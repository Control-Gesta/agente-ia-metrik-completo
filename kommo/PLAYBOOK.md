# PLAYBOOK KOMMO — do zero ao agente em produção

> Execute na ordem. Cada etapa tem o **porquê** (pra você ensinar, não só clicar).
> Tempo real com diagnóstico pronto: **~meio dia** (7 passos). O agente Kommo reusa **~80% da arquitetura do GHL** — o que muda está inteiro aqui.
> **Validado em produção:** dogfood Metrik desde **2026-07-11** (Desenho A/Salesbot), Desenho B (uazapi + voz) E2E em **2026-07-12**, playground do cérebro no ar em **19/07/2026**.

## Pré-requisito

`comum/DIAGNOSTICO.md` respondido. Sem ele, pare — você vai construir um agente genérico.

**No Kommo só o Bloco 3 (CANAL) muda de peso:** a pergunta *"o WhatsApp é OFICIAL (dentro do Kommo) ou é uazapi?"* **decide o Desenho A ou o Desenho B** — e portanto decide se tem voz, se tem multi-mensagem e se a janela de 24h da Meta vai te morder no followup. Pergunta irmã: *"tem uazapi/instância própria?"* → **ter uazapi própria é exatamente o que libera o Desenho B no Kommo**. Todo o resto do roteiro socrático vale igual.

---

## §0 · O QUE ESTE AGENTE ENTREGA (capacidades declaradas)

Atende WhatsApp via **webhook nativo `add_message`** · entende **ÁUDIO** (Groq Whisper) · **qualifica gravando campos do LEAD por `enum_id`** · **move o funil** (com alçada e guard anti-retrocesso) · **marca reunião** (task + campo de data) · faz **followup com cadências geradas por IA** · rastreia **origem/UTM** do lead · **escala pra humano** e se cala. Envio **indireto**: Salesbot (Desenho A) ou uazapi com voz ElevenLabs (Desenho B).

---

## §1 · AS 3 DIFERENÇAS ESTRUTURAIS (elas definem TUDO aqui)

Se você entender só isto, já constrói. O resto é consequência.

| # | Diferença | Consequência prática |
|---|---|---|
| **1** | **O Kommo NÃO devolve transcript de chat.** Não existe API pra reler a conversa. | O **histórico é NOSSO**, mora no Redis (`ak:conv:{leadId}`). **Redis é OBRIGATÓRIO** nesta variante (no GHL era auxiliar/opcional). Perdeu o Redis, perdeu a memória da conversa. |
| **2** | **A API v4 NÃO envia mensagem.** | Envio **indireto**: **Salesbot** (Desenho A) ou **uazapi** (Desenho B). O agente **deposita** a resposta e um terceiro entrega. |
| **3** | **Kommo é lead-cêntrico.** Não existe contact+opportunity como no GHL. | **Todas as tools operam no LEAD.** Campos de qualificação, tags, etapa, tarefa — tudo no lead. |

**Doutrina de arquitetura que isso quebra:** no GHL a lei é *"CRM é a fonte da verdade, agente 100% stateless"*. **No Kommo essa lei não se aplica ao histórico** — o CRM continua sendo a verdade do NEGÓCIO (etapa, campos, tarefas), mas a verdade da CONVERSA é nossa. É a única exceção do produto inteiro.

### Tabela comparativa completa (GHL × Kommo)

| Peça | GHL | Kommo (esta variante) |
|---|---|---|
| Histórico da conversa | API do CRM (fonte de verdade) | **Redis** `ak:conv:{leadId}` |
| Envio de mensagem | `POST /conversations/messages` | **indireto**: Salesbot ou uazapi |
| Entrada | Workflow "Customer Replied" → webhook | **webhook nativo `add_message`** (ou webhook da uazapi) |
| Voz (voice note) | upload + attachment → uazapi ptt | **só no Desenho B** (uazapi `ptt`) |
| Agendamento | Calendars API (slots reais) | **task (meeting) + campo "Data da reunião"** — não existe Calendars API |
| Entidade das tools | contact + opportunity | **lead** |
| Opções de select | `picklistOptions` por valor | **`enum_id`** (grava por ID, não por texto) |
| Redis | coordenação/fila (auxiliar) | **obrigatório** (dono do histórico) |

**Stack:** idêntica ao GHL — TypeScript · Vercel serverless · Upstash Redis · Claude Sonnet com `thinking: {type:'disabled'}` · ElevenLabs `opus_48000_64` · Groq Whisper. **Zero VPS.**

**Namespace Redis:** todas as chaves usam o prefixo **`ak:`** — é o que permite dividir o **MESMO database Upstash** (free tier = 1 DB) com o agente GHL, sem colisão.

---

## §2 · OS DOIS DESENHOS (e o transport dinâmico)

### Desenho A — WhatsApp OFICIAL dentro do Kommo (`TRANSPORT=salesbot`)

```
Kommo webhook add_message (form-urlencoded, chaves "message[add][0][...]")
 → /api/inbound (responde 200 IMEDIATO + waitUntil)
     1. dedup por msgId (ak:seen:) + anti-eco
     2. STT do áudio (Groq) → texto
     3. grava no histórico Redis  ak:conv:{leadId}
     4. GATE por TAG NO LEAD (avaliado ANTES de processar)
     5. buffer 10s no Redis (token election: só o webhook MAIS NOVO sobrevive)
     6. Claude + tools em loop (≤6 steps)
     7. DEPOSITA a resposta: campo "Resposta IA (agente)" no lead + outbox Redis (ak:outbox:)
 → POST /api/v2/salesbot/run  [{bot_id, entity_id, entity_type: "leads"}]
 → Salesbot roda: bloco widget-request → chama /api/salesbot?secret=
     ← NÓS POSTamos no return_url:
       { data: { resposta_ia },
         execute_handlers: [{ handler: "goto", params: { type: "question", step: 1 } }] }
 → o bot, no passo seguinte, envia literalmente a macro {{json.resposta_ia}}
```

