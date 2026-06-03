import { Eval, Reporter, type ExperimentSummary } from "braintrust";
import { runAgent, SYSTEM_PROMPT_V1, SYSTEM_PROMPT_V2, type AgentResult } from "../agent/index.js";
import { TICKETS, type Ticket } from "../eval/dataset.js";
import {
  OpenRouterJudgeModel,
  categoryMatch,
  faithfulness,
  replyQuality,
  toolCorrect
} from "../eval/scorers.js";
import { PROJECT_NAME, datasetHash, requiredEnv, scoreToBraintrust } from "./common.js";

requiredEnv(["OPENROUTER_API_KEY", "BRAINTRUST_API_KEY"]);

type PromptVersion = "v1" | "v2";

const summaries = new Map<PromptVersion, ExperimentSummary>();

const faithfulnessGate = Reporter<boolean>("faithfulness-gate", {
  reportEval(_evaluator, result) {
    const summary = result.summary;
    const promptVersion = summary.experimentName.includes("v2") ? "v2" : "v1";
    summaries.set(promptVersion, summary);
    const faithfulnessScore = summary.scores.faithfulness?.score;
    console.log(`${summary.experimentName} faithfulness=${faithfulnessScore ?? "missing"}`);
    return true;
  },
  reportRun() {
    const v1 = summaries.get("v1")?.scores.faithfulness?.score;
    const v2 = summaries.get("v2")?.scores.faithfulness?.score;
    if (v1 === undefined || v2 === undefined) {
      console.error("Braintrust gate could not find both V1 and V2 faithfulness summaries.");
      return false;
    }
    const passed = v2 > v1;
    console.log(`Braintrust faithfulness gate: v1=${v1}; v2=${v2}; passed=${passed}`);
    return passed;
  }
});

function makeEval(promptVersion: PromptVersion, systemPrompt: string) {
  const judge = new OpenRouterJudgeModel();
  Eval<string, AgentResult, Ticket>(PROJECT_NAME, {
    data: TICKETS.map((ticket) => ({
      input: ticket.input,
      expected: ticket,
      metadata: {
        id: ticket.id,
        datasetHash: datasetHash()
      }
    })),
    task: async (input) => runAgent(input, systemPrompt),
    scores: [
      ({ expected, output }) => scoreToBraintrust(categoryMatch(expected, output)),
      ({ expected, output }) => scoreToBraintrust(toolCorrect(expected, output)),
      async ({ expected, output }) => scoreToBraintrust(await replyQuality(expected, output, judge)),
      async ({ expected, output }) => scoreToBraintrust(await faithfulness(expected, output, judge))
    ],
    experimentName: `${promptVersion}-${datasetHash()}`,
    metadata: {
      promptVersion,
      datasetHash: datasetHash(),
      triageModel: process.env.TRIAGE_MODEL ?? "openai/gpt-oss-120b:free",
      judgeModel: process.env.JUDGE_MODEL ?? "openai/gpt-oss-120b:free"
    },
    maxConcurrency: 3,
    timeout: 20 * 60 * 1000
  }, faithfulnessGate);
}

makeEval("v1", SYSTEM_PROMPT_V1);
makeEval("v2", SYSTEM_PROMPT_V2);
