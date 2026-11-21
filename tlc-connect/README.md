# TLC Connect

CRM dentro do WhatsApp Web (extensão Chrome MV3) + backend + painel web, com integração ao bot_TLC.
Arquitetura: `../docs/replica/02-architecture.md`.

## Rodar
```bash
cd backend && npm install && npm start      # http://localhost:3000 (landing + painel)
```
Extensão: `chrome://extensions` → Modo desenvolvedor → Carregar sem compactação → pasta `extension/`.
No popup, informe URL do backend, token (do painel) e webhook do bot_TLC.

## Integração bot_TLC
- Enviar mensagem: `POST /api/outbox` com `Authorization: Bearer <apiKey>` e `{phone, text}`.
- Receber eventos: configure o webhook no popup (`note.created`, `tag.changed`, `message.sent`, `reminder.due`...).

## Deploy
```bash
docker build -t tlc-connect -f Dockerfile .
docker run -p 3000:3000 -v tlc-data:/data tlc-connect
```
Qualquer host com Docker serve (Fly, Render, Railway, VPS). Use HTTPS e atualize a URL do backend no popup.
CI: `.github/workflows/tlc-connect-ci.yml` roda os testes a cada push.

## bot/
`bot/tlcClient.js` (SDK) e `bot/webhookReceiver.js` (exemplo) — copie para o bot_TLC.