### Desenho B — WhatsApp na uazapi (`TRANSPORT=uazapi`)

```
uazapi webhook (in / out / fromMe → histórico COMPLETO, os 2 lados)
 → /api/uazapi
 → findOpenLeadByPhone: GET /api/v4/contacts?query=<fone>&with=leads
 → MESMO pipeline (dedup → STT → histórico → gate → buffer → Claude + tools)
 → envio DIRETO pela uazapi:
     /send/text  { number, text }                          ← multi-mensagem
     /send/media { number, type: "ptt", file: "data:audio/ogg;base64,..." }  ← voice note
   (Kommo fica só como CRM: etapas, campos, tarefas)
```

### ⚡ O transport é DINÂMICO **POR LEAD**, não global

> Os dois desenhos **coexistem no MESMO deploy**. Mensagem que entra pelo webhook do Kommo é respondida por **Salesbot**; mensagem que entra pela uazapi é respondida por **uazapi** (com voz). O canal de cada lead fica gravado em **`ak:via:{leadId}`**, e o **followup usa o ÚLTIMO canal usado**.

| Você tem | Desenho | Ganha | Paga |
|---|---|---|---|
| WhatsApp oficial (Cloud API) plugado no Kommo | **A** (`salesbot`) | Zero peça extra, chat oficial no Kommo | Sem voz · 1 mensagem por resposta · **janela 24h da Meta** morde o followup |
| Instância uazapi própria | **B** (`uazapi`) | **Voz** (ElevenLabs ptt) · multi-mensagem · **sem janela de 24h** | +1 fornecedor · 1 webhook por instância · busca de lead por telefone (fuzzy) |

---

## §3 · O QUE JÁ EXISTE (NÃO recriar do zero)

| Ativo | Onde |
|---|---|
| **Template do agente (Kommo)** | `clientes/metriksales/agente-ia-kommo/` — **copiar esta pasta** |
| **Produção de referência (dogfood Metrik)** | https://agente-ia-kommo-metriksales.vercel.app · projeto Vercel `agente-ia-kommo-metriksales` |
| **Template GHL (irmão)** | `clientes/metriksales/agente-ia/` + `ghl/PLAYBOOK.md` |
| **Doutrina comum** | `comum/ARQUITETURA.md` · `comum/CONTEXT-ENG.md` · `comum/EVALS.md` · `comum/PEGADINHAS.md` |

### Anatomia do template

| Arquivo | O que é |
|---|---|
| `prompt.md` | System prompt — versionado em git, é aqui que se edita o cérebro de fábrica |
| `lib/crm-map.ts` | **IDs do Kommo desta conta** (funil, etapas, campos **com enum_id**) — a única coisa que muda por cliente |
| `lib/kommo.ts` | Client API v4 + `salesbot/run` (retry, **merge de tags** — PATCH substitui tudo!) |
| `lib/history.ts` | Histórico no Redis + dedup + anti-eco |
| `lib/transport.ts` | Envio via Salesbot ou uazapi (decide por lead) |
| `lib/agent.ts` | Core: gate por tag → buffer → Claude → envio → followup |
| `lib/tools.ts` · `lib/claude.ts` | As 6 tools + o loop do modelo |
| `lib/stt.ts` · `lib/voice.ts` | Ouvido (Groq) e voz (ElevenLabs) |
| `lib/followup.ts` · `lib/tracking.ts` · `lib/execlog.ts` | Cadências · origem/UTM · diário de execuções |
| `lib/playground.ts` | `simulateChat` — tools em DRY-RUN (§8) |
| `api/inbound.ts` | Webhook `add_message` do Kommo |
| `api/salesbot.ts` | Callback do widget-request do bot de envio |
| `api/uazapi.ts` | Webhook da uazapi (Desenho B) |
| `api/followup.ts` | Cron de cadências |
| `api/validate.ts` | CRM_MAP vs Kommo vivo — **rodar após QUALQUER mexida no funil** |
| `api/cerebro.ts` · `api/prompt.ts` | Playground "Testar ao vivo" |
| `api/links.ts` · `api/r/` | Links rastreáveis + redirecionador público |
| `api/config.ts` · `api/executions.ts` | Config (usada pelos evals) · diário |
| `scripts/create_webhook.py` · `scripts/simulate_inbound.py` | Webhook via API · teste E2E sem WhatsApp |

---

## §4 · SÓ 3 COISAS MUDAM POR CLIENTE (igual GHL)

**1. `prompt.md`** — personalidade, catálogo, portas, limites, CTA.

**2. `lib/crm-map.ts`** — os IDs do Kommo **AO VIVO**:

