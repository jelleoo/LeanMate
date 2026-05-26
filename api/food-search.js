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
    throw new Error("The search result was not valid JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeFood(raw, query) {
  return {
    name: String(raw.name || query),
    servingDescription: String(raw.servingDescription || raw.serving_description || "100g"),
    calories: Number(raw.calories) || 0,
    carb: Number(raw.carb ?? raw.carbohydrate_g) || 0,
    protein: Number(raw.protein ?? raw.protein_g) || 0,
    fat: Number(raw.fat ?? raw.fat_g) || 0,
    confidence: String(raw.confidence || "medium"),
    sourceNote: String(raw.sourceNote || raw.source_note || "")
  };
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
              "You estimate nutrition facts for food search. Prefer Korean official, manufacturer, or restaurant nutrition pages when available. Return only JSON."
          },
          {
            role: "user",
            content:
              `Food query: ${query}\n` +
              "Return one best match. Use 100g as the default serving when possible. " +
              "If the food is normally sold by serving, describe that serving clearly. " +
              "Schema: {\"name\":\"\",\"servingDescription\":\"100g\",\"calories\":0,\"carb\":0,\"protein\":0,\"fat\":0,\"confidence\":\"low|medium|high\",\"sourceNote\":\"short source summary\"}"
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
    const food = normalizeFood(parseJson(text), query);
    json(res, 200, { food });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
