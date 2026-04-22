app.get("/", (req, res) => {
  res.send("RAIZ OK");
});

app.get("/ideavault", (req, res) => {
  res.send("IDEAVAULT OK");
});

app.get("/ideavault/ideias", (req, res) => {
  res.send("IDEIAS OK");
});