| Chave | O que carrega |
|---|---|
| `pipelineId` / `pipelineName` | o funil onde o agente opera |
| `stages[]` | etapas da **alçada** com o `quando` (resposta literal do cliente — vira instrução da IA) |
| `stageOrder[]` | **TODOS** os status vivos na ordem real (142=won, 143=lost no fim) → guard anti-retrocesso |
| `leadFields[]` | campos de qualificação **do LEAD** com `quando`, `type`, `kommoName` (o validate compara) e **`options[] com enum_id`** |
| `respostaFieldId` | textarea "Resposta IA (agente)" onde a resposta é depositada |
| `reuniao` | `dataFieldId`, `taskTypeId: 2`, duração, `janelaDias`, timezone, **janela** (hora início/fim + dias da semana), responsável padrão |
| `followup` | `intervalosHoras` (ex `[12,24,48,72]`), janela comercial, `aoEsgotar {tag, statusId}`, **`campoCadencia` com enum_ids**, `maxPorRodada`, `concorrencia` |
| `tracking` | `utmFields` (IDs dos campos `tracking_data` NATIVOS), `fonteFieldId` + `fonteOptions` (enums), `fonteTextFieldId` |

**3. Env vars:**

```
KOMMO_DOMAIN=https://<conta>.kommo.com   KOMMO_TOKEN=eyJ0eXAi...  KOMMO_ACCOUNT_ID=...
KOMMO_BOT_ID=            # obrigatório no Desenho A (só existe depois do passo 5)
TRANSPORT=salesbot|uazapi   UAZAPI_BASE_URL=  UAZAPI_TOKEN=  UAZAPI_AUTO_CREATE_LEAD=  UAZAPI_RELAY_URL=
ANTHROPIC_API_KEY=sk-ant-...   CLAUDE_MODEL=claude-sonnet-5
WEBHOOK_SECRET=<NOVO por cliente: openssl rand -hex 24>   CRON_SECRET=<outro>
UPSTASH_REDIS_REST_URL=  UPSTASH_REDIS_REST_TOKEN=       # OBRIGATÓRIOS
GATE_TAG=iav   HUMAN_TAG=atendimento-humano   DEBOUNCE_SECONDS=10
ELEVENLABS_API_KEY=  ELEVENLABS_VOICE_ID=               # só com TRANSPORT=uazapi
GROQ_API_KEY=gsk_...                                    # ouvido (Groq ≠ Grok/xAI)
CLIENT_NAME="Cliente · Agente"                          # carimbo dos alertas
```

### As chaves do Redis (o mapa da memória)

| Chave | Papel |
|---|---|
| `ak:conv:{leadId}` | **histórico da conversa** (o coração desta variante) |
| `ak:seen:{msgId}` · `ak:done:{leadId}` | dedup de webhook / idempotência |
| `ak:token:{leadId}` · `ak:lock:{leadId}` | eleição do buffer 10s / lock com dono |
| `ak:lastout:{leadId}` | hash da última resposta → **anti-eco** |
| `ak:outbox:{leadId}` | resposta esperando o Salesbot consumir |
| `ak:via:{leadId}` | **canal do lead** (salesbot ou uazapi) |
| `ak:fu:{leadId}` · `ak:fu:queue` | estado e fila do followup |
| `ak:rl:{leadId}` · `ak:rl:click:{ip}` | rate limit (10/min/lead) |
| `ak:phone2lead:{fone}` | índice telefone→lead (cura a busca fuzzy) |
| `ak:click:{code}` · `ak:link:{slug}` | traqueamento de origem |
| `ak:execlog` | diário de execuções |
| `ak:uazlast` | último payload cru da uazapi (debug) |

---

## §5 · OS 7 PASSOS (~meio dia)

### Passo 1 · Copiar + discovery AO VIVO + crm-map

```bash
cp -r clientes/metriksales/agente-ia-kommo clientes/<cliente>/agente-ia-kommo
cd clientes/<cliente>/agente-ia-kommo && npm install
```

Escreva o `prompt.md` novo (do diagnóstico) e **descubra os IDs AO VIVO** — nunca de anotação:

```bash
# funis + status
curl "https://<conta>.kommo.com/api/v4/leads/pipelines" -H "Authorization: Bearer $KOMMO_TOKEN"
# campos do LEAD (traga os enums!)
curl "https://<conta>.kommo.com/api/v4/leads/custom_fields" -H "Authorization: Bearer $KOMMO_TOKEN"
```

Monte o `lib/crm-map.ts` com o que voltou — **incluindo os `enum_id` de cada opção** de select/multiselect (§6, pegadinha 3). Anote o `stageOrder` na ordem REAL do funil.

> **Por quê:** a conta do cliente muda no mesmo dia (no GHL já vimos 4 campos deletados e 2 stages novos entre a manhã e a noite). ID de snapshot é dado perdido em silêncio.

### Passo 2 · Criar o campo de resposta no lead

```bash
curl -X POST "https://<conta>.kommo.com/api/v4/leads/custom_fields" \
  -H "Authorization: Bearer $KOMMO_TOKEN" -H "Content-Type: application/json" \
  -d '[{"name":"Resposta IA (agente)","type":"textarea"}]'
```

É o campo onde o agente **deposita** a resposta antes de mandar o Salesbot rodar. Anote o `id` → `respostaFieldId` no crm-map.

> ⚠️ **curl no Git Bash do Windows corrompe UTF-8** em body JSON com acento (`invalid_unicode`). Para qualquer chamada com texto em português, **use Python ou Node**.

### Passo 3 · Envs + deploy + provar o mapa

```bash
npx tsc --noEmit
vercel link --project=agente-ia-kommo-<cliente> --yes
printf "valor" | vercel env add NOME production      # repita pra cada env do §4
vercel deploy --prod --yes
```

`vercel.json` já vem certo: `maxDuration: 300` + `includeFiles: "prompt.md"` em `api/inbound.ts`, `api/uazapi.ts`, `api/followup.ts` e `api/prompt.ts`, e o cron diário `{"path":"/api/followup","schedule":"0 12 * * *"}`.

