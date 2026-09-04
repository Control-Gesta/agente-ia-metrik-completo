# PLAYBOOK · GHL — do zero ao agente em produção

> **Guia deste arquivo.** O passo a passo completo do **GoHighLevel**, do template ao ar: copiar, discovery ao vivo dos IDs, criar campos, escrever o prompt, mapear o funil, envs e deploy, `/api/validate`, a **operação visual no GHL** (Customer Replied + gate + webhook · tracker · templates de followup fora da janela · desligar o Conversation AI nativo), evals, E2E, Central e rampagem, o que fazer depois do go-live, e a tabela de debug.
>
> **Quando ler:** na hora de **construir ou replicar** um agente num cliente GHL. Execute na ordem. Cada etapa carrega o **porquê** — pra você ensinar, não só clicar.
>
> **Tempo real, com diagnóstico já respondido: ~1 dia.**

---

## §0 · Onde este arquivo entra (herança e roteador)

Esta é a perna **GHL** da skill. A origem é a antiga skill `agente-ia-ghl` (**aposentada em 22/07/2026** — foi absorvida por esta e não existe mais no disco): *construir/replicar agentes de IA SDR no **GoHighLevel sem n8n** (Claude API + Vercel + Upstash Redis) — **e ENSINAR a fazer***. A postura é a mesma do `SKILL.md`: **professor E executor** — explica o trade-off e coloca no ar com prova.

**O que mudou com a fusão.** Antes, o roteamento entre CRMs era uma **dependência cruzada no frontmatter** (`Kommo: use agente-ia-kommo`) — e a skill do Kommo era meia-skill, emprestando a biblioteca da GHL pra existir. Agora o roteador é **interno**: o `SKILL.md` **pergunta o CRM antes de qualquer coisa** e manda pra `ghl/` ou `kommo/`. Nenhum arquivo depende mais de outra skill.

| Se o CRM do cliente é… | Leia |
|---|---|
| **GoHighLevel** | **este arquivo** + `ghl/PEGADINHAS.md` |
| **Kommo** | `kommo/PLAYBOOK.md` + `kommo/PEGADINHAS.md` |
| Qualquer um dos dois | `comum/DIAGNOSTICO.md` · `comum/ARQUITETURA.md` · `comum/CONTEXT-ENG.md` · `comum/EVALS.md` · `comum/PEGADINHAS.md` · `comum/PLAYGROUND.md` |

**O template desta perna** é `clientes/metriksales/agente-ia/` (+ `clientes/metriksales/area-cliente/` pra Central). É este mesmo template que a perna Kommo chama de **"template irmão (GHL)"** quando manda portar monitores, evals e playground.

---

## §1 · Pré-requisito (não negocie)

`comum/DIAGNOSTICO.md` **respondido**. Sem ele, **pare** — você vai construir um agente genérico, e agente genérico o cliente cancela em 30 dias.

Do diagnóstico você tem que sair com: rascunho do `prompt.md`, rascunho do `crm-map.ts`, lista de credenciais, decisões de arquitetura anotadas (voz sim/não, Redis, RAG sim/não, gate, cadências) e os **cenários de eval** do cliente.

---

## §2 · O que pedir ao cliente ANTES da etapa 1

**Acessos (sem estes três você trava no meio):**

| Acesso | Pra quê | Se faltar |
|---|---|---|
| **Admin do GHL** | gerar o **PIT**, criar **workflows** e **templates** de WhatsApp | etapas 6, 8 e 8.3 param |
| **WhatsApp conectado e TESTADO** | o canal por onde tudo acontece | você descobre no E2E, tarde demais |
| **Calendário com disponibilidade real** | a tool de agenda só oferece slot que existe | o agente marca no vazio |

**Credencial do GHL:** **Private Integration Token**, prefixo **`pit-`** (Settings → Private Integrations). É o token que vai em `GHL_TOKEN`.

> **Multi-cliente:** as credenciais (**PIT do GHL** e **`WEBHOOK_SECRET`**) são **isoladas por cliente** — nunca reaproveite o PIT de um cliente em outro deploy. O que é do NEGÓCIO do cliente é isolado; o que é infraestrutura da agência (uazapi, grupo de alertas, database Upstash por namespace) é compartilhado. Ver `comum/ARQUITETURA.md` → multi-cliente.

---

## §3 · As decisões que este playbook já tomou por você (GHL)

Você não precisa re-decidir isto em cada cliente — mas precisa **saber o preço**, porque é o que você vai explicar ao cliente e ao aluno.

### 3.1 · O CRM (GHL) é a fonte da verdade — não um banco nosso

