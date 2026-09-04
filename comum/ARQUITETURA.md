# ARQUITETURA — cada decisão e seu trade-off (GHL **e** Kommo)

> **Este arquivo é o PORQUÊ de cada peça.** Use pra explicar o sistema (ao cliente, ao aluno) e pra decidir com critério — **nunca por cópia**. Leia-o quando for explicar o organismo ou decidir uma peça: aqui está cada decisão com o trade-off, o fluxo de uma mensagem nos dois CRMs, e por que **não** n8n / não VPS / não RAG.
>
> **Pré-requisito:** `comum/DIAGNOSTICO.md` respondido. Construir sem diagnóstico é **operar sem exame** — o roteiro é socrático de propósito porque *cada resposta do cliente DECIDE uma peça desta arquitetura*. Se você chegou aqui sem diagnóstico, volte.

**Dívida quitada nesta fusão:** antes, a skill do Kommo declarava biblioteca **emprestada** ("leia `agente-ia-ghl/ARQUITETURA.md`") e era meia-skill. **Agora não.** Este arquivo é a arquitetura dos DOIS CRMs, lado a lado, e não depende de mais nada. O que é de plataforma vive em `ghl/` e `kommo/`.

---

## §0 · COMO SE LÊ ESTE ARQUIVO (postura de arquiteto-professor)

**1. Toda decisão de arquitetura ganha E perde algo — sempre diga os dois lados.**
Exemplo de como se fala: *"vamos de prompt direto em vez de RAG porque abaixo de 10k tokens o cache dá 90% de desconto e qualidade garantida; o preço é que acima de 25k isso vira latência de 9s — quando chegar lá, migramos."* **Quem entende o porquê decide sozinho no próximo cliente.** Quem copia trava no primeiro imprevisto.

**2. Ensine em camadas** (calibre antes: *"você já mexeu com API/webhook?"*, *"sabe o que é variável de ambiente?"*, *"já usou Vercel/Git?"*):

| Nível | Como conduzir por este arquivo |
|---|---|
| **Iniciante / zero técnico** | Analogia primeiro, código depois. Ensine o organismo (§1) e mostre cada peça funcionando. Ele opera e vende; a construção é sua. |
| **Intermediário** | Ele executa o `PLAYBOOK` do CRM dele **com você revisando cada etapa** e explicando o porquê de cada decisão — o objetivo é ele **replicar sozinho no 2º cliente**. |
| **Avançado** | Vá **direto ao trade-off e às pegadinhas**, e mostre `comum/CONTEXT-ENG.md` **ANTES** que ele "otimize" o que não devia (RAG pra base minúscula, roteador Haiku, prompt if-else). |

**3. Feche cada bloco checando entendimento.** Frase-modelo: *"faz sentido por que o buffer existe? **Sem ele, 3 mensagens do lead viram 3 respostas.**"*

**4. Ceticismo com número medido.** Quando alguém trouxer *"a arquitetura de 2026 manda fazer X"*, **confira contra os números medidos** (`comum/CONTEXT-ENG.md`, laboratório Metrik 12/07/2026) **ANTES** de gastar uma semana implementando. Corrigir com evidência não é teimosia — concordar com o erro é desserviço.

> **Nota de biblioteca:** a postura completa (MODO PROFESSOR, as leis, os gatilhos de uso da skill e o índice dos 6+ arquivos) vive no `SKILL.md`. Aqui só o que é arquitetura.

---

## §1 · A STACK CANÔNICA (e o que ela deliberadamente NÃO é)

**LLM por adapter + Vercel serverless + Upstash Redis — explicitamente SEM n8n.**

O produto é um **ORGANISMO SERVERLESS que vive por cliente**. Cada peça tem um papel e **o cliente vê tudo** (não pode existir caixa-preta — é o que sustenta preço e mata churn).

| Órgão | Arquivo | Papel |
|---|---|---|
| 🗣️ **Boca/ouvido** | `api/inbound.ts` + adapter LLM | Atende: **buffer 10s → histórico → LLM + tools → responde** |
| 👂👁️ **Ouvido e olho** | `lib/stt.ts` + `lib/media.ts` | OpenAI simples ou adapters de visão/STT especializados |
| 🎙️ **Voz** | `lib/voice.ts` | OpenAI TTS ou ElevenLabs → áudio → **uazapi ptt** |
| ✋ **Mãos no CRM** | `lib/tools.ts` + `lib/crm-map.ts` | Campos, etapa, tags, escalação — com alçada e guards |
| 📅 **Agenda** | `lib/calendar.ts` | Horários reais + marca a call *(no Kommo: task + campo, §5.13)* |
| 🔁 **Perseguição** | `lib/followup.ts` | Cadências geradas por IA pra lead mudo |
| 📍 **Rastreador** | `lib/tracker.ts` | Lead nasce com Origem/UTM/1ª msg preenchidos |
| 🛡️ **Imunológico** | `lib/guardian.ts` + `lib/alert.ts` | Check-up diário + alerta de B.O. no grupo |
| 🧠 **Consciência** | `lib/analyst.ts` | Relatório semanal + sugestões de evolução do prompt |
| 🌅 **Briefing executivo** | `lib/daily-report.ts` + `api/daily-report.ts` | Placar do dia anterior às 07h no grupo: números em código + leitura qualitativa da LLM |
| 🔍 **Olhos no negócio** | `lib/auditor.ts` | Auditoria do funil COMPLETO (com IA × sem IA) |
| 📊 **Vitrine** | `area-cliente/` | Central de IA: o cliente vê tudo ao vivo |
| 🧪 **Exame** | `scripts/evals.mjs` + `lib/evals.ts` | Certifica o cérebro antes de cada deploy |
| 📖 **Códex** | `codex/` | A vitrine desta skill (lê os `.md` reais via `npm run sync`) |

**Onde vive — as 4 camadas:**

| Camada | O que é | O que guarda |
|---|---|---|
| **Vercel** | o código | serverless + **1 cron/dia** (Hobby) |
| **Upstash Redis** | coordenação | filas, locks, buffer, diário de execuções *(no Kommo: **também o histórico**)* |
| **CRM do cliente** | a verdade do negócio | contato, etapa, campos, resumo, origem |
| **OpenAI / Anthropic / Groq / ElevenLabs** | inteligência escolhida por régua | nada — stateless |

**Zero VPS.** Nada de servidor próprio na arquitetura. **~R$50–150/mês por cliente.**

