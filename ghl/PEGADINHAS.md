# PEGADINHAS — GoHighLevel (o sangue derramado NESTA plataforma)

> Cada item aqui custou horas de **produção real**. **Nenhum é teórico.** Data e evidência em cada um — se você replicar sem ler, vai reencontrar todos.
>
> **Escopo deste arquivo:** só o que é **específico do GHL/LeadConnector**. As cicatrizes que valem para os dois CRMs (voz determinística, tamanho da nota de voz, janela de 24h da Meta, um número = um agente, Vercel/`VERCEL_URL`, rotinas cloud sem rede, cron Hobby + QStash, Upstash 1 DB, `thinking:disabled`, ToS do Claude Max, curl no Git Bash, handoff × followup, janela comercial × tique do relógio) moram em **`comum/PEGADINHAS.md`** — não estão duplicadas aqui, estão **mapeadas** no §GHL-16.
>
> Este arquivo é o ramo **GHL** do roteador do `SKILL.md` (pergunte o CRM antes de tudo). O irmão é `kommo/PEGADINHAS.md`. Nenhum dos dois depende de outra skill.

---

## 🧭 MAPA RÁPIDO — sintoma → seção

| Sintoma no cliente | Vá para |
|---|---|
| "Mandei áudio e ele respondeu em texto" / "o áudio não chega no celular" | §GHL-1, §GHL-2 |
| "A IA se repete / diz que está aguardando algo que ela já respondeu" | §GHL-3 |
| "Nem respondeu" (nenhuma execução no diário) | §GHL-0, §GHL-4, §GHL-13 |
| "Testei STT injetando mensagem pela API e não funcionou" | §GHL-5 |
| "O followup 2, 3 e 4 não entregam" | §GHL-6 |
| "O lead ficou sem resposta durante o teste" | §GHL-7 |
| "O campo não preenche" / "o funil não anda" | §GHL-8 |
| "A IA repetiu uma nota interna do time pro lead" 🚨 | §GHL-9 |
| "O contato tem os dados no CRM, mas a IA jura que não" | §GHL-10 |
| 403 `Error 1010` ao chamar GHL ou Groq | §GHL-11 |
| `v.trim is not a function` ao criar campo | §GHL-12 |
| "Dois bots responderam o mesmo lead" | §GHL-13 |
| "As barras do funil da Central estão TODAS zeradas" | §GHL-14 |
| Central com 500 em `/funil` | §GHL-14.3 |
| "Quero testar o prompt sem tocar no CRM" | §GHL-15 |

---

## §GHL-0 · O CONTRATO DE ENTRADA (o que a plataforma exige antes de qualquer código)

### 0.1 · A vida de uma mensagem no GHL

```
Lead manda "oi" no WhatsApp
  → GHL recebe → Workflow "Customer Replied" (filtro de CANAL + gate por TAG)
  → POST /api/inbound (Vercel)
      ├─ responde 200 IMEDIATO   ← senão o GHL REENVIA o webhook (retry = resposta dupla pro lead)
      └─ waitUntil(processa em background)
          1. tag "atendimento-humano"? → não responde (humano assumiu)
          2. BUFFER 10s no Redis (eleição: só o webhook MAIS NOVO sobrevive)
          3. histórico vem DO GHL — fonte da verdade; o agente é stateless
          4. mídia vira TEXTO (áudio→Groq · imagem/PDF→visão do Claude)
          5. Claude Sonnet + tools em loop (≤6 steps) → decide e AGE no CRM
          6. responde: texto (GHL) ou VOZ (ElevenLabs → uazapi ptt) ← §GHL-1
          7. diário no Redis + agenda checagem de silêncio (followup)
```

