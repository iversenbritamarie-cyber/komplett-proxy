const { fetchKomplettClubOffers } = require("../../../../lib/komplett");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).send(JSON.stringify({ error: "MethodNotAllowed" }));
  }

  const tag = req.query.tag ?? "*";

  try {
    const { sourceUrl, fetchedAt, offers } = await fetchKomplettClubOffers({ tag, force: false });

    const map = new Map();
    for (const o of offers) {
      const c = o.category || "Ukjent";
      map.set(c, (map.get(c) || 0) + 1);
    }

    res.status(200).send(
      JSON.stringify({
        sourceUrl,
        tag,
        fetchedAt,
        categories: Array.from(map.entries()).map(([category, count]) => ({ category, count })),
      })
    );
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: "FetchFailed", details: String(e?.message || e) }));
  }
};
