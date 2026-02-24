let cache = {
  tag: null,
  fetchedAt: null,
  offers: null,
};

const TTL_MS = 1000 * 60 * 30; // 30 min

function isFresh() {
  if (!cache.fetchedAt) return false;
  return Date.now() - new Date(cache.fetchedAt).getTime() < TTL_MS;
}

function tryExtractNextData(html) {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function findBestProductArray(obj) {
  let best = null;

  function scoreItem(x) {
    if (!x || typeof x !== "object") return 0;
    const keys = Object.keys(x);
    const hasTitle = keys.includes("title") || keys.includes("name");
    const hasUrl = keys.some((k) => /url|link|href/i.test(k));
    const hasPrice = keys.some((k) => /price/i.test(k));
    return (hasTitle ? 2 : 0) + (hasUrl ? 2 : 0) + (hasPrice ? 2 : 0);
  }

  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) {
      if (node.length > 0 && typeof node[0] === "object") {
        const s = scoreItem(node[0]);
        if (s >= 4) {
          if (!best || node.length > best.length) best = node;
        }
      }
      for (const it of node) walk(it);
      return;
    }
    if (typeof node === "object") {
      for (const v of Object.values(node)) walk(v);
    }
  }

  walk(obj);
  return best || [];
}

function toMoney(x) {
  if (x == null) return null;
  if (typeof x === "number") return { amount: x, currency: "NOK" };
  if (typeof x === "string") {
    const n = Number(x.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (!Number.isNaN(n)) return { amount: n, currency: "NOK" };
  }
  if (typeof x === "object") {
    if (typeof x.amount === "number") return { amount: x.amount, currency: x.currency || "NOK" };
    if (typeof x.value === "number") return { amount: x.value, currency: x.currency || "NOK" };
  }
  return null;
}

function normalizeOffer(p) {
  const title = p.title ?? p.name ?? p.productName ?? "";
  const productUrl = p.productUrl ?? p.url ?? p.link ?? p.href ?? "";

  const priceNow =
    toMoney(p.priceNow) ||
    toMoney(p.salesPrice) ||
    toMoney(p.price) ||
    toMoney(p.currentPrice) ||
    { amount: 0, currency: "NOK" };

  const priceBefore =
    toMoney(p.priceBefore) ||
    toMoney(p.beforePrice) ||
    toMoney(p.originalPrice) ||
    toMoney(p.oldPrice) ||
    null;

  const discountPercent =
    typeof p.discountPercent === "number"
      ? p.discountPercent
      : typeof p.discount === "number"
      ? p.discount
      : null;

  const out = {
    productId: String(p.productId ?? p.id ?? p.sku ?? ""),
    title,
    brand: p.brand?.name ?? p.brand ?? "",
    category: p.category?.name ?? p.category ?? "",
    priceNow,
    productUrl,
    imageUrl: p.imageUrl ?? p.image ?? p.thumbnailUrl ?? "",
    availability: p.availability ?? p.stockStatus ?? "",
    fetchedAt: new Date().toISOString(),
  };

  if (priceBefore) out.priceBefore = priceBefore;
  if (discountPercent != null) out.discountPercent = discountPercent;

  return out;
}

async function fetchKomplettClubOffers({ tag = "*", force = false } = {}) {
  const sourceUrl = `https://www.komplett.no/kampanje/komplett-club-tilbud?tag=${encodeURIComponent(tag)}`;

  if (!force && cache.offers && cache.tag === tag && isFresh()) {
    return { sourceUrl, fetchedAt: cache.fetchedAt, offers: cache.offers, cached: true };
  }

  const resp = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; KomplettProxy/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await resp.text();

  const nextData = tryExtractNextData(html);
  const products = nextData ? findBestProductArray(nextData) : [];

  const offers = (products || [])
    .map(normalizeOffer)
    .filter((o) => o.title && o.productUrl && o.priceNow);

  cache = {
    tag,
    fetchedAt: new Date().toISOString(),
    offers,
  };

  return { sourceUrl, fetchedAt: cache.fetchedAt, offers, cached: false };
}

module.exports = { fetchKomplettClubOffers };
