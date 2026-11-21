// API do TLC Connect: auth, eventos da extensão e outbox para o bot_TLC.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data.json');

function createApp(dbFile = DB_FILE) {
  const load = () => { try { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch { return { users: [], events: [], outbox: [] }; } };
  const save = (db) => fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
  const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
  const id = () => crypto.randomBytes(8).toString('hex');

  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => { // CORS para a extensão
    res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS' });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  function auth(req, res, next) {
    const token = (req.get('Authorization') || '').replace(/^Bearer /, '');
    const db = load();
    const user = db.users.find((u) => u.token === token || u.apiKey === token);
    if (!token || !user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user; req.db = db; next();
  }

  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password || password.length < 8) return res.status(400).json({ error: 'email e senha (8+) obrigatórios' });
    const db = load();
    if (db.users.some((u) => u.email === email.toLowerCase())) return res.status(409).json({ error: 'email já cadastrado' });
    const salt = id();
    const user = { id: id(), email: email.toLowerCase(), salt, hash: hash(password, salt), token: crypto.randomBytes(24).toString('hex'), apiKey: 'tlc_' + crypto.randomBytes(20).toString('hex') };
    db.users.push(user); save(db);
    res.status(201).json({ token: user.token, apiKey: user.apiKey });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = load().users.find((u) => u.email === String(email).toLowerCase());
    if (!user || hash(String(password), user.salt) !== user.hash) return res.status(401).json({ error: 'credenciais inválidas' });
    res.json({ token: user.token, apiKey: user.apiKey });
  });

  // eventos vindos da extensão
  app.post('/api/events', auth, (req, res) => {
    const { event, payload, ts } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event obrigatório' });
    req.db.events.push({ id: id(), userId: req.user.id, event, payload, ts: ts || Date.now() });
    req.db.events = req.db.events.slice(-5000);
    save(req.db); res.status(201).json({ ok: true });
  });
  app.get('/api/events', auth, (req, res) => {
    res.json({ items: req.db.events.filter((e) => e.userId === req.user.id).slice(-100).reverse() });
  });

  // outbox: o bot_TLC enfileira; a extensão consome
  app.post('/api/outbox', auth, (req, res) => {
    const phone = String((req.body || {}).phone || '').replace(/\D/g, '');
    const text = String((req.body || {}).text || '').trim();
    if (phone.length < 8 || !text || text.length > 4000) return res.status(400).json({ error: 'phone e text válidos obrigatórios' });
    const item = { id: id(), userId: req.user.id, phone, text, status: 'pending', createdAt: Date.now() };
    req.db.outbox.push(item); save(req.db); res.status(201).json(item);
  });
  app.get('/api/outbox', auth, (req, res) => {
    const { status } = req.query;
    res.json({ items: req.db.outbox.filter((o) => o.userId === req.user.id && (!status || o.status === status)) });
  });
  app.post('/api/outbox/:id/ack', auth, (req, res) => {
    const item = req.db.outbox.find((o) => o.id === req.params.id && o.userId === req.user.id);
    if (!item) return res.status(404).json({ error: 'não encontrado' });
    item.status = 'sent'; item.sentAt = Date.now(); save(req.db); res.json(item);
  });

  app.get('/api/health', (_, res) => res.json({ ok: true }));
  app.use(express.static(path.join(__dirname, '..', 'web')));
  return app;
}

module.exports = { createApp };
if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log('TLC Connect backend em :' + port));
}
