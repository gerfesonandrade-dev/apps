// Cliente para o bot_TLC falar com o TLC Connect. Sem dependências (Node 18+).
// Uso: const tlc = require('./tlcClient')({ baseUrl, apiKey });
module.exports = function tlcClient({ baseUrl, apiKey }) {
  const call = async (path, opts = {}) => {
    const res = await fetch(baseUrl + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: opts.body && JSON.stringify(opts.body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`TLC ${res.status}: ${data.error || 'erro'}`);
    return data;
  };
  return {
    sendMessage: (phone, text) => call('/api/outbox', { method: 'POST', body: { phone, text } }),
    pending: () => call('/api/outbox?status=pending'),
    events: () => call('/api/events'),
  };
};
