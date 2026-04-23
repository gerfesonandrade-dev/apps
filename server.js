 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server.js b/server.js
index e5387c5478dd54fbd395874b74c97f542bb34a43..858b8518d4fb87fe26e464ae96141427832ff40f 100644
--- a/server.js
+++ b/server.js
@@ -306,72 +306,66 @@ function gerarHTMLIdeias(ideias, categoriaAtual = "", buscaAtual = "") {
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
-        gap: 8px;
+        gap: 0;
         text-decoration: none;
         flex-shrink: 0;
-        min-width: 170px;
+        min-width: auto;
       }
 
       .logo {
-        width: 34px;
-        height: 34px;
+        width: 64px;
+        height: 64px;
         object-fit: contain;
         border-radius: 8px;
         display: block;
         background: transparent;
         padding: 0;
       }
 
-      .brand-name {
-        font-size: 14px;
-        font-weight: 800;
-        letter-spacing: 0.6px;
-        color: #1d4ed8;
-      }
 
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
@@ -599,51 +593,50 @@ function gerarHTMLIdeias(ideias, categoriaAtual = "", buscaAtual = "") {
 
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
-          <span class="brand-name"></span>
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
 
EOF
)