| Regra da plataforma | Por quê (a dor) |
|---|---|
| **Gatilho = `Customer Replied` com filtro de canal + condição de TAG DE GATE** | É o único gatilho que pega resposta de lead no canal certo; sem a tag, a IA atende quem o time não autorizou no dia 1 |
| **`POST /api/inbound` responde `200` IMEDIATO** e processa em `waitUntil` | Se demorar, **o GHL reenvia o webhook** e o retry vira **resposta dupla** pro lead |
| **Histórico é do GHL** (`GET`/`POST` nas conversas), não de banco próprio | Agente 100% stateless; humano e IA leem a MESMA conversa; zero sincronização |

### 0.2 · O trade-off de usar o CRM como fonte da verdade (decisão de arquitetura, cobrada aqui)

- **Ganha:** agente **100% stateless** · humano e IA veem a **MESMA** conversa · **zero sincronização**.
- **Paga:** dependência da API — **rate limit 429** (§GHL-7) — e necessidade de **filtrar o ruído** (activities e notas internas) antes de montar o transcript (§GHL-9).
- **Quando NÃO:** Kommo, que **não devolve transcript** — lá o histórico é nosso, no Redis (ver `kommo/PLAYBOOK.md`).

### 0.3 · Acessos e credencial (peça ANTES de marcar a data de go-live)

| Acesso | Por quê |
|---|---|
| **Admin do GHL** | precisa para gerar o PIT, criar **workflows** e submeter **templates** de WhatsApp |
| **WhatsApp conectado e TESTADO** | canal quebrado só aparece no E2E, no pior momento |
| **Calendário com disponibilidade real** | agenda sem slot livre = agente que promete horário que não existe |

**Credencial:** o GHL usa **Private Integration Token**, prefixo **`pit-`**.
**Envs específicas da plataforma no agente:** `GHL_TOKEN` (o PIT) e `GHL_LOCATION_ID`.
**Multi-cliente:** credenciais (PIT + `WEBHOOK_SECRET`) são **isoladas por cliente** — nunca reaproveite o PIT de uma location em outra.

---

## §GHL-1 · 🚨 O PROVEDOR DE WHATSAPP DO GHL **DESCARTA** ÁUDIO OUTBOUND

*(cliente DAC, 13/07/2026 — o primeiro de 5 bugs em cadeia da feature de voz)*

| | |
|---|---|
| **Sintoma A** | `POST /conversations/messages {type:'WhatsApp', message:'', attachments:[ogg]}` → status **`failed`**, erro literal: `The parameter text.body is required` |
| **Sintoma B (o perigoso)** | com body **não-vazio** (ex.: `'🎧'`) → o GHL devolve status **`delivered`** — **mas só o texto chega no celular**. O áudio **some em silêncio**. Falso positivo de entrega. |
| **A lição mais cara** | a validação antiga logava `voz: true` (a *decisão do modelo*) e **ninguém tinha confirmado entrega em número real**. Achávamos que funcionava **há dias**. |

**Doutrina que ficou:** **SEMPRE teste voz em número real antes de vender.** Log de intenção ≠ prova de entrega. Esta é a cicatriz que sustenta a lei "prova antes de promessa".

**Cura (o caminho da voz no GHL):**
```
OpenAI TTS-1 (padrão) ou ElevenLabs (premium) gera ogg/opus
  → hospeda o arquivo no PRÓPRIO GHL (a URL pública dele serve como `file`)
  → POST {UAZAPI_URL}/send/media   header: token
     body: { number, type: 'ptt', file: <url pública do ogg> }
  → bolinha de voz DE VERDADE no WhatsApp do lead
```
- Código: `lib/voice.ts → sendVoiceNoteUazapi(phone, oggUrl)`.
- Use **`contact.phone`**, não o `contactId`: a uazapi manda **por número**.
- **O que a voz PAGA:** uma peça a mais no stack (uazapi) + **gap de histórico** (§GHL-3).

---

## §GHL-2 · O GHL PROCESSA O ANEXO **DEPOIS** DE DISPARAR O WEBHOOK

