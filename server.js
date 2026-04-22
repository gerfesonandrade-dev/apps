const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

app.get("/", (req, res) => {
  res.send("Ideavault is running");
});

app.post("/webhook", async (req, res) => {
  const update = req.body;
  console.log("Update recebido:", JSON.stringify(update, null, 2));

  const message = update.message;
  if (!message) {
    return res.sendStatus(200);
  }

  const chatId = message.chat.id;

  try {
    if (message.text) {
      await sendMessage(chatId, "💡 Ideia recebida! Vou organizar isso para você.");
    } else if (message.photo) {
      await sendMessage(chatId, "📸 Recebi sua imagem! Me descreve essa ideia.");
    } else if (message.video) {
      await sendMessage(chatId, "🎥 Recebi seu vídeo! Me conta sobre essa ideia.");
    }
  } catch (error) {
    console.error("Erro ao responder:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ideavault rodando na porta ${PORT}`);
});
