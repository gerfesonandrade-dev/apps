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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gerarLinksCategorias(contagem, categoriaAtual, buscaAtual) {
  const categoriasOrdenadas = Object.entries(contagem).sort((a, b) => a[0].localeCompare(b[0]));
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

  const baseTodas = buscaAtual
    ? `/ideavault/ideias?busca=${encodeURIComponent(buscaAtual)}`
    : `/ideavault/ideias`;

  let html = `
    <a class="filtro ${!categoriaAtual ? "ativo" : ""}" href="${baseTodas}">
      Todas (${total})
    </a>
  `;

  categoriasOrdenadas.forEach(([categoria, totalCategoria]) => {
    let href = `/ideavault/ideias?categoria=${encodeURIComponent(categoria)}`;
    if (buscaAtual) {
      href += `&busca=${encodeURIComponent(buscaAtual)}`;
    }

    html += `
      <a class="filtro ${categoriaAtual === categoria ? "ativo" : ""}" href="${href}">
        ${escapeHtml(categoria)} (${totalCategoria})
      </a>
    `;
  });

  return html;
}

function gerarResumoCategoria(categoria) {
  const mapa = {
    Receita: "Ingredientes, pratos, sobremesas e ideias culinárias.",
    Construção: "Materiais, acabamentos, bancadas, pisos e execução.",
    Decoração: "Ambientes, referências visuais, estilo e composição.",
    Organização: "Soluções práticas para arrumação e otimização.",
    DIY: "Projetos manuais, passo a passo e faça você mesmo.",
    Outros: "Referências diversas salvas no seu cofre."
  };

  return mapa[categoria] || "Referências organizadas no Ideavault.";
}

