const { json, readBody, setCors } = require("./_supabase");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function extractText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractText).join("");
  if (typeof value === "object") {
    if (value.type === "output_text" && value.text) return value.text;
    if (value.text) return extractText(value.text);
    if (value.content) return extractText(value.content);
    if (value.output) return extractText(value.output);
  }
  return "";
}

function parseJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("The model did not return JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    if (!OPENAI_API_KEY) {
      json(res, 500, { error: "OPENAI_API_KEY is not configured." });
      return;
    }

    const body = await readBody(req);
    const query = String(body.query || "").trim();
    if (!query) {
      json(res, 400, { error: "Food name is required." });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        tools: [{ type: "web_search", search_context_size: "low" }],
        input: [
          {
            role: "system",
            content:
              "You estimate nutrition facts for a food query. Prefer Korean public or manufacturer nutrition sources when available. Return only compact JSON."
          },
          {
            role: "user",
            content:
              `음식명: ${query}\n` +
              "100g 기준 kcal, carbohydrate_g, protein_g, fat_g를 추정해줘. " +
              "음식명이 1인분 기준으로 더 자연스러우면 serving_description도 적어줘. " +
              "JSON schema: {\"name\":\"\",\"calories\":0,\"carb\":0,\"protein\":0,\"fat\":0,\"serving_description\":\"100g\",\"confidence\":\"low|medium|high\",\"source_note\":\"\"}"
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      json(res, response.status, { error: data.error?.message || "OpenAI request failed." });
      return;
    }

    const text = data.output_text || extractText(data.output);
    const nutrition = parseJson(text);
    json(res, 200, { nutrition });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
