const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const DATA_FILE = "data.json";
const PENDING_FILE = "pending.json";

function lerJSON(arquivo) {
  if (!fs.existsSync(arquivo)) {
    return [];
  }

  try {
    const dados = fs.readFileSync(arquivo, "utf8");
    return JSON.parse(dados || "[]");
  } catch (error) {
    console.error(`Erro ao ler ${arquivo}:`, error);
    return [];
  }
}

function salvarJSON(arquivo, dados) {
  fs.writeFileSync(arquivo, JSON.stringify(dados, null, 2));
}

function lerIdeias() {
  return lerJSON(DATA_FILE);
}

function salvarIdeia(ideia) {
  const dados = lerIdeias();
  dados.push(ideia);
  salvarJSON(DATA_FILE, dados);
}

function lerPendencias() {
  return lerJSON(PENDING_FILE);
}

function salvarPendencias(pendencias) {
  salvarJSON(PENDING_FILE, pendencias);
}

function setPendencia(chatId, tipoMidia) {
  const pendencias = lerPendencias().filter((p) => p.chatId !== chatId);

  pendencias.push({
    chatId,
    tipoMidia,
    criadoEm: new Date().toISOString()
  });

  salvarPendencias(pendencias);
}

function buscarPendencia(chatId) {
  const pendencias = lerPendencias();
  return pendencias.find((p) => p.chatId === chatId);
}

function removerPendencia(chatId) {
  const pendencias = lerPendencias().filter((p) => p.chatId !== chatId);
  salvarPendencias(pendencias);
}

function detectarCategoria(texto) {
  const t = texto.toLowerCase();

  const categorias = {
    Receita: [
      "receita", "bolo", "frango", "massa", "macarrão", "ingredientes",
      "forno", "cozinha", "sobremesa", "molho", "tempero", "assado",
      "pizza", "pão", "doce", "brigadeiro", "torta", "lanche"
    ],
    Construção: [
      "cimento", "tijolo", "obra", "argamassa", "piso", "porcelanato",
      "reboco", "construção", "parede", "telhado", "viga", "coluna",
      "cimento queimado", "bancada", "cerâmica", "azulejo", "madeira", "armário"
    ],
    Decoração: [
      "decoração", "decorar", "sofá", "cortina", "tapete", "quadro",
      "luminária", "estilo", "ambiente", "paleta", "mesa posta",
      "sala", "cozinha planejada", "painel", "vaso"
    ],
    Organização: [
      "organização", "organizar", "gaveta", "caixa", "prateleira",
      "arrumação", "closet", "despensa", "setor", "agenda",
      "estoque", "separar", "categorizar"
    ],
    DIY: [
      "faça você mesmo", "diy", "artesanato", "manual", "montagem",
      "passo a passo", "reciclagem", "pintura", "mdf", "feito à mão"
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

function buscarIdeias(ideias, termo) {
  const t = termo.toLowerCase();

  return ideias.filter((ideia) => {
    const conteudo = (ideia.conteudo || "").toLowerCase();
    const categoria = (ideia.categoria || "").toLowerCase();
    const tipo = (ideia.tipo || "").toLowerCase();

    return (
      conteudo.includes(t) ||
      categoria.includes(t) ||
      tipo.includes(t)
    );
  });
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
    if (message.photo) {
      setPendencia(chatId, "imagem");
      await sendMessage(
        chatId,
        "📸 Imagem recebida!\nAgora me descreve essa ideia para eu salvar corretamente 👇"
      );
      return res.sendStatus(200);
    }

    if (message.video) {
      setPendencia(chatId, "video");
      await sendMessage(
        chatId,
        "🎥 Vídeo recebido!\nAgora me conta sobre essa ideia para eu salvar corretamente 👇"
      );
      return res.sendStatus(200);
    }

    if (message.text) {
      const textoRecebido = message.text.trim();

      if (textoRecebido === "/start") {
        await sendMessage(
          chatId,
          "🚀 Bem-vindo ao Ideavault!\n\nEnvie textos, imagens e vídeos para salvar suas ideias.\n\nComandos disponíveis:\n/listar - ver ideias salvas\n/total - ver total de ideias\n/categorias - ver categorias\n/buscar termo - buscar ideias"
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

      if (textoRecebido.startsWith("/buscar")) {
        const termo = textoRecebido.replace("/buscar", "").trim();

        if (!termo) {
          await sendMessage(
            chatId,
            "⚠️ Use assim: /buscar termo\nEx: /buscar receita"
          );
          return res.sendStatus(200);
        }

        const ideias = lerIdeias();
        const resultados = buscarIdeias(ideias, termo);

        await sendMessage(chatId, formatarBusca(resultados, termo));
        return res.sendStatus(200);
      }

      const pendencia = buscarPendencia(chatId);

      if (pendencia) {
        const categoria = detectarCategoria(textoRecebido);

        salvarIdeia({
          tipo: pendencia.tipoMidia,
          conteudo: textoRecebido,
          categoria,
          data: new Date().toISOString()
        });

        removerPendencia(chatId);

        await sendMessage(
          chatId,
          `✅ ${pendencia.tipoMidia === "imagem" ? "Imagem" : "Vídeo"} salvo com descrição!\n📂 Categoria: ${categoria}`
        );
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
  } catch (err) {
    console.error("Erro:", err.response?.data || err.message || err);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
