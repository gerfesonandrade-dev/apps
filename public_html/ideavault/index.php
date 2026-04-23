<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Ideavault</title>

  <link rel="icon" href="https://linhacriativa.com/img/icone.ico" />
  <link rel="stylesheet" href="/ideavault/style.css" />
</head>

<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/ideavault/">
        <img
          src="https://linhacriativa.com/img/logo_br.png"
          alt="Ideavault"
          class="logo"
        />
      </a>

      <form class="search-form" id="searchForm">
        <input
          type="text"
          id="searchInput"
          placeholder="Pesquise receitas, construção, decoração..."
          autocomplete="off"
        />

        <button type="submit">Buscar</button>
        <button type="button" id="clearSearch" class="clear-btn">Limpar</button>
      </form>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-content">
        <h1>Galeria de ideias.</h1>
        <p>Explore suas ideias salvas em um mural visual organizado por categoria.</p>

        <div class="hero-stats">
          <span id="totalIdeias">0 ideias salvas</span>
          <span id="totalExibidas">0 ideias exibidas</span>
        </div>
      </div>
    </section>

    <section class="filters-section">
      <div class="filters" id="filters">
        <button class="filter-btn active" data-category="">Todas</button>
      </div>
    </section>

    <section class="gallery-section">
      <div class="gallery" id="gallery"></div>

      <div class="empty-state" id="emptyState" hidden>
        Nenhuma ideia encontrada com esse filtro.
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>Ideavault</span>
    <span>Seu cofre inteligente de ideias</span>
  </footer>

  <script src="/ideavault/app.js"></script>
</body>
</html>
