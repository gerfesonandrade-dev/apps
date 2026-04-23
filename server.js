const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const DATA_FILE = "data.json";
const PENDING_FILE = "pending.json";

const LOGO_URL = "https://apps.linhacriativa.com/img/logo.png";
const FAVICON_URL = "https://apps.linhacriativa.com/img/icone.ico";

// ========================
// UTIL
// ========================
function lerJSON(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf8") || "[]");
  } catch {
    return [];
  }
}

function salvarJSON(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
}

// ========================
// IDEIAS
// ========================
function lerIdeias() {
  return lerJSON(DATA_FILE);
}

function salvarIdeia(ideia) {
  const dados = lerIdeias();
  dados.push(ideia);
  salvarJSON(DATA_FILE, dados);
}

// ========================
// PENDÊNCIAS
// ========================
function lerPendencias() {
  return lerJSON(PENDING_FILE);
}

function salvarPendencias(pendencias) {
  salvarJSON(PENDING_FILE, pendencias);
}

function setPendencia(chatId, tipo) {
  const lista = lerPendencias().filter((p) => p.chatId !== chatId);
  lista.push({ chatId, tipo, criadoEm: new Date().toISOString() });
  salvarPendencias(lista);
}

function buscarPendencia(chatId) {
  return lerPendencias().find((p) => p.chatId === chatId);
}

function removerPendencia(chatId) {
  const lista = lerPendencias().filter((p) => p.chatId !== chatId);
  salvarPendencias(lista);
}

// ========================
// CATEGORIA
// ========================
function detectarCategoria(texto) {
  const t = texto.toLowerCase();

  if (t.match(/receita|bolo|cozinha/)) return "Receita";
  if (t.match(/cimento|obra|tijolo/)) return "Construção";
  if (t.match(/decoração|ambiente/)) return "Decoração";
  if (t.match(/organizar|gaveta/)) return "Organização";
  if (t.match(/diy|artesanato/)) return "DIY";

  return "Outros";
}

// ========================
// BUSCA / FILTRO
// ========================
function filtrarIdeias(ideias, categoria, busca) {
  let lista = [...ideias];

  if (categoria) {
    lista = lista.filter(i => i.categoria === categoria);
  }

  if (busca) {
    const t = busca.toLowerCase();
    lista = lista.filter(i =>
      (i.conteudo || "").toLowerCase().includes(t)
    );
  }

  return lista;
}

// ========================
// TELEGRAM
// ========================
async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

// ========================
// HTML
// ========================
function gerarHTML(ideias, categoria = "", busca = "") {

  const ideiasFiltradas = filtrarIdeias(ideias, categoria, busca);
  const categorias = [...new Set(ideias.map(i => i.categoria))];

  const cards = ideiasFiltradas.reverse().map((i, index) => {
    const alturas = ["alto", "medio", "baixo"];
    const tipoAltura = alturas[index % 3];

    return `
      <div class="pin ${tipoAltura}">
        <div class="tag">${i.categoria}</div>
        <p>${i.conteudo}</p>
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ideavault</title>
<link rel="icon" href="${FAVICON_URL}">

<style>

body {
  margin:0;
  font-family: Arial;
  background:#f7f7f7;
  color:#111827;
}

/* TOPO */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #ececec;
}

.topbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0;
  text-decoration: none;
}

.logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
}

/* BUSCA */
.search-wrap {
  flex: 1;
}

.search-form {
  display: flex;
  gap: 8px;
}

.search-form input {
  flex: 1;
  background: #efefef;
  border-radius: 999px;
  border: none;
  padding: 12px;
}

.search-form button {
  border-radius: 999px;
  border: none;
  background: #111827;
  color: #fff;
  padding: 10px;
}

/* HERO */
.hero {
  background:#fff;
  margin:15px;
  padding:20px;
  border-radius:20px;
}

/* FILTROS */
.filtros {
  padding:10px 15px;
}

.filtros a {
  margin-right:10px;
  padding:6px 12px;
  border-radius:20px;
  background:#eee;
  text-decoration:none;
}

/* GALERIA */
.galeria {
  column-count:4;
  padding:15px;
}

.pin {
  background:#fff;
  margin-bottom:15px;
  padding:15px;
  border-radius:15px;
}

.pin.alto { min-height:160px; }
.pin.medio { min-height:110px; }
.pin.baixo { min-height:70px; }

@media(max-width:900px){
  .galeria{column-count:2;}
}

@media(max-width:500px){
  .galeria{column-count:1;}
  .logo{width:72px;height:72px;}
}

</style>
</head>

<body>

<div class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/ideavault/ideias">
      <img src="${LOGO_URL}" class="logo">
    </a>

    <div class="search-wrap">
      <form class="search-form">
        <input name="busca" placeholder="Pesquise receitas, construção..." value="${busca}">
        <button>Buscar</button>
      </form>
    </div>
  </div>
</div>

<div class="hero">
  <h1>Galeria de ideias.</h1>
  <p>Explore suas ideias salvas em um mural visual organizado por categoria.</p>
</div>

<div class="filtros">
  <a href="/ideavault/ideias">Todas</a>
  ${categorias.map(c => `<a href="/ideavault/ideias?categoria=${c}">${c}</a>`).join("")}
</div>

<div class="galeria">
  ${cards || "<p>Nenhuma ideia encontrada</p>"}
</div>

</body>
</html>
`;
}

// ========================
// ROTAS
// ========================
app.get("/", (req, res) => {
  res.redirect("/ideavault/ideias");
});

app.get("/ideavault/ideias", (req, res) => {
  const ideias = lerIdeias();
  const categoria = req.query.categoria || "";
  const busca = req.query.busca || "";
  res.send(gerarHTML(ideias, categoria, busca));
});

// ========================
// WEBHOOK
// ========================
app.post("/ideavault/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;

  if (msg.text) {
    salvarIdeia({
      tipo: "texto",
      conteudo: msg.text,
      categoria: detectarCategoria(msg.text),
      data: new Date()
    });

    await sendMessage(chatId, "💡 Ideia salva!");
  }

  res.sendStatus(200);
});

// ========================
app.listen(process.env.PORT || 3000);
