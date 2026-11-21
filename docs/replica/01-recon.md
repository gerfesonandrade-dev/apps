# 01 — Recon: WAPlus (waplus.io/pt)

Fonte: HTML público de `https://waplus.io/pt` e `/pt/pricing` (leitura em 2026-11-21).

## Produto
**WAPlus** é uma extensão de navegador (Chrome) que transforma o WhatsApp Web em um CRM:
caixa de entrada com abas personalizadas, notas, lembretes, respostas rápidas/automáticas,
mensagens agendadas, broadcast, tradução em tempo real (150+ idiomas), chatbot de IA treinado
com documentos da empresa, workspace colaborativo de equipe e integrações (HubSpot,
Salesforce, Zoho, Webhook, Google Calendar, Google Contatos).
Prova social: "25.000+ empresas", notas 4.7–5.0.

## Arquitetura do site (SSR, não é Next.js; assets em `/static/css`)
- Landing `/pt` — seções: banner (promo Black Friday) → hero ("WhatsApp CRM com IA: extensão
  gratuita", CTA "Instalar grátis") → prova social → abas de recursos (Extensão, Integração CRM,
  Produtividade, Tradutor IA, ChatBot IA, Gestão de Contatos, Espaço de Trabalho) → casos de uso
  → depoimentos → artigos → footer.
- Páginas de recurso: schedule-messages, auto-reply, quick-reply, broadcast-message,
  whatsapp-ai, whatsapp-integration, whatsapp-privacy, whatsapp-without-saving-contact,
  google-calendar, hubspot/salesforce/zoho-integration.
- Ferramentas grátis (aquisição/SEO): link-generator, qr-code-generator, chat-button-generator,
  wa-web-sender, gerador de conversa falsa.
- Soluções: SaaS, PME/comércio exterior, empresas de IA.
- Institucional: pricing, blog, help-center, contact-us, brand-ambassadors, afiliados,
  release-note, security, about-us.
- App web `/crm/` (home, conversation, pipeline, analysis, settings/workspace-members);
  auth em `/user/login` e `/user/register`.
- i18n: pt, en, es, de, fr, ar, zh.

## Preços (por usuário/mês)
| Plano | Preço | Destaques |
|---|---|---|
| Free | $0 (até 3 usuários) | 2 grupos, tradução 3.000 caract./mês, 3 agendamentos, 1 resposta rápida, 3 lembretes |
| Starter | $12.99 (de $18.99) | ilimitado em grupos/agendamento/respostas/lembretes, tradução 10.000 caract. |
| Pro | maior | + integrações CRM, chatbot, broadcast, sincronização |
Cobrança mensal ou anual (pagamento único 12 meses), promo Black Friday via Stripe.

## Identidade visual
- Fonte: **Poppins**. Verde primário `#2cae67` / `#1e803f` / `#42b55b`; azul-marinho `#1b224e`,
  `#242c56`; fundos `#ffffff`, `#f5f7fc`, `#f2f2f2`; texto `#101010`/`#1a1a1a`.
- Estilo SaaS limpo, cards, abas, swiper (carrossel).

## Observações para o projeto
- O núcleo do produto é uma **extensão de navegador** + painel web + backend; a landing é só
  a vitrine.
- Não replicar marca, textos literais, logos ou depoimentos do WAPlus: usar a análise como
  referência funcional e criar identidade própria (etapa `brand`).
- Integração com bot_TLC (futura): ponto natural é o **Webhook** + API de mensagens/contatos.
