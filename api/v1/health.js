module.exports = function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(
    JSON.stringify({
      ok: true,
      service: "komplett-proxy",
      time: new Date().toISOString(),
    })
  );
};
