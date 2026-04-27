# Atendente WhatsApp

Aplicação web (PT-BR) que atende o WhatsApp do dono 24/7 com um "atendente" gentil
e brincalhão. O dono escaneia um QR code no celular para conectar a conta. Quando
a chave estiver em modo "Atendente cuida", o assistente responde automaticamente
mensagens de texto e áudio. Em modo "Eu respondo", a IA fica em silêncio e o dono
pode responder direto pelo dashboard.

## Arquitetura

Monorepo pnpm com três artefatos:

- `artifacts/api-server` (Express 5) — API REST sob `/api`. Conecta-se ao WhatsApp
  via `@whiskeysockets/baileys`, gera QR code, recebe e envia mensagens, transcreve
  áudios (Whisper) e gera respostas em texto/áudio (gpt-5 + gpt-audio TTS).
  Estado de autenticação do Baileys persiste em Postgres (`whatsapp_auth`).
- `artifacts/atendente` (React + Vite) — Dashboard. Conecta WhatsApp, mostra
  estatísticas, lista contatos, exibe conversa, permite o dono assumir e enviar
  mensagens manualmente, e personalizar voz/persona/nome do atendente.
- `artifacts/mockup-sandbox` — sandbox para previews da Canvas (não usado pelo app
  em produção).

## Pacotes compartilhados

- `lib/api-spec` — fonte única da verdade da API (OpenAPI). `pnpm --filter @workspace/api-spec run codegen`.
- `lib/api-zod` — Zod schemas gerados (entry: `src/main.ts`).
- `lib/api-client-react` — hooks React Query gerados.
- `lib/db` — schema Drizzle (`settings`, `contacts`, `whatsapp_messages`,
  `whatsapp_auth`).
- `lib/integrations-openai-ai-server` — cliente OpenAI via integração Replit
  (chat + áudio TTS/STT). Variáveis `AI_INTEGRATIONS_OPENAI_*` configuradas
  automaticamente.

## Como o áudio funciona

- **Recebido:** Baileys baixa o áudio (opus/ogg). Convertemos com ffmpeg para WAV
  16kHz e mandamos para `gpt-4o-mini-transcribe`.
- **Enviado:** Geramos texto com `gpt-5`, mandamos para `gpt-audio` em MP3 e
  convertemos com ffmpeg para `libopus` em container OGG (formato exigido pelo
  WhatsApp para mensagens PTT). Enviamos com `ptt: true`.

## Persona

A persona padrão (em `lib/db/src/schema/settings.ts`) instrui o modelo a:
- Ser uma pessoa real, nunca admitir ser IA/bot/robô (regra absoluta).
- Falar PT-BR, frases curtas, gentil e brincalhão.
- Encaminhar para o dono assuntos que só ele pode resolver.

## Endpoints principais (sob `/api`)

- `GET /healthz`
- `GET /whatsapp/state`, `POST /whatsapp/connect`, `POST /whatsapp/disconnect`
- `GET /settings`, `PATCH /settings`
- `GET /contacts`
- `GET /contacts/{jid}/messages`, `POST /contacts/{jid}/messages`
- `GET /stats`

## Comandos úteis

- `pnpm --filter @workspace/api-spec run codegen` — regenera Zod e hooks
- `pnpm --filter @workspace/db run push` — aplica schema no Postgres
- Workflows iniciam automaticamente com o ambiente

## Observações de produção

- A sessão do WhatsApp é persistida no banco. Se o WhatsApp Web encerrar a
  sessão, o app limpa o estado e pede um novo QR.
- O app só responde em conversas privadas (ignora grupos e status).
