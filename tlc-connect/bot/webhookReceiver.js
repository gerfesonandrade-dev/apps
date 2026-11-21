// Exemplo: receptor de eventos da extensão (configure a URL no popup). Responde a notas/etiquetas.
const express = require('../backend/node_modules/express');
const tlc = require('./tlcClient')({ baseUrl: process.env.TLC_URL || 'http://localhost:3000', apiKey: process.env.TLC_API_KEY });

const handlers = {
  'tag.changed': async ({ contact, tags }) => console.log('[bot_TLC] etiquetas de', contact, tags),
  'note.created': async ({ contact, note }) => console.log('[bot_TLC] nota de', contact, note),
  'reminder.due': async (p) => console.log('[bot_TLC] lembrete', p),
  // exemplo de resposta: await tlc.sendMessage('5511999999999', 'Olá!')
};

express().use(express.json()).post('/hook', async (req, res) => {
  const { event, payload } = req.body || {};
  try { await handlers[event]?.(payload); } catch (e) { console.error(e.message); }
  res.sendStatus(200);
}).listen(process.env.PORT || 4000, () => console.log('webhook bot_TLC em :4000/hook'));