function gerarHTMLIdeias(ideias, categoriaAtual = "", buscaAtual = "") {
  const contagem = contarPorCategoria(ideias);

  let ideiasFiltradas = categoriaAtual
    ? ideias.filter((i) => (i.categoria || "") === categoriaAtual)
    : [...ideias];

  if (buscaAtual) {
    const termo = buscaAtual.toLowerCase();
    ideiasFiltradas = ideiasFiltradas.filter((i) =>
      (i.conteudo || "").toLowerCase().includes(termo) ||
      (i.categoria || "").toLowerCase().includes(termo) ||
      (i.tipo || "").toLowerCase().includes(termo)
    );
  }

  const destaqueResumo = buscaAtual
    ? `Resultados relacionados a "${escapeHtml(buscaAtual)}".`
    : categoriaAtual
      ? gerarResumoCategoria(categoriaAtual)
      : "Explore suas ideias salvas em um mural visual organizado por categoria.";

  const cards = ideiasFiltradas
    .slice()
    .reverse()
    .map((i, index) => {
      const tamanhos = ["alto", "medio", "baixo"];
      const tamanho = tamanhos[index % 3];

      return `
        <article class="pin ${tamanho}">
          <div class="pin-topo">
            <span class="tag tipo">${escapeHtml(i.tipo || "sem tipo")}</span>
            <span class="tag categoria">${escapeHtml(i.categoria || "Sem categoria")}</span>
          </div>

          <div class="pin-conteudo">
            <h3>${escapeHtml(i.categoria || "Ideia")}</h3>
            <p>${escapeHtml(i.conteudo || "")}</p>
          </div>

          <div class="pin-rodape">
            <span>${i.data ? new Date(i.data).toLocaleString("pt-BR") : ""}</span>
          </div>
        </article>
      `;
    })
    .join("");

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ideavault</title>
    <link rel="icon" type="image/x-icon" href="${FAVICON_URL}" />
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #f7f7f7;
        color: #111827;
      }

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
        gap: 8px;
        text-decoration: none;
        flex-shrink: 0;
        min-width: 170px;
      }

      .logo {
        width: 34px;
        height: 34px;
        object-fit: contain;
        border-radius: 8px;
        display: block;
        background: transparent;
        padding: 0;
      }

      .brand-name {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.6px;
        color: #1d4ed8;
      }

      .search-wrap {
        flex: 1;
        min-width: 260px;
      }

      .search-form {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .search-form input {
        flex: 1;
        min-width: 180px;
        border: none;
        outline: none;
        background: #efefef;
        border-radius: 999px;
        padding: 12px 16px;
        font-size: 13px;
      }

      .search-form button,
      .clear-btn {
        border: none;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 12px;
        cursor: pointer;
        text-decoration: none;
        white-space: nowrap;
      }

      .search-form button {
        background: #111827;
        color: white;
      }

      .clear-btn {
        background: #e5e7eb;
        color: #111827;
      }

      .hero {
        max-width: 1400px;
        margin: 0 auto;
        padding: 28px 20px 8px;
      }

      .hero-box {
        background: white;
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.06);
      }

      .hero h1 {
        margin: 0 0 10px;
        font-size: 48px;
        line-height: 1.05;
      }

      .hero p {
        margin: 0;
        font-size: 18px;
        color: #4b5563;
        max-width: 820px;
      }

      .hero-meta {
        margin-top: 18px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .meta-pill {
        background: #f3f4f6;
        color: #111827;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 600;
      }

      .filtros-wrap {
        max-width: 1400px;
        margin: 0 auto;
        padding: 18px 20px 8px;
      }

      .filtros {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .filtro {
        text-decoration: none;
        background: #ffffff;
        color: #111827;
        border: 1px solid #e5e7eb;
        padding: 11px 16px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 600;
      }

      .filtro.ativo {
        background: #111827;
        color: white;
        border-color: #111827;
      }

      .galeria-wrap {
        max-width: 1400px;
        margin: 0 auto;
        padding: 16px 20px 40px;
      }

      .galeria {
        column-count: 5;
        column-gap: 18px;
      }

      .pin {
        display: inline-block;
        width: 100%;
        margin: 0 0 18px;
        background: white;
        border-radius: 22px;
        padding: 16px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.06);
        border: 1px solid #ececec;
        break-inside: avoid;
      }

      .pin.alto .pin-conteudo p {
        min-height: 140px;
      }

      .pin.medio .pin-conteudo p {
        min-height: 90px;
      }

      .pin.baixo .pin-conteudo p {
        min-height: 50px;
      }

      .pin-topo {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }

      .tag {
        font-size: 11px;
        font-weight: 700;
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

      .pin-conteudo h3 {
        margin: 0 0 10px;
        font-size: 20px;
        line-height: 1.2;
      }

      .pin-conteudo p {
        margin: 0;
        color: #374151;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      .pin-rodape {
        margin-top: 16px;
        font-size: 12px;
        color: #6b7280;
      }

      .vazio {
        background: white;
        border-radius: 22px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 6px 24px rgba(0,0,0,0.06);
      }

      @media (max-width: 1200px) {
        .galeria {
          column-count: 4;
        }
      }

      @media (max-width: 900px) {
        .hero h1 {
          font-size: 36px;
        }

        .galeria {
          column-count: 3;
        }
      }

      @media (max-width: 680px) {
        .hero h1 {
          font-size: 28px;
        }

        .hero p {
          font-size: 15px;
        }

        .galeria {
          column-count: 2;
        }
      }

      @media (max-width: 640px) {
        .topbar-inner {
          flex-wrap: wrap;
          padding: 12px 14px;
        }

        .brand {
          min-width: auto;
        }

        .search-wrap {
          width: 100%;
        }

        .search-form {
          flex-wrap: wrap;
        }
      }

      @media (max-width: 460px) {
        .galeria {
          column-count: 1;
        }

        .hero,
        .filtros-wrap,
        .galeria-wrap {
          padding-left: 14px;
          padding-right: 14px;
        }
      }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="/ideavault/ideias">
          <img class="logo" src="${LOGO_URL}" alt="Logo Ideavault" />
          <span class="brand-name">IDEAVAULT</span>
        </a>

        <div class="search-wrap">
          <form class="search-form" method="GET" action="/ideavault/ideias">
            ${categoriaAtual ? `<input type="hidden" name="categoria" value="${escapeHtml(categoriaAtual)}" />` : ""}
            <input
              type="text"
              name="busca"
              placeholder="Pesquise receitas, construção, decoração..."
              value="${escapeHtml(buscaAtual)}"
            />
            <button type="submit">Buscar</button>
            <a class="clear-btn" href="/ideavault/ideias">Limpar</a>
          </form>
        </div>
      </div>
    </div>

    <section class="hero">
      <div class="hero-box">
        <h1>Galeria de ideias.</h1>
        <p>${destaqueResumo}</p>

        <div class="hero-meta">
          <span class="meta-pill">${ideias.length} ideias salvas</span>
          <span class="meta-pill">${ideiasFiltradas.length} ideias exibidas</span>
          ${categoriaAtual ? `<span class="meta-pill">Categoria: ${escapeHtml(categoriaAtual)}</span>` : ""}
          ${buscaAtual ? `<span class="meta-pill">Busca: ${escapeHtml(buscaAtual)}</span>` : ""}
        </div>
      </div>
    </section>

    <section class="filtros-wrap">
      <div class="filtros">
        ${gerarLinksCategorias(contagem, categoriaAtual, buscaAtual)}
      </div>
    </section>

    <section class="galeria-wrap">
      ${
        ideiasFiltradas.length === 0
          ? `<div class="vazio">Nenhuma ideia encontrada com esse filtro.</div>`
          : `<div class="galeria">${cards}</div>`
      }
    </section>
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
  res.redirect("/ideavault/ideias");
});

app.get("/ideias", (req, res) => {
  const ideias = lerIdeias();
  const categoria = req.query.categoria || "";
  const busca = req.query.busca || "";
  res.send(gerarHTMLIdeias(ideias, categoria, busca));
});

app.get("/ideavault/ideias", (req, res) => {
  const ideias = lerIdeias();
  const categoria = req.query.categoria || "";
  const busca = req.query.busca || "";
  res.send(gerarHTMLIdeias(ideias, categoria, busca));
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