| Ganha | Paga |
|---|---|
| Agente **100% stateless** · humano e IA veem a **MESMA** conversa · **zero sincronização** | Dependência da API (**rate limit 429**) · precisa **filtrar ruído** do transcript (activities, notas internas) |

> No **Kommo** essa decisão se inverte (o Kommo não devolve transcript → o histórico é nosso, no Redis). É a diferença estrutural nº 1 entre as duas pernas — ver `kommo/PLAYBOOK.md`.

### 3.2 · A voz não passa pelo GHL

**Descoberta cara (cliente DAC, 13/07/2026):** o **provedor de WhatsApp do GHL DESCARTA áudio outbound** — o status volta `delivered`, mas **só o texto chega ao lead**. Detalhe completo em `ghl/PEGADINHAS.md` §GHL-1 (e a lei universal em `comum/PEGADINHAS.md` §1).

**Caminho da voz que funciona:** OpenAI TTS-1 (padrão simples) ou ElevenLabs
(premium) gera **ogg/opus** → **hospeda no GHL** → **uazapi `/send/media
type:ptt`** entrega a bolinha de voz de verdade.

| Ganha | Paga |
|---|---|
| Nota de voz real no WhatsApp do lead | **Uma peça a mais no stack** (uazapi) · **gap de histórico**: a nota volta como **outbound vazio** e vira marcador |

### 3.3 · A vida de uma mensagem no GHL (o fluxo que explica tudo)

```
Lead manda "oi" no WhatsApp
  → GHL recebe → Workflow "Customer Replied" (filtro de CANAL + GATE por tag)
  → POST /api/inbound (Vercel)
      ├─ responde 200 IMEDIATO   ← senão o GHL REENVIA o webhook (retry = resposta DUPLA pro lead)
      └─ waitUntil(processa em background)
          1. Contato tem tag "atendimento-humano"? → não responde (humano assumiu)
          2. BUFFER 10s no Redis — eleição: só o webhook MAIS NOVO sobrevive
          3. HISTÓRICO vem do GHL (fonte da verdade — o agente é stateless)
          4. MÍDIA vira TEXTO (áudio→GPT-4o Mini Transcribe · imagem/PDF→GPT-5.4 Mini)
          5. GPT-5.4 Mini + tools em loop (≤6 steps) → decide e AGE no CRM
          6. Responde: texto (GHL) ou voz (TTS-1 → uazapi ptt)
          7. Registra no diário (Redis) + agenda checagem de silêncio (followup)
```

**Cada número resolve um problema que já mordeu.** Tirar qualquer um = bug de volta. Os dois que mais doem no GHL: o **200 imediato** (passo 0) e o **histórico do GHL** (passo 3).

---

## Etapa 1 · Copiar o template

```bash
cp -r clientes/metriksales/agente-ia   clientes/<cliente>/agente-ia
cp -r clientes/metriksales/area-cliente clientes/<cliente>/area-cliente
```

Se for **reusar o Upstash do 1º cliente** (free tier = 1 database só):

```bash
sed -i 's/agente:/agente-<slug>:/g' lib/*.ts api/*.ts
```

⚠️ E **reverta** a propriedade JS `agente: {` em `api/config.ts` — ela **não** é chave Redis, o sed pega junto. Detalhe: `comum/PEGADINHAS.md` §18 (Upstash free = 1 DB).

---

## Etapa 2 · Descobrir os IDs **AO VIVO** (nunca de anotação)

```bash
# Pipelines e stages
curl "https://services.leadconnectorhq.com/opportunities/pipelines?locationId=<LOC>" \
  -H "Authorization: Bearer pit-..." \
  -H "Version: 2021-07-28" \
  -H "User-Agent: Mozilla/5.0"

# Custom fields — DOIS modelos separados, rode os dois
curl "https://services.leadconnectorhq.com/locations/<LOC>/customFields?model=opportunity" \
  -H "Authorization: Bearer pit-..." -H "Version: 2021-07-28" -H "User-Agent: Mozilla/5.0"
curl "https://services.leadconnectorhq.com/locations/<LOC>/customFields?model=contact" \
  -H "Authorization: Bearer pit-..." -H "Version: 2021-07-28" -H "User-Agent: Mozilla/5.0"

# Calendários — ATENÇÃO: Version DIFERENTE
curl "https://services.leadconnectorhq.com/calendars/?locationId=<LOC>" \
  -H "Authorization: Bearer pit-..." \
  -H "Version: 2021-04-15" \
  -H "User-Agent: Mozilla/5.0"
```