> **Nota de extração (Códex):** a ficha `produtos/<id>/organismo.ts` sai **dos órgãos do `SKILL.md §1` + do fluxo deste arquivo** — cada peça vira um `Orgao` com `mecanismo` e a **dor de origem**. Não invente: extraia dos `.md` e pergunte o que faltar.

---

## §2 · A DIVERGÊNCIA ESTRUTURAL GHL × KOMMO (a tabela que explica tudo)

O Kommo reusa **~80% da arquitetura**. As diferenças não são detalhe de implementação — elas **definem tudo** do lado Kommo:

| Dimensão | **GHL** | **Kommo** |
|---|---|---|
| **Fonte da verdade do histórico** | **o CRM** — o agente é 100% *stateless*, lê o transcript da conversa | **é NOSSO** — o Kommo **não devolve transcript de chat**; histórico vive no Redis `ak:conv:{leadId}` |
| **Envio da resposta** | **direto** — `POST /conversations/messages` | **indireto** — API v4 **não envia mensagem**: ou **Salesbot** (Desenho A) ou **uazapi** (Desenho B) |
| **Entidade** | contact **+** opportunity (dois objetos) | **lead-cêntrico** — as tools operam no LEAD |
| **Campos select** | options por texto | **gravam por `enum_id`**, não por value — o `crm-map` carrega os enums |
| **Tags** | add/remove por endpoint | **PATCH SUBSTITUI o conjunto inteiro** → merge local obrigatório |
| **Agenda** | Calendars API (slots reais) | **não existe Calendars API** → task (`task_type_id 2`) + campo `date_time` (epoch **segundos**) + move etapa |
| **Redis** | recomendado (coordenação) | **OBRIGATÓRIO** (mora o histórico) |
| **Prefixo Redis** | `agente:` (ou `agente-<slug>:`) | `ak:` — divide o database com o agente GHL |
| **Voz** | via uazapi (o provedor do GHL descarta áudio) | só no **Desenho B** (uazapi); Salesbot é 1 mensagem de texto por resposta |
| **Mídia inbound** | hidratação com espera explícita (o GHL anexa **depois** do webhook) | uazapi: `POST /message/download {id}` → mp3 (assíncrono, retry 2/4/8s); `.enc` é inútil direto |

> **A frase que resume:** *no GHL o CRM é o dono da memória; no Kommo a memória é nossa e a boca é emprestada.*

---

## §3 · A VIDA DE UMA MENSAGEM (os dois caminhos, lado a lado)

### 3.1 · GHL — o CRM é a fonte da verdade

```
Lead manda "oi" no WhatsApp
  → GHL recebe → Workflow "Customer Replied" (filtro canal + gate por tag)
  → POST /api/inbound (Vercel)
      ├─ responde 200 IMEDIATO  ← senão o GHL reenvia o webhook (retry = resposta dupla)
      └─ waitUntil(processa em background)
          1. Contato tem tag "atendimento-humano"? → não responde (humano assumiu)
          2. BUFFER 10s no Redis — eleição: só o webhook MAIS NOVO sobrevive
          3. Histórico do GHL (a fonte da verdade — o agente é stateless)
          4. MÍDIA vira TEXTO pelo adapter escolhido (STT/visão) — §4
          5. Claude Sonnet + tools em loop (≤6 steps) → decide e AGE no CRM
          6. Responde: texto ou voz (adapter TTS → uazapi ptt)
          7. Registra no diário (Redis) + agenda checagem de silêncio (followup)
```

### 3.2 · Kommo — Desenho A (WhatsApp **oficial** no Kommo · `TRANSPORT=salesbot`)

```
Lead manda "oi" no WhatsApp
  → Kommo webhook add_message  (form-urlencoded, chaves "message[add][0][...]")
  → POST /api/inbound  (200 IMEDIATO + waitUntil)
          1. dedup por msgId  +  anti-eco (hash da última resposta ak:lastout:, direction,
             rate limit 10/min/lead)   ← o add_message dispara até pra msg do PRÓPRIO bot
          2. gate por tag NO LEAD
          3. BUFFER 10s no Redis (token election) — só o mais novo sobrevive
          4. STT/visão por adapter → TEXTO → histórico NOSSO: ak:conv:{leadId}
          5. Claude + tools (≤6 steps) → age no LEAD (campos por enum_id, etapa, task)
          6. DEPOSITA a resposta: campo "Resposta IA (agente)" + outbox Redis
          7. POST /api/v2/salesbot/run [{bot_id, entity_id, entity_type:"leads"}]
             → Salesbot → widget-request /api/salesbot?secret=
             → nós POSTamos no return_url:
               {data:{resposta_ia}, execute_handlers:[{handler:"goto",
                                     params:{type:"question", step:1}}]}
             → o bot envia {{json.resposta_ia}}
          8. Diário (Redis) + agenda checagem de silêncio (followup)
```

### 3.3 · Kommo — Desenho B (WhatsApp na **uazapi** · `TRANSPORT=uazapi`)

```
Lead manda "oi" no WhatsApp
  → uazapi webhook {EventType:"messages", chat, message}   ← in/out/fromMe = histórico COMPLETO
  → POST /api/uazapi
          1. fromMe + wasSentByApi = eco nosso → ignora
          2. findOpenLeadByPhone (contacts?query=fone&with=leads)
             + validação dígito a dígito + índice ak:phone2lead:   ← busca é FUZZY
          3. … mesmo pipeline dos passos 3-6 acima …
          4. ENVIO DIRETO: /send/text {number,text} (multi-msg)
             voz: /send/media {number, type:"ptt", file:"data:audio/ogg;base64,…"}
```

**O transport é DINÂMICO por lead, não global.** Msg que entra pelo webhook do Kommo responde por Salesbot; msg que entra pela uazapi responde por uazapi (com voz). O canal fica em `ak:via:{leadId}` e **o followup usa o último canal**. Os dois desenhos **coexistem no mesmo deploy**.

### 3.4 · Por que essa ordem importa

**Cada número resolve um problema que já nos mordeu. Tirar qualquer um = bug de volta.**

| Passo | A dor que ele mata |
|---|---|
| 200 imediato | retry do CRM = resposta dupla |
| tag `atendimento-humano` | IA falando por cima do vendedor |
| **buffer 10s** | 3 mensagens → 3 respostas (§5.5) |
| mídia → texto na entrada | agente respondendo "[mídia recebida]" na hora mais sensível (§4) |
| tools com guards | modelo "otimizando" o funil sozinho (§5.7) |
| voz determinística no código | modelo voicava resposta a texto (§5.9) |
| diário + followup | lead sumindo em silêncio, e você sem saber o que aconteceu |

---