```bash
curl "https://<deploy>.vercel.app/api/inbound"                  # health → {ok:true, redis:true}
curl "https://<deploy>.vercel.app/api/validate?secret=XXX"      # TEM que dar {"ok": true}
```

### Passo 4 · Webhook de entrada **VIA API** (não no UI)

```bash
python scripts/create_webhook.py "https://<deploy>.vercel.app/api/inbound?secret=<WEBHOOK_SECRET>"
```

Faz `POST /api/v4/webhooks {destination, settings: ["add_message"]}` — o **mesmo evento** que o ROTEADOR do n8n usa. O script lê `KOMMO_DOMAIN`/`KOMMO_TOKEN` do `.env.local`.

> No **Desenho B** o `add_message` é redundante (a uazapi já entrega tudo) — pode remover.

### Passo 5 · O Salesbot de envio no UI — **operação visual (~3 min)**

A API não cria esse grafo, mas o agente pode montá-lo na sessão autenticada.
Siga `../comum/OPERACAO-VISUAL.md`: confirme a conta, trabalhe em rascunho,
reabra o bot, capture o `bot_id` e prove lead → outbox → Salesbot → mensagem.
Sem navegador controlável, guie o humano exatamente pelos mesmos blocos.

Duas formas, as duas funcionam:

| Opção | Como | Quando usar |
|---|---|---|
| **1 — widget-request** (padrão Metrik, plug-compatible) | Duplique um bot widget-request existente e troque a URL do request pra `https://<deploy>.vercel.app/api/salesbot?secret=<WEBHOOK_SECRET>`. O **passo seguinte (step 1) continua enviando `{{json.resposta_ia}}`** | Conta que já tinha o bot do n8n — troca cirúrgica de URL |
| **2 — campo do lead** (sem widget) | Bot de **1 bloco "Enviar mensagem"** cujo conteúdo é o campo **"Resposta IA (agente)"** — o transport grava lá antes do run | Conta nova, sem legado |

**Depois de criar:** anote o **`bot_id`** → env **`KOMMO_BOT_ID`** → **REDEPLOY**. Sem isso o sender não dispara (env só vale em deploy novo).

> ⚠️ **Desligue o bot antigo pro mesmo público**, ou use **gates de tag disjuntos**: o webhook `add_message` é da **conta inteira** — dois agentes com o mesmo gate respondem duplicado.

### Passo 5b · uazapi (só Desenho B)

1. Conecte o número na instância uazapi e aponte o webhook de mensagens pra `https://<deploy>.vercel.app/api/uazapi?secret=<WEBHOOK_SECRET>`
2. `TRANSPORT=uazapi` + `UAZAPI_BASE_URL` + `UAZAPI_TOKEN` (+ `ELEVENLABS_*` pra voz)
3. O parser é tolerante, mas **valide com um POST real da instância** (o formato varia por versão): mande uma msg de teste e confira `vercel logs` / `ak:uazlast`

### Passo 6 · Testes (E2E sem WhatsApp e com WhatsApp)

```bash
python scripts/simulate_inbound.py <LEAD_ID> "quero saber do agente de ia"
curl "https://<deploy>/api/executions?secret=XXX"          # o diário: saiu execução?
curl "https://<deploy>/api/followup?secret=XXX&force=1"    # followup manual (bypass da janela)
```

> ⚠️ **O lead PRECISA ter a `GATE_TAG`** — sem ela o agente ignora **de propósito**.

**Checklist E2E (não pule):**
☐ texto simples → resposta · ☐ **rajada de 3 msgs → UMA resposta** · ☐ **áudio → transcreve** (e no Desenho B **responde por voz, bolinha de verdade no celular**) · ☐ qualificação **preenche campos por enum_id** · ☐ **move etapa** · ☐ **marca reunião** (task + campo de data + etapa) · ☐ `escalar_para_humano` → tag + silêncio · ☐ followup `force=1` · ☐ tudo aparece em `/api/executions`.

> **A voz só existe depois que você OUVIU no celular.** Log de sucesso não é entrega (a cicatriz que gerou essa lei está em `comum/PEGADINHAS.md` §1).

### Passo 7 · Rampagem pela GATE_TAG

- **Ligar:** tag do gate (ex `IAV`) no **lead** → o agente atende. `GATE_TAG=` vazio = atende todos (só no fim).
- **Desligar:** tag `atendimento-humano` (a tool `escalar_para_humano` põe sozinha).
- **Ordem:** 1 lead seu → 10 leads → todos.

### Passo 8 (não é opcional na prática) · Certificar o cérebro com EVALS

