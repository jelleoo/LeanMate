const { json, readBody, setCors, supabaseFetch } = require("./_supabase");

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    json(res, 200, { ok: true });
    return;
  }

  try {
    if (req.method === "GET") {
      const members = await supabaseFetch("leanmate_members?select=id,name,created_at&order=created_at.asc");
      json(res, 200, { members });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      if (!name) {
        json(res, 400, { error: "Member name is required." });
        return;
      }

      const [member] = await supabaseFetch("leanmate_members", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ name })
      });
      json(res, 201, { member });
      return;
    }

    json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    json(res, error.statusCode || 500, {
      error: error.message,
      details: error.details
    });
  }
};
