import { CallbackHandler } from "@langfuse/langchain";
import { LangfuseClient } from "@langfuse/client";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { startActiveObservation } from "@langfuse/tracing";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { runAgent, SYSTEM_PROMPT_V1, SYSTEM_PROMPT_V2, type AgentResult } from "../agent/index.js";
import { TICKETS, type Ticket } from "../eval/dataset.js";
import {
  OpenRouterJudgeModel,
  categoryMatch,
  faithfulness,
  replyQuality,
  toolCorrect
} from "../eval/scorers.js";
import {
  DATASET_NAME,
  PROJECT_NAME,
  datasetHash,
  requiredEnv,
  scoreToLangfuse,
  stableUuid,
  toEvalInput
} from "./common.js";

requiredEnv([
  "OPENROUTER_API_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL"
]);

type LangfuseInput = ReturnType<typeof toEvalInput>;

const otelSdk = new NodeSDK({
  spanProcessors: [
    new LangfuseSpanProcessor({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: process.env.LANGFUSE_BASE_URL!,
      environment: process.env.LANGFUSE_TRACING_ENVIRONMENT ?? "local"
    })
  ]
});

otelSdk.start();

const langfuse = new LangfuseClient({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL!
});

async function ensureDataset() {
  try {
    await langfuse.api.datasets.create({
      name: DATASET_NAME,
      description: "Fixed 25-ticket support triage eval dataset.",
      metadata: { datasetHash: datasetHash() }
    });
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }

  for (const ticket of TICKETS) {
    await langfuse.api.datasetItems.create({
      id: stableUuid("langfuse", ticket.id),
      datasetName: DATASET_NAME,
      input: toEvalInput(ticket),
      expectedOutput: ticket,
      metadata: {
        ticketId: ticket.id,
        datasetHash: datasetHash()
      }
    });
  }

  return langfuse.dataset.get(DATASET_NAME);
}

async function ensurePrompt(label: "v1" | "v2", prompt: string) {
  try {
    const current = await langfuse.prompt.get("triage-system-prompt", {
      label,
      type: "text",
      cacheTtlSeconds: 0
    });
    if (current.prompt === prompt) {
      return current;
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  return langfuse.prompt.create({
    name: "triage-system-prompt",
    type: "text",
    prompt,
    labels: [label],
    config: {
      datasetHash: datasetHash()
    }
  });
}

function makeEvaluators(judge: OpenRouterJudgeModel) {
  return [
    async ({ output, expectedOutput }: { output: AgentResult; expectedOutput?: Ticket }) => {
      if (!expectedOutput) {
        throw new Error("Missing Langfuse expectedOutput for categoryMatch.");
      }
      return scoreToLangfuse(categoryMatch(expectedOutput, output));
    },
    async ({ output, expectedOutput }: { output: AgentResult; expectedOutput?: Ticket }) => {
      if (!expectedOutput) {
        throw new Error("Missing Langfuse expectedOutput for toolCorrect.");
      }
      return scoreToLangfuse(toolCorrect(expectedOutput, output));
    },
    async ({ output, expectedOutput }: { output: AgentResult; expectedOutput?: Ticket }) => {
      if (!expectedOutput) {
        throw new Error("Missing Langfuse expectedOutput for replyQuality.");
      }
      return scoreToLangfuse(await replyQuality(expectedOutput, output, judge));
    },
    async ({ output, expectedOutput }: { output: AgentResult; expectedOutput?: Ticket }) => {
      if (!expectedOutput) {
        throw new Error("Missing Langfuse expectedOutput for faithfulness.");
      }
      return scoreToLangfuse(await faithfulness(expectedOutput, output, judge));
    }
  ];
}

async function runPromptVersion(promptVersion: "v1" | "v2", fallbackPrompt: string) {
  const prompt = await langfuse.prompt.get("triage-system-prompt", {
    label: promptVersion,
    type: "text",
    cacheTtlSeconds: 0,
    fallback: fallbackPrompt
  });
  const dataset = await langfuse.dataset.get(DATASET_NAME);
  const judge = new OpenRouterJudgeModel();
  const runName = `${PROJECT_NAME}-${promptVersion}-${datasetHash()}`;

  const result = await dataset.runExperiment({
    name: `${PROJECT_NAME}-${promptVersion}`,
    runName,
    description: "Apples-to-apples customer-support triage eval.",
    metadata: {
      promptVersion,
      promptVersionNumber: prompt.version,
      datasetHash: datasetHash(),
      triageModel: process.env.TRIAGE_MODEL ?? "openai/gpt-oss-120b:free",
      judgeModel: process.env.JUDGE_MODEL ?? "openai/gpt-oss-120b:free"
    },
    maxConcurrency: 3,
    task: async ({ input, metadata }) => {
      const evalInput = input as LangfuseInput;
      return startActiveObservation(
        "triage-agent",
        async (observation) => {
          observation.update({
            input,
            metadata: {
              ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
              promptVersion,
              datasetHash: datasetHash()
            }
          });
          const output = await runAgent(evalInput.input, prompt.prompt, {
            callbacks: [
              new CallbackHandler({
                tags: [promptVersion, "triage-eval"],
                version: promptVersion,
                traceMetadata: {
                  ticketId: evalInput.id,
                  datasetHash: datasetHash()
                }
              })
            ]
          });
          observation.update({
            output,
            metadata: {
              ticketId: evalInput.id,
              promptVersion
            }
          });
          return output;
        },
        { asType: "agent" }
      );
    },
    evaluators: makeEvaluators(judge)
  });

  console.log(await result.format());
}

function isAlreadyExistsError(error: unknown): boolean {
  return /already exists|conflict|409/i.test(String(error));
}

function isNotFoundError(error: unknown): boolean {
  return /not found|404/i.test(String(error));
}

try {
  await ensurePrompt("v1", SYSTEM_PROMPT_V1);
  await ensurePrompt("v2", SYSTEM_PROMPT_V2);
  await ensureDataset();
  await runPromptVersion("v1", SYSTEM_PROMPT_V1);
  await runPromptVersion("v2", SYSTEM_PROMPT_V2);
} finally {
  await langfuse.flush();
  await otelSdk.shutdown();
}
