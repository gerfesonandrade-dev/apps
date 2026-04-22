const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

const DATA_FILE = "data.json";
const PENDING_FILE = "pending.json";

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
  lista.push({
    chatId,
    tipo,
    criadoEm: new Date().toISOString()
  });
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

  if (t.match(/bolo|receita|frango|massa|cozinha|ingrediente|sobremesa|molho|tempero|pizza|pão|torta|brigadeiro/)) {
    return "Receita";
  }

  if (t.match(/cimento|obra|tijolo|parede|bancada|piso|porcelanato|argamassa|telhado|reboco|azulejo|cerâmica|madeira|armário/)) {
    return "Construção";
  }

  if (t.match(/decoração|decorar|sofá|ambiente|quadro|cortina|tapete|luminária|paleta|vaso|painel|sala/)) {
    return "Decoração";
  }

  if (t.match(/organizar|organização|gaveta|caixa|prateleira|arrumação|despensa|closet|estoque|agenda/)) {
    return "Organização";
  }

  if (t.match(/diy|artesanato|manual|faça você mesmo|reciclagem|mdf|feito à mão|passo a passo/)) {
    return "DIY";
  }

  return "Outros";
}

// ========================
// BUSCA / FILTRO
// ========================
function buscarIdeias(ideias, termo) {
  const t = termo.toLowerCase();

  return ideias.filter((i) =>
    (i.conteudo || "").toLowerCase().includes(t) ||
    (i.categoria || "").toLowerCase().includes(t) ||
    (i.tipo || "").toLowerCase().includes(t)
  );
}

function contarPorCategoria(ideias) {
  const contagem = {};

  ideias.forEach((ideia) => {
    const categoria = ideia.categoria || "Sem categoria";
    contagem[categoria] = (contagem[categoria] || 0) + 1;
  });

  return contagem;
}

function formatarCategorias(contagem) {
  const entradas = Object.entries(contagem);

  if (entradas.length === 0) {
    return "📂 Nenhuma categoria encontrada ainda.";
  }

  let texto = "📂 Ideias por categoria:\n\n";

  entradas.forEach(([categoria, total]) => {
    texto += `- ${categoria}: ${total}\n`;
  });

  return texto;
}

function formatarBusca(resultados, termo) {
  if (resultados.length === 0) {
    return `🔎 Nenhum resultado encontrado para: "${termo}"`;
  }

  let texto = `🔎 Resultados para "${termo}":\n\n`;

  resultados
    .slice(-10)
    .reverse()
    .forEach((ideia, index) => {
      texto += `${index + 1}. [${ideia.tipo} | ${ideia.categoria}] ${ideia.conteudo}\n`;
    });

  return texto;
}

function formatarListaIdeias(ideias) {
  if (ideias.length === 0) {
    return "📭 Nenhuma ideia salva ainda.";
  }

  const ultimas = ideias.slice(-10).reverse();
  let texto = "📚 Últimas ideias salvas:\n\n";

  ultimas.forEach((ideia, index) => {
    texto += `${index + 1}. [${ideia.tipo} | ${ideia.categoria}] ${ideia.conteudo}\n`;
  });

  return texto;
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
    .replace(/>/g, "&gt;");
}

function gerarLinksCategorias(contagem, categoriaAtual) {
  const categoriasOrdenadas = Object.entries(contagem).sort((a, b) => a[0].localeCompare(b[0]));

  let html = `
    <a class="filtro ${!categoriaAtual ? "ativo" : ""}" href="/ideavault/ideias">Todas (${Object.values(contagem).reduce((a, b) => a + b, 0)})</a>
  `;

  categoriasOrdenadas.forEach(([categoria, total]) => {
    html += `
      <a class="filtro ${categoriaAtual === categoria ? "ativo" : ""}" href="/ideavault/ideias?categoria=${encodeURIComponent(categoria)}">
        ${categoria} (${total})
      </a>
    `;
  });

  return html;
}

