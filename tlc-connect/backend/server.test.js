const test = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path');
const { createApp } = require('./server');

test('fluxo completo: registro, evento, outbox, ack', async () => {
  const srv = createApp(path.join(os.tmpdir(), 'tlc-test-' + Date.now() + '.json')).listen(0);
  const base = 'http://localhost:' + srv.address().port;
  const j = (p, o = {}, t) => fetch(base + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: o.body && JSON.stringify(o.body) }).then(async (r) => ({ s: r.status, b: await r.json() }));
  try {
    assert.equal((await j('/api/auth/register', { method: 'POST', body: { email: 'a@a.com', password: '123' } })).s, 400);
    const reg = await j('/api/auth/register', { method: 'POST', body: { email: 'a@a.com', password: '12345678' } });
    assert.equal(reg.s, 201);
    assert.equal((await j('/api/auth/register', { method: 'POST', body: { email: 'a@a.com', password: '12345678' } })).s, 409);
    assert.equal((await j('/api/auth/login', { method: 'POST', body: { email: 'a@a.com', password: 'errada123' } })).s, 401);
    assert.equal((await j('/api/events')).s, 401);
    assert.equal((await j('/api/events', { method: 'POST', body: { event: 'note.created', payload: {} } }, reg.b.token)).s, 201);
    const ob = await j('/api/outbox', { method: 'POST', body: { phone: '+55 11 99999-0000', text: 'oi' } }, reg.b.apiKey); // bot usa apiKey
    assert.equal(ob.s, 201); assert.equal(ob.b.phone, '5511999990000');
    assert.equal((await j('/api/outbox?status=pending', {}, reg.b.token)).b.items.length, 1);
    await j(`/api/outbox/${ob.b.id}/ack`, { method: 'POST' }, reg.b.token);
    assert.equal((await j('/api/outbox?status=pending', {}, reg.b.token)).b.items.length, 0);
  } finally { srv.close(); }
});

test('receptor /hook/:key guarda payload do bot', async () => {
  const srv = createApp(path.join(os.tmpdir(), 'tlc-hook-' + Date.now() + '.json')).listen(0);
  const base = 'http://localhost:' + srv.address().port;
  try {
    const reg = await (await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'h@h.com', password: '12345678' }) })).json();
    assert.equal((await fetch(base + '/hook/errada', { method: 'POST', body: '{}' })).status, 401);
    const r = await fetch(base + '/hook/' + reg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: 'x', n: 1 }) });
    assert.equal(r.status, 200);
    const list = await (await fetch(base + '/api/hooks', { headers: { Authorization: 'Bearer ' + reg.token } })).json();
    assert.equal(list.items.length, 1); assert.equal(list.items[0].body.n, 1);
  } finally { srv.close(); }
});
