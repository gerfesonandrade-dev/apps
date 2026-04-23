const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const DATA_FILE = "data.json";
const PENDING_FILE = "pending.json";

const LOGO_URL = "https://linhacriativa.com/img/logo_br.png";
const FAVICON_URL = "https://linhacriativa.com/img/icone.ico";

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
function escapeHtml(texto = "") {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gerarHTML(ideias, categoria = "", busca = "") {
  const ideiasFiltradas = filtrarIdeias(ideias, categoria, busca);
  const categorias = [...new Set(ideias.map(i => i.categoria))];

  const cards = ideiasFiltradas
    .slice()
    .reverse()
    .map((i, index) => {
      const alturas = ["alto", "medio", "baixo"];
      const tipoAltura = alturas[index % 3];

      return `
        <article class="pin ${tipoAltura}" data-categoria="${escapeHtml(i.categoria || "Outros")}">
          <div class="pin-topo-visual">
            <span class="tag">${escapeHtml(i.categoria || "Outros")}</span>
          </div>

          <div class="pin-body">
            <h3>${escapeHtml(i.categoria || "Ideia")}</h3>
            <p>${escapeHtml(i.conteudo || "")}</p>
          </div>

          <div class="pin-footer">
            ${i.data ? new Date(i.data).toLocaleString("pt-BR") : ""}
          </div>
        </article>
      `;
    })
    .join("");

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
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f7f7f7;
  color: #111827;
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
  width: 250px;
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
  outline: none;
}

.search-form button {
  border-radius: 999px;
  border: none;
  background: #111827;
  color: #fff;
  padding: 10px 14px;
  cursor: pointer;
}

/* HERO */
.hero {
  background: #fff;
  margin: 15px;
  padding: 20px;
  border-radius: 20px;
}

/* FILTROS */
.filtros {
  padding: 10px 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filtros a {
  padding: 8px 14px;
  border-radius: 999px;
  background: #eee;
  text-decoration: none;
  color: #111827;
  font-size: 13px;
}

/* GALERIA */
.galeria {
  column-count: 4;
  column-gap: 18px;
  padding: 15px;
}

.pin {
  display: inline-block;
  width: 100%;
  margin: 0 0 18px;
  background: #fff;
  border-radius: 22px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  border: 1px solid #ececec;
  break-inside: avoid;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.pin:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
}

.pin-topo-visual {
  height: 90px;
  padding: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
}

.pin[data-categoria="Receita"] .pin-topo-visual {
  background: linear-gradient(135deg, #fde68a, #fff7ed);
}

.pin[data-categoria="Construção"] .pin-topo-visual {
  background: linear-gradient(135deg, #d1d5db, #f3f4f6);
}

.pin[data-categoria="Decoração"] .pin-topo-visual {
  background: linear-gradient(135deg, #fbcfe8, #fdf2f8);
}

.pin[data-categoria="Organização"] .pin-topo-visual {
  background: linear-gradient(135deg, #bbf7d0, #f0fdf4);
}

.pin[data-categoria="DIY"] .pin-topo-visual {
  background: linear-gradient(135deg, #fed7aa, #fff7ed);
}

.pin[data-categoria="Outros"] .pin-topo-visual {
  background: linear-gradient(135deg, #e5e7eb, #f9fafb);
}

.pin-body {
  padding: 16px;
}

.tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.88);
  color: #111827;
  backdrop-filter: blur(4px);
}

.pin h3 {
  margin: 0 0 10px;
  font-size: 18px;
  line-height: 1.2;
  color: #111827;
}

.pin p {
  margin: 0;
  color: #374151;
  line-height: 1.55;
  white-space: pre-wrap;
  font-size: 14px;
}

.pin.alto .pin-body p { min-height: 140px; }
.pin.medio .pin-body p { min-height: 90px; }
.pin.baixo .pin-body p { min-height: 55px; }

.pin-footer {
  padding: 0 16px 16px;
  font-size: 12px;
  color: #6b7280;
}

@media (max-width: 900px) {
  .galeria {
    column-count: 2;
  }
}

@media (max-width: 500px) {
  .galeria {
    column-count: 1;
  }

  .logo {
    width: 72px;
    height: 72px;
  }

  .search-form {
    flex-wrap: wrap;
  }
}

</style>
</head>

<body>

<div class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/ideavault/ideias">
      <img src="${LOGO_URL}" class="logo" alt="Logo Ideavault">
    </a>

    <div class="search-wrap">
      <form class="search-form" method="GET" action="/ideavault/ideias">
        ${categoria ? `<input type="hidden" name="categoria" value="${escapeHtml(categoria)}">` : ""}
        <input name="busca" placeholder="Pesquise receitas, construção..." value="${escapeHtml(busca)}">
        <button type="submit">Buscar</button>
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
  ${categorias.map(c => `<a href="/ideavault/ideias?categoria=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`).join("")}
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

app.get("/ideavault", (req, res) => {
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
