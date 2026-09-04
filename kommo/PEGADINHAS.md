# PEGADINHAS — KOMMO (o sangue já derramado NESTE CRM)

> Aqui só entra o que é **específico do Kommo**. O que vale para os dois CRMs (voz, janela 24h da Meta, coexistência "um número = um agente", Vercel/Upstash, modelo, handoff × followup, janela comercial × tique do relógio) está em **`comum/PEGADINHAS.md`** — leia os dois antes de prometer qualquer coisa a cliente.
>
> **Nenhum item aqui é teórico.** Cada um custou hora de produção real, tem data e evidência. Se você replicar sem ler, vai reencontrar todos.

---

## §0 · O TERRENO — as 3 diferenças estruturais que GERAM todas as cicatrizes daqui

A variante Kommo do agente serverless foi construída e deployada em **2026-07-11**, como **dogfood da própria Metrik**. Ela reusa ~80% da arquitetura do GHL (`comum/ARQUITETURA.md`), mas **três diferenças estruturais definem TUDO** — quase toda pegadinha desta página é consequência direta de uma delas:

| # | Diferença estrutural | Consequência prática |
|---|---|---|
| **1** | **O Kommo NÃO devolve transcript de chat.** Não há como reler a conversa pela API do CRM. | O histórico é **NOSSO**, no Redis (`ak:conv:{leadId}`). No GHL o CRM era a fonte da verdade da conversa; aqui **não é**. |
| **2** | **A API v4 do Kommo NÃO envia mensagem.** | O envio é **indireto**: ou pelo **Salesbot** (Desenho A) ou pela **uazapi** (Desenho B). Toda a complexidade de "depositar resposta + disparar bot" nasce daqui. |
| **3** | **O Kommo é LEAD-cêntrico.** | Todas as tools operam no **LEAD** — não em contact/opportunity como no GHL. Tag, campo, etapa, task: tudo pendurado no lead. |

**Decorrência imediata (e inegociável):**

| Regra | Por quê |
|---|---|
| **Redis é OBRIGATÓRIO no Kommo** | O histórico mora lá. No GHL o Redis era coordenação/auxiliar (dava pra viver sem, com dor); aqui, sem Redis **não existe conversa**. |
| **Chaves com prefixo `ak:`** | Para dividir o **MESMO database Upstash** com o agente GHL sem colisão (Upstash free = 1 DB — ver `comum/PEGADINHAS.md`, namespace). |

**Capacidades declaradas do agente Kommo** (o que o frontmatter promete e a produção sustenta): atende WhatsApp via **webhook nativo `add_message`**, entende **ÁUDIO** (Groq), **qualifica gravando campos do LEAD por `enum_id`**, **move funil**, **marca reunião** (task + campo, sem Calendars API) e faz **followup com cadências geradas por IA**.

**Ativos que NÃO se recriam do zero:**

| Ativo | Onde |
|---|---|
| **Template do agente Kommo** | `clientes/metriksales/agente-ia-kommo/` — **copiar esta pasta** |
| **Produção de referência (dogfood Metrik)** | https://agente-ia-kommo-metriksales.vercel.app · projeto Vercel `agente-ia-kommo-metriksales` |

**Processo de sessão nova:** invocar a skill + ler `clientes/metriksales/agente-ia-kommo/README.md`. Depois: discovery **AO VIVO** dos IDs antes do `crm-map` (a conta muda no mesmo dia), review adversarial antes de cliente real, E2E com lead próprio, rampagem por tag.

---

## §1 · O CANAL DECIDE TUDO — Desenho A × Desenho B

**No diagnóstico do Kommo só o bloco de canal muda** (o resto de `comum/DIAGNOSTICO.md` vale igual): pergunte se o **WhatsApp é OFICIAL ou uazapi** — a resposta define **Desenho A ou Desenho B**.

> 💡 **Decisão de arquitetura:** ter **uazapi própria** é o que libera, no Kommo, o **Desenho B** (envio pela uazapi em vez do Salesbot) — com multi-mensagem e voz. Sem uazapi, você está preso ao Desenho A e às limitações do Salesbot (§2.10) e da janela 24h (§2.9).

### Desenho A — WhatsApp OFICIAL dentro do Kommo (`TRANSPORT=salesbot`)

