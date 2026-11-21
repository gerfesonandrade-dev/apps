// Service worker: alarmes (agendamento/lembretes), webhook, sync e outbox do bot_TLC.
const DEFAULTS = { backendUrl: 'http://localhost:3000', token: '', webhookUrl: '' };

const get = (k) => chrome.storage.local.get(k);
async function settings() {
  const { settings } = await get('settings');
  return { ...DEFAULTS, ...(settings || {}) };
}

async function emit(event, payload) {
  const s = await settings();
  const body = JSON.stringify({ event, payload, ts: Date.now() });
  const headers = { 'Content-Type': 'application/json' };
  if (s.webhookUrl) fetch(s.webhookUrl, { method: 'POST', headers, body }).catch(() => {});
  if (s.token) {
    fetch(s.backendUrl + '/api/events', {
      method: 'POST',
      headers: { ...headers, Authorization: 'Bearer ' + s.token },
      body,
    }).catch(() => {});
  }
}

function sendUrl(phone, text) {
  const p = String(phone).replace(/\D/g, '');
  return `https://web.whatsapp.com/send?phone=${p}&text=${encodeURIComponent(text)}&tlc_auto=1`;
}

async function openAndSend(phone, text) {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  const url = sendUrl(phone, text);
  if (tabs[0]) await chrome.tabs.update(tabs[0].id, { url, active: true });
  else await chrome.tabs.create({ url });
}

async function runDueSchedules() {
  const { scheduled = [] } = await get('scheduled');
  const now = Date.now();
  const due = scheduled.filter((m) => !m.sent && m.at <= now);
  if (!due.length) return;
  for (const m of due) {
    m.sent = true;
    await openAndSend(m.phone, m.text);
    emit('message.sent', { phone: m.phone, text: m.text, scheduled: true });
    await new Promise((r) => setTimeout(r, 8000)); // um por vez, dá tempo de enviar
  }
  await chrome.storage.local.set({ scheduled });
}

async function checkReminders() {
  const { contacts = {} } = await get('contacts');
  const now = Date.now();
  let changed = false;
  for (const c of Object.values(contacts)) {
    for (const r of c.reminders || []) {
      if (!r.done && r.at <= now) {
        r.done = true;
        changed = true;
        chrome.notifications?.create?.({ type: 'basic', iconUrl: 'icons/icon.png', title: 'Lembrete', message: `${c.name}: ${r.text}` });
        emit('reminder.due', { contact: c.name, text: r.text });
      }
    }
  }
  if (changed) await chrome.storage.local.set({ contacts });
}

// bot_TLC enfileira mensagens no backend; a extensão busca e envia.
async function pollOutbox() {
  const s = await settings();
  if (!s.token) return;
  try {
    const res = await fetch(s.backendUrl + '/api/outbox?status=pending', { headers: { Authorization: 'Bearer ' + s.token } });
    if (!res.ok) return;
    const { items } = await res.json();
    for (const it of items.slice(0, 1)) { // um por ciclo, evita rajadas
      await openAndSend(it.phone, it.text);
      await fetch(`${s.backendUrl}/api/outbox/${it.id}/ack`, { method: 'POST', headers: { Authorization: 'Bearer ' + s.token } });
      emit('message.sent', { phone: it.phone, text: it.text, source: 'outbox' });
    }
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create('tick', { periodInMinutes: 1 }));
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== 'tick') return;
  runDueSchedules();
  checkReminders();
  pollOutbox();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'emit') emit(msg.event, msg.payload);
});