## §4 · ENTENDER A MÍDIA DO LEAD (áudio, imagem, PDF) — `lib/media.ts` · **vale nos dois CRMs**

O lead manda foto do RG, print do Meu INSS, laudo em PDF. Se o agente responde "[mídia recebida]", ele **parece burro na hora mais sensível**.

> **Regra de ouro: descreva UMA vez na ENTRADA e grave como TEXTO no histórico.** Assim histórico, followup, evals e Central continuam sendo texto puro — e você **não paga visão a cada turno** da conversa.

| Tipo | Como | Vira no histórico |
|---|---|---|
| áudio | OpenAI Transcribe/Whisper ou Groq, pelo adapter STT | `[áudio do lead]: <transcrição>` |
| imagem | GPT-5.4 Mini ou outro adapter de visão validado | `[imagem do lead]: <descrição>` |
| PDF | OpenAI `input_file` (texto + páginas) ou adapter validado | `[documento do lead]: <descrição>` |

No padrão OpenAI simples é a **mesma conta e chave**, mas áudio e voz continuam
modelos/chamadas separados. Veja `comum/MIDIA-PROVEDORES.md`.

**Como acertar (aprendido no Manoel, 19/07/2026):**
- **Roteie pelo `content-type` do GET e use extensão só como fallback.** Não use
  `HEAD`: muitos servidores devolvem 405 e fazem mídia válida parecer inválida.
- **Normalize o `media_type` da imagem** pro que a API aceita (`image/jpeg|png|gif|webp`) — `image/jpg` quebra.
- **Teto de tamanho (~8MB)** e **`User-Agent` de browser** no download (o Cloudflare do GHL/uazapi bloqueia sem — mesma pegadinha do 1010).
- **Prompt de descrição COM o contexto do negócio** ("escritório previdenciário: que documento é? que dados aparecem?"). Sem isso o modelo descreve *"um papel branco"* em vez de *"RG de João, nº X"*.
- **Mande admitir quando não dá:** "se ilegível/cortado, diga; **NÃO invente**". Testado: numa foto sem documento ele respondeu *"não é um documento, não há dados relevantes"* em vez de alucinar um RG.
- **No prompt do agente:** avise que a mídia chega já descrita com os marcadores, que ele **NUNCA** diga "não consigo ver/ouvir", e que **não interprete o documento juridicamente** (isso é do advogado) — só reconheça, agradeça e emende a próxima pergunta.

**Diferença de download por CRM:**

| | GHL | Kommo |
|---|---|---|
| áudio | URL do attachment (hidratação com espera — o GHL anexa DEPOIS do webhook: backoff 12×2s ≈ 24s) | **Desenho A:** `attachment.link` público vai ao adapter STT · **Desenho B:** `POST /message/download {id}` → `fileURL` mp3 (retry 2/4/8s; `.enc` é inútil direto) |
| custo de latência | áudio demora ~30s pra responder — **avise o cliente que é de propósito** | idem no Desenho B por causa do retry de conversão |

---

## §5 · AS DECISÕES (o que ganhamos, o que pagamos, quando NÃO)

### 5.1 · Serverless (Vercel) em vez de VPS / n8n
- **RAM não atravessa turnos:** `Map`, array e variável global são cache descartável. Qualquer decisão na mensagem seguinte deve consultar CRM/calendário novamente ou usar Redis. Para agenda: revalidar o slot na fonte, checar conflito imediatamente antes de criar e bloquear nova reunião quando o card já estiver em reunião/pré-qualificação.
- **Ganha:** zero servidor pra cair/atualizar · escala sozinho · **R$0 de infra fixa** · deploy em 20s · **código versionado** (prompt com histórico em git!)
- **Paga:** cron limitado a **1/dia** no Hobby · **sem processo longo** (tudo tem que caber em 300s) · não dá pra "olhar o servidor"
- **Quando NÃO:** se o cliente exige **WhatsApp não-oficial self-hosted** (Evolution/Baileys) — aí precisa de máquina viva pra manter a sessão
- ⚠️ **Hobby é não-comercial nos termos.** Cliente pagante = Pro (ou QStash como gatilho + Hobby só de cron nativo — §5.15)

### 5.2 · API de LLM por adapter (loop próprio) em vez de framework
- **Ganha:** **~80 linhas** transparentes e debugáveis · zero dependência que quebra · é o que a própria Anthropic ensina pra single-agent
- **Paga:** você escreve o loop (guards, `MAX_STEPS`, retry) na mão — **uma vez**
- **Quando NÃO:** multi-agente com handoff complexo e estado compartilhado (aí framework paga)
- **Detalhe obrigatório:** fixe o reasoning/thinking escolhido e normalize tool
  calls; defaults variam por provedor.

### 5.3 · Fonte da verdade do histórico — **a decisão que diverge entre os CRMs**

| | **GHL: CRM como fonte da verdade** | **Kommo: histórico nosso (Redis)** |
|---|---|---|
| **Ganha** | agente 100% stateless · humano e IA veem a **MESMA** conversa · zero sincronização | funciona onde o CRM não devolve transcript · leitura instantânea · **o analista semanal lê direto do Redis — nem precisa de API externa (mais fácil que no GHL)** |
| **Paga** | dependência da API (rate limit **429 ~100 req/10s por location**) · precisa **filtrar ruído** (activities, `TYPE_INTERNAL_COMMENT` — nota interna que **vaza pro lead** se você não filtrar) | Redis vira **obrigatório** · o humano no CRM não enxerga o mesmo contexto que a IA · TTL apaga (o valor comercial tem que estar no card) |
| **Quando NÃO** | quando o CRM não devolve transcript → é exatamente o caso do **Kommo** | quando o CRM já dá o histórico de graça (GHL) — duplicar memória é criar duas verdades |

> **A regra que atravessa os dois:** o que importa pro NEGÓCIO (resumo, origem, etapa, qualificação) vai **sempre** pro CRM. O Redis é memória de trabalho, não arquivo.

### 5.4 · Redis (Upstash) — o que ele realmente é aqui
**Não é banco de dados: é coordenação + memória de trabalho.**

| **FAZ** | **NÃO FAZ** |
|---|---|
| eleição do buffer · lock com dono · **idempotência de retry** · fila de followup (`mq:fu:*`) · diário de execuções · cache de STT · snapshots do auditor · override do prompt publicado · **(Kommo) o histórico `ak:conv:{leadId}`** · canal por lead `ak:via:{leadId}` · índice `ak:phone2lead:` · anti-eco `ak:lastout:` | guardar o que importa pro negócio — **resumo, origem e etapa vão pro CRM** |

