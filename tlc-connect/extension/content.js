// Painel CRM injetado no WhatsApp Web (Shadow DOM para não colidir com o CSS da página).
(() => {
  const SEL = window.TLC_SEL;
  const store = {
    async get(k, d) { const o = await chrome.storage.local.get(k); return o[k] ?? d; },
    set(k, v) { return chrome.storage.local.set({ [k]: v }); },
  };
  const emit = (event, payload) => chrome.runtime.sendMessage({ type: 'emit', event, payload });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- ações no WhatsApp ----------
  function insertText(text) {
    const box = document.querySelector(SEL.composer);
    if (!box) return false;
    box.focus();
    document.execCommand('insertText', false, text);
    return true;
  }
  function clickSend() {
    const el = document.querySelector(SEL.sendButton);
    (el?.closest('button') || el)?.click();
  }
  // Envio automático quando aberto via agendamento/outbox (?tlc_auto=1)
  if (new URLSearchParams(location.search).get('tlc_auto') === '1') {
    let tries = 0;
    const t = setInterval(() => {
      if (document.querySelector(SEL.sendButton)) { clearInterval(t); setTimeout(clickSend, 1200); }
      else if (++tries > 60) clearInterval(t);
    }, 1000);
  }

  // ---------- UI ----------
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;top:0;right:0;height:100vh;z-index:99999;';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
  <style>
    *{box-sizing:border-box;font-family:Poppins,system-ui,sans-serif}
    .tab{position:absolute;right:0;top:40%;background:#2cae67;color:#fff;border:0;padding:10px 6px;border-radius:8px 0 0 8px;cursor:pointer;writing-mode:vertical-rl}
    .panel{width:320px;height:100vh;background:#fff;border-left:1px solid #e5e7eb;display:none;flex-direction:column;color:#101010;font-size:13px}
    .open .panel{display:flex}.open .tab{display:none}
    header{background:#1b224e;color:#fff;padding:12px;display:flex;justify-content:space-between;align-items:center}
    nav{display:flex;border-bottom:1px solid #e5e7eb}
    nav button{flex:1;padding:9px 2px;border:0;background:none;cursor:pointer;font-size:12px}
    nav button.on{border-bottom:2px solid #2cae67;color:#1e803f;font-weight:600}
    .body{padding:12px;overflow:auto;flex:1}
    input,textarea,select{width:100%;padding:7px;border:1px solid #d1d5db;border-radius:6px;margin:4px 0}
    button.p{background:#2cae67;color:#fff;border:0;padding:7px 10px;border-radius:6px;cursor:pointer}
    .item{background:#f5f7fc;border-radius:6px;padding:8px;margin:6px 0;display:flex;justify-content:space-between;gap:6px}
    .x{background:none;border:0;cursor:pointer;color:#b91c1c}
    .tag{display:inline-block;background:#e6f6ed;color:#1e803f;border-radius:10px;padding:2px 8px;margin:2px;font-size:11px}
    h4{margin:10px 0 4px}.muted{color:#6b7280}
  </style>
  <div id="app"><button class="tab" id="open">TLC CRM</button>
    <div class="panel"><header><b id="title">TLC Connect</b><button class="x" id="close" style="color:#fff">✕</button></header>
    <nav id="nav"><button data-t="contact" class="on">Contato</button><button data-t="replies">Respostas</button><button data-t="schedule">Agendar</button></nav>
    <div class="body" id="body"></div></div></div>`;
  const $ = (s) => root.querySelector(s);
  let tab = 'contact';
  const chatName = () => document.querySelector(SEL.chatTitle)?.getAttribute('title') || '';

  async function render() {
    const name = chatName();
    $('#title').textContent = name || 'TLC Connect';
    const body = $('#body');
    if (tab === 'contact') {
      if (!name) { body.innerHTML = '<p class="muted">Abra uma conversa para ver o contato.</p>'; return; }
      const contacts = await store.get('contacts', {});
      const c = (contacts[name] ||= { name, tags: [], notes: [], reminders: [] });
      body.innerHTML = `
        <h4>Etiquetas</h4><div>${c.tags.map((t, i) => `<span class="tag">${esc(t)} <a data-dt="${i}" style="cursor:pointer">×</a></span>`).join('')}</div>
        <input id="tag" placeholder="Nova etiqueta + Enter">
        <h4>Notas</h4>${c.notes.map((n, i) => `<div class="item"><span>${esc(n)}</span><button class="x" data-dn="${i}">✕</button></div>`).join('')}
        <textarea id="note" rows="2" placeholder="Nova nota"></textarea><button class="p" id="addNote">Salvar nota</button>
        <h4>Lembretes</h4>${c.reminders.map((r, i) => `<div class="item"><span>${r.done ? '✔ ' : ''}${esc(r.text)}<br><small class="muted">${new Date(r.at).toLocaleString()}</small></span><button class="x" data-dr="${i}">✕</button></div>`).join('')}
        <input id="rtext" placeholder="Lembrete"><input id="rat" type="datetime-local"><button class="p" id="addRem">Adicionar</button>`;
      const save = () => store.set('contacts', contacts).then(render);
      body.querySelector('#tag').onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { c.tags.push(e.target.value.trim()); emit('tag.changed', { contact: name, tags: c.tags }); save(); } };
      body.querySelectorAll('[data-dt]').forEach((a) => (a.onclick = () => { c.tags.splice(+a.dataset.dt, 1); emit('tag.changed', { contact: name, tags: c.tags }); save(); }));
      body.querySelector('#addNote').onclick = () => { const v = body.querySelector('#note').value.trim(); if (v) { c.notes.push(v); emit('note.created', { contact: name, note: v }); save(); } };
      body.querySelectorAll('[data-dn]').forEach((b) => (b.onclick = () => { c.notes.splice(+b.dataset.dn, 1); save(); }));
      body.querySelector('#addRem').onclick = () => { const t = body.querySelector('#rtext').value.trim(); const at = new Date(body.querySelector('#rat').value).getTime(); if (t && at) { c.reminders.push({ text: t, at, done: false }); save(); } };
      body.querySelectorAll('[data-dr]').forEach((b) => (b.onclick = () => { c.reminders.splice(+b.dataset.dr, 1); save(); }));
    } else if (tab === 'replies') {
      const replies = await store.get('replies', []);
      body.innerHTML = `${replies.map((r, i) => `<div class="item"><span><b>${esc(r.key)}</b><br>${esc(r.text)}</span><span><button class="p" data-u="${i}">Usar</button> <button class="x" data-d="${i}">✕</button></span></div>`).join('') || '<p class="muted">Nenhuma resposta rápida.</p>'}
        <h4>Nova resposta</h4><input id="rk" placeholder="Atalho (ex.: preço)"><textarea id="rt" rows="3" placeholder="Texto"></textarea><button class="p" id="addR">Salvar</button>`;
      body.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => insertText(replies[+b.dataset.u].text)));
      body.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { replies.splice(+b.dataset.d, 1); await store.set('replies', replies); render(); }));
      body.querySelector('#addR').onclick = async () => { const key = body.querySelector('#rk').value.trim(), text = body.querySelector('#rt').value.trim(); if (key && text) { replies.push({ key, text }); await store.set('replies', replies); render(); } };
    } else {
      const list = await store.get('scheduled', []);
      body.innerHTML = `<p class="muted">O WhatsApp Web precisa estar aberto no horário.</p>
        <input id="sp" placeholder="Telefone com DDI (5511999999999)"><textarea id="st" rows="3" placeholder="Mensagem"></textarea><input id="sa" type="datetime-local"><button class="p" id="addS">Agendar</button>
        <h4>Agendadas</h4>${list.map((m, i) => `<div class="item"><span>${m.sent ? '✔ ' : ''}${esc(m.phone)}<br>${esc(m.text)}<br><small class="muted">${new Date(m.at).toLocaleString()}</small></span><button class="x" data-ds="${i}">✕</button></div>`).join('')}`;
      body.querySelector('#addS').onclick = async () => { const phone = body.querySelector('#sp').value.replace(/\D/g, ''), text = body.querySelector('#st').value.trim(), at = new Date(body.querySelector('#sa').value).getTime(); if (phone && text && at) { list.push({ phone, text, at, sent: false }); await store.set('scheduled', list); emit('message.scheduled', { phone, text, at }); render(); } };
      body.querySelectorAll('[data-ds]').forEach((b) => (b.onclick = async () => { list.splice(+b.dataset.ds, 1); await store.set('scheduled', list); render(); }));
    }
  }

  $('#open').onclick = () => { $('#app').classList.add('open'); render(); };
  $('#close').onclick = () => $('#app').classList.remove('open');
  $('#nav').onclick = (e) => { const t = e.target.dataset?.t; if (!t) return; tab = t; root.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); render(); };
  // atualiza ao trocar de conversa
  let last = '';
  setInterval(() => { const n = chatName(); if (n !== last && $('#app').classList.contains('open') && tab === 'contact') { last = n; render(); } else last = n; }, 1500);
})();
