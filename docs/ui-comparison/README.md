# UI Comparison Findings

Date observed: 2026-06-03

This document records the hands-on UI review of Braintrust, LangSmith, and Langfuse using the hosted runs from this repo's shared triage eval.

## Executive Summary

If this repo can keep only one observability/eval product, use LangSmith. It showed the most useful end-to-end view for a LangGraph app: agent runs, model calls, evaluator runs, dataset experiments, latency, error rates, and monitoring dashboards.

Use Braintrust as the eval leaderboard and CI-gating product. It has the cleanest experiment comparison mental model, but the current integration did not send usable logs/traces, so review and monitoring were mostly empty.

Use Langfuse when the priority is broad vendor-neutral observability, score analytics, and production trace investigation. It is strong, especially for traces and score analysis, but the experiment comparison flow is less direct than Braintrust or LangSmith.

Overall ranking for this repo:

1. LangSmith
2. Braintrust
3. Langfuse

Recommended split:

- Debug agent behavior: LangSmith
- Decide V1 vs V2: Braintrust
- Track production traces and scores over time: Langfuse
- Show a clean eval table: LangSmith
- Show a simple experiment win/loss: Braintrust
- Investigate score correlations: Langfuse

## Rankings By Dimension

| Dimension | Winner | Ranking |
| --- | --- | --- |
| Onboarding for this repo | LangSmith | LangSmith > Braintrust > Langfuse |
| LangGraph debugging | LangSmith | LangSmith > Langfuse > Braintrust |
| Experiment comparison | Braintrust | Braintrust > LangSmith > Langfuse |
| Dataset eval table | LangSmith | LangSmith > Langfuse > Braintrust |
| Score analytics | Langfuse | Langfuse > Braintrust > LangSmith |
| Tracing and spans | LangSmith | LangSmith > Langfuse > Braintrust |
| Production monitoring | LangSmith | LangSmith > Langfuse > Braintrust |
| Prompt management | Langfuse | Langfuse > Braintrust > LangSmith |
| Scorer/evaluator authoring | LangSmith | LangSmith > Braintrust > Langfuse |
| Human review/annotation | Braintrust | Braintrust > Langfuse > LangSmith |
| CI/eval gating | Braintrust | Braintrust > LangSmith > Langfuse |
| UI clarity for this eval | LangSmith | LangSmith > Braintrust > Langfuse |
| UI performance in this session | Langfuse | Langfuse > LangSmith > Braintrust |
| Beginner friendliness | LangSmith | LangSmith > Langfuse > Braintrust |
| Vendor-neutral observability | Langfuse | Langfuse > Braintrust > LangSmith |

## Onboarding Experience

### Braintrust Onboarding

Braintrust onboarding starts with a broad "select your stack" grid. It covers model providers, SDK integrations, and agent frameworks, including OpenRouter, LangChain, LangGraph, OpenAI, Anthropic, Gemini, LiteLLM, CrewAI, and others. This is comprehensive, but it is also a lot of choices before the user understands what Braintrust wants them to do.

The CLI setup flow is more unusual. It asks the user to pick a coding agent (`claude`, `codex`, `cursor`, `gemini`) so Braintrust can ask that agent to add SDK tracing, run the app, and verify data reaches Braintrust. That is ambitious and potentially useful, but it is also confusing because it shifts onboarding from "copy this SDK snippet" to "let Braintrust drive a coding agent." In this session, the CLI reported browser setup complete for org `personal-srijan` and project `triage-eval-comparison`, then said it would fetch instructions and run the selected coding agent.

Verdict: powerful, but the most surprising onboarding. Good for users who want guided instrumentation; confusing for users who expected a normal API-key + SDK quickstart.

### LangSmith Onboarding

LangSmith onboarding was the most direct for this repo. The setup page showed "Get started with Tracing," selected LangChain, and offered a Python/TypeScript toggle. The TypeScript path gave concrete steps: key creation, dependency install, environment exports, and a runnable agent example. It also showed a success state once traces landed: "Agent traced successfully," with a direct next step to view traces.

The mismatch is that the suggested snippet assumes OpenAI-style setup and package choices, while this repo uses OpenRouter through LangChain. It also suggested `npm`, while this repo uses `pnpm`. Still, the conceptual flow was clear: set env vars, run agent, inspect traces.

Verdict: best onboarding for this repo because it moved from setup to visible traces quickly and had a clear success state.

### Langfuse Onboarding

The screenshots provided for Langfuse were mostly product surfaces rather than first-run setup. The UI did show a "Faster Langfuse experience enabled (preview)" banner and a nudge to upgrade the Langfuse SDK for missing real-time data. It also exposed a "Launch Week: Day 1" card suggesting GitHub Actions experiments against a dataset, which is relevant to this repo's CI/eval goal.

Verdict: likely good for production observability users, but less onboarding evidence was captured than for Braintrust or LangSmith. The product itself became clear after data landed, but the first-run path was not as strongly represented in the screenshots.

## Braintrust

### Strengths