- **TTL é feature:** transcript morre em **90d** (custo zero crescente + LGPD); o valor comercial já está eternizado no card.
- **Ledger de recuperação por ciclo:** resposta recuperada e objetivo concretizado
  são eventos diferentes, atribuídos ao toque e preservados por `cycleId`.
  Contadores legados `mq:fu:rec:*`/`lost:*` não bastam para eficácia comercial;
  migre conforme `RECUPERACAO.md`.
- **O que decide se o Redis é obrigatório:** a pergunta 4.3 do diagnóstico — *"quantos leads/dia hoje? E o pico?"* → decide **Redis obrigatório? rate limit? frequência do cron (horário)?**
- **Limite do free tier:** **1 database só** → veja §6 (namespace).

### 5.5 · Buffer de 10s — a peça que mais parece bug e é o coração
- **Problema:** lead manda 3 mensagens → 3 webhooks → **3 execuções paralelas**, porque *serverless não se enxerga*.
- **Mecanismo:** cada execução anota no Redis **"sou eu o mais novo"**, dorme **10s**, e **só responde quem ainda for o mais novo** — as outras morrem em silêncio.
- **Ganha:** uma resposta **humana e única** pras 3 mensagens, com contexto completo.
- **Paga:** **+10s de latência DELIBERADOS** — e isso é *feature*: resposta instantânea parece robô. A troca é consciente.
- **Prova (E2E):** **rajada de 3 mensagens seguidas → UMA única resposta.** É o teste que prova o debounce.
- **Health:** `curl "https://<agente>.vercel.app/api/inbound"` tem que devolver `{ok:true, redis:true}` — **`redis:false` = duplicidade garantida**.
- **Checagem de entendimento (use com o aluno):** *"faz sentido por que o buffer existe? Sem ele, 3 mensagens do lead viram 3 respostas."*

### 5.6 · Prompt em arquivo (`prompt.md`) em vez de banco/painel
- **Ganha:** versionado em git (diff, histórico, rollback) · **cacheado pela API (90% mais barato)** · testável por eval
- **Paga:** mudar exige deploy (20s) — **e isso é bom: força passar pelo eval**
- **Quando NÃO:** cliente que quer editar sozinho o tempo todo → prompt no **CRM/painel** com cache invalidado (**mas some o eval — cuidado**). A saída elegante pra esse caso é o **cérebro editável com o eval como porteiro** (§5.11), que dá a edição ao vivo *sem* perder o exame.
- **Caching correto:** bloco estático (`prompt.md`) com `cache_control`; contexto dinâmico (data, nome, tags) em **bloco SEPARADO** — senão o timestamp invalida o cache a cada minuto.

### 5.7 · Tools com alçada e guards (não "o modelo decide")
- **Padrão:** whitelist de etapas · **só avança, nunca retrocede** · **fail-closed** (stage desconhecido = não mexe) · opções validadas · slot de agenda vindo de **consulta real**
- **No Kommo:** o lead pode estar em **OUTRO pipeline** — as tools **recusam** (fail-closed) se `pipeline_id ≠ mapa` ou se o status está fora do `stageOrder`
- **Por quê:** modelo é ótimo em linguagem, **não em disciplina de processo**
- 🏛️ **PRINCÍPIO DE ARQUITETURA: o que é determinístico vira CÓDIGO, não instrução de prompt.** (decisão de voz, alçada, whitelist) — **o modelo escorrega, o código não**
- **Alçada padrão:** termina no **"Agendado"**. Reunião, proposta e negociação são território do closer humano.

### 5.8 · Gate por tag (a coisa mais simples e mais importante)
- Agente **só atende quem o time marcou**. Rampagem: **você → 10 leads → todos**.
- **Sem gate:** dia 1 do cliente = IA respondendo lead errado = **confiança destruída antes de provar valor**.
- Desligar num lead = tag `atendimento-humano`. Ensine isso ao time no go-live.
- ⚠️ **Gates disjuntos:** se existir fluxo antigo (n8n) ainda ativo na conta, os gates **não podem se sobrepor** (no dogfood: tag `IA` = n8n · tag `IAV` = agente novo — **nunca as duas no mesmo lead**).

### 5.9 · Voz via uazapi (não pelo CRM)
- **Descoberta cara (DAC, 13/07/2026):** o provedor WhatsApp do GHL **DESCARTA áudio outbound**. `attachments:[ogg]` com body vazio → `failed`; com body `'🎧'` → status **`delivered` mas só o texto chega**.
- **A lição mais cara:** a validação antiga logava `voz: true` (**a decisão do modelo**) e **ninguém tinha confirmado entrega no celular** — achávamos que funcionava **há dias**. **SEMPRE teste voz em número real antes de vender.** *"A voz só existe depois que você OUVIU no celular."*
- **Solução:** o adapter TTS (OpenAI TTS no caminho simples; ElevenLabs quando
  voz premium justificar) gera áudio → converta/normalize para formato aceito →
  **uazapi `/send/media type:ptt`** entrega a bolinha. No Kommo Desenho B,
  `file:"data:audio/ogg;base64,…"` pode ir direto.
- **A decisão de voz virou CÓDIGO exatamente porque o modelo escorregava** quando era só instrução no prompt (`leadSentAudio = body.startsWith('[áudio do lead]:')`). No Kommo é bidirecional: **turno de áudio → voz forçada** (≤500 chars, sem link) · **turno de texto → voz derrubada** · exceção: lead pediu áudio por escrito.
- **Paga:** uma peça a mais no stack (uazapi) · **gap de histórico** — a nota de voz volta como outbound vazio → vira **marcador** `[<Agente> respondeu por áudio aqui]`.
  ⚠️ **É marcador, NÃO conteúdo.** Pra conversa longa por voz, o **refinamento futuro é gravar o TEXTO da fala no Redis/CRM e reinjetar no histórico**.
- **Teto físico:** bitrate e formato mudam por TTS; mantenha guard de 500KB e
  regra firme de **~500 chars / 2-3 frases**, com fallback explícito para texto.
- **Quando NÃO:** cliente sem uazapi e sem disposição de pagar por ela → **não venda voz**. Declare `voz: roadmap` no manifesto (§5.12).

### 5.10 · Monitores NATIVOS (dentro do agente), não em rotina cloud
- **Por quê:** rotinas cloud do Claude (`claude.ai/code/routines`) **NÃO têm saída de rede** — curls falham **em silêncio** (lição 11/07: 3 rodadas, zero efeito). Guardião/analista/auditor vivem em `lib/*.ts` e rodam pelo **cron do próprio agente**.
- **Bônus:** credenciais em env (não no prompt) · código versionado · **números calculados em código (zero alucinação)**.
- **As 3 camadas:**