| Detalhe | Regra |
|---|---|
| `Version` | **`2021-07-28`** em pipelines e custom fields · **`2021-04-15`** em calendários. Versão errada = resposta errada ou 4xx. |
| `User-Agent` | **Sempre** `Mozilla/5.0`, junto com `Authorization` e `Version`. Sem UA de browser o Cloudflare do GHL responde **403 "Error 1010"** (`ghl/PEGADINHAS.md` §GHL-11 · lei universal em `comum/PEGADINHAS.md` §14). |
| `model=` | `opportunity` e `contact` são **listas separadas**. Puxar só uma é o jeito clássico de "sumir" com metade dos campos. |

**Por que ao vivo, sempre:** a conta do cliente muda **no mesmo dia** (já aconteceu: **4 campos deletados e 2 stages novos entre a manhã e a noite**) — e o pior: o GHL **grava em ID morto SEM erro, devolvendo 200 OK**, e o dado simplesmente some. Ver `ghl/PEGADINHAS.md` §GHL-8 (a lei universal — "IDs mudam debaixo de você" — está em `comum/PEGADINHAS.md` §11). É exatamente por causa disso que existe o `/api/validate` (etapa 7), e o guardião roda ele **todo dia**.

---

## Etapa 3 · Criar no CRM o que falta

**No CONTACT:**

| Campo | Tipo | Pra quê |
|---|---|---|
| **Origem** | **SINGLE_OPTIONS** (dropdown de opção única — **não** texto livre) | rastreio de aquisição |
| `utm_source/medium/campaign` **`_first`** e **`_last`** | texto | primeira e última origem |
| **Primeira mensagem** | texto | o que o lead disse ao chegar |
| **Data primeira mensagem** | data | safra do lead |
| **Remarketing** (Cadência 1..N) | opções | onde o followup está |
| **Resumo da conversa** | texto longo | o que o humano lê antes de falar |

**Na OPPORTUNITY:** os campos de qualificação que saíram do diagnóstico (cada um com o seu `quando`).

**Criando por API:**

```bash
# Pasta de campos
POST /locations/{locationId}/customFields   { "documentType": "folder", ... }
```

⚠️ **`options` tem que ser ARRAY DE STRINGS.** Mandar array de objeto retorna o erro `v.trim is not a function` — erro que não diz nada sobre o que está errado.

---

## Etapa 4 · Escrever o cérebro (`prompt.md`)

Monte a partir do material do diagnóstico, nesta ordem:

1. **Identidade** (quem é, de quem fala)
2. **Números reais da empresa** (nunca inventados — dado inventado é bomba-relógio)
3. **Portas**: perfil → oferta → caminho (o padrão que mais converte)
4. **Tom e formato de WhatsApp**
5. **Regra de ouro**: responder **antes** de perguntar · **uma pergunta por vez**
6. **Uso das tools**
7. **Funil e qualificação**
8. **Agendamento**
9. **Followup** (cadências)
10. **Voz** (curta, sem link)
11. **Limites** — o que **nunca** falar
12. **Regra de suporte** — escalar **sem pitch**

> Referência de estrutura: `clientes/metriksales/agente-ia/prompt.md` (**9,7/10 nos evals**).
> A regra de ouro e o porquê dela (custou venda, flagrada pelo eval) estão em `comum/CONTEXT-ENG.md`.

---

## Etapa 5 · Mapear o funil (`lib/crm-map.ts`)

| Bloco | O que entra | Cuidado |
|---|---|---|
| **Stages da alçada** | cada um com o `quando` — **a resposta LITERAL do cliente** | frase do dono > frase sua |
| **`stageOrder`** | **TODOS** os stages vivos, na ordem real | é o guard **anti-retrocesso**; faltando um, o guard erra |
| **Campos de qualificação** | com `quando` e `options` | options têm que bater com o CRM vivo |
| **Calendário** | id, janela, timezone | tirado da etapa 2 (`Version: 2021-04-15`) |
| **Followup** | intervalos, janela comercial, o que fazer ao esgotar | ver `comum/PEGADINHAS.md` (janela comercial × relógio) |

---

## Etapa 6 · Env vars + deploy

```bash
vercel link --project=agente-ia-<cliente> --yes

# Específicas do GHL:
#   GHL_TOKEN        (o PIT, prefixo pit-)
#   GHL_LOCATION_ID
# Comuns:
#   OPENAI_API_KEY, WEBHOOK_SECRET (NOVO por cliente!), CRON_SECRET,
#   SELF_URL (alias PÚBLICO!), CLIENT_NAME ("Cliente · Agente"),
#   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN,
#   LLM_MODEL / VISION_MODEL / STT_MODEL / TTS_MODEL / TTS_VOICE,
#   UAZAPI_URL / UAZAPI_TOKEN / ALERT_GROUP_JID

printf "valor" | vercel env add NOME production
vercel deploy --prod --yes
```

