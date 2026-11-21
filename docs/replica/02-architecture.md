# 02 — Arquitetura: TLC Connect (nome de trabalho)

Monorepo em `tlc-connect/`:

| Parte | Tecnologia | Papel |
|---|---|---|
| `extension/` | Chrome MV3, JS puro | **Núcleo.** Painel lateral injetado no WhatsApp Web: contatos, abas/etiquetas, notas, lembretes, respostas rápidas, agendamento, eventos para webhook |
| `backend/` | Node + Express, JSON em disco | Auth, sincronização, recebimento de eventos, **outbox** para o bot_TLC enfileirar mensagens |
| `web/` | HTML/CSS/JS estático | Landing + login/painel simples, servido pelo backend |

## Fluxo
1. Content script detecta o chat aberto (`#main header span[title]`) e mostra o painel.
2. Dados locais em `chrome.storage.local` (funciona offline); eventos (`note.created`, `tag.changed`, `message.scheduled`...) vão ao background.
3. Background envia eventos ao **webhook configurado** e ao backend (`POST /api/events`).
4. Agendamentos: `chrome.alarms` → abre `web.whatsapp.com/send?phone=..&text=..&tlc_auto=1`; o content script clica em enviar.
5. **Integração bot_TLC**: o bot faz `POST /api/outbox` (Bearer API key); a extensão consulta `GET /api/outbox` a cada minuto e dispara os envios. Eventos fazem o caminho inverso via webhook.

## Riscos
- O DOM do WhatsApp Web muda; seletores ficam isolados em `extension/selectors.js`.
- Automação de envio pode violar os termos do WhatsApp: manter envio com ação visível do usuário, limites e opt-in.
