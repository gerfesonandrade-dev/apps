const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const DATA_FILE = "data.json";

function lerIdeias() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const dados = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(dados || "[]");
  } catch (error) {
    console.error("Erro ao ler data.json:", error);
    return [];
  }
}

function salvarIdeia(ideia) {
  const dados = lerIdeias();
  dados.push(ideia);
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

function formatarListaIdeias(ideias) {
  if (ideias.length === 0) {
    return "📭 Nenhuma ideia salva ainda.";
  }

  const ultimas = ideias.slice(-10).reverse();

  let texto = "📚 Últimas ideias salvas:\n\n";

  ultimas.forEach((ideia, index) => {
    texto += `${index + 1}. [${ideia.tipo}] ${ideia.conteudo}\n`;
  });

  return texto;
}

app.get("/", (req, res) => {
  res.send("Ideavault está rodando 🚀");
});

app.post("/webhook", async (req, res) => {
  const update = req.body;
  const message = update.message;

  if (!message) {
    return res.sendStatus(200);
  }

  const chatId = message.chat.id;

  try {
    if (message.text) {
      const textoRecebido = message.text.trim();

      if (textoRecebido === "/start") {
        await sendMessage(
          chatId,
          "🚀 Bem-vindo ao Ideavault!\n\nEnvie textos, imagens e vídeos para salvar suas ideias.\n\nComandos disponíveis:\n/listar - ver ideias salvas\n/total - ver total de ideias"
        );
        return res.sendStatus(200);
      }

      if (textoRecebido === "/listar") {
        const ideias = lerIdeias();
        await sendMessage(chatId, formatarListaIdeias(ideias));
        return res.sendStatus(200);
      }

      if (textoRecebido === "/total") {
        const ideias = lerIdeias();
        await sendMessage(chatId, `📦 Total de ideias salvas: ${ideias.length}`);
        return res.sendStatus(200);
      }

      salvarIdeia({
        tipo: "texto",
        conteudo: textoRecebido,
        data: new Date().toISOString()
      });

      await sendMessage(chatId, "💡 Ideia salva com sucesso!");
    }

    if (message.photo) {
      salvarIdeia({
        tipo: "imagem",
        conteudo: "imagem recebida",
        data: new Date().toISOString()
      });

      await sendMessage(chatId, "📸 Imagem salva! Me descreve essa ideia 👇");
    }

    if (message.video) {
      salvarIdeia({
        tipo: "video",
        conteudo: "vídeo recebido",
        data: new Date().toISOString()
      });

      await sendMessage(chatId, "🎥 Vídeo salvo! Me conta sobre essa ideia 👇");
    }
  } catch (err) {
    console.error("Erro:", err.response?.data || err.message || err);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