- **`WEBHOOK_SECRET` novo por cliente**: `openssl rand -hex 24`.
- **`SELF_URL` = alias público.** Nunca `VERCEL_URL` — ela aponta pro deployment interno, protegido por Vercel Authentication, e devolve **tela de login em vez de JSON** (`comum/PEGADINHAS.md` §15).
- **Env var só vale em NOVO deploy.** Mudou env → redeploy.

---

## Etapa 7 · Provar o mapa (antes de qualquer lead)

```bash
curl "https://<agente>.vercel.app/api/validate?secret=<SECRET>"   # tem que dar ok:true
curl "https://<agente>.vercel.app/api/inbound"                     # {ok:true, redis:true}
```

> **Por que `/api/validate` existe:** porque o GHL **aceita PUT em custom field ID inexistente devolvendo 200 OK silencioso** — perda de dado **invisível**. O validate compara o mapa contra o CRM vivo, e o **guardião roda ele todo dia**.

---

## Etapa 8 · Configurar o GHL — **operação visual** (a API não cria workflow)

⚠️ A API do GHL **não cria workflow**, mas isso não obriga o mestre a montar:
havendo autorização e sessão autenticada, o agente opera o builder visual. Siga
`../comum/OPERACAO-VISUAL.md`: crie desativado, releia a configuração e só
publique depois do E2E. Sem navegador controlável, conduza o humano nos 4 blocos.

### 8.1 · Workflow de ATENDIMENTO

```
Trigger:   Customer Replied   (filtro de canal: WhatsApp)
Condição:  tem a TAG DE GATE
Ação:      Custom Webhook
           POST  https://<agente>.vercel.app/api/inbound?secret=<WEBHOOK_SECRET>
           body: contact_id = {{contact.id}}
```

### 8.2 · Workflow RASTREADOR (**SEM tag de gate!**)

O rastreador atende **todo mundo** — inclusive lead que a IA não vai responder. Por isso não leva gate.

```
(a) Trigger: Contact Created
    Ação:    POST https://<agente>.vercel.app/api/tracker?secret=<WEBHOOK_SECRET>

(b) Trigger: Customer Replied
    Condição: "Origem is empty"
    Ação:    mesmo webhook /api/tracker
```

### 8.3 · Followup FORA da janela de 24h (3 templates + 3 workflows)

A API do GHL **NÃO envia template de WhatsApp** — verificado no spec: existe `templateId`, mas **sem variáveis e sem endpoint**. Não adianta procurar. O **único caminho suportado** é tag → workflow → template:

1. Crie **3 templates de WhatsApp**, categoria **Marketing** (aprovação da Meta leva 1–2 dias).
2. Crie **3 workflows**:

| Workflow | Trigger | Ação |
|---|---|---|
| FU cadência 2 | `Tag Added: ia-fu-c2` | WhatsApp → template 2 |
| FU cadência 3 | `Tag Added: ia-fu-c3` | WhatsApp → template 3 |
| FU cadência 4 | `Tag Added: ia-fu-c4` | WhatsApp → template 4 |

> Contexto: mensagem livre só entrega até 24h depois da **última mensagem DO LEAD**. Fora dela **não entrega e não dá erro claro** — o followup 1 (12h) passa, os outros morreriam em silêncio. Ver `comum/PEGADINHAS.md` §8.

### 8.4 · ⚠️ DESLIGAR o Conversation AI nativo (Autopilot) no canal

Se ficar ligado, **DOIS bots respondem o mesmo lead**. É o erro mais constrangedor possível no dia 1 do cliente.

---

## Etapa 9 · Certificar o cérebro (evals)

```bash
ANTHROPIC_API_KEY=... node scripts/evals.mjs   # 10/10 ou NÃO SOBE
```

Detalhe do harness, como escrever cenário e a prova de valor: `comum/EVALS.md`.

---

## Etapa 10 · Teste E2E com número real (**NÃO pule**)

| ☐ | Cenário | O que prova |
|---|---|---|
| ☐ | "oi" → resposta em ~25s | caminho inteiro vivo |
| ☐ | **rajada de 3 msgs → UMA resposta** | o buffer de 10s |
| ☐ | conta um negócio → **card preenche + etapa anda** | tools + alçada |
| ☐ | **manda ÁUDIO → ouve o conteúdo E responde por voz (bolinha!)** | STT + voz real |
| ☐ | pede link **por áudio** → volta **TEXTO** | regra de mídia |
| ☐ | "quero marcar" → horários reais → agenda no calendário | calendar |
| ☐ | "quero falar com humano" → despedida + tag + **silêncio** | handoff |
| ☐ | followup: `curl "/api/followup?secret=X&force=1"` | motor de perseguição |
| ☐ | tudo aparece em `/api/executions` | diário |

