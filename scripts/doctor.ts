import { DATASET_NAME, datasetHash } from "../src/platforms/common.js";

const required = [
  "OPENROUTER_API_KEY",
  "BRAINTRUST_API_KEY",
  "LANGSMITH_API_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_BASE_URL"
];

console.log("triage-eval-comparison doctor");
console.log(`dataset=${DATASET_NAME}`);
console.log(`datasetHash=${datasetHash()}`);
console.log(`TRIAGE_MODEL=${process.env.TRIAGE_MODEL ?? "openai/gpt-oss-120b:free"}`);
console.log(`JUDGE_MODEL=${process.env.JUDGE_MODEL ?? "openai/gpt-oss-120b:free"}`);

for (const name of required) {
  console.log(`${name}=${process.env[name] ? "set" : "missing"}`);
}

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.log(`Hosted evals incomplete until these are set: ${missing.join(", ")}`);
}
