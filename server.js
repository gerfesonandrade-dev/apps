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

function salvarPendencias(p) {
  salvarJSON(PENDING_FILE, p);
}

function setPendencia(chatId, tipo) {
  const lista = lerPendencias().filter(p => p.chatId !== chatId);
  lista.push({ chatId, tipo });
  salvarPendencias(lista);
}

function buscarPendencia(chatId) {
  return lerPendencias().find(p => p.chatId === chatId);
}

function removerPendencia(chatId) {
  const lista = lerPendencias().filter(p => p.chatId !== chatId);
  salvarPendencias(lista);
}

// ========================
// CATEGORIA
// ========================
function detectarCategoria(texto) {
  const t = texto.toLowerCase();

  if (t.match(/bolo|receita|frango|massa|cozinha/)) return "Receita";
  if (t.match(/cimento|obra|tijolo|parede|bancada/)) return "Construção";
  if (t.match(/decoração|sofá|ambiente|quadro/)) return "Decoração";
  if (t.match(/organizar|gaveta|caixa/)) return "Organização";
  if (t.match(/diy|artesanato|manual/)) return "DIY";

  return "Outros";
}

// ========================
// BUSCA
// ========================
function buscarIdeias(ideias, termo) {
  const t = termo.toLowerCase();
  return ideias.filter(i =>
    (i.conteudo || "").toLowerCase().includes(t) ||
    (i.categoria || "").toLowerCase().includes(t)
  );
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
function gerarHTMLIdeias(ideias) {
  return `
  <html>
  <head>
    <title>Ideavault</title>
    <style>
      body { font-family: Arial; background:#f5f5f5; padding:20px }
      .card {
        background:#fff;
        padding:15px;
        margin-bottom:10px;
        border-radius:10px;
        box-shadow:0 2px 6px rgba(0,0,0,0.1);
      }
    </style>
  </head>
  <body>
    <h1>🚀 Ideavault</h1>
    <p>Total: ${ideias.length}</p>
    ${ideias.reverse().map(i => `
      <div class="card">
        <b>${i.tipo} | ${i.categoria}</b><br/>
        ${i.conteudo}
      </div>
    `).join("")}
  </body>
  </html>
  `;
}

// ========================
// ROTAS (COMPATÍVEL)
// ========================

// raiz
app.get("/", (req, res) => {
  res.redirect("/ideavault");
});

// nova rota
app.get("/ideavault", (req, res) => {
  res.send("Ideavault rodando 🚀");
});

// painel (novo e antigo)
app.get("/ideavault/ideias", (req, res) => {
  res.send(gerarHTMLIdeias(lerIdeias()));
});

app.get("/ideias", (req, res) => {
  res.send(gerarHTMLIdeias(lerIdeias()));
});

// ========================
// WEBHOOK (NOVO)
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
      const texto = msg.text;

      if (texto === "/start") {
        await sendMessage(chatId, "🚀 Ideavault ativo!");
        return res.sendStatus(200);
      }

      if (texto.startsWith("/buscar")) {
        const termo = texto.replace("/buscar", "").trim();
        const resultados = buscarIdeias(lerIdeias(), termo);
        await sendMessage(chatId, JSON.stringify(resultados.slice(-5), null, 2));
        return res.sendStatus(200);
      }

      const pend = buscarPendencia(chatId);

      if (pend) {
        salvarIdeia({
          tipo: pend.tipo,
          conteudo: texto,
          categoria: detectarCategoria(texto),
          data: new Date()
        });

        removerPendencia(chatId);
        await sendMessage(chatId, "✅ Salvo com sucesso!");
        return res.sendStatus(200);
      }

      salvarIdeia({
        tipo: "texto",
        conteudo: texto,
        categoria: detectarCategoria(texto),
        data: new Date()
      });

      await sendMessage(chatId, "💡 Ideia salva!");
    }

  } catch (err) {
    console.error(err);
  }

  res.sendStatus(200);
});

// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando", PORT);
});