> **A voz só existe depois que você OUVIU no celular.** A validação antiga logava `voz: true` (decisão do modelo) e **ninguém tinha confirmado entrega** — achamos que funcionava por dias. Ver `ghl/PEGADINHAS.md` §GHL-1 (lei universal: `comum/PEGADINHAS.md` §1).
> **Não delete a conversa do lead entre testes** (§A.6 abaixo) e **áudio real só por WhatsApp de verdade** (§A.7).

---

## Etapa 11 · Central de IA (área do cliente) + rampagem

A `area-cliente/` é um **Next.js** que lê o `/api/config` do agente + dados do GHL ao vivo. Ela é **acoplada à conta do cliente** — `cp -r` + deploy **NÃO basta**. São **5 pontos** a trocar (senão quebra ou mostra dado errado — validado no **Manoel, 19/07/2026**):

### 1. Envs (Vercel **e** `.env.local`)

| Env | Valor |
|---|---|
| `AGENT_URL` | deploy do agente |
| `AGENT_SECRET` | **= `WEBHOOK_SECRET` do agente** |
| `GHL_TOKEN` | o PIT |
| `GHL_LOCATION_ID` | location do cliente |
| `GHL_PIPELINE_ID` | pipeline que a Central mostra |
| `GHL_CALENDAR_ID` | **deixe VAZIO se o cliente não agenda** |

### 2. `lib/ghl.ts` → `STAGE_ORDER` (o que mais zera funil)

É **HARDCODED** com os stage IDs do **1º cliente que gerou o template**. Troque pelos stages do cliente novo:

```
GET /opportunities/pipelines   → pegue os stages do cliente
STAGE_ORDER = [...todos os stages, na ordem...]  com ia:true nas etapas que o AGENTE move
```

⚠️ **Esqueceu = `getFunnelStages` não casa nenhum id = TODAS as barras do funil ao vivo ficam ZERO** — sem erro nenhum, parece que o funil está vazio. Ver `ghl/PEGADINHAS.md` §GHL-14.1 (e `comum/PEGADINHAS.md` §22).

### 3. Agente **SEM** calendário

Se o agente do cliente não agenda (ex.: fluxo de handoff), a página `/funil` quebra em `f.calendario.nome` → **500 `Cannot read properties of undefined`**. Fix: torne `calendario?` **opcional** em `lib/agent.ts` e **guarde** a seção AGENDA com `{f.calendario && (...)}`. O `/api/live` já cai gracioso (`.catch(() => ({proximos:[],realizados7d:0}))`) — a página **SSR não**. Ver `ghl/PEGADINHAS.md` §GHL-14.3 (e `comum/PEGADINHAS.md` §23).

### 4. Branding

`app/layout.tsx` (title) · `components/Sidebar.tsx` (logo + rodapé + label da nav) · o **mapa de cores** em `app/cerebro/page.tsx` (as keys são os **títulos das seções do prompt DO cliente**).

### 5. Tema claro (**só se for oferecer**)

O CSS nasce dark com cor **chumbada** (`#000`, `#0a0a0a`, dezenas de `text-white`). Ordem correta:

1. Converta **primeiro** pra variáveis (`--surface`, `--line`, `--badge-bg`, `--text-*`) com override em `[data-theme='light']`.
2. `text-white` → `text-foreground` e `bg-white/[x]` → `bg-foreground/[x]` — **senão vira branco no branco**.
3. No `tailwind.config` use `hsl(var(--x) / <alpha-value>)` pra o `/95` funcionar.
4. Aplique o tema salvo num **script inline no `<head>`, ANTES da 1ª pintura** — senão pisca no tema errado.
5. Badges coloridos precisam de tom mais escuro no claro; o shimmer do hero **inverte** (clareia no dark, escurece no light).

*(Validado no Manoel, 19/07/2026.)*

### Deploy da Central

**Projeto Vercel PRÓPRIO por cliente** (`central-ia-<cliente>`, pasta própria). **NUNCA redeploya a Central de outro cliente** — cada uma é isolada. Env vars só valem em novo deploy.

### Rampagem (a etapa que salva a confiança do time)

**Tag de gate em VOCÊ → 10 leads → acompanha pela Central + grupo de alertas → abre pra todos.**

### Aba "Recuperação" (dashboard de followup)

A Central separa: fila/próximos envios · **voltou a conversar** · **concretizou o
objetivo** · influência assistida · esgotados/cancelados, com eficácia por toque.
O objetivo e seu sinal no CRM são definidos por cliente em `RECUPERACAO.md`.

