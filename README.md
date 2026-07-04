# Triage Eval Comparison

One shared TypeScript LangGraph customer-support triage agent, one fixed 25-row eval dataset, one shared scorer set, and three adapter layers for Braintrust, LangSmith, and Langfuse.

The comparison is intentionally not filled in from guesses. Hosted verification is incomplete until these variables are set: `OPENROUTER_API_KEY`, `BRAINTRUST_API_KEY`, `LANGSMITH_API_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`.

## Architecture

- `src/agent`: shared LangGraph agent. The graph classifies, looks up orders, asks the model whether shipping lookup is needed, retrieves policy text, and drafts the reply.
- `src/eval`: static 25-ticket dataset and neutral scorer functions.
- `src/platforms`: Braintrust, LangSmith, and Langfuse adapters. Platform code stays out of the shared core.
- `scripts`: smoke checks and credential diagnostics.

The shared public API is:

```ts
runAgent(input: string, systemPrompt: string, options?: RunOptions): Promise<AgentResult>
```

It also exports `Ticket`, `Category`, `ToolName`, `AgentResult`, and neutral scorer functions.

## Setup

```bash
pnpm install
cp .env.example .env
```

Set the environment variables in your shell or source your `.env` through your preferred local env loader.

Defaults:

```bash
export TRIAGE_MODEL=openai/gpt-oss-120b:free
export JUDGE_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
```