- **Sintoma:** o lead manda áudio, o agente responde **em texto e fora do assunto** — como se a mensagem estivesse vazia.
- **Causa:** o webhook chega **antes** do GHL hidratar a mídia. ⚠️ **O buffer de 10s NÃO cobre a hidratação de forma confiável** — não conte com ele.
- **Cura:** `getHydratedHistory(convId)` — **backoff 12×2s ≈ 24s**, enquanto o último inbound ainda for placeholder **sem URL**.
- **Cura irmã (obrigatória):** `getMessages` **NÃO pode descartar inbound vazio** — áudio não-hidratado chega com `body=""` e `attachments=[]`. Esse inbound tem que virar o marcador **`[mídia recebida sem texto]`**, senão o áudio some do histórico e o modelo responde no vácuo.
- **Custo aceito:** áudio demora **~30s** pra ser respondido. **Avise o cliente que é de propósito** — senão ele acha que travou.

---

## §GHL-3 · A VOZ VIA UAZAPI CRIA **GAP DE HISTÓRICO** → ALUCINAÇÃO

- **Causa:** a nota de voz enviada pela uazapi é registrada no GHL como **mensagem OUTBOUND VAZIA**. Se o `getMessages` descarta vazios, **o modelo lê um histórico onde ELE nunca respondeu**.
- **Sintoma:** alucina e se repete — *"aguardando você escolher o horário"* logo depois de ter mandado os horários por áudio.
- **Cura:** outbound vazio vira marcador **`[<Agente> respondeu por áudio aqui]`**.
- ⚠️ **É marcador, não conteúdo.** Para conversa longa **inteira por voz**, o refinamento futuro é gravar o **texto da fala** no Redis/CRM e reinjetar no histórico.

---

## §GHL-4 · **NÃO DELETE A CONVERSA DO LEAD** ENTRE TESTES

- **Sintoma:** "nem respondeu" — o workflow não dispara e **o código nem roda** (nenhuma execução no diário).
- **Causa:** o gatilho **`Customer Replied` engasga no 1º evento de uma conversa recém-criada**. Apagar a conversa para "limpar o contexto" te devolve exatamente esse estado.
- **Decisão:** **deixe a conversa existir.** A poluição de contexto que você queria resolver apagando já é resolvida pelo **marcador de áudio** do §GHL-3.

---

## §GHL-5 · INBOUND INJETADO PELA API **PERDE O ANEXO** (não testa STT)

- **Fato:** injetar uma mensagem inbound com `attachment` via API **NÃO testa STT** — **o GHL apaga o anexo do inbound injetado**.
- **Consequência:** **teste de áudio real só com WhatsApp de verdade.**
- Complemento (vale nos dois CRMs, detalhe em `comum/PEGADINHAS.md`): `curl -F` no Git Bash do Windows falha (**exit 26**); o caminho que funciona é **Node fetch + FormData + Blob → Groq**, que engole **ogg/opus** direto.

---

## §GHL-6 · A API DO GHL **NÃO ENVIA TEMPLATE** DE WHATSAPP

- **Verificado no spec:** o campo `templateId` existe **sem variáveis** e **sem endpoint** correspondente. **Não adianta procurar** — não existe caminho por API.
- **Único caminho suportado (reengajamento fora da janela de 24h da Meta — a janela em si está em `comum/PEGADINHAS.md`):**

```
agente põe a tag  ia-fu-cN  no CONTATO
  → Workflow GHL com gatilho "Tag Added"
  → action WhatsApp com TEMPLATE APROVADO
  → lead responde o template → janela reabre → volta o texto livre
```
- Template de reengajamento é categoria **Marketing** (~R$0,35/envio no BR; a Meta **reclassifica** quem tenta disfarçar de Utility). Aprovação leva **1–2 dias**.

---

## §GHL-7 · RATE LIMIT **429** — ~100 REQUISIÇÕES / 10s POR LOCATION