| Camada | Arquivo | O que faz |
|---|---|---|
| **Alerta instantâneo** | `lib/alert.ts` | erro no processamento/followup → mensagem **NA HORA** no grupo de WhatsApp de operações (uazapi). Throttle Redis 10min/tipo. **Carimbo obrigatório `CLIENT_NAME`** |
| **Evento de agendamento** | `lib/alert.ts` + tool de agenda | somente após confirmação real do calendário → cartão no grupo com lead, data/hora, closer, resumo, próximo passo e links. Idempotência por contato+slot no Redis; falha do alerta nunca reverte a reunião |
| **Evento de handoff** | `lib/alert.ts` + tool de escalação | somente após a tag humana ser gravada → cartão com responsável, motivo, última mensagem, relógio de SLA e link. Falha do alerta nunca reverte a transferência |
| **Copiloto do grupo** | `api/group-copilot.ts` + `lib/group-copilot.ts` | lê ledger/CRM sem poder escrever; ativa só por comando, menção ou reply no JID autorizado e para remetentes allowlisted; dedup por mensagem, rate limit por remetente e anti-eco em camadas |
| **Guardião diário** | `lib/guardian.ts` | `/api/validate` + erros 24h do execlog + diagnóstico por padrão + **retrigger seguro (máx 3)** + laudo no grupo **só se houver problema** |
| **Analista semanal** | `lib/analyst.ts` | segundas: números **calculados em código** + Claude lê as conversas → destaque + **até 3 sugestões de prompt com evidência**. Snapshot comparativo no Redis. **Sugestões NUNCA aplicadas automaticamente** — passam pelo eval |
| **Briefing executivo diário** | `lib/daily-report.ts` + `api/daily-report.ts` | 07h local: compara ontem com anteontem, mostra volume, resposta, agenda, qualificação, handoff, falhas, custo, latência e cache. A LLM interpreta somente amostra sanitizada; envio no mesmo grupo de alertas com chave Redis antirrepetição |

- **Orquestração:** dispatcher `api/cron-daily.ts` no ÚNICO cron diário do Hobby: **followup → guardião → (segunda) analista → (sexta) auditor**.
- ⚠️ **`SELF_URL`, nunca `VERCEL_URL`** pro self-fetch: a `VERCEL_URL` aponta pra URL interna do deployment, **protegida por Vercel Authentication** → devolve tela de login em vez de JSON. Sintoma: guardião reportando "endpoint inacessível" com tudo no ar (12/07 — **o próprio guardião pegou**).

### 5.11 · Cérebro editável ao vivo (com o EVAL como PORTEIRO)
- **O que é:** a Central edita o prompt **sem deploy**. A versão publicada vive num **override no Redis que o agente lê ANTES do arquivo do bundle**. O `prompt.md` em git continua sendo o **padrão de fábrica** — o botão *"voltar ao de fábrica"* **apaga o override**.
- **A trava que faz isso ser seguro:** `POST /api/prompt {acao:'publicar'}` **roda os 10 evals no candidato e só publica se passar** — o botão Publicar **nem destrava** sem aprovação. **Validado:** prompt sabotado (inventava preço, pedia nome antes, vendia pra quem pedia suporte) foi **bloqueado com 5.7/10, 4/10 aprovados** — produção intacta.
- **Ganha:** cliente/time ajusta tom e oferta **em minutos** · histórico de **20 versões com nota** · rollback · **zero chance de subir cérebro quebrado**.
- **Paga:** **+1 leitura no Redis por execução** (irrelevante) · exige Upstash · **a edição ao vivo não passa por git** (por isso o histórico com nota e o restaurar-fábrica).
- **Onde:** `lib/prompt-store.ts` (override + histórico) · `lib/evals.ts` (exame server-side) · `api/prompt.ts` (GET/testar/publicar/restaurar/rollback) · Central `/cerebro`.
- **Complemento:** o **playground "Testar ao vivo"** (tools em **dry-run**, zero efeito no CRM) — detalhe em `comum/PLAYGROUND.md`.
- **Estado por CRM (jul/2026):** GHL = completo (editar + publicar + evals + playground). **Kommo = SÓ o playground** (`/api/cerebro?secret=`, self-contained, sem app Next separado — validado E2E 19/07). Portar `prompt-store.ts` + `evals.ts` + ações publicar/restaurar/rollback é o próximo passo.

### 5.12 · Manifesto do sistema (`lib/manifest.ts`) — a Enciclopédia
Fonte da verdade sobre **o que o agente É**: cada módulo com `status` (ativo/construção/roadmap/ideia), resumo em linguagem de dono, **`comoFunciona`** (o mecanismo destrinchado), `quandoRoda`, onde vive e **`prova` com data**. A Central renderiza em `/sistema` (o que existe) e `/roadmap` (o que vem).

- **Por que existe:** **o cliente não pode ter caixa-preta.** Ele vê cada peça, entende o mecanismo e enxerga o futuro — é o que **sustenta preço e mata churn**.
- **Por cliente:** basta mudar o `status` no manifesto do deploy dele (cliente sem voz? `voz: roadmap`). **O que está no ar de verdade é o que o manifesto declara.**
- **Regra:** **nada entra como `ativo` sem `prova`** (data + evidência real). **Manifesto que mente é pior que não ter.**
- Bump o `SISTEMA_VERSAO` e registre a peça em `MODULOS` a cada componente compartilhado novo — é como você sabe **qual cliente está atrasado**.

### 5.13 · Envio indireto no Kommo: Salesbot (A) × uazapi (B)
A API v4 do Kommo **não envia mensagem**. Você tem duas bocas — e a escolha vem do diagnóstico (*"o WhatsApp é oficial ou aparelho/uazapi?"*):

| | **Desenho A — Salesbot** | **Desenho B — uazapi** |
|---|---|---|
| **Ganha** | usa o WhatsApp **oficial** já conectado no Kommo · nada de instância extra · plug-compatible com bot **widget-request** existente | **multi-mensagem** · **voz (ptt)** · histórico completo (in/out/fromMe) · sem janela 24h |
| **Paga** | **1 mensagem por resposta** (as partes viram parágrafos) · **sem voz** · **passo manual no UI** (~3 min) · `salesbot/run` é endpoint legado v2 (`entity_type:"leads"` como **string**) · **um 502 pode ter rodado** — o sender não faz retry em 5xx | +1 fornecedor · **1 webhook POR instância** (POST substitui!) — se outro sistema consome, seu endpoint tem que **RETRANSMITIR** (`UAZAPI_RELAY_URL`) · busca por telefone é fuzzy |
| **Janela 24h da Meta** | **vale** — cadência 1 (12h) entra; **2+ não entregam texto livre** → template WABA no bot | **não se aplica** |
| **Quando NÃO** | cliente que quer voz ou resposta em várias bolhas | número compartilhado com humano sem gate claro; auto-criação de lead (`UAZAPI_AUTO_CREATE_LEAD=1`) **só em número dedicado da IA** |