> **Enquadre como RECUPERAÇÃO, não perseguição** — é a métrica que vende.

| Peça | Onde |
|---|---|
| Fonte | endpoint **read-only** no agente `GET /api/followup-stats` (lê a fila `mq:fu:*` do Redis) |
| Nomes | a **Central** enriquece via GHL — **só IDs saem do agente** |
| Tracking 1 | **`markRecovered`** — lead responde estando em cadência >0 → em `lib/agent.ts`, **antes** de resetar a cadência |
| Tracking 2 | **`markGoalAchieved`** — observa etapa/campo/tag/agenda configurado e grava evidência |
| Tracking 3 | **`markEsgotado`** — no `esgotar()` do `api/followup.ts` |
| Estado | contadores + listas curtas no Redis (`mq:fu:rec:*` / `mq:fu:lost:*`) |

*(Validado no Manoel, 19/07/2026.)*

---

## §12 · Depois do go-live (o que faz o cliente ficar)

- **Grupo de alertas** com o time do cliente dentro (carimbo `CLIENT_NAME` em toda mensagem).
- **Cron diário** já entrega: followup + guardião · **segunda**: relatório + evolução do prompt · **sexta**: auditoria do funil.
- **Ensine o time:** o que é o gate · como **desligar a IA** num lead (tag `atendimento-humano`) · como ler a Central.
- **Mensal:** rode os evals de novo (o mundo muda) · revise as sugestões do analista · rode **`/api/validate` depois de QUALQUER mexida no funil**.

---

## §13 · Debug rápido

| Sintoma | Primeiro passo |
|---|---|
| **"Nem respondeu"** | Saiu execução em `/api/executions`? **Não** = workflow/gatilho do GHL (dispare `POST /api/inbound` manual pra provar) · **Sim** = leia o erro. *(E confira: deletou a conversa do lead? §A.6)* |
| **Resposta duplicada** | Redis ativo? (`/api/inbound` → `redis:true`) · o número está em **2 sistemas**? (`comum/PEGADINHAS.md` §9) · **Conversation AI nativo ligado?** (Etapa 8.4) · o endpoint respondeu **200 imediato**? |
| **Áudio vira texto** | `comum/PEGADINHAS.md` **§1 → §2 → §3 → §4 → §5, NESSA ORDEM** (o detalhe da plataforma está em `ghl/PEGADINHAS.md` §GHL-1 → §GHL-3) |
| **Campo não preenche** | **Rode `/api/validate`** — **ID morto grava com 200 OK e some sem erro** |
| **Followup não sai** | Janela comercial? domingo? **janela 24h da Meta**? (`comum/PEGADINHAS.md` §8 e §25) |
| **Funil da Central todo zerado** | `STAGE_ORDER` não trocado (Etapa 11.2 / `ghl/PEGADINHAS.md` §GHL-14.1 / `comum/PEGADINHAS.md` §22) |
| **Central 500 em `/funil`** | Agente sem calendário (Etapa 11.3 / `ghl/PEGADINHAS.md` §GHL-14.3 / `comum/PEGADINHAS.md` §23) |
| **403 "Error 1010"** | faltou `User-Agent: Mozilla/5.0` no curl |
| **Lead sem resposta em rajada de teste** | **429** — rate limit do GHL (§A.10) |

---

# ANEXO A · As pegadinhas do GHL que este playbook pressupõe

> Cada item aqui custou horas de **produção real**. **Nenhum é teórico.** Estão repetidos em `ghl/PEGADINHAS.md` com o mesmo numeral — aqui ficam porque o playbook **depende** deles pra fazer sentido. Se você replicar sem ler, vai reencontrar todos.

## A.1 · 🚨 O provedor de WhatsApp do GHL DESCARTA áudio outbound *(DAC, 13/07/2026)*

| | |
|---|---|
| **Sintoma A** | `POST /conversations/messages {type:WhatsApp, message:'', attachments:[ogg]}` → status **`failed`**, erro *"The parameter text.body is required"* |
| **Sintoma B (o perigoso)** | com body **não-vazio** (ex.: `'🎧'`) → status **`delivered`** — **mas só o texto chega no celular**. O áudio **some em silêncio**. Falso positivo de entrega. |
| **A lição mais cara** | a validação antiga logava `voz: true` (decisão do modelo) e **ninguém tinha confirmado entrega no celular**. Achávamos que funcionava há **dias**. **SEMPRE teste voz em número real antes de vender.** |
| **Solução** | enviar pelo **uazapi**, mesmo número: `POST {UAZAPI_URL}/send/media`, header `token`, body `{number, type:'ptt', file:<url pública do ogg>}` → bolinha de voz de verdade. **A URL do `.ogg` hospedado no PRÓPRIO GHL serve como `file` público.** Código: `lib/voice.ts → sendVoiceNoteUazapi(phone, oggUrl)` — use `contact.phone` (o uazapi manda **por número**, não por contactId). |