The judge deliberately defaults to a different model family than the triage agent so the agent is never grading its own outputs (LLM judges rate their own family's outputs higher).

## Credentials

OpenRouter:

1. Create an OpenRouter API key.
2. Set `OPENROUTER_API_KEY`.
3. Optionally set `OPENROUTER_SITE_URL` and `OPENROUTER_APP_TITLE` for OpenRouter attribution.

Braintrust:

1. Create a Braintrust API key.
2. Set `BRAINTRUST_API_KEY`.
3. Run `pnpm eval:braintrust`. The Braintrust adapter runs V1 and V2 and gates CI on `faithfulness` non-regression: V2 must score at least V1 minus a 0.02 noise margin, because a strict V2 > V1 check on 25 rows flips on judge noise rather than prompt quality.

LangSmith:

1. Create a LangSmith API key.
2. Set `LANGSMITH_API_KEY`.
3. Keep `LANGSMITH_TRACING=true`.
4. Run `pnpm eval:langsmith`. Dataset setup is idempotent and keyed by stable item IDs plus the dataset hash.

Langfuse:

1. For Langfuse Cloud, set `LANGFUSE_BASE_URL=https://cloud.langfuse.com`.
2. For self-hosted Langfuse, set `LANGFUSE_BASE_URL` to your deployed instance URL.
3. Set `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY`.
4. Run `pnpm eval:langfuse`. The adapter seeds prompt labels `v1` and `v2`, creates or updates dataset items, runs dataset experiments, and attaches scores.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm smoke:agent
pnpm smoke:openrouter
pnpm eval:braintrust
pnpm eval:langsmith
pnpm eval:langfuse
pnpm eval:all
pnpm run doctor
```

`pnpm smoke:agent` uses the deterministic fake model and does not require hosted credentials. `pnpm smoke:openrouter` and all hosted eval commands require the relevant keys. Use `pnpm run doctor` for the repo diagnostic because `pnpm doctor` is pnpm's own built-in command.

## Hosted UI Comparison Findings

Date observed: 2026-06-03

These findings come from hands-on hosted runs in Braintrust, LangSmith, and Langfuse using this repo's shared triage eval.

For the current LangGraph implementation, if this repo can keep only one observability/eval product, use LangSmith. It showed the most useful end-to-end view for this app: agent runs, model calls, evaluator runs, dataset experiments, latency, error rates, and monitoring dashboards.

Use Braintrust as the eval leaderboard and CI-gating product. It has the cleanest experiment comparison mental model, but the current integration did not send usable logs/traces, so Braintrust observability is not fairly measured yet.

Use Langfuse when the priority is broad vendor-neutral observability, score analytics, and production trace investigation. It is strong, especially for traces and score analysis, but the experiment comparison flow is less direct than Braintrust or LangSmith.

Provisional ranking for this LangGraph repo:

1. LangSmith
2. Braintrust
3. Langfuse

This ranking is about the observed hosted integration for this repo, not a universal product ranking. Braintrust is ranked on the eval surfaces that worked; its tracing, review, and monitoring surfaces are marked not measured because traces did not land.

Recommended split:

- Debug agent behavior: LangSmith
- Decide V1 vs V2: Braintrust
- Track production traces and scores over time: Langfuse
- Show a clean eval table: LangSmith
- Show a simple experiment win/loss: Braintrust
- Investigate score correlations: Langfuse

### Rankings By Dimension

| Dimension | Winner | Ranking |
| --- | --- | --- |
| Onboarding for this repo | LangSmith | LangSmith > Braintrust > Langfuse |
| LangGraph debugging | LangSmith | LangSmith > Langfuse; Braintrust not measured because traces did not land |
| Experiment comparison | Braintrust | Braintrust > LangSmith > Langfuse |
| Dataset eval table | LangSmith | LangSmith > Langfuse > Braintrust |
| Score analytics | Langfuse | Langfuse > Braintrust > LangSmith |
| Tracing and spans | LangSmith | LangSmith > Langfuse; Braintrust not measured because traces did not land |
| Production monitoring | LangSmith | LangSmith > Langfuse; Braintrust not measured because logs/traces did not land |
| Prompt management | Langfuse | Langfuse > Braintrust > LangSmith |
| Scorer/evaluator authoring | LangSmith | LangSmith > Braintrust > Langfuse |
| Human review/annotation | Not measured | Braintrust review was gated by missing logs; Langfuse and LangSmith surfaces were observed but not compared deeply |
| CI/eval gating | Braintrust | Braintrust > LangSmith > Langfuse |
| UI clarity for this eval | LangSmith | LangSmith > Braintrust > Langfuse |
| Beginner friendliness | LangSmith | LangSmith > Langfuse > Braintrust |
| Vendor-neutral observability | Langfuse | Langfuse > Braintrust > LangSmith |

### Onboarding Experience

Braintrust onboarding starts with a broad "select your stack" grid. It covers model providers, SDK integrations, and agent frameworks, including OpenRouter, LangChain, LangGraph, OpenAI, Anthropic, Gemini, LiteLLM, CrewAI, and others. This is comprehensive, but it is also a lot of choices before the user understands what Braintrust wants them to do.

The Braintrust CLI setup flow is more unusual. It asks the user to pick a coding agent (`claude`, `codex`, `cursor`, `gemini`) so Braintrust can ask that agent to add SDK tracing, run the app, and verify data reaches Braintrust. That is ambitious and potentially useful, but it is also confusing because it shifts onboarding from "copy this SDK snippet" to "let Braintrust drive a coding agent." In this session, the CLI reported browser setup complete for org `personal-srijan` and project `triage-eval-comparison`, then said it would fetch instructions and run the selected coding agent.

LangSmith onboarding was the most direct for this repo. The setup page showed "Get started with Tracing," selected LangChain, and offered a Python/TypeScript toggle. The TypeScript path gave concrete steps: key creation, dependency install, environment exports, and a runnable agent example. It also showed a success state once traces landed: "Agent traced successfully," with a direct next step to view traces.

The LangSmith mismatch is that the suggested snippet assumes OpenAI-style setup and package choices, while this repo uses OpenRouter through LangChain. It also suggested `npm`, while this repo uses `pnpm`. Still, the conceptual flow was clear: set env vars, run agent, inspect traces.

Langfuse onboarding was less represented in the captured first-run flow. The UI did show a "Faster Langfuse experience enabled (preview)" banner and a nudge to upgrade the Langfuse SDK for missing real-time data. It also exposed a "Launch Week: Day 1" card suggesting GitHub Actions experiments against a dataset, which is relevant to this repo's CI/eval goal.

Onboarding verdict: LangSmith was best for this repo because it moved from setup to visible traces quickly and had a clear success state. Braintrust was powerful but surprising. Langfuse became clear after data landed, but the first-run path was not as directly captured.

### Methodology Caveats

- Braintrust observability is not measured yet. Its eval, experiment, scorer, and CI-gating surfaces worked; its logs, review, and monitor pages were empty because, at the time the rankings were captured, this repo did not send Braintrust traces. As of 2026-06-11 the adapter passes a `BraintrustCallbackHandler` into the agent, so experiment rows carry full span trees; the observability rankings still need a fresh UI pass before they can be filled in.
- LangSmith's win is conditional on this repo using LangGraph. LangSmith has a native advantage for LangChain/LangGraph traces; a non-LangGraph agent loop could narrow that advantage.
- The LangSmith "22% trace error rate" was root-caused on 2026-06-11: every errored trace was an `OpenRouterError: Insufficient credits` from the 2026-06-02 23:44 UTC window, when the first paid-model Braintrust run drained the OpenRouter balance. The eval and evaluator projects have zero errors across their full history. The agent and graph were never at fault. Those errored traces also exposed cross-platform pollution: ambient `LANGSMITH_TRACING=true` was sending Braintrust eval traffic into LangSmith, so the Braintrust and Langfuse adapters now disable LangSmith tracing for their runs.
- Cross-platform fairness depends on identical dataset identity, prompt-version metadata, and run labels across adapters. The current adapters are close enough for an exploratory comparison, but this should be tightened before treating the comparison as publication-grade.

### Braintrust

Strengths:

- Best eval-first product model.
- Experiment overview shows score trends across runs.
- Experiment table makes V1/V2 comparison easy.
- Strong native scorer surface: LLM judge scorer, code scorer, and templates for factuality, closed Q&A, security, possible, summary, and exact match.
- Playgrounds explicitly support comparing prompts, models, custom scorers, and datasets.
- Human review, topics, scorer, and dataset concepts are first-class.
- Most natural fit for CI gating and experiment-regression checks.

Weaknesses:

- The current project showed no logs in the Braintrust Logs page.
- Review was not usable because it requires logs.
- Monitor had no logs monitoring data.
- The experiment detail page said rows were not attached to a dataset, even though the eval inputs are fixed in the repo.
- Its end-to-end debugging surface is not measured for this repo yet because evals worked but traces/logs did not.

Observed screens:

- Project overview: observability setup card, evaluation summary, recent experiments, starter plan usage.
- Logs: no logs, setup instructions.
- Experiments list: aggregate score trend, 6 experiments, categoryMatch, faithfulness, replyQuality, toolCorrect, errors, duration.
- Experiment detail: row-level eval output, comparison selector, score distributions, filters, display controls.
- Scorers: LLM judge scorer, code scorer, scorer templates.
- Prompts: prompt creation with model, params, messages, variables, tool/MCP, description, metadata, chat test area.
- Review: gated by logs.
- Topics: task, sentiment, and issue facets; token-credit note; enable topics workflow.
- Playgrounds: prompt/model/custom-scorer starter examples.
- Monitor: charts for spans, latency, total LLM cost, token count, topics, time to first token, but empty because logs were absent.

### LangSmith

Strengths:

- Best fit for a LangGraph/LangChain application.
- Home dashboard summarizes tracing projects, error rates, latency, datasets, experiments, and prompts.
- Tracing project pages distinguish ChatOpenRouter calls, LangGraph runs, and evaluator calls.
- Monitoring is strong: traces, LLM calls, cost and tokens, tools, run types, feedback scores, dashboards, and alerts.
- Dataset/experiment table is the clearest row-level eval UI observed: averages in headers, red/green score cells, filters, column controls, CSV export, compare, compact/full/diff modes.
- Evaluator creation is productized with templates for PII leakage, prompt injection, toxicity, bias and fairness, hallucination, correctness, perceived error, and user satisfaction.
- Supports LLM-as-judge evaluators and code evaluators.
- Most useful product for answering "why did the agent produce this output?"

Weaknesses:

- Strongly LangChain-shaped. This is good for this repo, but less neutral than Langfuse or Braintrust.
- Powerful but concept-heavy: tracing projects, evaluator runs, dataset experiments, monitoring dashboards, prompts, deployments, sandboxes, and annotation queues all live in the same product.
- Prompt management exists but was not populated in this workspace, so it was not deeply evaluated.
- The home screen showed a 22% error rate on one trace project. This was later root-caused to the OpenRouter insufficient-credits outage during the first paid-model run, not an agent or platform problem (see Methodology Caveats).

Observed screens:

- Home: onboarding cards, tracing summary, datasets and experiments, prompts section.
- Prompt management: prompt/webhook creation area and LangChain Hub link.
- Tracing project for `evaluators`: evaluator runs with latency and outputs.
- Monitoring: trace count, latency, trace error rate, and tabs for traces, LLM calls, cost and tokens, tools, run types, feedback scores.
- Dataset experiment table: row-level inputs, reference outputs, outputs, scores, latency, tokens, cost.
- Evaluators: template gallery and create-from-scratch options.
- Tracing project for `pr-impassioned-fright-34`: ChatOpenRouter, LangGraph, evaluator runs, inputs/outputs, latency, dataset, annotation columns.

### Langfuse

Strengths:

- Strong broad observability model with Home, Dashboards, Tracing, Sessions, Users, Prompts, Playground, Scores, Evaluators, Human Annotation, Datasets, and Experiments.
- Dataset linkage was clean: `triage-comparison-v1`, 25 items, 2 experiments, dataset hash metadata, created/last-run timestamps.
- Experiment result page showed input, expected output, actual output, scores, metadata, baseline selector, comparison search, and filters.
- Trace table was strong: agent/generation/span types, root-observation filters, trace names, inputs, outputs, and ChatOpenRouter observations.
- Scores surface was detailed: score list, trace/observation links, source, name, data type, values.
- Score analytics were the best observed: statistics, trend over time, score distribution, heatmap, Pearson/Spearman correlation, MAE, and RMSE.
- Best fit for vendor-neutral production observability and likely best self-host/open-source story.

Weaknesses:

- Experiments are marked beta.
- The experiment page is useful but less direct for "which version won?" than Braintrust or LangSmith.
- UI is table-heavy. It is strong for investigation, weaker for a quick executive comparison.
- Setup and integration involve more moving parts: SDK, tracing, prompts, datasets, score APIs, eval runs, and observability configuration.

Observed screens:

- Datasets: fixed 25-ticket dataset, 2 experiments, dataset hash metadata, new dataset flow.
- Scores analytics: faithfulness/replyQuality comparison, totals, means, standard deviation, correlations, trend chart, heatmap.
- Experiment results: baseline experiment, row-level input/expected/output, scores, metadata, filters, comparison panel.
- Tracing agent workflow: agent rows with input/output, environment and type filters.
- Scores table: per-score rows connected to trace and observation IDs.
- Tracing generation view: ChatOpenRouter generations with inputs/outputs and filters.

### Follow-Up Work

Addressed on 2026-06-11:

- Braintrust tracing is wired through `@braintrust/langchain-js`, so agent spans now land under each experiment row. Re-observe the Braintrust UI before re-ranking its observability rows.
- The LangSmith 22% trace error rate was root-caused to the 2026-06-02 insufficient-credits outage; eval projects show zero errors.
- `toolCorrect` now scores the full expected tool sequence (including the model-decided `lookup_shipping` step) instead of only the first tool call. The dataset identity moved to `triage-comparison-v2` because the ticket schema changed.
- The judge model is split from the triage model, and judge calls retry transient free-tier failures.

Still open:

- Use the same V1/V2 prompt naming across all three tools so UI comparison is less polluted by adapter-specific labels.
- Re-run the hosted UI comparison with the fixes above and update the rankings, especially Braintrust's observability rows.

## Docs Used

- [LangChain OpenRouter integration](https://docs.langchain.com/oss/javascript/integrations/chat/openrouter)
- [LangGraph graph API](https://docs.langchain.com/oss/javascript/langgraph/use-graph-api)
- [Braintrust eval docs](https://www.braintrust.dev/docs/evaluate/run-evaluations)
- [LangSmith code evaluator SDK](https://docs.langchain.com/langsmith/code-evaluator-sdk)
- [Langfuse SDK overview](https://langfuse.com/docs/observability/sdk/overview)
- [Langfuse prompt labels](https://langfuse.com/docs/prompt-management/features/prompt-version-control)
- [Langfuse experiments](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)