⚠️ O template Kommo **ainda não traz o `scripts/evals.mjs`** — **porte do template GHL** (`clientes/metriksales/agente-ia/scripts/evals.mjs`). É porte seco: **no Kommo o `/api/config` já existe**, então o harness funciona **igual, sem adaptação** (ele baixa o prompt de **PRODUÇÃO**, não uma cópia local que você acha que subiu).

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/evals.mjs   # 10/10 ou não sobe
```

**EVALS SÃO OBRIGATÓRIOS antes de todo deploy de prompt.** Comprovado no GHL: pegaram **2 defeitos + 1 regressão invisíveis ao teste manual** (8,2 → 9,7/10). Detalhe do harness, os 8 cenários que todo cliente precisa e a regra do juiz: `comum/EVALS.md`.

---

## §6 · AS 6 TOOLS (e a alçada)

| Tool | O que faz | Guard |
|---|---|---|
| `buscar_dados_lead` | lê o lead (campos, tags, etapa) | — |
| `adicionar_tag` | tag no lead | **merge local** (PATCH substitui!) |
| `mover_etapa_funil` | move o lead | só etapas da alçada · **só avança** (stageOrder) · **fail-closed** |
| `preencher_qualificacao` | grava campos do lead | **grava por `enum_id`** · multiselect faz **UNION** com o que já existe |
| `marcar_reuniao` | valida janela → cria **task (`task_type_id: 2`)** + campo de data + move etapa | janela do crm-map · epoch em **SEGUNDOS** |
| `escalar_para_humano` | tag `atendimento-humano` + `clearFollowup` | agente se cala |

**Lei da alçada:** o agente termina no **"Agendamento de reunião"**. Reunião confirmada, proposta e negociação são território do closer humano.

**Fail-closed:** o lead pode estar em **OUTRO pipeline**. Se `pipeline_id` ≠ mapa, ou se o status atual está **fora do `stageOrder`**, as tools **recusam** em vez de chutar.

---

## §7 · PEGADINHAS KOMMO (verificadas em produção — leia ANTES de construir)

> Detalhe completo, sintoma/causa/cura, em `kommo/PEGADINHAS.md`. O resumo abaixo é o que você precisa ter na cabeça **enquanto** executa os 7 passos.

| # | Pegadinha | Cura |
|---|---|---|
| **1** | **PATCH de tags SUBSTITUI o conjunto inteiro** | sempre **merge local** — `addLeadTags` / `removeLeadTags` do template |
| **2** | **Multiselect também substitui** | `preencher_qualificacao` faz **UNION com os enum_ids atuais** antes de gravar |
| **3** | **select/multiselect gravam por `enum_id`, NÃO por value** | por isso o crm-map carrega os enums |
| **4** | 🚨 **Loop de eco:** `add_message` pode disparar pra mensagem que o **PRÓPRIO bot** enviou — **loop infinito real, aconteceu no Imigre USA** | 3 camadas no template: **hash da última resposta (`ak:lastout:`)** + campo **`direction`** + **rate limit 10/min/lead** |
| **5** | Webhook chega **form-urlencoded com chaves em colchetes** (`message[add][0][text]`) | o parser cobre formato **PLANO E ANINHADO** |
| **6** | **Payload confirmado em produção (Metrik):** `account[id]` · `message[add][0][id\|entity_id\|contact_id\|text\|created_at\|attachment[type]\|attachment[link]]` | attachment types: **`voice` / `picture` / `file`**; o **link do áudio é PÚBLICO** (o Groq baixa direto, sem auth) |
| **7** | `salesbot/run`: `entity_type` é a **STRING `"leads"`** (endpoint legado v2) | — |
| **7b** | ⚠️ um **502 do `salesbot/run` PODE ter rodado mesmo assim** | o sender **NÃO faz retry em 5xx** — retry cegaria em mensagem duplicada |
| **8** | **Kommo não tem Calendars API** | `marcar_reuniao` valida a janela do crm-map e cria **TASK (`task_type_id: 2`)** + campo de data + move etapa. **`date_time` grava epoch em SEGUNDOS** (não ms) |
| **9** | **Janela 24h da Meta** vale no **WhatsApp OFICIAL** do Kommo: **cadência 1 (12h) entra; cadência 2+ NÃO entrega texto livre** (sem erro visível) | **uazapi (Desenho B)** ou um **bloco de template WABA aprovado** dentro do bot |
| **10** | **Salesbot = 1 mensagem por resposta** (as partes viram parágrafos na mesma msg) | **multi-mensagem e voz só existem no Desenho B** |
| **11** | Lead pode estar em **OUTRO pipeline** | tools **fail-closed** se `pipeline_id` ≠ mapa ou status fora do `stageOrder` |
| **12** | **A conta muda no mesmo dia** | rode `/api/validate` **após qualquer mexida no funil** (e o guardião roda todo dia) |
| **13** | **curl no Git Bash Windows corrompe UTF-8** em JSON com acento | Python/Node pra qualquer chamada com português |

### Pegadinhas da uazapi (Desenho B — verificadas em produção)

| # | Pegadinha | Cura |
|---|---|---|
| **B1** | Payload: `{EventType: "messages", chat, message}` — texto em `message.text`, mídia em `message.content.URL` (**`.enc` criptografada, INÚTIL direto**); `fromMe`+`wasSentByApi` = **eco nosso** (ignorar) | **1 webhook POR instância** (POST **substitui** o anterior!) — se outro sistema consome (inbox Bridge), nosso endpoint **RETRANSMITE** via env `UAZAPI_RELAY_URL` |
| **B2** | Áudio inbound: `POST /message/download {id}` → fileURL mp3 descriptografado. É **ASSÍNCRONO** (o webhook chega antes da conversão) | **retry 2/4/8s**. **Imagem e PDF: descreva com a VISÃO do próprio Claude** (blocos `image`/`document`) numa chamada **na ENTRADA** e grave como texto no histórico (`[imagem do lead]:` / `[documento do lead]:`) — sem Gemini/OCR à parte, e você não paga visão a cada turno (ver `lib/media.ts` no template GHL) |
| **B3** | Envio: `/send/text {number, text}` · voz `/send/media {number, type:"ptt", file:"data:audio/ogg;base64,..."}` (ElevenLabs `opus_48000_64` direto) | — |
| **B4** | 🚨 **DUPLA ENTREGA:** número conectado no Kommo **E** na uazapi → a mesma mensagem chega **2x** | **canal único por lead** — `via=uazapi` faz o `add_message` **ignorar aquele lead** |
| **B5** | A **busca de contato por telefone no Kommo é FUZZY** e contatos de teste com o mesmo número confundem | validar o telefone do contato **DÍGITO A DÍGITO** + manter o índice **`ak:phone2lead:`** |
| **B6** | **Canal voz/texto = decisão do CÓDIGO, bidirecional** — o modelo imita o padrão do histórico nos 2 sentidos (chega a responder texto em voz) | turno de **áudio → voz forçada** (≤500 chars, sem link); turno de **texto → voz derrubada**; exceção: lead pediu áudio por escrito. Prompt imperativo + aviso dinâmico guiam só o **CONTEÚDO** |
| **B7** | Auto-criação de lead (`UAZAPI_AUTO_CREATE_LEAD=1`) | **SÓ em número DEDICADO da IA**. Em número **compartilhado** (ex: suporte) mantenha o **gate por tag** — senão todo cliente de suporte vira lead atendido pela IA |

### 🚨 UM NÚMERO = UM AGENTE (a pegadinha nasceu AQUI, 11/07/2026)

Um número WhatsApp pode estar **simultaneamente** na Cloud API oficial (GHL) **E** pareado na uazapi (bridge do Kommo) — coexistência permitida pela Meta. Uma **única** mensagem do lead entra pelos **DOIS** caminhos e, se os dois agentes tiverem gate aberto pro contato, o lead recebe **RESPOSTA DUPLA**. Aconteceu no dogfood: **Bia GHL + Bia Kommo responderam juntas a mesma mensagem** — e a bridge ainda puxa as respostas do oficial pro Kommo, virando bagunça no chat.

**Regras:** produção = **número exclusivo por agente**. Dogfood com número compartilhado = **só UM gate (tag) aberto por vez** pro mesmo contato.

---

## §8 · O CÉREBRO — "Testar ao vivo" (playground, no ar 19/07/2026)

Painel **self-contained servido pelo próprio agente** (sem app Next.js separado): o cliente edita o prompt candidato e conversa com a IA **como se fosse o lead**. As tools rodam em **DRY-RUN** (simuladas, **ZERO efeito no CRM**) e a UI mostra o que a IA faria por trás.

**Abrir:** `/api/cerebro?secret=<WEBHOOK_SECRET>` (o secret fica só na URL).

Port **aditivo — NÃO toca no caminho de conversa** (`claude.ts` / `inbound` intocados). São 3 arquivos + 1 entrada no `vercel.json`:

| Arquivo | O que faz |
|---|---|
| `lib/playground.ts` | `simulateChat(promptTexto, turns)` — espelha o loop de `generateReply`, trocando `runTool` por **`simulateTool`** (cobre as 6 tools do Kommo) e usando o prompt candidato via `buildSystemFromText`. Retorna `{ reply, toolCalls[], voice }` |
| `api/prompt.ts` | `GET` devolve o prompt de fábrica (carrega no editor) · `POST {acao:'chat', texto, mensagens}` roda a simulação. Auth `?secret=` |
| `api/cerebro.ts` | a página (HTML self-contained; lê o `secret` da URL pra falar com `/api/prompt`) |
| `vercel.json` | registrar `api/prompt.ts` com `maxDuration: 300` + `includeFiles: "prompt.md"` |

**Validado E2E em produção 19/07/2026:** a IA respondeu **E** chamou `preencher_qualificacao("Origem do lead"="Instagram")` + `mover_etapa_funil` — **tudo simulado, CRM intocado**.

### ⚠️ GAP declarado: no Kommo existe SÓ o playground

O agente Kommo **ainda NÃO tem a Central / prompt-store** — o cérebro editável ao vivo (publicar sem deploy) e os 10 evals com o **eval como PORTEIRO** são o **próximo passo**. Pra ter isso aqui:

1. **Portar** do template GHL: `prompt-store.ts` + `evals.ts` + `api/prompt.ts` (ações publicar/restaurar/rollback) + a página do cérebro.
2. **Adaptar `simulateChat` ao brain de lá** → aqui a assinatura é `generateReply(lead, history)` + `runTool(leadId, ...)`, com o mesmo `simulateTool` cobrindo as tools do Kommo.
3. O padrão do componente e o dry-run estão em `comum/PLAYGROUND.md`; a propagação pros demais clientes segue a **"4ª perna"** do `SKILL.md`.

---

## §9 · MONITORAMENTO E ALERTAS (portar do template GHL — validado E2E 11/07/2026)

O padrão completo vive no template GHL (`clientes/metriksales/agente-ia/`) e porta pro Kommo com **adaptações mínimas**:

| Camada | Arquivo | O que faz no Kommo |
|---|---|---|
| **Alerta instantâneo** | `lib/alert.ts` | Erro no processamento/followup → mensagem **NA HORA** no grupo de WhatsApp de operações via uazapi. Envs `UAZAPI_URL`/`UAZAPI_TOKEN`/`ALERT_GROUP_JID` — grupo multi-cliente **"🚨 Alertas IA - Clientes Metrik"**, JID `120363409250696396@g.us` (**MESMO grupo pra todos os projetos**). Carimbo obrigatório: env **`CLIENT_NAME`** ("Cliente · Agente") no cabeçalho de toda mensagem. **Throttle Redis 10min/tipo.** ✅ **No Kommo o transport uazapi JÁ existe — reusa o mesmo client, sem dependência nova** |
| **Guardião** | `lib/guardian.ts` | Check-up diário heurístico: `validate` + erros 24h do execlog + diagnóstico por padrão + **retrigger seguro (máx 3)** + laudo no grupo **SÓ se houver problema** |
| **Analista semanal** | `lib/analyst.ts` | Segundas: relatório com números **calculados EM CÓDIGO** + Claude analisa as conversas. ✅ **No Kommo ele lê do PRÓPRIO histórico Redis (`ak:conv:{leadId}`) — nem precisa de API externa, é mais fácil que no GHL.** Destaque + até 3 sugestões de prompt **com evidência**. Snapshot comparativo no Redis. **Sugestões NUNCA aplicadas automaticamente** |
| **Orquestração** | `api/cron-daily.ts` | Dispatcher no **ÚNICO cron diário do Vercel Hobby**: followup → guardião → (segunda) analista |

### Followup pontual: o cron diário NÃO basta

Cadência sub-diária (ex: 1ª em 6h) não é pega por um cron 1x/dia. **Use QStash** (Upstash — **MESMA conta do Redis**, não é peça estranha ao stack) como **relógio horário** apontando pro `/api/followup`:

- QStash `0 0-11,13-23 * * *` + cron Vercel `0 12 * * *` = **cobertura horária completa, ZERO colisão, grátis, sem Pro**
- QStash é **só o relógio**; motor + fila seguem no Vercel + Redis
- Auth: o QStash forwarda `Upstash-Forward-Authorization: Bearer <CRON_SECRET>` → o endpoint valida
- **Hobby é não-comercial nos termos** — cliente pagante = Pro (ou QStash como gatilho + Hobby só de cron nativo)

### ⚠️ Handoff × followup (vale IGUAL no Kommo)

Quando o agente usa `escalar_para_humano`, o loop **NÃO pode** chamar `scheduleSilenceCheck` depois — senão o próprio handoff agenda perseguição pra quem **acabou de ir pro humano**. No fim do turno:

```ts
if (reply.toolsUsed.includes('escalar_para_humano')) await clearFollowup(id)
else await scheduleSilenceCheck(id, 0)
```

**Doutrina:** a fila vive no Redis, mas **a verdade do gate é do CRM** — todo painel de fila filtra pelas **tags reais**, e **toda ação que tira o lead do fluxo tira da fila na MESMA volta**. (Bug silencioso: o cron até dropa esses leads, então ninguém recebe followup errado — **mas o painel mente até lá**.)

### ⚠️ A janela comercial ENGOLE o tique do relógio (vale IGUAL no Kommo)

Relógio de hora em hora + janela 8h–18h → quem vence às **17h38** não é pego pelo tique das 17h (cedo) nem pelo das 18h (janela já rejeita) e só sai no dia seguinte: **22 minutos viram 14 horas de atraso**.

- **Cura (motor):** se o PRÓXIMO tique cai fora da janela, **antecipe** quem vence até lá — `getDue(limite, lookAhead)` com `zrange` até `now + 1h`. Antecipa **no máximo um tique**.
- **Cura (painel):** **nunca** escreva "agora" pro que só sai amanhã — escreva **"amanhã a partir das 8h"**, com a janela vinda da **API do motor** (uma fonte só).
- **Doutrina: a granularidade do gatilho é o piso da sua promessa.**

### ⚠️ Rotinas cloud do Claude (claude.ai/code/routines) NÃO têm saída de rede

Curls falham **em silêncio**. **Monitores DEVEM viver no próprio agente Vercel.** Rotinas cloud só pra tarefa sem rede.

### Aba "Recuperação" (quando a Central chegar ao Kommo)

Dashboard do followup: fila e próximos envios · voltou a conversar · concretizou o
objetivo · influência assistida · eficácia por toque · esgotados/cancelados.
Fonte = `GET /api/followup-stats`; o objetivo usa `status_id`, campo, tag ou
webhook confirmado no lead. Trackings e atribuição estão em `RECUPERACAO.md`.

---

## §10 · TRAQUEAMENTO DE ORIGEM (Fase 1 — no ar, testado E2E 2026-07-12)

Clique → código → 1ª mensagem → card, **tudo no mesmo projeto**:

```
Bio / YouTube / anúncio → /api/r/{slug}?utm_...   (redirecionador PÚBLICO)
  → clique salvo no Redis (código de 4 chars, TTL 7d, USO ÚNICO)
  → 302 pro wa.me com texto pré-preenchido + " #CODE"
