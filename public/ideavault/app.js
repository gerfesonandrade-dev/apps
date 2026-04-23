const API_URL = "/ideavault/api/ideias";

const gallery = document.getElementById("gallery");
const filters = document.getElementById("filters");
const emptyState = document.getElementById("emptyState");
const totalIdeias = document.getElementById("totalIdeias");
const totalExibidas = document.getElementById("totalExibidas");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

let ideias = [];
let categoriaAtual = "";
let buscaAtual = "";

function escapeHtml(texto = "") {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatarData(data) {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR");
}

function filtrarIdeias() {
  return ideias.filter((ideia) => {
    const categoriaOk = !categoriaAtual || ideia.categoria === categoriaAtual;

    const busca = buscaAtual.toLowerCase();
    const buscaOk =
      !busca ||
      (ideia.conteudo || "").toLowerCase().includes(busca) ||
      (ideia.categoria || "").toLowerCase().includes(busca) ||
      (ideia.tipo || "").toLowerCase().includes(busca);

    return categoriaOk && buscaOk;
  });
}

function renderFiltros() {
  const categorias = [...new Set(ideias.map((ideia) => ideia.categoria || "Outros"))];

  filters.innerHTML = "";

  const todas = document.createElement("button");
  todas.className = `filter-btn ${categoriaAtual === "" ? "active" : ""}`;
  todas.textContent = `Todas (${ideias.length})`;
  todas.dataset.category = "";
  filters.appendChild(todas);

  categorias.forEach((categoria) => {
    const total = ideias.filter((ideia) => ideia.categoria === categoria).length;

    const button = document.createElement("button");
    button.className = `filter-btn ${categoriaAtual === categoria ? "active" : ""}`;
    button.textContent = `${categoria} (${total})`;
    button.dataset.category = categoria;
    filters.appendChild(button);
  });
}

function renderGaleria() {
  const resultados = filtrarIdeias();

  totalIdeias.textContent = `${ideias.length} ideias salvas`;
  totalExibidas.textContent = `${resultados.length} ideias exibidas`;

  emptyState.hidden = resultados.length !== 0;
  gallery.innerHTML = "";

  resultados
    .slice()
    .reverse()
    .forEach((ideia) => {
      const categoria = ideia.categoria || "Outros";

      const card = document.createElement("article");
      card.className = "pin";
      card.dataset.category = categoria;

      card.innerHTML = `
        <div class="pin-top">
          <span class="tag">${escapeHtml(categoria)}</span>
        </div>

        <div class="pin-body">
          <h3>${escapeHtml(categoria)}</h3>
          <p>${escapeHtml(ideia.conteudo || "")}</p>
        </div>

        <div class="pin-footer">
          ${formatarData(ideia.data)}
        </div>
      `;

      gallery.appendChild(card);
    });
}

function render() {
  renderFiltros();
  renderGaleria();
}

async function carregarIdeias() {
  try {
    const resposta = await fetch(API_URL);
    const dados = await resposta.json();

    ideias = dados.ideias || [];
    render();
  } catch (error) {
    console.error("Erro ao carregar ideias:", error);
    emptyState.hidden = false;
    emptyState.textContent = "Erro ao carregar ideias.";
  }
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-btn");
  if (!button) return;

  categoriaAtual = button.dataset.category || "";
  render();
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  buscaAtual = searchInput.value.trim();
  render();
});

clearSearch.addEventListener("click", () => {
  buscaAtual = "";
  categoriaAtual = "";
  searchInput.value = "";
  render();
});

carregarIdeias();
