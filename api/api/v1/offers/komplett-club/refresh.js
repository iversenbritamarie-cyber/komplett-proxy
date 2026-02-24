const { fetchKomplettClubOffers } = require("../../../../lib/komplett");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).send(JSON.stringify({ error: "MethodNotAllowed" }));
  }

  const body = req.body || {};
  const tag = body.tag ?? "*";
  const force = body.force ?? true;

  try {
    const { sourceUrl, fetchedAt, offers, cached } = await fetchKomplettClubOffers({ tag, force });

    res.status(200).send(
      JSON.stringify({
        sourceUrl,
        tag,
        refreshed: !cached,
        fetchedAt,
        totalExtracted: offers.length,
        message: cached ? "Cache was fresh; no refresh needed" : "Refreshed and cached offers",
      })
    );
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: "FetchFailed", details: String(e?.message || e) }));
  }
};