```
Kommo webhook nativo add_message (form-urlencoded, chaves "message[add][0][...]")
 → /api/inbound (200 imediato + waitUntil)
 → dedup por msgId + STT do áudio + grava no histórico Redis ak:conv:{leadId}
 → GATE por TAG no LEAD (avaliado ANTES de processar)
 → buffer 10s (token election) → Claude + tools (≤6 steps)
 → DEPOSITA a resposta (não envia): campo "Resposta IA (agente)" no lead + outbox no Redis
 → POST /api/v2/salesbot/run  [{bot_id, entity_id, entity_type: "leads"}]
 → Salesbot chama nosso widget-request /api/salesbot?secret=
 → NÓS POSTamos no return_url:
     {data: {resposta_ia}, execute_handlers: [{handler: "goto", params: {type: "question", step: 1}}]}
 → o bot envia literalmente a macro {{json.resposta_ia}} no passo seguinte ao widget-request
```

O ponto mental que salva horas de debug: **a resposta é DEPOSITADA, não enviada.** Quem envia é o Salesbot. Se a mensagem não chegou ao lead, o problema pode estar em qualquer um dos três elos (depósito → `salesbot/run` → bot no UI) — isole antes de acusar o código.

### Desenho B — WhatsApp na uazapi (`TRANSPORT=uazapi`, endpoint `/api/uazapi`)

```
uazapi webhook (in/out/fromMe → histórico COMPLETO) → /api/uazapi
 → findOpenLeadByPhone: resolve o lead pelo telefone via  contacts?query=<fone>&with=leads
 → mesmo pipeline de processamento do Desenho A
 → envio DIRETO: /send/text (multi-mensagem) e /send/media {type:"ptt"} (voice note)
```

**Validado E2E em 2026-07-12 com voice note real.**

### Os dois coexistem — e o transport é DINÂMICO **por lead**

Não é global. Mensagem que entra pelo **webhook do Kommo** responde por **Salesbot**; mensagem que entra pela **uazapi** responde por **uazapi** (com voz). **Os dois desenhos vivem no MESMO deploy.**

- O canal do lead fica gravado em **`ak:via:{leadId}`**.
- O **followup usa o ÚLTIMO canal usado** pelo lead.

**As 6 tools do agente Kommo:** `buscar_dados_lead` · `adicionar_tag` · `mover_etapa_funil` · `preencher_qualificacao` · `marcar_reuniao` · `escalar_para_humano`.

---

## §2 · AS 14 PEGADINHAS VERIFICADAS DO KOMMO

### 1. 🚨 PATCH de tags **SUBSTITUI o conjunto inteiro**
- **Sintoma:** você adiciona uma tag e o lead **perde todas as outras** — inclusive a `GATE_TAG` que mantém o agente ligado, e a `atendimento-humano` que o desliga.
- **Causa:** no Kommo, o `PATCH` do lead com `_embedded.tags` **não faz merge** — o array enviado vira o conjunto final.
- **Cura:** **sempre merge local.** Use `addLeadTags` / `removeLeadTags` do template (leem as tags atuais, calculam o novo conjunto e só então gravam). Nunca escreva tag "na mão" num PATCH.

### 2. Multiselect também SUBSTITUI
- Mesma mecânica da #1, agora em campo. Gravar um valor novo apaga os anteriores.
- **Cura:** `preencher_qualificacao` faz **UNION com os `enum_id`s atuais** antes de gravar.

### 3. `select` / `multiselect` gravam por **`enum_id`**, NÃO por value
- Mandar o texto da opção não dá erro útil — dá dado perdido.
- **Cura:** o **`crm-map` carrega os enums**. Item 2 da personalização por cliente: `lib/crm-map.ts` com os IDs Kommo **ao vivo** — `pipeline_id`, `status_ids` com o "quando mover", `field_ids` com o "quando preencher", **`ENUM_IDS` das opções**, campo de resposta, campo de cadência de followup e janela de reunião.

### 4. 🚨 Loop de ECO no `add_message` (loop infinito REAL — aconteceu no Imigre USA)
- **Sintoma:** o agente responde, o webhook `add_message` dispara **pela mensagem que o PRÓPRIO bot enviou**, o agente responde de novo… infinito.
- **Cura — proteção anti-eco em 3 camadas no template:**

| Camada | Mecanismo |
|---|---|
| 1 | **Hash da última resposta** (`ak:lastout:`) — se o texto que chegou é o que acabamos de mandar, descarta |
| 2 | **Campo `direction`** do payload |
| 3 | **Rate limit 10/min/lead** — a rede de segurança que impede a sangria mesmo se 1 e 2 falharem |

### 5. O webhook chega **form-urlencoded**, com chaves em colchetes
- `message[add][0][text]` — não é JSON.
- **Cura:** o parser precisa cobrir **formato PLANO E ANINHADO** (o template já cobre os dois).