⚠️ **Dupla entrega:** número conectado no Kommo **E** na uazapi → mesma msg 2×. Cura: **canal único por lead** (`via=uazapi` faz o `add_message` ignorar aquele lead).
⚠️ **UM NÚMERO = UM AGENTE** (a pegadinha nasceu no dogfood Kommo, 11/07/2026): um número pode estar na Cloud API (GHL) **e** pareado na uazapi (Kommo) ao mesmo tempo — coexistência da Meta. Uma mensagem entra pelos **DOIS** caminhos e, com os dois gates abertos, **o lead recebe resposta dupla** (Bia GHL + Bia Kommo responderam juntas — e a bridge ainda puxa as respostas do oficial pro Kommo, virando bagunça no chat). **Produção: número exclusivo por agente. Dogfood: só um gate aberto por vez.**

### 5.14 · Arquitetura do CONHECIMENTO: prompt direto × RAG × tool (limiares medidos)

| Situação | Faça | Por quê |
|---|---|---|
| Conhecimento **< 10k tokens** | **prompt direto + `cache_control`** | cache = **90% de desconto** e o modelo vê TUDO (qualidade **garantida**, não probabilística) |
| **10k–25k tokens** | prompt, mas **enxugue** (exemplo redundante vira tabela) | latência começa a doer: **4,7s → 9,5s medido** |
| **> 25k tokens** OU catálogo/preço por SKU OU **> ~150 FAQs** OU latência > 12s | **RAG** (`knowledge/` + busca) | aí sim: context rot real + latência inaceitável |
| Dado que muda toda hora (estoque, agenda, saldo) | **TOOL** — nunca prompt/RAG | dado vivo se **consulta**, não se memoriza |
| Domínios distintos (vendas + suporte + financeiro) | **agentes separados** (deploys, mesmo template) | monolito com 30 tools degrada |
| Tarefa mecânica (followup, classificação) | **Haiku** (`CLAUDE_MODEL_FAST`) | **3,5× mais barato**, tom não importa ali |
| Conversa com lead (tom, objeção, fechamento) | **Sonnet** | é onde o dinheiro é ganho — **não economize** |

- 🚩 **Red flag de escopo:** *"tenho 300 FAQs e 5 mil SKUs"* → **o prompt estoura; muda a arquitetura para RAG — e vale cobrar escopo maior.**
- ❌ **Anti-padrão: prompt gigante com if-else por cenário** — a Anthropic chama de **"altitude errada"**; vira inmanutenível. **Princípios > árvore de decisão.**
- ❌ Outros anti-padrões que parecem sofisticados: RAG pra base de 6k tokens (**engenharia negativa**) · roteador Haiku antes do Sonnet (o Sonnet roteia as portas **de graça, na mesma chamada**) · otimizar token antes de ter eval · medo de "context rot" em 6k tokens (o fenômeno é real acima de ~50k).
- **Economia real:** conversa completa ≈ **R$0,16** · 1.000 conversas/mês = **R$162** · ticket R$179–997 → **custo de IA ≈ 0,1% do ticket**. *Otimizar token antes de otimizar conversão é economizar gasolina do carro-forte.*

### 5.15 · O RELÓGIO: cron diário do Vercel × QStash
- **Problema:** Vercel Hobby = **1 cron/dia**. Uma cadência de "1ª cutucada em 6h" **não é pega** por um cron que roda 1×/dia.
- **Solução grátis e coerente com o stack: QStash** (Upstash, **MESMA conta do Redis** — não é peça estranha). **O QStash é só o RELÓGIO:** bate em `/api/followup` de hora em hora. **Motor e fila continuam no Vercel + Redis.**
- **Padrão sem colisão:** QStash `0 0-11,13-23 * * *` + cron Vercel `0 12` = **cobertura horária completa, zero sobreposição, grátis, sem Pro**.
- **Auth:** o QStash forwarda `Upstash-Forward-Authorization: Bearer <CRON_SECRET>` → o endpoint valida.
- **Paga:** mais um painel pra olhar; e **segredo trocado = 401 silencioso a cada hora**.
- **Antes de acusar o motor, PROVE O RELÓGIO:** no QStash confira `lastScheduleTime` / `isPaused` e bata no endpoint com o **MESMO header** que ele manda, exigindo **200**.
- **Alternativas:** Vercel Pro (US$20/mês cobre o time todo) · cron-job.org.
- *Validado no Manoel, 19/07: followup `[6,24,48,72]` só fica pontual assim.*

### 5.16 · Followup: a fila é do Redis, **a verdade do gate é do CRM**
- 🏛️ **DOUTRINA:** a fila vive no Redis, mas **a VERDADE DO GATE é do CRM** → **todo painel de fila deve filtrar pelas tags reais antes de exibir**. E **toda ação que tira o lead do fluxo tem que tirá-lo da fila na MESMA volta** — não deixe pro cron limpar.
- **Cicatriz do handoff (Manoel, 19/07):** a tool de escalação põe a tag `atendimento-humano`, mas o loop chamava `scheduleSilenceCheck(id, 0)` **depois** — **reagendando perseguição de quem acabou de ir pro humano**. Cura no fim do turno:
  ```ts
  if (reply.toolsUsed.includes('escalar_para_humano')) await clearFollowup(id)
  else await scheduleSilenceCheck(id, 0)
  ```
  **Defesa em profundidade:** a própria tool de escalação **também** chama `clearFollowup`, além da decisão no loop.