- **O caso real:** **rajada de teste + painel com polling automático** estourou o limite → **o LEAD FICOU SEM RESPOSTA**.
- **Fixes (os três juntos):**
  1. retry com **backoff 2/4/8s** no client HTTP;
  2. **painel SEM polling automático** — só botão "Atualizar";
  3. **`sleep(250ms)`** em loops de paginação.

---

## §GHL-8 · CAMPO MORTO GRAVA COM **200 OK** + OS IDs MUDAM DEBAIXO DE VOCÊ

🚨 **A cicatriz mais cara do GHL, porque não gera erro nenhum.**

| | |
|---|---|
| **Fato 1** | O GHL **aceita `PUT` em custom field ID INEXISTENTE devolvendo 200 silencioso** = **perda de dado invisível** (gravação em campo morto). |
| **Fato 2** | O time do cliente **deleta campo e renomeia etapa sem avisar** — aconteceu **no MESMO DIA**: 4 campos deletados e 2 stages novos entre a manhã e a noite. |
| **Consequência** | Um mapa de IDs feito "de anotação" grava no vazio para sempre, com log de sucesso. |

**Anticorpos:**
1. **Lei: IDs do CRM sempre AO VIVO** — nunca de snapshot/memória.
2. **`/api/validate`** existe por causa disso: compara o mapa vs o CRM vivo e diz se os IDs ainda existem. **O guardião roda ele todo dia.**
3. **Debug "o campo não preenche": rode `/api/validate` PRIMEIRO** — ID morto grava com 200 OK e some sem erro.

**Discovery ao vivo (os curls que valem no GHL — note as VERSÕES diferentes):**
```bash
# Pipelines e stages            → Version: 2021-07-28
curl "https://services.leadconnectorhq.com/opportunities/pipelines?locationId=<LOC>" \
  -H "Authorization: Bearer pit-..." -H "Version: 2021-07-28" -H "User-Agent: Mozilla/5.0"

# Custom fields — DOIS MODELOS SEPARADOS
curl "https://services.leadconnectorhq.com/locations/<LOC>/customFields?model=opportunity" \
  -H "Authorization: Bearer pit-..." -H "Version: 2021-07-28" -H "User-Agent: Mozilla/5.0"
curl "https://services.leadconnectorhq.com/locations/<LOC>/customFields?model=contact"     \
  -H "Authorization: Bearer pit-..." -H "Version: 2021-07-28" -H "User-Agent: Mozilla/5.0"

# Calendários                   → Version: 2021-04-15  (DIFERENTE da de pipelines!)
curl "https://services.leadconnectorhq.com/calendars/?locationId=<LOC>" \
  -H "Authorization: Bearer pit-..." -H "Version: 2021-04-15" -H "User-Agent: Mozilla/5.0"
```
⚠️ **Todo curl ao GHL leva `User-Agent: Mozilla/5.0`** junto com `Authorization` e `Version` — sem UA a request pode ser **bloqueada** (§GHL-11).

---

## §GHL-9 · FILTRE `messageType` POR ALLOWLIST — SENÃO A **NOTA INTERNA VAZA PRO LEAD**

- **Regra:** ao montar o histórico, aceite **apenas** `TYPE_SMS` e `TYPE_WHATSAPP` (**allowlist**, nunca blacklist).
- **Sem isso, leve:** as **activities** poluem o contexto do modelo.
- **Sem isso, GRAVE:** 🚨 **`TYPE_INTERNAL_COMMENT`** — a **nota interna do time** — entra no contexto do modelo, **que pode REPETI-LA pro lead**.

---

## §GHL-10 · `GET /contacts/{id}` ÀS VEZES VEM COM `customFields: []`

- **Sintoma:** o contato **tem** os dados no CRM, mas a leitura volta vazia — a IA age como se não soubesse nada.
- **Cura de leitura:** para leitura confiável use **`POST /contacts/search`**, não o `GET` por id.
- **Cura de escrita (irmã, mesma família):** no **PUT de opportunity**, custom field usa a chave **`field_value`** — **NÃO `value`**. Mandar `value` é mais uma forma de gravar no vazio.