### 6. Payload confirmado em produção (Metrik) — use este, não o da doc
```
account[id]
message[add][0][id]
message[add][0][entity_id]
message[add][0][contact_id]
message[add][0][text]
message[add][0][created_at]
message[add][0][attachment][type]
message[add][0][attachment][link]
```
- **Tipos de attachment do Kommo:** `voice` · `picture` · `file`.
- **O link do áudio é PÚBLICO** — o **Groq baixa direto, sem auth**. (Isso é uma boa notícia: é o oposto da dor de hidratação de mídia do GHL.)

### 7. `salesbot/run`: `entity_type` é a STRING `"leads"` — e o 502 mente
- Endpoint **legado v2**: `entity_type` vai como **string** `"leads"` (não enum, não plural inferido).
- 🚩 **Um 502 do `salesbot/run` PODE ter rodado mesmo assim.** Por isso o sender **NÃO faz retry em 5xx** — retry cegaria em **mensagem duplicada** pro lead. Prefira o lead não receber a receber duas vezes.

### 8. Agendamento: o Kommo **não tem Calendars API**
- **Cura:** a tool `marcar_reuniao` valida a **janela** (vinda do `crm-map`) e então: cria **TASK** + preenche o **campo de data** + **move a etapa**.
- **Números que importam:** a task de reunião usa **`task_type_id: 2`**, e o campo `date_time` grava **epoch em SEGUNDOS** (não em milissegundos — mandar ms joga a reunião para o ano 55.000 sem erro nenhum).

### 9. Janela 24h da Meta vale no WhatsApp **OFICIAL** do Kommo
- **Cadência 1 (12h) entra. Cadência 2+ NÃO entrega texto livre** — e, como no GHL, **não entrega e não dá erro claro**.
- **Saídas para cadência 2+ no oficial:** usar **uazapi (Desenho B)** **ou** um bloco de **template WABA aprovado dentro do bot**.

### 10. Salesbot = **1 mensagem por resposta**
- As "partes" da resposta viram **parágrafos** de uma mensagem só.
- **Multi-mensagem e voz só existem no Desenho B** (uazapi). Não venda "ela manda em pedacinhos, com áudio" para cliente que está no oficial via Salesbot.

### 11. O lead pode estar em **OUTRO pipeline** — fail-closed
- As tools **recusam** a operação se `pipeline_id` ≠ mapa **ou** se o status está fora do `stageOrder`.
- **Por quê:** mexer em lead de outro funil é pior que não mexer. Stage desconhecido = não toca (mesma doutrina do GHL: `comum/ARQUITETURA.md`, tools com alçada e guards).

---

### 12. Mensagem digitada pelo HUMANO pode entrar como se fosse do lead 🟪

- **Sintoma:** o vendedor responde pelo próprio Kommo e, um instante depois, o agente responde **por cima** dele — às vezes contradizendo o que o humano acabou de dizer.
- **Causa:** o campo de direção do `add_message` **não vem sempre** (é a camada 4 do anti-eco, §4). Quando não vem, e o texto não é idêntico ao último que **nós** enviamos (o hash `ak:lastout:` não bate), a mensagem do humano é registrada como inbound — e o agente acha que é a vez dele.
- **Conserto:** a defesa real **não é técnica no webhook, é de processo**: humano assumiu = tag `atendimento-humano` no lead (a tool `escalar_para_humano` faz sozinha; o time faz na mão quando entra por conta própria). Com a tag, `processLead` sai antes de qualquer coisa. **Ensine isso ao time no dia da entrega — é a regra nº 1 da operação.**
- **Limitação assumida do Desenho A:** mensagem de atendente digitada no Kommo **não entra** no histórico do Redis. É aceitável porque humano no comando = agente desligado. No **Desenho B (uazapi) o problema não existe**: a instância manda tudo, inclusive `fromMe`, e o histórico fica completo.

### 13. Bot de envio ausente = agente "MUDO" (e você jura que ele quebrou) 🟪

