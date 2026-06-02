import { ChatOpenRouter } from "@langchain/openrouter";
import { requiredEnv } from "../src/platforms/common.js";

requiredEnv(["OPENROUTER_API_KEY"]);

const model = new ChatOpenRouter({
  model: process.env.TRIAGE_MODEL ?? "minimax/minimax-m3",
  temperature: 0,
  maxTokens: 80,
  siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://github.com/srijanshukla18/triage-eval-comparison",
  siteName: process.env.OPENROUTER_APP_TITLE ?? "triage-eval-comparison"
});

const response = await model.invoke([
  { role: "system", content: "Return one concise sentence." },
  { role: "user", content: "Say OpenRouter smoke test passed." }
]);

console.log(typeof response.content === "string" ? response.content : JSON.stringify(response.content));