---

## §GHL-11 · CLOUDFLARE **1010** (GHL **e** Groq)

- **Sintoma:** `403` com `Error 1010`.
- **Causa:** request **sem `User-Agent` de browser**.
- **Cura:** sempre mande **UA de Chrome** (`User-Agent: Mozilla/5.0 ...`) — em curl, no client HTTP e **também no download de mídia** para descrever imagem/PDF (o Cloudflare do GHL/uazapi bloqueia o download sem UA).

---

## §GHL-12 · CUSTOM FIELDS: FOLDER, TIPO E O `v.trim is not a function`

| Item | Regra do GHL |
|---|---|
| **Criar pasta de campos** | `POST /locations/{id}/customFields` com **`documentType: "folder"`** |
| **Options de um campo** | 🚨 **ARRAY DE STRINGS**. Mandar array de objeto retorna o erro literal **`v.trim is not a function`** |
| **Campo `Origem`** | tipo **`SINGLE_OPTIONS`** (dropdown de opção única), **não** texto livre |
| **Modelos separados** | `?model=contact` e `?model=opportunity` são universos distintos (§GHL-8) |

**Campos que o template espera no Contact:** `Origem` (SINGLE_OPTIONS) · UTMs `_first`/`_last` · `Primeira mensagem` · `Data primeira mensagem` · `Remarketing` (Cadência 1..N) · `Resumo da conversa`. No **Opportunity**: os campos de qualificação que saíram do diagnóstico.

---

## §GHL-13 · A API **NÃO CRIA WORKFLOW** — a etapa manual é obrigatória (e tem uma armadilha)

⚠️ **Não existe automatizar isto.** A configuração dos workflows é **manual na UI do GHL**. Quem promete "instalo tudo por API" no GHL está errado.

| # | Workflow | Configuração exata |
|---|---|---|
| 1 | **Atendimento** | trigger **`Customer Replied`** (canal WhatsApp) → **condição da TAG DE GATE** → **Custom Webhook** `POST <agente>/api/inbound?secret=X` com `contact_id={{contact.id}}` |
| 2 | **Rastreador** ⚠️ **SEM tag de gate!** | `Contact Created` → `POST <agente>/api/tracker?secret=X` **· E ·** `Customer Replied` + condição **"Origem is empty"** → o MESMO webhook |
| 3 | **Followup fora da janela** | 3 workflows: `Tag Added: ia-fu-c2` / `ia-fu-c3` / `ia-fu-c4` → action **WhatsApp** disparando o **template** correspondente da cadência (§GHL-6) |
| 4 | 🚨 **DESLIGAR o Conversation AI nativo (Autopilot)** no canal | **Se ficar ligado, DOIS bots respondem o mesmo lead.** É a checagem que mais some do checklist |

> O rastreador é **sem gate de propósito**: origem/UTM tem que ser capturada de **todo** lead, inclusive os que a IA não atende.

---

## §GHL-14 · CENTRAL DE IA / ÁREA DO CLIENTE (validado no Manoel, 19/07/2026)

### 14.1 🚨 `STAGE_ORDER` é HARDCODED — o funil zera SEM ERRO

- **Onde:** `area-cliente/lib/ghl.ts → STAGE_ORDER` — os stage IDs vêm **chumbados do 1º cliente que gerou o template**.
- **Sintoma:** ao replicar sem trocar, **`getFunnelStages` não casa NENHUM id** → **todas as barras do funil ao vivo ficam ZERO**. **Sem erro nenhum** — parece só que o funil está vazio. (Idem no agente: `lib/ghl.ts → STAGE_ORDER`.)
- **Cura:** puxe os stages do cliente novo com **`GET /opportunities/pipelines`** e marque **`ia: true`** nas etapas que o agente move.