- **Sintoma:** os logs mostram o agente pensando, chamando tools e movendo etapa — e o lead **não recebe nada**.
- **Causa:** no Desenho A quem entrega é o **Salesbot**, e o `KOMMO_BOT_ID` é o único passo manual da instalação (~3 min na UI). Sem ele, não há entrega.
- **Conserto (já no template):** o `transport.ts` deposita a resposta **ANTES** de tentar disparar — no campo `Resposta IA (agente)` do lead **e** no outbox do Redis (TTL 10 min) — e só então falha com mensagem explícita. Ou seja: mesmo mudo, **a resposta está no card**, visível, com o texto que teria saído. Você depura pelo card, não pelo escuro.
- **As duas formas de montar o bot:** (a) *widget-request* → bloco de request pro `/api/salesbot?secret=…` e o passo seguinte envia `{{json.resposta_ia}}` (padrão — vem do outbox, mais fresco); (b) *campo do lead* → um único bloco "Enviar mensagem" com o conteúdo de `Resposta IA (agente)` (quando não se quer widget).

### 14. O bot dispara e manda MENSAGEM EM BRANCO 🟪

- **Sintoma:** o bot roda, mas a mensagem sai vazia (ou o bot morre no passo 0).
- **Causa:** o callback do widget-request achou o **outbox vazio** — run atrasado, run duplicado, ou outbox já consumido numa volta anterior (`getOutbox` **lê e apaga**, TTL 10 min).
- **Conserto (já no `api/salesbot.ts`):** com texto, responde ao `return_url` com o payload + o handler que empurra o bot pro passo 1:
  ```json
  { "data": { "resposta_ia": "..." },
    "execute_handlers": [{ "handler": "goto", "params": { "type": "question", "step": 1 } }] }
  ```
  **Sem texto, `execute_handlers` vai VAZIO de propósito** — o bot para em vez de mandar vazio, e o log avisa `outbox vazio pro lead N (run atrasado ou duplicado?)`. **Melhor um silêncio explicado que uma mensagem em branco no WhatsApp do cliente.**

### 15. O webhook reconhece imagem/PDF, mas o agente NÃO VÊ o conteúdo 🟪

- **Sintoma:** o lead envia um print ou PDF visível no Kommo, e o agente responde que não consegue visualizar ou pede uma descrição.
- **Causa:** reconhecer `attachment.type=picture|file` não é visão. O parser antigo descartava `attachment.link` e gravava somente `[imagem recebida]` ou `[arquivo recebido]` no histórico. O modelo nunca recebia os bytes.
- **Cura:** baixar o link público do attachment na entrada, limitar tamanho e timeout, enviar uma única vez ao modelo como bloco `image` ou `document`, e gravar o resultado textual no Redis como `[imagem do lead]: ...` ou `[documento PDF do lead]: ...`.
- **Anticorpo:** teste real separado para imagem e PDF. Ver o thumbnail no Kommo não prova leitura. O log precisa registrar a descrição criada e a resposta deve citar conteúdo que só existe dentro do arquivo. Em falha de download/visão, nunca fingir leitura. Escalar para humano.
- **Evidência:** validado em 23/07/2026 no TS&D. A imagem e um PDF real foram lidos diretamente pela API; o defeito original estava confirmado no `api/inbound.ts`, que substituía ambos por placeholders.

## §3 · O BLOCO uazapi (Desenho B) — pegadinhas verificadas em produção

> E2E validado **2026-07-12**, com **voice note real**.

### u1. Payload da Bridge-API (e o webhook que se sobrescreve)
- Formato: `{EventType: "messages", chat, message}` — **texto em `message.text`**, **mídia em `message.content.URL`**.
- ⚠️ A URL `.enc` é **criptografada e INÚTIL direto** — não tente baixar.
- `fromMe` + `wasSentByApi` = **eco nosso** → ignorar.
- ⚠️ **1 webhook POR instância — o POST SUBSTITUI o anterior.** Se outro sistema já consome (ex.: inbox Bridge), **nosso endpoint RETRANSMITE** (env `UAZAPI_RELAY_URL`). Registrar sem olhar = você desliga o inbox do cliente sem perceber.

### u2. Áudio inbound é **ASSÍNCRONO** (o webhook chega antes da conversão)
- `POST /message/download {id}` → `fileURL` com **mp3 descriptografado**.
- Como é assíncrono, a primeira tentativa costuma falhar → **retry 2/4/8s**.
- **Imagem e PDF: descreva com a VISÃO do próprio Claude** (blocos `image` / `document`), numa chamada **na ENTRADA**, e grave como **texto** no histórico: `[imagem do lead]:` / `[documento do lead]:`. **Não precisa de Gemini/OCR à parte** — e você não paga visão a cada turno. Referência: `lib/media.ts` do template GHL.

### u3. Envio
- Texto: `/send/text {number, text}` (permite **multi-mensagem**).
- Voz: `/send/media {number, type: "ptt", file: "data:audio/ogg;base64,..."}` — ElevenLabs `opus_48000_64` direto.