## A.2 · Decisão de voz = **DETERMINÍSTICA** (não confie no modelo)

O marcador `[AUDIO]` escorrega — o modelo voicava até resposta a texto. **Fix no código** (`api/inbound.ts`):

```ts
const leadSentAudio = (target.body || '').startsWith('[áudio do lead]:')
if (reply.voice && leadSentAudio) { /* voz */ } else { /* texto */ }
```

> **Princípio: o que é determinístico vira CÓDIGO, não instrução de prompt.**

## A.3 · Hidratação de mídia precisa de espera EXPLÍCITA

O **GHL processa o anexo DEPOIS de disparar o webhook** — o buffer de 10s **não cobre isso de forma confiável**.

- Sem **`getHydratedHistory(convId)`** (**backoff 12×2s ≈ 24s** enquanto o último inbound for placeholder sem URL), o áudio **some do histórico** → o agente **responde em texto e fora do assunto**.
- O **`getMessages` NÃO pode descartar inbound vazio**: áudio não-hidratado vem com `body=""` e `attachments=[]` → tem que virar **`[mídia recebida sem texto]`**.
- **Custo:** áudio demora **~30s** pra responder. **Avise o cliente que é de propósito.**

## A.4 · Voz via uazapi cria GAP de histórico → alucinação

O GHL registra a nota de voz (mandada pelo uazapi) como **mensagem OUTBOUND VAZIA**. Se o `getMessages` descarta vazios, o modelo lê um histórico onde **ELE nunca respondeu** → alucina (*"aguardando você escolher o horário"*) e se repete.

**Fix:** outbound vazio vira marcador **`[<Agente> respondeu por áudio aqui]`**.
⚠️ É **marcador, não conteúdo** — pra conversa longa por voz, refinamento futuro = gravar o texto da fala no Redis/CRM e reinjetar.

## A.5 · Voz TEM que ser CURTA (~500 chars / 2–3 frases)

ElevenLabs a 64kbps ≈ **8KB/s** → **~800 chars batem no teto de 500KB** (guard) → **cai pra texto silenciosamente**. Prompt "showcase" tende a explicar o ecossistema inteiro e estourar. Regra firme no prompt: **em voz, ponto principal + gancho e puxa pra reunião**; detalhe vai por texto.

## A.6 · **NÃO delete a conversa do lead entre testes**

O gatilho **"Customer Replied" engasga no 1º evento de conversa recém-criada** → **"nem respondeu"** (o workflow não dispara e o **código nem roda**).
**Deixe a conversa existir.** Pra limpar poluição de contexto, o **marcador do item A.4 já resolve** — apagar a conversa troca um problema pequeno por um que parece bug de código.

## A.7 · STT: teste com Node, não curl — e **áudio real só por WhatsApp de verdade**

- `curl -F` no **Git Bash do Windows falha (exit 26)**. O caminho real (Node `fetch` + `FormData` + `Blob` → Groq) funciona.
- **Injetar mensagem inbound com attachment via API NÃO testa STT: o GHL APAGA o anexo do inbound injetado.**
- O Groq engole **ogg/opus direto**.

## A.8 · A API do GHL **NÃO envia template** de WhatsApp

Verificado no spec: existe `templateId`, **sem variáveis e sem endpoint**. **Não adianta procurar.**
**Único caminho suportado de reengajamento:** tag **`ia-fu-cN`** no contato → **Workflow GHL gatilho "Tag Added"** → **action WhatsApp com TEMPLATE aprovado**. Template de reengajamento = categoria **Marketing** (~R$0,35/envio BR; a Meta reclassifica quem tenta disfarçar de Utility). Lead responde o template → **janela reabre** → volta o texto livre.

## A.9 · Rate limit: **~100 requisições / 10s por location → HTTP 429**

**O caso real:** rajada de teste **somada a painel com polling automático** estourou o 429 e o **LEAD FICOU SEM RESPOSTA**.

| Fix | Onde |
|---|---|
| retry com **backoff 2/4/8s** | no client do GHL |
| **painel SEM polling automático** (só botão "Atualizar") | Central |
| `sleep(250ms)` | em loops de paginação |

## A.10 · IDs mudam debaixo de você **+ gravação em campo morto com 200 OK**