### 14.2 Envs da Central no GHL (só valem em novo deploy)

`AGENT_URL` (deploy do agente) · `AGENT_SECRET` (= `WEBHOOK_SECRET` do agente) · **`GHL_TOKEN`** · **`GHL_LOCATION_ID`** · **`GHL_PIPELINE_ID`** · **`GHL_CALENDAR_ID`** (**deixe vazio se o cliente não agenda**).
⚠️ Cada Central é um **projeto Vercel PRÓPRIO** (`central-ia-<cliente>`) — **NUNCA redeploya a Central de outro cliente**. Mudou env → **redeploy**, senão nada muda.

### 14.3 Central quebra (500) se o agente não tem calendário

- **Causa:** a página `/funil` renderiza `f.calendario.nome` / `janelaDias` **direto**. Agente sem agenda (ex.: fluxo de handoff puro) → o `/api/config` não devolve `funil.calendario` → **página 500** (`Cannot read properties of undefined`).
- **Cura:** `calendario?` **opcional** em `AgentConfig` (`lib/agent.ts`) + guardar a seção AGENDA com `{f.calendario && (...)}`.
- **Nota:** o `/api/live` já cai gracioso (`.catch(() => ({proximos:[],realizados7d:0}))`) — **mas a página SSR não**, tem que guardar.

---

## §GHL-15 · PLAYGROUND "TESTAR AO VIVO" — a troca que o GHL exige

- **Prova de produção:** componente **no ar na Metrik desde 19/07/2026** — não é protótipo.
- **Referência de implementação a copiar:** `clientes/metriksales/agente-ia` (+ `clientes/metriksales/area-cliente/app/cerebro/page.tsx`).
- **A troca específica do agente GHL:** use **`buildSystemFromText(promptTexto)`** no lugar de **`buildSystem(contact)`** — mantendo **o MESMO bloco dinâmico** (data/hora + lead stub). É o que faz o chat rodar o prompt **candidato** (o texto do editor) em vez do vigente.
- Tools em **dry-run** (`simulateTool`) → **ZERO efeito no CRM**. Doutrina e demais detalhes do componente em `comum/PLAYGROUND.md`.

---

## §GHL-16 · O QUE **NÃO** ESTÁ AQUI (mora em `comum/PEGADINHAS.md`)

Mapa de-para com a numeração da antiga skill `agente-ia-ghl` (**aposentada em 22/07/2026**) — para quem procura por "§N" em código, commit ou conversa antiga.

| § histórico | Cicatriz | Onde está agora |
|---|---|---|
| §1 | Provedor de WhatsApp do GHL descarta áudio outbound | **aqui — §GHL-1** |
| §2 | Decisão de voz = DETERMINÍSTICA (código, não prompt) | `comum/PEGADINHAS.md` |
| §3 | Hidratação de mídia precisa de espera explícita | **aqui — §GHL-2** |
| §4 | Voz via uazapi cria gap de histórico | **aqui — §GHL-3** |
| §5 | Voz tem que ser CURTA (~500 chars) | `comum/PEGADINHAS.md` |
| §6 | Não delete a conversa entre testes | **aqui — §GHL-4** |
| §7 | STT: teste com Node, não curl · inbound injetado perde anexo | **aqui — §GHL-5** (+ parte comum) |
| §8 | Janela de 24h da Meta | `comum/` — **o caminho tag→workflow→template é daqui: §GHL-6** |
| §9 | UM NÚMERO = UM AGENTE (coexistência) | `comum/PEGADINHAS.md` |
| §10 | Rate limit 429 | **aqui — §GHL-7** |
| §11 | IDs mudam + gravação em campo morto com 200 OK | **aqui — §GHL-8** |
| §12 | `messageType` allowlist / nota interna vaza | **aqui — §GHL-9** |
| §13 | `contacts/search` vs `GET` · `field_value` no PUT | **aqui — §GHL-10** |
| §14 | Cloudflare 1010 | **aqui — §GHL-11** |
| §15 | Nunca use `VERCEL_URL` pra self-fetch | `comum/PEGADINHAS.md` |
| §16 | Rotinas cloud do Claude não têm saída de rede | `comum/PEGADINHAS.md` |
| §17 | Vercel Hobby = 1 cron/dia · QStash como relógio | `comum/PEGADINHAS.md` |
| §18 | Upstash free = 1 database (namespace por cliente) | `comum/PEGADINHAS.md` |
| §19 | Sonnet sem `thinking:{type:'disabled'}` → resposta vazia | `comum/PEGADINHAS.md` |
| §20 | Claude Max como backend = violação de ToS | `comum/PEGADINHAS.md` |
| §21 | curl no Git Bash Windows corrompe UTF-8 | `comum/PEGADINHAS.md` |
| §22 | `STAGE_ORDER` hardcoded → funil zerado | **aqui — §GHL-14.1** |
| §23 | Central quebra (500) sem calendário | **aqui — §GHL-14.3** |
| §24 | Handoff se auto-sabota (encaminha E agenda followup) | `comum/PEGADINHAS.md` |
| §25 | Janela comercial engole o tique do relógio | `comum/PEGADINHAS.md` |

