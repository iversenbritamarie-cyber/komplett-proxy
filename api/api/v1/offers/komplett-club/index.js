const { fetchKomplettClubOffers } = require("../../../../lib/komplett");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    return res.status(405).send(JSON.stringify({ error: "MethodNotAllowed" }));
  }

  const tag = req.query.tag ?? "*";
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 30)));

  try {
    const { sourceUrl, fetchedAt, offers } = await fetchKomplettClubOffers({ tag, force: false });

    const start = (page - 1) * pageSize;
    const paged = offers.slice(start, start + pageSize);

    res.status(200).send(
      JSON.stringify({
        source: "komplett.no",
        sourceUrl,
        tag,
        fetchedAt,
        page,
        pageSize,
        totalEstimated: offers.length,
        offers: paged,
      })
    );
  } catch (e) {
    res.status(500).send(JSON.stringify({ error: "FetchFailed", details: String(e?.message || e) }));
  }
};