### u4. 🚨 DUPLA ENTREGA (número no Kommo **E** na uazapi)
- **Sintoma:** a mesma mensagem chega **2x** e o lead pode receber resposta dobrada.
- **Causa:** o número está conectado no Kommo **e** pareado na uazapi ao mesmo tempo (coexistência da Meta — ver "UM NÚMERO = UM AGENTE" em `comum/PEGADINHAS.md`).
- **Cura:** **canal único por lead** — `via=uazapi` faz o `add_message` **ignorar aquele lead**.

### u5. A busca de contato por telefone é **FUZZY**
- **Sintoma:** o agente responde no lead errado. Contatos de teste com o mesmo número **confundem** a busca.
- **Cura:** validar o telefone do contato **DÍGITO A DÍGITO** depois da busca + manter o índice **`ak:phone2lead:`** no Redis.

### u6. Canal voz/texto = decisão do **CÓDIGO**, e é **bidirecional**
- O modelo **imita o padrão do histórico nos dois sentidos** — chega a responder **texto em voz** se a conversa vinha em áudio.
- **Regra no código:** turno de **áudio** → **voz forçada** (≤500 chars, **sem link**); turno de **texto** → **voz derrubada**. Exceção: o lead pediu áudio **por escrito**.
- Prompt imperativo + aviso dinâmico guiam **só o CONTEÚDO**, nunca a escolha do canal. (Doutrina: o que é determinístico vira código, não instrução de prompt.)

### u7. Auto-criação de lead só em número DEDICADO
- `UAZAPI_AUTO_CREATE_LEAD=1` **só em número dedicado da IA**.
- Em **número compartilhado** (ex.: também usado pelo suporte), **manter o gate por tag** — senão a IA abre lead para toda mensagem que cair ali.

---

## §4 · ONDE CADA PEGADINHA MORDE NO ROTEIRO DE REPLICAÇÃO

Replicar o agente para um cliente Kommo leva **~meio dia** (7 passos). Detalhe operacional em `kommo/PLAYBOOK.md`; aqui está o **mapa das minas**:

| Passo | O que fazer | Mina que mora aqui |
|---|---|---|
| **1** | Copiar pasta → prompt novo → **discovery AO VIVO** (`GET /api/v4/leads/pipelines` + `GET /api/v4/leads/custom_fields`) → montar o `crm-map` | IDs de snapshot/memória. **Sem os `enum_id`s, §2.3 te pega.** |
| **2** | Criar campo **TEXTAREA "Resposta IA (agente)"** no lead: `POST /api/v4/leads/custom_fields` | Sem esse campo, o Desenho A não tem onde **depositar** a resposta |
| **3** | `vercel link` + envs + deploy → `GET /api/validate?secret=` tem que dar `ok:true` | Envs: `KOMMO_DOMAIN` / `KOMMO_TOKEN` / `KOMMO_ACCOUNT_ID` / `KOMMO_BOT_ID`, `TRANSPORT`, `ANTHROPIC`, `UPSTASH`, **`WEBHOOK_SECRET` novo (por cliente)**, `GATE_TAG` |
| **4** | Criar o webhook de entrada **VIA API, não no UI**: `python scripts/create_webhook.py "https://<deploy>/api/inbound?secret=X"` com `settings: ["add_message"]` | Criar no UI é onde se erra o filtro e nasce o §2.4 (eco) |
| **5** | **Salesbot de envio no UI — ÚNICO passo manual (~3 min)**: duplicar um bot widget-request existente trocando a URL para `/api/salesbot?secret=X` (o passo seguinte envia `{{json.resposta_ia}}`) **OU** um bot de 1 bloco "Enviar mensagem" com o campo "Resposta IA (agente)" | Duplicar o bot ERRADO (ver §5, bot 62431) |
| **5b** | **Anotar o `bot_id` → env `KOMMO_BOT_ID` → REDEPLOY** | **Sem o redeploy o sender NÃO dispara** — depósito acontece, envio não. Sintoma clássico de "o agente ficou mudo" |
| **6** | Teste: `scripts/simulate_inbound.py <lead_id> "msg"` — **o lead PRECISA ter a `GATE_TAG`** — depois conferir o card + `/api/executions?secret=` | Testar em lead sem a tag e concluir que "não funciona" |
| **7** | **Rampagem pela `GATE_TAG`**: a tag no lead **LIBERA** o agente; a tag `atendimento-humano` **DESLIGA** | Rampagem pulada = IA em lead errado no dia 1 |

---

## §5 · DOGFOOD METRIK — os números que provam (estado 2026-07-11)