---

## ✅ CHECKLIST GHL — passe o olho antes de dizer "está no ar"

☐ Workflow de atendimento com **filtro de canal + tag de gate**
☐ **Autopilot / Conversation AI nativo DESLIGADO** no canal
☐ Workflow **rastreador SEM gate** (Contact Created + Origem is empty)
☐ 3 templates aprovados + 3 workflows `Tag Added: ia-fu-cN`
☐ `/api/validate` → `ok:true` (nenhum ID morto)
☐ `POST /api/inbound` respondendo **200 imediato**
☐ Histórico filtrado por **allowlist de `messageType`**
☐ Leitura de contato por **`POST /contacts/search`**; escrita de opp com **`field_value`**
☐ `User-Agent` de browser em **toda** chamada (API e download de mídia)
☐ **Voz OUVIDA no celular** (não "delivered" no log) — §GHL-1
☐ `STAGE_ORDER` do cliente (agente **e** Central) com `ia:true` nas etapas da IA
☐ `GHL_CALENDAR_ID` vazio ⇒ `calendario?` opcional e seção AGENDA guardada
## §GHL-17 · DUPLICAÇÃO DE OPORTUNIDADE: O AGENTE NÃO É O ÚNICO ESCRITOR

- **Sintoma:** o mesmo lead aparece em mais de uma oportunidade, mesmo quando o agente não possui uma chamada explícita de criação; contatos semelhantes também podem surgir com variações do nono dígito brasileiro.
- **Causa:** o GHL pode ter um circuito paralelo. Um workflow amplo como `Contact Created → Add Tag` alimenta outros workflows, e um fluxo legado do Conversation AI pode conter `Criar ou atualizar a oportunidade`. Esse escritor opera independentemente do agente externo. A variação `+55 DDD 9XXXXXXXX` × `+55 DDD XXXXXXXX` também impede deduplicação ingênua por igualdade literal.
- **Cura:** centralize a criação no agente externo com a regra **reutiliza 1 · cria quando 0 · bloqueia quando 2+**. Todo lead atendido deve sair da execução com card. A classificação Educação × Empresarial considera oferta, mensagem, campanha, UTMs e tags; não reduza Educação a “curso” nem Empresarial a “empresa”. Se ainda estiver ambíguo, crie uma rota explicitamente provisória e refine após uma pergunta-chave, permitindo troca de pipeline apenas enquanto o card continuar na entrada. Ao criar ou reutilizar, espelhe deterministicamente todas as UTMs disponíveis do contato/attribution na opportunity. O POST não repete automaticamente em 5xx: releia o CRM antes de concluir que falhou. No GHL, remova toda ação nativa concorrente. Para contato, normalize para E.164 e trate o nono dígito como busca de alias, nunca como alteração cega.
- **Anticorpo:** execute duas vezes o mesmo evento e prove: um contato canônico e exatamente uma oportunidade aberta no funil escolhido; a segunda execução precisa reutilizar o mesmo ID. O `/api/validate` confere os dois pipelines e as etapas esperadas por nome.
- **Evidência (28/07/2026):** na conta Metrik, o workflow `Adiciona Tag - Bia` estava publicado com `Contact Created → Add Tag`; também havia um workflow legado `Agende de qualificação e agendamento` com a ação `Criar ou atualizar a oportunidade` no funil antigo `[05] Vendas - Serviços`, removida e publicada. O agente passou a garantir a oportunidade nos funis `01 · Comercial — Educação` e `02 · Comercial — Empresarial` pela regra 1/0/2+, com classificação explícita da intenção.