1ª mensagem chega → resolver acha o #CODE → REMOVE do texto (o modelo nem vê)
  → grava no lead:
      utm_* nos campos tracking_data NATIVOS
    + "Fonte do lead" por ENUM (canal sem enum cai no campo texto "Fonte")
    + NOTA DE AUDITORIA no card (canal, UTMs, hora do clique, IP)
```

**Gerenciar links** (`/api/links?secret=`):

```bash
curl -X POST "https://<deploy>/api/links?secret=XXX" -H "Content-Type: application/json" \
  -d '{"slug":"yt-canal","canal":"Youtube","phone":"5521999999999","text":"Olá! Quero saber mais sobre o agente de IA","utm_source":"youtube","utm_medium":"video"}'
curl "https://<deploy>/api/links?secret=XXX"     # lista com as URLs prontas pra divulgar
```

- **UTMs na URL do clique sobrescrevem os defaults do link** — use isso nos anúncios
- **Fallback declarado:** o prompt manda o agente perguntar a origem **UMA vez** e gravar via `preencher_qualificacao("Origem do lead" → Youtube/Instagram/Indicação)`
- **Fase 2 (futuro):** `referral`/`ctwa_clid` de anúncio CTWA — na **uazapi**: `contextInfo` da 1ª msg. No **OFICIAL**: ⚠️ **o Kommo preenche o UTM SOZINHO, mas SÓ SE o WABA estiver no MESMO Business Manager da conta de anúncios** → vira **item de checklist de implantação** e é a **provável causa do "UTM 0%"** que vimos em clientes
- **Fase 3:** CAPI da Meta (evento de qualificação com `ctwa_clid`)

---

## §11 · ESTADO DO DOGFOOD METRIK (referência viva)

> A variante Kommo foi **construída e deployada em 2026-07-11 como dogfood da própria Metrik**. É a conta de referência: quando algo não bate, compare com ela.

| Item | Valor |
|---|---|
| Deploy | https://agente-ia-kommo-metriksales.vercel.app |
| Funil | **"Vendas Implementações" — id `12839352`** |
| Alçada (etapas) | Primeiro contato **99017612** → Qualificação **99017620** → Agendamento de reunião **99017880** |
| `stageOrder` real | 99017608 (Incoming) · 99017612 · 99017616 (Followup) · 99017620 · 99017880 · 142 (won) · 143 (lost) |
| Campos | **Resposta IA `1126115`** · **Demonstrou interesse `1117491`** (enums `815671`–`815685`) · **Follow-up `1122909`** · **Data da reunião `1085812`** |
| Webhook `add_message` | **id `47402316`** |
| Gate | **`GATE_TAG=iav`** (tag `IAV` no lead) · secrets no **`.env.local` da pasta do projeto** |
| Salesbot de envio | **bot `65955`** — cópia do `62431` com a URL do widget-request trocada pra `/api/salesbot?secret=` |
| Cadeia E2E | ✅ **validada 2026-07-11**: outbox consumido · lead moveu de etapa · **multiselect gravado por enum_id** |
| Desenho B | ✅ **validado E2E 2026-07-12** com **voice note real** |
| Playground | ✅ **no ar 19/07/2026** |

### ⚠️ Dois avisos que valem ouro nessa conta

1. **NÃO usar o bot `62431`** — ele aponta pro **n8n/Postgres antigo**.
2. **O fluxo n8n antigo (gate tag `IA`) continua ATIVO na conta.** Os gates são **disjuntos**: **NUNCA** coloque `IA` e `IAV` no mesmo lead.

---

## §12 · PROCESSO NUMA SESSÃO NOVA

1. Invocar esta skill + **ler `clientes/metriksales/agente-ia-kommo/README.md`**
2. **SEMPRE:** discovery ao vivo dos IDs **antes** do crm-map (a conta muda no mesmo dia) → review adversarial antes de cliente real → teste E2E com lead próprio → rampagem por tag

## §13 · DEPOIS DO GO-LIVE (o que faz o cliente ficar)

- **Grupo de alertas** com o time do cliente dentro (carimbo `CLIENT_NAME`)
- **Cron diário** entregando: followup + guardião · segunda: relatório + evolução do prompt
- **Ensine o time:** o que é o gate (`IAV`), como desligar a IA num lead (tag `atendimento-humano`), como ler o diário
- **Mensal:** rode os evals de novo (o mundo muda) · revise as sugestões do analista · `/api/validate` **depois de qualquer mexida no funil**
- **Custo pra dimensionar a conversa (medido):** conversa completa ≈ **R$0,16** (Sonnet + prompt caching) → mil conversas/mês ≈ **R$162**. **Haiku (`CLAUDE_MODEL_FAST`) pra tarefa mecânica** (followup, classificação, 3,5x mais barato) e **Sonnet pra conversa com lead** — não economize onde o dinheiro é ganho. Doutrina completa (prompt vs RAG, limiares) em `comum/CONTEXT-ENG.md`

## §14 · DEBUG RÁPIDO

| Sintoma | Primeiro passo |
|---|---|
| "Nem respondeu" | Saiu execução em `/api/executions`? **Não** = webhook/gate (rode `simulate_inbound.py` pra provar que o código roda) · **Sim** = leia o erro no diário |
| Respondeu mas o lead não recebeu | `KOMMO_BOT_ID` setado **e redeployado**? · o bot está publicado/ativo? · o outbox (`ak:outbox:`) foi consumido? · `salesbot/run` deu 502 (**pode ter rodado — não repita**) |
| Resposta duplicada | Dois agentes com gate aberto (n8n `IA` + este `IAV`)? · número em 2 sistemas (**Kommo + uazapi**)? · `ak:via:` do lead |
| Loop infinito de mensagens | Anti-eco: `ak:lastout:` · campo `direction` · rate limit 10/min (pegadinha 4) |
| Campo não preenche | `/api/validate` · está gravando por **enum_id**? · multiselect fez UNION? |
| Etapa não anda | Lead está no pipeline do mapa? Status atual está no `stageOrder`? (**fail-closed** recusa em silêncio proposital) |
| Áudio vira placeholder | `GROQ_API_KEY` ausente · no Desenho B, o `/message/download` é **assíncrono** (retry 2/4/8s) |
| Followup não sai | Janela comercial? · domingo? · **janela 24h da Meta** (só oficial)? · o relógio é diário (precisa de QStash)? |
| "O followup atrasou horas" | Janela comercial engolindo o tique (§9) — **prove o relógio antes de acusar o motor**: `lastScheduleTime`/`isPaused` no QStash + bater no endpoint com o MESMO header (segredo trocado = **401 silencioso a cada hora**) |