> É a instalação de referência. Quando algo não bate no cliente novo, compare com estes valores.

| Item | Valor |
|---|---|
| Deploy | https://agente-ia-kommo-metriksales.vercel.app |
| Funil | **"Vendas Implementações" — id `12839352`** |
| Alçada (etapas) | Primeiro contato `99017612` → Qualificação `99017620` → Agendamento de reunião `99017880` |
| Campos | Resposta IA `1126115` · Demonstrou interesse `1117491` (**enums `815671`–`815685`**) · Follow-up `1122909` · Data da reunião `1085812` |
| Webhook `add_message` | id **`47402316`** |
| Gate | **`GATE_TAG=iav`** (tag `IAV` no lead) · secrets no **`.env.local`** da pasta do projeto |
| Salesbot de envio | **bot `65955`** — cópia do `62431` com a URL do widget-request trocada para `/api/salesbot?secret=` |

**Cadeia validada E2E em 2026-07-11:** outbox consumido · lead **moveu de etapa** · multiselect **gravado por `enum_id`**.

### 🚩 Dois avisos que evitam estrago nessa conta

1. **NÃO usar o bot `62431`** — ele aponta pro **n8n/Postgres antigo**. Ele é a origem da cópia, não o bot de produção do agente serverless.
2. **O fluxo n8n antigo (gate tag `IA`) continua ATIVO na conta.** Os gates são **disjuntos**: **NUNCA** coloque `IA` e `IAV` no mesmo lead — o lead recebe resposta dos dois sistemas.

---

## §6 · RASTREIO DE ORIGEM NO KOMMO (Fase 1 no ar, E2E 2026-07-12)

**Como a origem é gravada no Kommo** (o resto do mecanismo clique→código→1ª mensagem está em `comum/ARQUITETURA.md`):

- `utm_*` vão nos campos **`tracking_data` NATIVOS** do Kommo;
- **"Fonte do lead" por enum** — canal **sem enum** cai no campo texto **"Fonte"**;
- **nota de auditoria** no lead: canal / UTMs / hora / IP.

### 🚩 A pegadinha da Fase 2 (WhatsApp OFICIAL) — provável causa do "UTM 0%" que você já viu em cliente

No **WhatsApp OFICIAL**, **o Kommo preenche o UTM SOZINHO** — **MAS SÓ SE o WABA estiver no MESMO Business Manager da conta de anúncios**. Se estiverem em BMs diferentes, o Kommo não recebe o referral e o rastreio **fica zerado em silêncio**.

→ **Vira item obrigatório de checklist de implantação.** É a explicação mais provável do "UTM 0%" observado em contas de cliente.

---

## §7 · CENTRAL / CÉREBRO NO KOMMO — o que existe e o que AINDA NÃO existe

### O que existe: o **playground** ("Testar ao vivo", no ar 19/07/2026)

Painel **self-contained servido pelo próprio agente** (sem app Next.js separado): edita o prompt candidato e conversa com a IA como se fosse o lead; as tools rodam em **DRY-RUN** (simuladas, **ZERO efeito no CRM**). Abrir em `/api/cerebro?secret=WEBHOOK_SECRET` (o secret fica só na URL).

Port **aditivo — NÃO toca no caminho de conversa** (`claude.ts` / `inbound` intocados). 3 arquivos + 1 entrada no `vercel.json`:

| Arquivo | Papel |
|---|---|
| `lib/playground.ts` | `simulateChat(promptTexto, turns)` — espelha o loop de `generateReply`, trocando `runTool` por `simulateTool` (as 6 tools do Kommo) e usando o prompt candidato via `buildSystemFromText`. Retorna `{ reply, toolCalls[], voice }` |
| `api/prompt.ts` | `GET` devolve o prompt de fábrica (carrega no editor) · `POST {acao:'chat', texto, mensagens}` roda a simulação. Auth `?secret=` |
| `api/cerebro.ts` | A página (HTML self-contained; lê o `secret` da URL pra falar com `/api/prompt`) |
| `vercel.json` | Registrar `api/prompt.ts` com `maxDuration: 300` + `includeFiles: "prompt.md"` |

**Validado E2E em produção 19/07/2026:** a IA respondeu **e** chamou `preencher_qualificacao("Origem do lead"="Instagram")` + `mover_etapa_funil` — **tudo simulado, CRM intocado**.

### 🚩 O GAP declarado (não venda o que não existe)