☐ Todo lead atendido termina com opportunity; só a rota idempotente `garantir_oportunidade` cria
☐ Todas as UTMs disponíveis foram espelhadas na opportunity na criação/reutilização
☐ Rota ambígua está marcada como provisória e pode ser refinada sem duplicar
☐ Workflows nativos que criam oportunidade foram inventariados e não concorrem com o agente
☐ Telefone canônico E.164 + busca segura do alias com/sem nono dígito
☐ Teste repetido duas vezes reutiliza o mesmo ID e não cria oportunidade adicional

---

## §GHL-18 · TAG DE TEMPLATE NÃO É PROVA DE MENSAGEM ENVIADA

- **Sintoma:** a Central contabiliza follow-up como enviado, a cadência avança e o contato recebe `ia-fu-cN`, mas nenhuma mensagem aparece na conversa nem chega ao WhatsApp.
- **Causa:** o motor tratou `addTags(...)=200` como confirmação de entrega. A tag dependia de um workflow GHL inexistente, rascunho, sem template configurado ou com gatilho incorreto. O log ficou verde sem existir `messageId` ou outbound novo.
- **Cura:** antes de avançar a régua, fotografe os IDs da conversa, aplique a tag, aguarde a execução do workflow e releia a conversa. Só marque `enviado` quando surgir outbound novo. Se não surgir, remova a tag, mantenha a mesma cadência, reagende e alerte. No workflow, valide manualmente gatilho, ordem dos ramos, template aprovado e `Parar ao receber resposta`; texto gerado pelo construtor do GHL não é prova da árvore salva.
- **Anticorpo:** o teste precisa mostrar três evidências juntas: workflow `Publicado(a)`, outbound novo na conversa e cadência avançada somente depois dele. Um `200`, uma tag ou a descrição da IA do builder isoladamente não valem.
- **Evidência (29/07/2026):** na DAC, cadências foram registradas como template enviado apesar de não haver workflow correspondente. O workflow de proposta gerado pela IA do GHL também declarou ter removido `Cliente respondeu`, mas o gatilho continuava na árvore publicada e precisou ser apagado manualmente.

---

# Cache de slots em RAM no serverless faz a IA negar o horário que acabou de oferecer

**Sintoma:** a IA oferece um horário livre; quando o lead escolhe na mensagem seguinte, ela diz que o horário não está disponível ou consulta outra data. **Causa:** a lista da última consulta estava em um `Map` em memória. A resposta do lead pode cair em outra instância Vercel, onde o mapa nasce vazio. **Cura:** no momento de agendar, consultar novamente a agenda real e validar o ISO escolhido contra os slots atuais; o `freeBusy` final continua como proteção contra corrida. **Anticorpo:** nenhum estado que precise sobreviver à próxima mensagem pode morar apenas em RAM serverless; use fonte real ou Redis. Antes de criar, bloqueie também novo agendamento quando a oportunidade já estiver na etapa de reunião. Validado em 27/07/2026 após conversa real em que um slot oferecido foi recusado no turno seguinte.