function gerarHTMLIdeias(ideias, categoriaAtual = "") {
  const contagem = contarPorCategoria(ideias);
  const ideiasFiltradas = categoriaAtual
    ? ideias.filter((i) => (i.categoria || "") === categoriaAtual)
    : ideias;

  const cards = ideiasFiltradas
    .slice()
    .reverse()
    .map((i) => `
      <div class="card">
        <div class="topo-card">
          <span class="tag tipo">${escapeHtml(i.tipo || "sem tipo")}</span>
          <span class="tag categoria">${escapeHtml(i.categoria || "Sem categoria")}</span>
        </div>
        <div class="conteudo">${escapeHtml(i.conteudo || "")}</div>
        <div class="data">${i.data ? new Date(i.data).toLocaleString("pt-BR") : ""}</div>
      </div>
    `)
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ideavault</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #f4f7fb;
        color: #1f2937;
      }

      header {
        background: #0f172a;
        color: white;
        padding: 24px;
        text-align: center;
      }

      header h1 {
        margin: 0;
        font-size: 32px;
      }

      header p {
        margin: 8px 0 0;
        color: #cbd5e1;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
      }

      .topo-info {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }

      .box {
        background: #fff;
        border-radius: 14px;
        padding: 16px 18px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        min-width: 180px;
      }

      .box strong {
        display: block;
        font-size: 24px;
        margin-bottom: 6px;
      }

      .filtros {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 24px;
      }

      .filtro {
        text-decoration: none;
        background: #ffffff;
        color: #0f172a;
        border: 1px solid #dbe3ee;
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }

      .filtro.ativo {
        background: #0f172a;
        color: #fff;
        border-color: #0f172a;
      }

      .subtitulo {
        margin-bottom: 18px;
        font-size: 18px;
        font-weight: bold;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 18px;
      }

      .card {
        background: #fff;
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        border: 1px solid #e5e7eb;
      }

      .topo-card {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }

      .tag {
        font-size: 12px;
        font-weight: bold;
        padding: 6px 10px;
        border-radius: 999px;
      }

      .tipo {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .categoria {
        background: #fef3c7;
        color: #92400e;
      }

      .conteudo {
        font-size: 16px;
        line-height: 1.5;
        margin-bottom: 16px;
        white-space: pre-wrap;
      }

      .data {
        font-size: 12px;
        color: #6b7280;
      }

      .vazio {
        background: white;
        border-radius: 16px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      }
    </style>
  </head>
  <body>
    <header>
      <h1>🚀 Ideavault</h1>
      <p>Seu cofre inteligente de ideias</p>
    </header>

    <div class="container">
      <div class="topo-info">
        <div class="box">
          <strong>${ideias.length}</strong>
          <span>Total de ideias</span>
        </div>
        <div class="box">
          <strong>${ideiasFiltradas.length}</strong>
          <span>${categoriaAtual ? `Itens em ${categoriaAtual}` : "Itens exibidos"}</span>
        </div>
      </div>

      <div class="filtros">
        ${gerarLinksCategorias(contagem, categoriaAtual)}
      </div>

      <div class="subtitulo">
        ${categoriaAtual ? `Categoria: ${escapeHtml(categoriaAtual)}` : "Todas as ideias"}
      </div>

      ${
        ideiasFiltradas.length === 0
          ? `<div class="vazio">Nenhuma ideia encontrada nesta categoria.</div>`
          : `<div class="grid">${cards}</div>`
      }
    </div>
  </body>
  </html>
  `;
}

// ========================
// ROTAS
// ========================
app.get("/", (req, res) => {
  res.redirect("/ideavault");
});

app.get("/ideavault", (req, res) => {
  res.send("Ideavault rodando 🚀");
});

app.get("/ideias", (req, res) => {
  const ideias = lerIdeias();
  const categoria = req.query.categoria || "";
  res.send(gerarHTMLIdeias(ideias, categoria));
});

app.get("/ideavault/ideias", (req, res) => {
  const ideias = lerIdeias();
  const categoria = req.query.categoria || "";
  res.send(gerarHTMLIdeias(ideias, categoria));
});

// ========================
// WEBHOOK
// ========================
app.post("/ideavault/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;

  try {
    if (msg.photo) {
      setPendencia(chatId, "imagem");
      await sendMessage(chatId, "📸 Envie a descrição da imagem");
      return res.sendStatus(200);
    }

    if (msg.video) {
      setPendencia(chatId, "video");
      await sendMessage(chatId, "🎥 Envie a descrição do vídeo");
      return res.sendStatus(200);
    }

    if (msg.text) {
      const texto = msg.text.trim();

      if (texto === "/start") {
        await sendMessage(
          chatId,
          "🚀 Ideavault ativo!\n\nComandos:\n/listar\n/total\n/categorias\n/buscar termo\n\nPainel:\nhttps://apps.linhacriativa.com/ideavault/ideias"
        );
        return res.sendStatus(200);
      }

      if (texto === "/listar") {
        await sendMessage(chatId, formatarListaIdeias(lerIdeias()));
        return res.sendStatus(200);
      }

      if (texto === "/total") {
        await sendMessage(chatId, `📦 Total de ideias salvas: ${lerIdeias().length}`);
        return res.sendStatus(200);
      }

      if (texto === "/categorias") {
        await sendMessage(chatId, formatarCategorias(contarPorCategoria(lerIdeias())));
        return res.sendStatus(200);
      }

      if (texto.startsWith("/buscar")) {
        const termo = texto.replace("/buscar", "").trim();

        if (!termo) {
          await sendMessage(chatId, "⚠️ Use assim: /buscar termo\nEx: /buscar receita");
          return res.sendStatus(200);
        }

        const resultados = buscarIdeias(lerIdeias(), termo);
        await sendMessage(chatId, formatarBusca(resultados, termo));
        return res.sendStatus(200);
      }

      const pendencia = buscarPendencia(chatId);

      if (pendencia) {
        const categoria = detectarCategoria(texto);

        salvarIdeia({
          tipo: pendencia.tipo,
          conteudo: texto,
          categoria,
          data: new Date().toISOString()
        });

        removerPendencia(chatId);
        await sendMessage(chatId, `✅ Salvo com sucesso!\n📂 Categoria: ${categoria}`);
        return res.sendStatus(200);
      }

      const categoria = detectarCategoria(texto);

      salvarIdeia({
        tipo: "texto",
        conteudo: texto,
        categoria,
        data: new Date().toISOString()
      });

      await sendMessage(chatId, `💡 Ideia salva!\n📂 Categoria: ${categoria}`);
    }
  } catch (err) {
    console.error("Erro:", err.response?.data || err.message || err);
  }

  res.sendStatus(200);
});

// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando", PORT);
});