- **Por que é silencioso:** o cron *até* dropa esses leads (checa gate + tag humana antes de enviar) — **ninguém recebe followup errado** — mas eles ficam presos na fila e **o painel mente até lá**. *Bug que não quebra nada, só mente.*
- **Cicatriz da janela comercial (Manoel, 20/07):** relógio de hora em hora + janela 8h–18h → quem vence **17h38** não é pego pelo tique das 17h (cedo) nem pelo das 18h (janela já rejeita) e só sai no dia seguinte: **22 minutos viraram 14 horas de atraso**. **Nesse caso a fila estava PERFEITA** — o histórico no Redis foi conferido e a conta do intervalo **batia no segundo**; o culpado era **a janela comercial engolindo o tique**, não o motor.
  ```ts
  const UMA_HORA = 3600_000
  const lookAhead = dentroDaJanela(new Date(Date.now() + UMA_HORA)) ? 0 : UMA_HORA
  const due = await getDue(maxPorRodada, lookAhead)   // zrange até now + lookAhead
  ```
  Antecipa **no máximo um tique**: quem vence 18h07 continua esperando (tocar 1h+ adiantado é pior que esperar).
- **Cura no painel — NUNCA escreva "agora"** pra algo que só sai na próxima abertura: **foi essa palavra que fez o cliente achar que travou.** Calcule o envio real na **TZ do cliente** e escreva **"amanhã a partir das 8h"**. E **exponha a `janela` pela API do motor** — a Central não pode ter uma segunda cópia da regra.
- 🚩 **Cuidado com precisão falsa:** se você achar a próxima abertura **avançando de hora em hora**, o MINUTO que sobra é **resíduo do seu laço, não hora de envio** (`"ter., 08:46"` 🚫). Mostre **só a abertura da janela**.
- 🏛️ **DOUTRINA: a granularidade do gatilho é o piso da sua promessa.** Prometeu "6h"? Com tique horário + janela, o pior caso real é *6h + (fecha − vence) + noite*. **Ou você antecipa, ou promete a coisa certa.**
- **Janela de 24h da Meta (WhatsApp oficial):** mensagem livre só entrega até 24h **depois da última mensagem DO LEAD** (a nossa não reabre) e, fora dela, **não entrega e não dá erro claro** — followup 1 (12h) passa; 2, 3 e 4 morreriam. Caminho: **tag `ia-fu-cN` → Workflow do CRM → template aprovado**. **Template de reengajamento cai na categoria Marketing (~R$0,35/envio no BR) — e a Meta reclassifica quem tenta disfarçar de Utility.**
- **Enquadramento comercial:** followup é **RECUPERAÇÃO, não perseguição** — é a métrica que vende (🎯 em perseguição · ✅ recuperados **+ taxa %** · ❌ perdidos).

### 5.17 · `GET /api/followup-stats` — endpoint read-only (decisão de privacidade e acoplamento)
- **A decisão:** a fonte da aba "Recuperação" é um **endpoint read-only no agente** que lê a fila `mq:fu:*` do Redis. **Só IDs saem do agente** — **a Central enriquece os nomes via CRM**.
- **Ganha:** o agente não vira API de dados pessoais · a Central não precisa de credencial do Redis · uma fonte só pra fila (nada de segunda cópia da regra).
- **Paga:** +1 round-trip na Central; ela precisa das credenciais do CRM (que já tem).
- **Trackings necessários no agente:** `scheduleFollowup`, `markSent`,
  **`markRecovered`** (antes de resetar a cadência), **`markGoalAchieved`**
  (prova lida do CRM), `markHandoff`, `markCancelled` e `markEsgotado`.
  Contrato completo em `RECUPERACAO.md`.

---

## §6 · MULTI-CLIENTE: o que é isolado, o que é compartilhado

| Peça | Isolado por cliente | Compartilhado |
|---|---|---|
| Deploy Vercel (agente + Central) | ✅ um par por cliente (`agente-ia-<cliente>` / `central-ia-<cliente>`) | — |
| Credenciais (PIT/token, secret) | ✅ | — |
| `prompt.md` + `lib/crm-map.ts` | ✅ | o **motor** (`lib/*`) é o mesmo |
| Redis | **namespace** `agente-<slug>:` (GHL) / `ak:` (Kommo) | **free tier = 1 DB pra vários** |
| Grupo de alertas | carimbo `CLIENT_NAME` | **1 grupo pra todos os clientes** |
| uazapi | pode ser a mesma instância | ✅ |

🏛️ **REGRA DE OURO DO MULTI-CLIENTE:** *o que é do NEGÓCIO do cliente é isolado; o que é infraestrutura da agência é compartilhado.* Isso mantém o **custo marginal por cliente perto de zero**.

**Como dividir o Redis sem pagar (Upstash free = 1 database só):**
```bash
sed -i 's/agente:/agente-<slug>:/g' lib/*.ts api/*.ts
# e aponte as MESMAS envs UPSTASH_REDIS_REST_URL / _TOKEN
```
🚩 **CICATRIZ:** o `sed` pega **também** a propriedade JS `agente: {` em `api/config.ts` — **que não é chave Redis** e fica corrompida. **REVERTA esse ponto na mão.** (detalhe na pegadinha do prefixo Redis)
✅ **Validado 13/07/2026:** Camila-DAC dividiu o database Redis da Bia por namespace e **o isolamento foi provado**.

**Propagação de código novo (a "4ª perna"):** um componente compartilhado só está *pronto* quando **todos** os clientes foram redeployados. Nunca sobrescreva o que é do cliente:

| Compartilhado (o motor — vem do template) | Do cliente (a alma dele — **JAMAIS** tocar no update) |
|---|---|
| `lib/*.ts`, `api/*.ts` do agente · `area-cliente/` (páginas/componentes) | `prompt.md` · `lib/crm-map.ts` · `.env` / envs da Vercel · `.vercel/` · o **`status`** do `lib/manifest.ts` |

---

## §7 · O CONTRATO DE CONFIGURAÇÃO (a superfície que muda por cliente)

**Só 3 coisas mudam por cliente** (vale nos dois CRMs):
1. **`prompt.md`** — personalidade, portas, catálogo, limites
2. **`lib/crm-map.ts`** — IDs **AO VIVO**: pipeline, stages com o `quando`, `stageOrder` completo (guard anti-retrocesso), campos com o `quando` **e, no Kommo, os `enum_ids` das opções** + campo de resposta + campo de cadência + janela de reunião
3. **Env vars**

**Env vars do agente:**

| Comum aos dois | GHL | Kommo |
|---|---|---|
| chave da LLM escolhida · `VISION_PROVIDER` · `STT_PROVIDER` · `TTS_PROVIDER` · somente as chaves dos providers selecionados · `WEBHOOK_SECRET` · `CRON_SECRET` · `SELF_URL` · `CLIENT_NAME` · Upstash REST · uazapi/alertas | `GHL_TOKEN` (PIT) · `GHL_LOCATION_ID` | `KOMMO_DOMAIN` · `KOMMO_TOKEN` · `KOMMO_ACCOUNT_ID` · `KOMMO_BOT_ID` · `TRANSPORT` · `GATE_TAG` · (`UAZAPI_RELAY_URL`, `UAZAPI_AUTO_CREATE_LEAD`) |

