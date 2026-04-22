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

function detectarCategoria(texto) {
  const t = texto.toLowerCase();

  const categorias = {
    Receita: [
      "receita", "bolo", "frango", "massa", "macarrão", "ingredientes",
      "forno", "cozinha", "sobremesa", "molho", "tempero", "assado"
    ],
    Construção: [
      "cimento", "tijolo", "obra", "argamassa", "piso", "porcelanato",
      "reboco", "construção", "parede", "telhado", "viga", "coluna", "cimento queimado"
    ],
    Decoração: [
      "decoração", "decorar", "sofá", "cortina", "tapete", "quadro",
      "luminária", "estilo", "ambiente", "paleta", "mesa posta"
    ],
    Organização: [
      "organização", "organizar", "gaveta", "caixa", "prateleira",
      "arrumação", "closet", "despensa", "setor", "agenda"
    ],
    DIY: [
      "faça você mesmo", "diy", "artesanato", "manual", "montagem",
      "passo a passo", "reciclagem", "pintura", "mdf"
    ]
  };

  for (const [categoria, palavras] of Object.entries(categorias)) {
    for (const palavra of palavras) {
      if (t.includes(palavra)) {
        return categoria;
      }
    }
  }

  return "Outros";
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
    const categoria = ideia.categoria ? ` | ${ideia.categoria}` : "";
    texto += `${index + 1}. [${ideia.tipo}${categoria}] ${ideia.conteudo}\n`;
  });

  return texto;
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
          "🚀 Bem-vindo ao Ideavault!\n\nEnvie textos, imagens e vídeos para salvar suas ideias.\n\nComandos disponíveis:\n/listar - ver ideias salvas\n/total - ver total de ideias\n/categorias - ver categorias"
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

      if (textoRecebido === "/categorias") {
        const ideias = lerIdeias();
        const contagem = contarPorCategoria(ideias);
        await sendMessage(chatId, formatarCategorias(contagem));
        return res.sendStatus(200);
      }

      const categoria = detectarCategoria(textoRecebido);

      salvarIdeia({
        tipo: "texto",
        conteudo: textoRecebido,
        categoria,
        data: new Date().toISOString()
      });

      await sendMessage(
        chatId,
        `💡 Ideia salva com sucesso!\n📂 Categoria: ${categoria}`
      );
    }

    if (message.photo) {
      salvarIdeia({
        tipo: "imagem",
        conteudo: "imagem recebida",
        categoria: "Pendente",
        data: new Date().toISOString()
      });

      await sendMessage(chatId, "📸 Imagem salva! Categoria: Pendente\nMe descreve essa ideia 👇");
    }

    if (message.video) {
      salvarIdeia({
        tipo: "video",
        conteudo: "vídeo recebido",
        categoria: "Pendente",
        data: new Date().toISOString()
      });

      await sendMessage(chatId, "🎥 Vídeo salvo! Categoria: Pendente\nMe conta sobre essa ideia 👇");
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