O time do cliente **deleta campo e renomeia etapa sem avisar** — aconteceu **no MESMO DIA: 4 campos deletados, 2 stages novos entre manhã e noite**.
E o **GHL aceita PUT em custom field ID INEXISTENTE devolvendo 200 silencioso** = **perda de dado invisível** (gravação em campo morto).
Por isso existe **`/api/validate`** (compara o mapa contra o CRM vivo) e **o guardião roda ele todo dia**.

## A.11 · Filtre `messageType` — senão **nota interna VAZA pro lead**

Monte o histórico com **ALLOWLIST**: `TYPE_SMS` / `TYPE_WHATSAPP`.

- Sem allowlist, **activities poluem** o contexto.
- **Grave:** `TYPE_INTERNAL_COMMENT` (**nota interna do time**) entra no contexto do modelo — **que pode REPETIR a nota interna pro lead**.

## A.12 · `GET /contacts/{id}` às vezes devolve `customFields: []`

Mesmo com o contato **tendo dados**. Pra **leitura confiável use `POST /contacts/search`**.
E no **PUT de opportunity**, custom field usa a chave **`field_value`** — **não `value`**.

## A.13 · Cloudflare 1010

Sem `User-Agent` de browser → **403 "Error 1010"** (GHL **e** Groq). Sempre mande UA de Chrome/`Mozilla/5.0`.

## A.14 · Central: `STAGE_ORDER` HARDCODED → funil ZERADO *(validado no Manoel, 19/07/2026)*

`area-cliente/lib/ghl.ts` tem os **stage IDs chumbados do 1º cliente que gerou o template**. Ao replicar, se não trocar, **`getFunnelStages` não casa nenhum id** → **todas as barras do funil ao vivo ficam ZERO** — **sem erro**, só zerado, e parece que o funil está vazio.
**Fix:** `GET /opportunities/pipelines` do cliente novo → substitua o `STAGE_ORDER` → marque **`ia:true`** nas etapas que o **agente** move.

## A.15 · Central quebra (500) se o agente **não tem calendário**

A página `/funil` renderiza `f.calendario.nome` / `janelaDias` direto. Agente sem agenda (ex.: fluxo de handoff) → o `/api/config` não devolve `funil.calendario` → **página 500** (`Cannot read properties of undefined`).
**Fix:** `calendario?` opcional em `AgentConfig` (`lib/agent.ts`) + guardar a seção AGENDA com `{f.calendario && (...)}`. O `/api/live` já cai gracioso (`.catch(() => ({proximos:[],realizados7d:0}))`) — a **página SSR não**.
**Lembrete:** cada Central é um **projeto Vercel PRÓPRIO** (`central-ia-<cliente>`) — nunca redeploya a de outro cliente.

---

# ANEXO B · Playground "Testar ao vivo" no GHL (o que é específico daqui)

> A doutrina completa do componente (o que é, segurança, fluxo que ele fecha, registro no manifesto, porte pro Kommo) está em **`comum/PLAYGROUND.md`**. Aqui fica o que é **da perna GHL**.

| Item | Valor |
|---|---|
| **Prova de produção** | **no ar na Metrik desde 19/07/2026** — componente em produção, não protótipo |
| **Referência de implementação a copiar** | `clientes/metriksales/agente-ia` (+ `clientes/metriksales/area-cliente/app/cerebro/page.tsx`) |
| **A troca de assinatura no GHL** | **`buildSystemFromText(promptTexto)` no lugar de `buildSystem(contact)`**, mantendo o **MESMO bloco dinâmico** (data/hora + lead stub) — é isso que faz o chat rodar o prompt **candidato** (o texto do editor) em vez do vigente |
| **Tools** | `simulateTool(name, input)` no lugar de `runTool(...)` — **dry-run**, zero efeito no CRM |
| **Propagação** | é componente **COMPARTILHADO** → redeploye **agente + Central de cada cliente** (a "4ª perna" do `SKILL.md`) |

---

## Checklist final antes de dizer "está no ar"

☐ `comum/DIAGNOSTICO.md` respondido · ☐ IDs puxados **ao vivo** (2 modelos de custom field + calendars com `Version: 2021-04-15`) · ☐ campos criados (Origem = SINGLE_OPTIONS, options como array de strings) · ☐ `prompt.md` com limites e regra de suporte · ☐ `crm-map.ts` com `stageOrder` COMPLETO · ☐ envs (incl. `WEBHOOK_SECRET` novo e `SELF_URL` público) · ☐ `/api/validate` → `ok:true` · ☐ **4 blocos visuais do GHL relidos** (atendimento · tracker sem gate · 3 templates + 3 workflows de FU · **Autopilot DESLIGADO**) · ☐ evals **10/10** · ☐ E2E completo com **voz ouvida no celular** · ☐ Central com os **5 pontos** trocados · ☐ rampagem por tag começando **em você**.