- Best eval-first product model.
- Experiment overview shows score trends across runs.
- Experiment table makes V1/V2 comparison easy.
- Strong native scorer surface: LLM judge scorer, code scorer, and templates for factuality, closed Q&A, security, possible, summary, and exact match.
- Playgrounds explicitly support comparing prompts, models, custom scorers, and datasets.
- Human review, topics, scorer, and dataset concepts are first-class.
- Most natural fit for CI gating and experiment-regression checks.

### Weaknesses

- The current project showed no logs in the Braintrust Logs page.
- Review was not usable because it requires logs.
- Monitor had no logs monitoring data.
- The experiment detail page said rows were not attached to a dataset, even though the eval inputs are fixed in the repo.
- The UI was the heaviest product in this session. Chrome showed high memory use for a Braintrust tab, and the experiment page became unresponsive.
- It is currently the weakest end-to-end debugging surface for this repo because evals worked but traces/logs did not.

### Observed Screens

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

## LangSmith

### Strengths

- Best fit for a LangGraph/LangChain application.
- Home dashboard summarizes tracing projects, error rates, latency, datasets, experiments, and prompts.
- Tracing project pages distinguish ChatOpenRouter calls, LangGraph runs, and evaluator calls.
- Monitoring is strong: traces, LLM calls, cost and tokens, tools, run types, feedback scores, dashboards, and alerts.
- Dataset/experiment table is the clearest row-level eval UI observed: averages in headers, red/green score cells, filters, column controls, CSV export, compare, compact/full/diff modes.
- Evaluator creation is productized with templates for PII leakage, prompt injection, toxicity, bias and fairness, hallucination, correctness, perceived error, and user satisfaction.
- Supports LLM-as-judge evaluators and code evaluators.
- Most useful product for answering "why did the agent produce this output?"

### Weaknesses

- Strongly LangChain-shaped. This is good for this repo, but less neutral than Langfuse or Braintrust.
- Powerful but concept-heavy: tracing projects, evaluator runs, dataset experiments, monitoring dashboards, prompts, deployments, sandboxes, and annotation queues all live in the same product.
- Prompt management exists but was not populated in this workspace, so it was not deeply evaluated.
- The home screen showed a 22% error rate on one trace project, which needs follow-up investigation before treating the hosted traces as fully healthy.

### Observed Screens

- Home: onboarding cards, tracing summary, datasets and experiments, prompts section.
- Prompt management: prompt/webhook creation area and LangChain Hub link.
- Tracing project for `evaluators`: evaluator runs with latency and outputs.
- Monitoring: trace count, latency, trace error rate, and tabs for traces, LLM calls, cost and tokens, tools, run types, feedback scores.
- Dataset experiment table: row-level inputs, reference outputs, outputs, scores, latency, tokens, cost.
- Evaluators: template gallery and create-from-scratch options.
- Tracing project for `pr-impassioned-fright-34`: ChatOpenRouter, LangGraph, evaluator runs, inputs/outputs, latency, dataset, annotation columns.

## Langfuse

### Strengths

- Strong broad observability model with Home, Dashboards, Tracing, Sessions, Users, Prompts, Playground, Scores, Evaluators, Human Annotation, Datasets, and Experiments.
- Dataset linkage was clean: `triage-comparison-v1`, 25 items, 2 experiments, dataset hash metadata, created/last-run timestamps.
- Experiment result page showed input, expected output, actual output, scores, metadata, baseline selector, comparison search, and filters.
- Trace table was strong: agent/generation/span types, root-observation filters, trace names, inputs, outputs, and ChatOpenRouter observations.
- Scores surface was detailed: score list, trace/observation links, source, name, data type, values.
- Score analytics were the best observed: statistics, trend over time, score distribution, heatmap, Pearson/Spearman correlation, MAE, and RMSE.
- Best fit for vendor-neutral production observability and likely best self-host/open-source story.

### Weaknesses

- Experiments are marked beta.
- The experiment page is useful but less direct for "which version won?" than Braintrust or LangSmith.
- UI is table-heavy. It is strong for investigation, weaker for a quick executive comparison.
- Setup and integration involve more moving parts: SDK, tracing, prompts, datasets, score APIs, eval runs, and observability configuration.
- One Langfuse tab initially rendered as a blank shell before the user-provided screenshots showed the relevant pages working.

### Observed Screens

- Datasets: fixed 25-ticket dataset, 2 experiments, dataset hash metadata, new dataset flow.
- Scores analytics: faithfulness/replyQuality comparison, totals, means, standard deviation, correlations, trend chart, heatmap.
- Experiment results: baseline experiment, row-level input/expected/output, scores, metadata, filters, comparison panel.
- Tracing agent workflow: agent rows with input/output, environment and type filters.
- Scores table: per-score rows connected to trace and observation IDs.
- Tracing generation view: ChatOpenRouter generations with inputs/outputs and filters.

## Follow-Up Work

- Wire Braintrust tracing/logging properly if Braintrust should be judged as an end-to-end observability product instead of only an eval product.
- Investigate the LangSmith project with 22% trace error rate.
- Use the same V1/V2 prompt naming across all three tools so UI comparison is less polluted by adapter-specific labels.
- Consider updating the adapters so every platform stores the same dataset identity and prompt-version metadata.