**O agente Kommo (`agente-ia-kommo`) ainda NÃO tem Central / prompt-store.** No Kommo existe **SÓ o playground** (testar). **Editar + publicar ao vivo (sem deploy) e os 10 evals — a Central completa — ainda são o próximo passo.** O **sandbox não existe lá até ser portado**.

**Para ter a Central no Kommo, portar do template GHL:**

| Portar | Observação |
|---|---|
| `prompt-store.ts` | override + histórico de versões |
| `evals.ts` | o exame server-side (o **porteiro** do publicar) |
| `api/prompt.ts` | com as ações **publicar / restaurar / rollback** |
| a **página do cérebro** | a UI de edição |

**Adaptação obrigatória:** no Kommo, adaptar `simulateChat` ao **brain de lá** — `generateReply(lead, history)` + `runTool(leadId, ...)` — com o **mesmo `simulateTool` cobrindo as tools do Kommo**.

Padrão do componente e do dry-run: `comum/PLAYGROUND.md`. A propagação para os demais clientes segue a **"4ª perna"** (`SKILL.md` — código novo só chega no cliente com redeploy dele).

---

## §8 · MONITORAMENTO NO KOMMO — o que fica MAIS FÁCIL

O organismo completo (alerta instantâneo, guardião diário, analista semanal, auditor, QStash como relógio do followup) vive em `comum/` e vale igual. **Três coisas ficam mais simples no Kommo:**

| Peça | No Kommo |
|---|---|
| **Alerta (`lib/alert.ts`)** | O **transport uazapi JÁ existe** — o alerta **reusa o mesmo client**, **sem dependência nova**. |
| **Analista semanal (`lib/analyst.ts`)** | Lê as conversas do **PRÓPRIO histórico Redis** (`ak:conv:{leadId}`) — **nem precisa de API externa**. É **mais fácil que no GHL**. |
| **Evals** | O **`/api/config` já existe** no Kommo → **o eval harness funciona igual, sem adaptação**. |

> As demais regras (handoff × followup: `clearFollowup` quando `escalar_para_humano` foi usada; janela comercial × tique do relógio; rotinas cloud do Claude sem saída de rede) valem **idênticas** no Kommo — estão em `comum/PEGADINHAS.md`.

---

## §9 · BLOCO COMERCIAL EM VÁRIAS BOLHAS PODE REPETIR OU IGNORAR INTERRUPÇÃO

**Sintoma:** uma plausibilidade ou proposta literal é enviada corretamente em
várias bolhas; o lead responde “o que faço agora?” ou manda algo durante o
envio; a tool move novamente para a mesma etapa e o bloco inteiro é disparado
outra vez.

**Causa:** usar `stageMoves.includes(etapa)` como autorização suficiente para
forçar o texto literal. A tool pode chamar a etapa atual novamente. Além disso,
um loop de Salesbot que não observa o token do buffer continua disparando as
bolhas antigas mesmo depois de chegar uma inbound nova.

**Cura:** os blocos integrais precisam ser idempotentes pelo histórico/estado
do lead. Se o primeiro marcador já apareceu, não devolver o literal novamente;
responder apenas à dúvida atual ou usar uma ponte curta. Durante o envio, antes
de cada nova bolha, comparar o token atual do lead com o token que iniciou o
turno. Mudou: apagar as partes restantes do outbox, registrar somente o que
realmente saiu e reprocessar a inbound nova sob o mesmo lock.

**Anticorpo:** eval estrutural obrigatório para provar: (1) plausibilidade
integral uma vez; (2) proposta integral uma vez; (3) interrupção cancela a fila;
(4) histórico recebe apenas `sentParts`; (5) o texto literal mantém o hash
canônico. Validado em produção em 27/07/2026 após caso real de 12 bolhas
repetidas em sequência.

---

## §10 · QSTASH DUPLICADO EXIGE CLAIM ATÔMICO NA FILA REDIS

**Sintoma:** o mesmo follow-up aparece três, quatro ou cinco vezes no mesmo
minuto, embora cada callback do QStash tenha recebido `200 OK`.

**Causa:** usar `ZRANGEBYSCORE` para ler vencidos e só depois reagendar/remover.
Callbacks independentes e simultâneos enxergam o mesmo member antes que o
primeiro termine. Redis ser a “fonte da verdade” não basta se a leitura não
reservar o item atomicamente.

**Cura:** fazer claim por Lua em uma única operação: ler os vencidos e mover
imediatamente seus scores para um lease curto. Só quem recebeu o member executa.
Se a função morrer, o lease vence e o lead volta a ficar elegível. Em erro de
processamento, reagendar explicitamente a mesma cadência.

