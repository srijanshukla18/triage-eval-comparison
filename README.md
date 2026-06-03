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
export JUDGE_MODEL=openai/gpt-oss-120b:free
```

## Credentials

OpenRouter:

1. Create an OpenRouter API key.
2. Set `OPENROUTER_API_KEY`.
3. Optionally set `OPENROUTER_SITE_URL` and `OPENROUTER_APP_TITLE` for OpenRouter attribution.

Braintrust:

1. Create a Braintrust API key.
2. Set `BRAINTRUST_API_KEY`.
3. Run `pnpm eval:braintrust`. The Braintrust adapter runs V1 and V2 and gates CI so V2 must beat V1 on `faithfulness`.

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

## Comparison Rubric

| Dimension | Braintrust | LangSmith | Langfuse |
| --- | --- | --- | --- |
| Dataset setup ergonomics | Pending hosted run | Pending hosted run | Pending hosted run |
| Experiment reproducibility | Pending hosted run | Pending hosted run | Pending hosted run |
| LangGraph trace depth | Pending hosted run | Pending hosted run | Pending hosted run |
| Prompt version workflow | Pending hosted run | Pending hosted run | Pending hosted run |
| CI gating fit | Pending hosted run | Pending hosted run | Pending hosted run |
| Score visibility | Pending hosted run | Pending hosted run | Pending hosted run |

Only update this table after actual hosted runs with credentials.

## Docs Used

- [LangChain OpenRouter integration](https://docs.langchain.com/oss/javascript/integrations/chat/openrouter)
- [LangGraph graph API](https://docs.langchain.com/oss/javascript/langgraph/use-graph-api)
- [Braintrust eval docs](https://www.braintrust.dev/docs/evaluate/run-evaluations)
- [LangSmith code evaluator SDK](https://docs.langchain.com/langsmith/code-evaluator-sdk)
- [Langfuse SDK overview](https://langfuse.com/docs/observability/sdk/overview)
- [Langfuse prompt labels](https://langfuse.com/docs/prompt-management/features/prompt-version-control)
- [Langfuse experiments](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)
