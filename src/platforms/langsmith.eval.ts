import { Client } from "langsmith";
import type { ExampleCreate } from "langsmith/schemas";
import { evaluate, type EvaluatorT } from "langsmith/evaluation";
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
  scoreToLangSmith,
  stableUuid,
  toEvalInput
} from "./common.js";

requiredEnv(["OPENROUTER_API_KEY", "LANGSMITH_API_KEY"]);
process.env.LANGSMITH_TRACING ??= "true";

async function ensureDataset(client: Client) {
  const exists = await client.hasDataset({ datasetName: DATASET_NAME });
  const dataset = exists
    ? await client.readDataset({ datasetName: DATASET_NAME })
    : await client.createDataset(DATASET_NAME, {
        description: "Fixed 25-ticket support triage eval dataset.",
        metadata: { datasetHash: datasetHash() }
      });

  const existingIds = new Set<string>();
  for await (const example of client.listExamples({ datasetId: dataset.id })) {
    existingIds.add(example.id);
  }

  const examples: ExampleCreate[] = TICKETS.map((ticket) => ({
    id: stableUuid("langsmith", ticket.id),
    dataset_id: dataset.id,
    inputs: toEvalInput(ticket),
    outputs: ticket,
    metadata: {
      ticketId: ticket.id,
      datasetHash: datasetHash()
    }
  })).filter((example) => example.id && !existingIds.has(example.id));

  if (examples.length > 0) {
    await client.createExamples(examples);
  }

  return dataset;
}

function makeEvaluators(judge: OpenRouterJudgeModel): EvaluatorT[] {
  return [
    ({ outputs, referenceOutputs }: { outputs: Record<string, unknown>; referenceOutputs?: Record<string, unknown> }) =>
      scoreToLangSmith(categoryMatch(referenceOutputs as Ticket, outputs as AgentResult)),
    ({ outputs, referenceOutputs }: { outputs: Record<string, unknown>; referenceOutputs?: Record<string, unknown> }) =>
      scoreToLangSmith(toolCorrect(referenceOutputs as Ticket, outputs as AgentResult)),
    async ({ outputs, referenceOutputs }: { outputs: Record<string, unknown>; referenceOutputs?: Record<string, unknown> }) =>
      scoreToLangSmith(await replyQuality(referenceOutputs as Ticket, outputs as AgentResult, judge)),
    async ({ outputs, referenceOutputs }: { outputs: Record<string, unknown>; referenceOutputs?: Record<string, unknown> }) =>
      scoreToLangSmith(await faithfulness(referenceOutputs as Ticket, outputs as AgentResult, judge))
  ];
}

async function runPromptVersion(client: Client, promptVersion: "v1" | "v2", systemPrompt: string) {
  const judge = new OpenRouterJudgeModel();
  const target = async (inputs: { input: string }) => runAgent(inputs.input, systemPrompt);
  const results = await evaluate(target, {
    client,
    data: DATASET_NAME,
    evaluators: makeEvaluators(judge),
    experimentPrefix: `${PROJECT_NAME}-${promptVersion}`,
    metadata: {
      promptVersion,
      datasetHash: datasetHash(),
      triageModel: process.env.TRIAGE_MODEL ?? "openai/gpt-oss-120b:free",
      judgeModel: process.env.JUDGE_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free"
    },
    maxConcurrency: 3
  });

  for await (const _row of results) {
    // Exhaust the iterator so all runs and evaluator scores are uploaded.
  }
  console.log(`LangSmith experiment complete: ${results.experimentName}`);
}

const client = new Client();
await ensureDataset(client);
await runPromptVersion(client, "v1", SYSTEM_PROMPT_V1);
await runPromptVersion(client, "v2", SYSTEM_PROMPT_V2);