**Anticorpo:** teste obrigatório com pelo menos 10 claims concorrentes sobre o
mesmo item e assert de exatamente 1 vencedor. Antes de reativar produção,
sanear terminais, leads sem gate/handoff e conversas legadas fora da janela.
Validado em produção no TS&D em 28/07/2026.

---

## §11 · COLETA E FINALIZAÇÃO SÃO ESTADO, NÃO DECISÃO LIVRE DO MODELO

**Sintoma:** a IA diz que recebeu todos os dados, mas o card permanece em
coleta; depois o cron cobra tudo outra vez. Uma mídia ou pergunta posterior
pode até fazer o roteiro comercial voltar para plausibilidade/proposta.

**Causa:** prompt e tools descrevem a jornada, mas não garantem o estado. O LLM
pode omitir `mover_etapa_funil`, aceitar dados incompletos ou perder o ponto da
conversa quando o histórico é truncado.

**Cura:** representar os campos obrigatórios em estado estruturado, validar
formato em código, persistir apenas valores não vazios e finalizar
deterministicamente quando todos estiverem presentes. Finalização e etapas
posteriores são terminais: limpam a fila e bloqueiam novas respostas/follow-ups.
O parser deve aceitar dados rotulados, sem dois-pontos, em várias mensagens ou
na mesma linha, sem transformar frases como “tá bom” em nome.

**Anticorpo:** testes com coleta completa/incompleta, dados em linha única,
campos vazios no Redis, bloqueio da tool de finalização e guardas terminais no
atendimento e no cron. Validado em produção no TS&D em 28/07/2026.

---

## §12 · WIDGET KOMMO PODE TER O CSS CERTO E AINDA APARECER CRU

**Sintoma:** o widget abre dentro do lead, busca os dados e exibe o conteúdo,
mas parece quebrado: tipografia enorme, texto espremido, sem cards, badges,
espaçamento ou hierarquia visual. Uma versão nova também pode continuar
mostrando o visual antigo.

**Causa:** ter `style.css` dentro do ZIP não garante seu carregamento. O
`script.js` precisa inserir a folha explicitamente; além disso, a Kommo/CDN
pode reutilizar o asset se a URL e a versão não mudarem. O caminho atual vem
de `settings.cdn_path`; `settings.path` é apenas fallback de compatibilidade.

**Cura:** criar `ensureStyles()` com
`settings.cdn_path || settings.path`, injetar um `<link>` único e usar
`style.css?v=<widget.version>`. Chamar a função em `settings`, `init`, `render`,
`initMenuPage` e `advancedSettings`. Manter o fallback de versão do JS igual ao
manifest, gerar novo ZIP e testar no card real. Para a central interna, usar
`widget_page` + `left_menu` + `initMenuPage`; o layout responde à largura do
contêiner da Kommo, não só ao viewport.

**Anticorpo:** o build deve rejeitar ausência de `cdn_path || path`, query de
versão, callbacks, raízes CSS próprias ou divergência de SemVer. CSS nunca
estiliza `html`, `body`, `:root`, `*` ou DOM nativo da Kommo. A matriz visual
inclui sidebar estreita, página interna, estados de erro/vazio/cache e ausência
de scroll horizontal. O playbook completo vive na skill
`kommo-widget-metrik`.

**Evidência:** reproduzido e corrigido no Copilot Comercial by Metrik em conta
técnica real em 30/07/2026. O card do lead passou a renderizar `Agora`,
`Contexto` e `Conversa`, e as páginas nativas `Visão geral`, `Memória`,
`Autoria` e `Configuração` foram validadas visualmente.

---

## §13 · SALVAR VERSÃO NÃO AUTORIZA SOLICITAR REVISÃO

**Sintoma:** o widget entra na fila de revisão da Kommo antes de o responsável
ver e testar a versão instalada.

**Causa:** código local, ZIP, rascunho, instalação técnica e revisão foram
tratados como um único fluxo automático. Revisão, porém, é uma ação externa de
release.

**Cura:** retirar a versão da revisão, manter o rascunho testável e separar os
estados do release.

**Anticorpo:** o agente pode construir, empacotar, cadastrar e instalar o
rascunho quando autorizado, mas só aciona **Solicitar revisão** após o mestre
ver a versão e responder explicitamente **`aprovado`**. Checklist e documento
de submissão registram o estado atual e a autorização.

**Evidência:** revisão solicitada às 13:04 e retirada às 13:11 de 30/07/2026
(America/Sao_Paulo), por solicitação do mestre.