**Pegadinhas de credencial:** peça somente as chaves do desenho aprovado.
OpenAI pode centralizar LLM/visão/STT/TTS, mas em modelos separados; Anthropic
usa `sk-ant-`; ElevenLabs exige TTS + Voices Read; Groq `gsk_` **não é Grok/xAI**.

**Env var só vale em novo deploy.** Mudou env → redeploy.

---

## §8 · RASTREIO DE ORIGEM (a arquitetura que faz o funil ter verdade)

Clique → código → 1ª mensagem → card, **tudo no mesmo projeto** (Fase 1 no ar e testada E2E 12/07/2026 no Kommo):

| Peça | O que faz |
|---|---|
| `GET /api/r/{slug}?utm_...` (**PÚBLICO**) | registra o clique no Redis (código de **4 chars, TTL 7d, uso único**) → **302** pro `wa.me` com o texto + `" #CODE"`. UTMs da URL **sobrescrevem** os defaults do link |
| `/api/links?secret=` | gerencia os links: `POST {slug, canal, phone, text, utm_*}` · `GET` lista com as URLs prontas |
| resolver no inbound (e no `/api/uazapi`) | acha o `#CODE`, **REMOVE do texto (o modelo nem vê)** e grava no lead: `utm_*` nos campos de tracking nativos, "Fonte do lead" por enum (canal sem enum → campo texto), **nota de auditoria** (canal/UTMs/hora/IP) |
| `lib/tracker.ts` (GHL) | `Contact Created` → grava Origem/UTM/1ª msg · e `Customer Replied` **com condição "Origem is empty"** → mesmo webhook. **Sem tag de gate** — o rastreador é pra TODO lead |
| fallback declarado | o prompt manda o agente **perguntar a origem UMA vez** e gravar via `preencher_qualificacao` |

**Fase 2 (futuro):** referral / `ctwa_clid` de anúncio CTWA — na uazapi vem no `contextInfo` da 1ª msg; no **oficial**, o Kommo preenche o UTM sozinho **SE o WABA estiver no MESMO Business Manager da conta de anúncios** (é a **provável causa do "UTM 0%"** em clientes — vire checklist de implantação). **Fase 3:** CAPI da Meta (evento de qualificação com `ctwa_clid`).

---

## §9 · COMO ESTA ARQUITETURA ENTRA NUMA SESSÃO

**Cliente novo:** diagnóstico (`comum/DIAGNOSTICO.md`) → **desenho comentado** (*"vamos fazer X porque Y; o trade-off é Z"*) → construção (`ghl/PLAYBOOK.md` ou `kommo/PLAYBOOK.md`) → **evals** → **E2E** → **rampagem** → **ensinar o time a operar** (o que é o gate, como desligar a IA num lead, como ler a Central).

**A folha de decisões que sai do diagnóstico** (entregável nº 4 — anote, é o contrato técnico):

☐ **voz** sim/não (só prometa depois de ouvir no celular) · ☐ **Redis** (obrigatório? volume/pico decide) · ☐ **RAG** sim/não (limiares §5.14) · ☐ **gate** (qual tag, quem marca) · ☐ **cadências** de followup (intervalos, janela comercial, o que fazer ao esgotar) · ☐ **transport** (GHL direto · Kommo Desenho A ou B) · ☐ **alçada** (até onde a IA vai) · ☐ **relógio** (cron diário basta ou precisa de QStash?)

**"Algo quebrou" — isole ANTES de teorizar:**

| Sintoma | Primeiro passo |
|---|---|
| "Nem respondeu" | **Saiu execução em `/api/executions`?** **Não** = workflow/gatilho do CRM, não o código (dispare `POST /api/inbound` manual pra provar) · **Sim** = **leia o diário (Redis) e cruze com `PEGADINHAS`** |
| **Resposta duplicada** | 1) **Redis ativo?** (`/api/inbound` → `redis:true`) · 2) **o número está em 2 sistemas?** (§5.13) |
| Áudio vira texto | pegadinhas de voz, **na ordem** (§1→§5 do bloco VOZ E ÁUDIO) |
| Campo não preenche | `/api/validate` — **ID morto grava com 200 OK silencioso** |
| Followup não sai | janela comercial? domingo? **janela 24h da Meta?** relógio provado? (§5.15/§5.16) |

**As provas de que está de pé:**
```bash
curl "https://<agente>.vercel.app/api/validate?secret=<SECRET>"   # ok:true (mapa × CRM vivo)
curl "https://<agente>.vercel.app/api/inbound"                    # {ok:true, redis:true}
ANTHROPIC_API_KEY=... node scripts/evals.mjs                      # 10/10 ou não sobe
```
E o E2E que prova o buffer: **rajada de 3 mensagens seguidas → UMA única resposta.**

---

## §10 · REFERÊNCIAS CRUZADAS

| Preciso de… | Vá em |
|---|---|
| as perguntas antes do código, red flags, saída do diagnóstico | `comum/DIAGNOSTICO.md` |
| números medidos (custo, latência, limiares), regra de ouro do prompt, anti-padrões | `comum/CONTEXT-ENG.md` |
| o exame do cérebro (conceito, harness, cenários, prova de valor) | `comum/EVALS.md` |
| o sandbox "Testar ao vivo" (dry-run na Central) | `comum/PLAYGROUND.md` |
| as dores que valem nos dois CRMs (Vercel, Meta, modelo, Central, followup) | `comum/PEGADINHAS.md` |
| construir/replicar no GHL · dores de GHL API, hidratação, voz | `ghl/PLAYBOOK.md` · `ghl/PEGADINHAS.md` |
| construir/replicar no Kommo · dores de tags/enum/salesbot/uazapi | `kommo/PLAYBOOK.md` · `kommo/PEGADINHAS.md` |

> **Âncoras herdadas (mantidas resolvíveis):** as chamadas históricas do PLAYBOOK apontam pras pegadinhas **§1 voz/áudio (GHL)** · **§1-5 áudio vira texto (GHL)** · **§8 janela 24h da Meta (comum)** · **§9 um número = um agente (comum)** · **§11 ID morto com 200 OK (GHL)** · **§15 `SELF_URL` × `VERCEL_URL` (comum)** · **§18 prefixo Redis / `agente: {` (comum)**. Cite sempre **título + número original** — a numeração antiga sobrevive à fusão como rótulo, não como posição.
