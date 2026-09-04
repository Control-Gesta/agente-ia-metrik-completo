# PEGADINHAS — o sangue já derramado (vale nos DOIS CRMs)

> Cada item aqui custou **horas de produção real**. **Nenhum é teórico.** Data e evidência em cada um — se você replicar sem ler, vai reencontrar todos.

**Leia ANTES de:** prometer voz · prometer followup pontual · prometer agendamento · dizer "tá pronto". **Leia DURANTE:** qualquer coisa quebrada (o `Debug rápido` no fim mapeia sintoma → §).

## As 3 frases que resumem este arquivo

1. **LEI 4 — prova antes de promessa.** Voz, agendamento e followup só se VENDEM depois de teste E2E em **número real**. Este arquivo inteiro é o lembrete permanente disso.
2. **"Funcionou no meu teste" NÃO é prova.** O caso da voz (§1) **logava sucesso** (`voz: true`) e **não entregava áudio nenhum** por dias. Log de decisão ≠ entrega confirmada no celular.
3. **O que é determinístico vira CÓDIGO, não instrução de prompt.** O modelo é ótimo em linguagem, péssimo em disciplina de processo (§2 é a cicatriz que provou).

## Como ler a numeração

| Convenção | Significado |
|---|---|
| **§1..§25** | Numeração **canônica herdada** — outros arquivos (DIAGNOSTICO, PLAYBOOK, SKILL) referenciam por esse número. **Nunca renumere.** |
| **§26+** | Cicatrizes universais que nasceram no Kommo ou fora da lista original |
| 🟦 GHL · 🟧 Kommo · 🟪 os dois | Onde a cicatriz morde. **Tudo neste arquivo vale nos dois** — a etiqueta diz onde ela foi *medida* |
| ➡️ `ghl/` `kommo/` | O detalhe de plataforma vive na pasta daquele CRM. Aqui fica a **lei universal** + a evidência |

---

## 🔊 VOZ E ÁUDIO — a cadeia que MAIS quebra
*(5 bugs em cadeia, cliente DAC 13/07/2026 · voice note real validada no Kommo 12/07/2026)*

### §1 🚨 O canal do CRM DESCARTA áudio outbound — a voz só sai por uazapi `ptt`
| | |
|---|---|
| **Sintoma** 🟦 | `POST /conversations/messages {type:WhatsApp, message:'', attachments:[ogg]}` → status **`failed`** ("The parameter text.body is required"). Com body não-vazio (`'🎧'`) → status **`delivered` mas só o texto chega — o áudio some**. |
| **Sintoma** 🟧 | Salesbot = **1 mensagem de TEXTO por resposta**; a API v4 do Kommo **não envia mensagem** nenhuma. Voz não existe no Desenho A — só no Desenho B (uazapi). |
| **A lição mais cara** | A validação antiga logava `voz: true` (a **decisão do modelo**) e **ninguém tinha confirmado entrega no celular**. Achávamos que funcionava **há dias**. **SEMPRE teste voz em número real antes de vender.** |
| **Conserto** 🟪 | Enviar pelo **uazapi** (mesmo número): `POST {UAZAPI_URL}/send/media`, header `token`, body `{number, type:'ptt', file:<ogg>}` → **bolinha de voz de verdade**. 🟦 `file` = URL pública do ogg hospedado no GHL. 🟧 `file` = `data:audio/ogg;base64,...` direto do ElevenLabs (`opus_48000_64`). |
| **Detalhe** | Código: `lib/voice.ts → sendVoiceNoteUazapi(phone, ogg)`. Use **`contact.phone`** — a uazapi manda **por número**, não por contactId/leadId. |
| **Evidência** | DAC 13/07/2026 (GHL) · Kommo E2E 12/07/2026 (voice note real recebida) |

### §2 Decisão de voz = DETERMINÍSTICA (não confie no modelo) 🟪
- **Sintoma:** o marcador `[AUDIO]` escorrega — o modelo **voicava até resposta a texto** (e, no Kommo, o inverso também: o modelo **imita o padrão do histórico nos dois sentidos**, chegando a responder texto em voz).
- **Conserto (código, não prompt)** — `api/inbound.ts`:
  ```ts
  const leadSentAudio = (target.body || '').startsWith('[áudio do lead]:')
  if (reply.voice && leadSentAudio) { /* voz */ } else { /* texto */ }
  ```
- **Regra bidirecional (validada no Kommo):** turno de **áudio** → voz **forçada** (≤500 chars, sem link) · turno de **texto** → voz **derrubada** · **exceção:** o lead pediu áudio **por escrito**. O prompt imperativo + o aviso dinâmico guiam só o **CONTEÚDO**, nunca o canal.
- **Doutrina:** a decisão de voz virou código **exatamente porque** o modelo escorregava quando era só instrução. Vale pra alçada, whitelist de etapa e qualquer regra determinística.

### §3 Hidratação de mídia precisa de espera EXPLÍCITA 🟪
- **Sintoma:** o áudio **some do histórico** → o agente responde em texto, **fora do assunto**.
- **Causa:** o anexo é processado **DEPOIS** do webhook. O buffer de 10s **não cobre de forma confiável**.
- **Conserto** 🟦: `getHydratedHistory(convId)` — backoff **12×2s ≈ 24s** enquanto o último inbound for placeholder sem URL. E o `getMessages` **NÃO pode descartar inbound vazio** (áudio não-hidratado tem `body:""` e `attachments:[]`) → mantenha como `[mídia recebida sem texto]`.
- **Conserto** 🟧 (uazapi): a mídia vem em `message.content.URL` **`.enc` criptografada — INÚTIL direto**. Baixe com `POST /message/download {id}` → devolve `fileURL` mp3 descriptografado. É **ASSÍNCRONO** (o webhook chega antes da conversão) → **retry 2/4/8s**.
- **Custo aceito:** áudio demora **~30s** pra responder. **Avise o cliente que é de propósito** — senão vira "a IA travou".

### §4 Voz via uazapi cria GAP de histórico → alucinação 🟦 (doutrina 🟪)
- **Sintoma:** o agente alucina ("aguardando você escolher o horário") e **se repete**.
- **Causa:** o GHL registra a nota de voz (mandada pelo uazapi) como **outbound VAZIO**. Se o `getMessages` descarta vazios, o modelo lê um histórico onde **ELE nunca respondeu**.
- **Conserto:** outbound vazio vira marcador **`[<Agente> respondeu por áudio aqui]`**.
- ⚠️ **É marcador, não conteúdo.** Pra conversa longa por voz, o refinamento futuro é **gravar o texto da fala** no Redis/CRM e reinjetar.
- 🟧 No Kommo o histórico é **nosso** (Redis `ak:conv:{leadId}`) — o gap não acontece **se** você gravar a fala ao enviar. **Se esquecer de gravar, o bug volta idêntico.**

### §5 Voz TEM que ser CURTA (~500 chars / 2-3 frases) 🟪
- **Conta:** ElevenLabs a **64kbps ≈ 8KB/s** → **~800 chars** batem no teto de **500KB** (guard) → **cai pra texto silenciosamente**.
- Prompt "showcase" tende a explicar o ecossistema inteiro e estourar. **Regra firme no prompt:** em voz, **ponto principal + gancho e puxa pra reunião**; detalhe vai por texto.
- **Link JAMAIS vai em áudio.** (Também é pergunta de diagnóstico — Bloco 3.)

### §6 NÃO delete a conversa/lead de teste entre rodadas 🟦
O gatilho **"Customer Replied" engasga no 1º evento** de conversa recém-criada → "nem respondeu" (o workflow **não dispara**, o código nem roda). Deixe a conversa existir; o marcador (§4) resolve a poluição de contexto.

### §7 STT: teste com Node, não curl 🟪
- `curl -F` no **Git Bash Windows falha (exit 26)**. O caminho real (**Node fetch + FormData + Blob → Groq**) funciona.
- **Injetar inbound com attachment via API NÃO testa STT** — o GHL **apaga o anexo** do inbound injetado. **Teste de áudio real só com WhatsApp de verdade.**
- Groq **engole ogg/opus direto** (e baixa a URL por conta dele).

### §7b Imagem e PDF: descreva UMA vez na ENTRADA, com a visão do próprio Claude 🟪
*(aprendido no Manoel, 19/07/2026)*

> **Regra de ouro: descreva na entrada e grave como TEXTO no histórico.** Assim histórico, followup, evals e Central continuam sendo texto puro — e você **não paga visão a cada turno**.

| Tipo | Como | Vira no histórico |
|---|---|---|
| áudio | Groq Whisper (`transcribeUrl`) — barato e rápido | `[áudio do lead]: <transcrição>` |
| imagem | visão do Claude: `{type:'image', source:{type:'base64', media_type, data}}` | `[imagem do lead]: <descrição>` |
| PDF | document input: `{type:'document', source:{type:'base64', media_type:'application/pdf', data}}` | `[documento do lead]: <descrição>` |

**Os marcadores acima são OBRIGATÓRIOS** — §2 depende do prefixo `[áudio do lead]:` pra decidir voz.

Pegadinhas medidas:
- **Roteie por content-type E extensão.** `HEAD` antes de baixar pra detectar áudio (o Groq baixa sozinho); imagem/PDF **você** baixa e manda em base64.
- **Normalize o `media_type` da imagem** pro que a API aceita (`image/jpeg|png|gif|webp`) — **`image/jpg` quebra**.
- **Teto ~8MB** e **`User-Agent` de browser** no download (Cloudflare do GHL/uazapi bloqueia sem — §14).
- **Prompt de descrição COM o contexto do negócio** ("escritório previdenciário: que documento é? que dados aparecem?"). Sem isso o modelo descreve *"um papel branco"* em vez de *"RG de João, nº X"*.
- **Mande admitir quando não dá:** "se ilegível/cortado, diga; NÃO invente". Testado: numa foto sem documento ele respondeu *"não é um documento, não há dados relevantes"* em vez de alucinar um RG.
- **No prompt do agente:** avise que a mídia chega **já descrita** com os marcadores, que ele **NUNCA** diga "não consigo ver/ouvir", e que **não interprete o documento juridicamente** (isso é do advogado) — só **reconheça, agradeça e emende a próxima pergunta**.
- **É o MESMO modelo e a MESMA key** que já respondem o lead: **não precisa de Gemini/OCR/serviço à parte** (o n8n usava Gemini — é **um fornecedor a menos** no stack).

---

## 📱 WHATSAPP / META

### §8 Janela de 24h (mata followup SILENCIOSAMENTE) 🟪
- **Regra da Meta:** mensagem livre só entrega até **24h depois da última mensagem DO LEAD** (a nossa **não** reabre). Fora dela: **não entrega e não dá erro claro**.
- **Consequência real:** followup 1 (12h) passa; **2, 3 e 4 morreriam**. 🟧 No Kommo idem: cadência 1 (12h) entra, 2+ não entregam texto livre.
- **Solução** 🟦: a API do GHL **não envia template** (verificado no spec: `templateId` sem variáveis, sem endpoint). O caminho é **tag `ia-fu-cN` → Workflow GHL "Tag Added" → action WhatsApp com TEMPLATE aprovado**.
- **Solução** 🟧: **uazapi** (número não-oficial não tem janela) **ou** bloco de **template WABA** dentro do Salesbot.
- **Custo:** template de reengajamento = categoria **Marketing** (**~R$0,35/envio BR**). A Meta **reclassifica** quem tenta disfarçar de Utility.
- **Reabertura:** lead responde o template → janela reabre → volta o texto livre.
- ⚠️ **Só vale no WhatsApp OFICIAL.** Pergunte no diagnóstico (Bloco 3): *"o WhatsApp é oficial (API/Meta) ou aparelho?"*

### §9 UM NÚMERO = UM AGENTE (coexistência é traiçoeira) 🟪
*(a pegadinha NASCEU no Kommo, 11/07/2026)*
- Um número pode estar na **Cloud API (GHL)** *e* **pareado na uazapi (Kommo)** ao mesmo tempo — é a coexistência da Meta.
- Uma **única** mensagem entra pelos **DOIS** caminhos → se os dois agentes tiverem gate aberto, **o lead recebe RESPOSTA DUPLA**. Verificado 11/07: **Bia GHL + Bia Kommo responderam juntas** à mesma mensagem — e a bridge ainda puxa as respostas do oficial pro Kommo, virando **bagunça no chat**.
- **Regras:** produção = **número exclusivo por agente**. Dogfood com número compartilhado = **só UM gate aberto por vez** pro mesmo contato.
- 🟧 **Variante interna do Kommo:** número conectado no Kommo **E** na uazapi → mesma msg 2×. Cura: **canal único por lead** (`ak:via:{leadId}`; `via=uazapi` faz o `add_message` **ignorar** aquele lead). O followup usa **o último canal**.
- **Red flag de venda:** *"meu número já tem outro bot"* → resposta dupla **garantida**. Fale isso ANTES de fechar: *"um número = um agente; senão o lead recebe duas respostas — já vimos acontecer"*.

### §26 DOIS CÉREBROS NO MESMO CANAL (o bot nativo/legado que ninguém desligou) 🟪
- **Sintoma:** duas respostas diferentes, tom diferente, às vezes contraditórias.
- **Causa** 🟦: o **Conversation AI nativo (Autopilot)** do GHL continua ligado no canal. **Desligue** — é etapa obrigatória do go-live.
- **Causa** 🟧: o **fluxo n8n antigo** continua ativo na conta (gate tag `IA`) enquanto o agente novo usa `IAV`. **Gates disjuntos**: NUNCA ponha `IA` e `IAV` no mesmo lead.
- **Lei:** um canal = **um** cérebro. Antes do E2E, faça o inventário do que mais responde naquele número (bot nativo, n8n legado, chatbot do site, atendente).

### §27 LOOP DE ECO — o canal devolve as PRÓPRIAS mensagens 🟧 (lei 🟪)
- **Sintoma:** loop infinito real (aconteceu no **Imigre USA**): o webhook `add_message` dispara para a mensagem que **o próprio bot** acabou de enviar.
- **Cura em camadas** (o template já traz): **hash da última resposta** (`ak:lastout:`) · **campo `direction`** · **rate limit 10/min/lead**.
- **uazapi:** `fromMe` + `wasSentByApi` = **eco nosso** → ignorar.
- **Lei universal:** todo canal que **retorna outbound** precisa de anti-eco em camadas. 🟦 No GHL o gatilho é "Customer Replied" (só inbound), então o eco não aparece — **mas se você trocar o gatilho, ele volta**.

---

## ⚙️ A VERDADE DO CRM (a lei vale nos dois; o detalhe vive na pasta do CRM)

### §10 Rate limit (rajada de teste + painel com polling = lead sem resposta) 🟪
- 🟦 GHL: **~100 req/10s por location** → 429.
- **Fixes (universais):** **retry com backoff 2/4/8s** no client · **painel SEM polling automático** (só botão "Atualizar") · **`sleep(250ms)`** em loops de paginação.

### §11 IDs mudam debaixo de você + gravação em campo morto com 200 OK 🟪
- **Fato:** o time do cliente **deleta campo e renomeia etapa sem avisar**. Aconteceu no **MESMO DIA**: **4 campos deletados e 2 stages novos entre a manhã e a noite**.
- 🟦 O GHL **aceita PUT em field ID inexistente com 200 silencioso** = **perda de dado invisível**.
- **Cura:** **`/api/validate`** (compara o mapa vs o CRM VIVO) rodando **todo dia** pelo guardião + laudo no grupo. **Discovery ao vivo SEMPRE** antes de escrever o `crm-map.ts` — nunca de anotação/memória.
- **Fail-closed:** stage/pipeline desconhecido = **não mexe**. 🟧 O lead pode estar em **OUTRO pipeline** — as tools **recusam** se `pipeline_id ≠ mapa` ou status fora do `stageOrder`.
- **Pergunta de diagnóstico que decide isso:** *"alguém mexe no funil sem avisar?"* → se SIM, `/api/validate` no cron é **obrigatório**.

### §12 Filtre o tipo de mensagem — senão NOTA INTERNA VAZA pro lead 🟪
- 🟦 Use **allowlist** `TYPE_SMS`/`TYPE_WHATSAPP`. Sem isso: activities poluem e **`TYPE_INTERNAL_COMMENT`** (nota interna do time) entra no contexto do modelo — **que pode repeti-la pro lead**. Grave.
- **Lei:** todo histórico tem lixo. **Allowlist**, nunca blocklist.

### §13 Leitura de campo mente 🟦 ➡️ `ghl/PEGADINHAS.md`
`GET /contacts/{id}` às vezes vem com `customFields: []` **mesmo tendo dados** → use **`POST /contacts/search`**. E no PUT de opportunity, custom field usa **`field_value`** (não `value`).
🟧 Equivalente Kommo (➡️ `kommo/PEGADINHAS.md`): **PATCH de tags SUBSTITUI o conjunto inteiro** · **multiselect também substitui** · **select/multiselect gravam por `enum_id`**, não por texto.

### §14 Cloudflare 1010 — sem `User-Agent` de browser, 403 🟪
Atinge **GHL, Groq e downloads de mídia (uazapi)**. Sempre mande **UA de Chrome**. Sintoma: `403 "Error 1010"` em chamada que funciona no navegador.

---

## ☁️ VERCEL / INFRA

### §15 NUNCA use `VERCEL_URL` pra self-fetch 🟪
- **Causa:** ela aponta pra URL **interna do deployment**, **protegida por Vercel Authentication** → devolve **tela de login em vez de JSON**.
- **Conserto:** use o **alias público** via env **`SELF_URL`**.
- **Sintoma:** guardião reportando *"endpoint inacessível"* **com tudo no ar** — **12/07/2026, o próprio guardião pegou**.

### §16 Rotinas cloud do Claude NÃO têm saída de rede 🟪
- **Evidência:** guardião/analista como *scheduled remote agent*: **3 rodadas, zero efeito** (curls bloqueados **em silêncio**). 11/07/2026.
- **Doutrina:** **monitores vivem DENTRO do agente** (`lib/guardian.ts`, `lib/analyst.ts`, `lib/auditor.ts`) rodando pelo **cron da Vercel**. Rotina cloud só pra tarefa **sem rede**.
- **Bônus de ser nativo:** credenciais em **env** (não no prompt), código **versionado**, números **calculados em código** (zero alucinação).

### §17 Vercel Hobby = 1 cron/dia (e como ter followup PONTUAL mesmo assim) 🟪
- Por isso existe o dispatcher **`api/cron-daily.ts`**: followup → guardião → **segunda:** analista → **sexta:** auditor.
- **Mas cron diário deixa o followup impreciso** — cadência "1ª em 6h" **não** é pega por um cron 1×/dia.
- **Solução grátis e coerente: QStash** (Upstash — **MESMA conta do teu Redis**, não é peça estranha ao stack). O QStash é **só o relógio**: um schedule bate no `/api/followup` **de hora em hora**; **motor + fila seguem no Vercel+Redis**.
- **Padrão sem colisão** (nem precisa remover o cron nativo): QStash **`0 0-11,13-23 * * *`** (toda hora MENOS a que o cron do Vercel cobre, ex. `0 12`) → **cobertura horária completa, ZERO sobreposição**.
- **Auth:** o QStash forwarda **`Upstash-Forward-Authorization: Bearer <CRON_SECRET>`** → o endpoint valida.
- **Evidência:** Manoel **19/07/2026** — followup `[6,24,48,72]` **só fica pontual assim**. (Alternativas: **Pro US$20/mês** cobre o time todo · cron-job.org.)
- ⚠️ **Hobby é NÃO-COMERCIAL nos termos** — **cliente pagante = Pro** (ou QStash como gatilho + Hobby só com o cron nativo).
- **Limites que o serverless cobra** (o outro lado do trade-off): nada de processo longo (**tudo cabe em 300s**) e **não dá pra "olhar o servidor"**. ➡️ `comum/ARQUITETURA.md`. **Quando NÃO usar serverless:** cliente que exige WhatsApp não-oficial **self-hosted** (Evolution/Baileys) — aí precisa de máquina viva mantendo a sessão.

### §18 Upstash free = 1 database só 🟪
- **Pro 2º agente sem pagar: compartilhe com NAMESPACE.**
  ```bash
  sed -i 's/agente:/agente-<slug>:/g' lib/*.ts api/*.ts
  ```
- ⚠️ **O sed pega também a propriedade JS `agente: {`** em `api/config.ts` (**não é chave Redis**) — **reverta esse ponto**.
- **Validado 13/07/2026:** Camila-DAC dividiu o DB da Bia; **isolamento provado**.
- 🟧 No Kommo o prefixo já nasce separado (`ak:`) justamente pra dividir o database com o agente GHL.
- **Regra multi-cliente:** o que é do **NEGÓCIO** do cliente é **isolado** (deploy, credenciais, prompt, crm-map); o que é **infraestrutura da agência** é **compartilhado** (Redis com namespace, uazapi, grupo de alertas com carimbo `CLIENT_NAME`).

### §29 Env var só vale em NOVO deploy · e cada cliente tem projeto PRÓPRIO 🟪
- **Sintoma:** "troquei a env e nada mudou". **Mudou env → redeploy.** Sempre.
- **Isolamento:** um par de deploys **por cliente** (`agente-ia-<cliente>` + `central-ia-<cliente>`), pasta própria. **NUNCA redeploya a Central/agente de outro cliente.**
- **`WEBHOOK_SECRET` NOVO por cliente** (`openssl rand -hex 24`) — reaproveitar secret entre clientes é vazamento cruzado.
- ⚠️ **Segredo trocado sem avisar o relógio = 401 silencioso a cada hora** (o QStash continua batendo e você não vê). Ver §25.

### §32 uazapi: 1 webhook POR instância (POST SUBSTITUI o anterior) 🟪
- **Sintoma:** você configura o webhook do agente e **outro sistema para de receber** (ou vice-versa).
- **Causa:** a uazapi aceita **um** webhook por instância — o `POST` **substitui**, não adiciona.
- **Cura:** se outro sistema consome (ex. inbox Bridge), **nosso endpoint RETRANSMITE** (env `UAZAPI_RELAY_URL`).
- **Payload (Bridge-API):** `{EventType:"messages", chat, message}` — texto em `message.text`, mídia em `message.content.URL`.
- **Busca por telefone é FUZZY** e contatos de teste com o mesmo número confundem → **valide o telefone dígito a dígito** + índice `ak:phone2lead:`.
- **Auto-criação de lead** (`UAZAPI_AUTO_CREATE_LEAD=1`) **SÓ em número dedicado da IA** — em número compartilhado (suporte) mantenha o **gate por tag**.

---

## 🧠 MODELO E CREDENCIAIS

### §19 Sonnet sem `thinking: {type:'disabled'}` 🟪
**Adaptive thinking liga sozinho**, come o `max_tokens` **pensando** → **resposta vazia → lead sem resposta, sem erro nenhum**. Sempre desabilitar em agente conversacional **e** nos evals. E trate **`stop_reason: 'max_tokens'` com retry**.

### §20 Assinatura Claude Max como backend = violação de ToS 🟪
Backend comercial exige **API key** (Commercial Terms). **Enforcement ativo desde fev/2026.** Peça a key da conta comercial no diagnóstico.

### §30 Bloco dinâmico no lugar errado INVALIDA o cache 🟪
`cache_control` no **bloco estático** (o `prompt.md`); **data, nome, tags e hora em bloco SEPARADO**. Misturou? O **timestamp invalida o cache a cada minuto** e você paga preço cheio (**R$0,13 vs R$0,02 por chamada** — números medidos, ➡️ `comum/CONTEXT-ENG.md`).

### §28 Credenciais que nascem quebradas (peça e confira ANTES) 🟪
| Credencial | Formato | Pegadinha |
|---|---|---|
| **Anthropic** | `sk-ant-` | **conta comercial** — assinatura Max em backend viola ToS (§20) |
| **ElevenLabs** | `sk_` | **nasce SEM escopos** — marque **TTS + Voices Read** na criação, senão 401 na hora do teste |
| **Groq** | `gsk_` | **Groq ≠ Grok/xAI** — gente já criou conta na empresa errada |
| **Upstash REST** | URL + token | free = **1 DB** → namespace (§18) |
| **uazapi** | URL + token | necessária pra **voz (`ptt`)** e pra **alertas em grupo de WhatsApp** |
| 🟦 **GHL PIT** | `pit-` | admin da location (PIT + workflows + templates) |
| 🟧 **Kommo** | token longo | `KOMMO_DOMAIN`/`TOKEN`/`ACCOUNT_ID`/**`BOT_ID`** (o bot_id só existe depois do Salesbot criado no UI) |
| **Voz do cliente** | — | voz da biblioteca **OU 1-2 min de gravação limpa** pra clonar |

---

## 🔁 FOLLOWUP × HANDOFF × RELÓGIO

### §24 🚨 O handoff se auto-sabota: encaminha pro humano E agenda followup 🟪
*(Manoel, 19/07/2026)*
- **Sintoma:** leads que a IA **ACABOU** de encaminhar pro humano (tag `atendimento-humano`) aparecem na **fila de followup**. O painel mostra *"em perseguição"* quem **já foi entregue** pro time.
- **Causa:** a tool de escalação põe a tag, mas o loop do agente chama **`scheduleSilenceCheck(id, 0)` DEPOIS** de enviar a resposta — **reagendando a perseguição de quem acabou de sair do fluxo**. A tag entra; o agendamento vem depois e **vence**.
- **Cura** (`lib/agent.ts`) — decida pelo que **ACONTECEU no turno**:
  ```ts
  if (reply.toolsUsed.includes('escalar_para_humano')) await clearFollowup(id)
  else await scheduleSilenceCheck(id, 0)
  ```
  A própria tool **também** chama `clearFollowup` (defesa em profundidade).
- **Por que é silencioso:** o cron **até** dropa esses leads (checa gate + tag humana antes de enviar), então **ninguém recebe followup errado** — mas eles **ficam presos na fila** até a checagem vencer e **o painel MENTE até lá**. *Bug que não quebra nada, só mente.*
- **Doutrina que ficou:** a **fila vive no Redis, mas a VERDADE do gate é do CRM** → todo painel de fila **filtra pelas tags reais** antes de exibir. E **toda ação que tira o lead do fluxo tem que tirá-lo da fila na MESMA volta** — não deixe pro cron limpar.

### §25 🚨 A janela comercial ENGOLE o tique do relógio (o followup que nunca sai) 🟪
*(Manoel, 20/07/2026)*
- **Sintoma:** o cliente **jura** que "o followup não funciona". O painel mostra leads *"em perseguição"* com **"próxima cutucada agora"** parados há horas. **Nada foi enviado.**
- **O caso real:** relógio **de hora em hora** + janela **8h–18h**. Lead vence às **17h38**. O tique das **17h** é cedo demais; o das **18h** a janela **rejeita** (`hora < 18` é falso às 18h). Resultado: **22 minutos de diferença viraram 14 HORAS de atraso**. A fila estava **perfeita** — conferi o histórico no Redis e a conta do intervalo batia **no segundo**.
- **Cura (motor)** — quando o **PRÓXIMO** tique já cai fora da janela, **antecipe** quem vence até lá:
  ```ts
  const UMA_HORA = 3600_000
  const lookAhead = dentroDaJanela(new Date(Date.now() + UMA_HORA)) ? 0 : UMA_HORA
  const due = await getDue(maxPorRodada, lookAhead)   // zrange até now + lookAhead
  ```
  **Antecipa no MÁXIMO um tique**: quem vence 18h07 continua esperando (tocar 1h+ adiantado é **pior** que esperar).
- **Cura (painel):** **NUNCA escreva "agora"** pra algo que só sai na próxima abertura — foi **essa palavra** que fez o cliente achar que travou. Calcule o envio real **na TZ do cliente** e escreva **"amanhã a partir das 8h"**. E **exponha a `janela` pela API do motor**: a Central **não pode** ter uma segunda cópia da regra.
- **Cuidado com precisão falsa:** se você achar a próxima abertura avançando de hora em hora, o **MINUTO** que sobra é **resíduo do seu laço**, não hora de envio (*"ter., 08:46"* 🚫). Mostre **só a abertura da janela**.
- **Doutrina:** **a granularidade do gatilho é o PISO da sua promessa.** Prometeu "6h"? Com tique horário + janela, o pior caso real é *6h + (fecha − vence) + noite*. **Ou você antecipa, ou promete a coisa certa.**
- **Antes de acusar o motor, PROVE O RELÓGIO:** no QStash confira **`lastScheduleTime`/`isPaused`** e bata no endpoint com **o MESMO header que ele manda** (`Authorization: Bearer <CRON_SECRET>`), exigindo **200**. **Segredo trocado = 401 silencioso a cada hora.**
- **Enquadramento comercial:** followup é **RECUPERAÇÃO, não perseguição** — é a métrica que vende (aba Recuperação da Central: em perseguição · recuperados + **taxa %** · perdidos · fila por cadência · "quem voltou").

---

## 🖥️ CENTRAL / ÁREA DO CLIENTE
*(validado no Manoel, 19/07/2026 — a Central é template compartilhado: as 4 cicatrizes valem em qualquer CRM)*

### §22 `STAGE_ORDER` da Central é HARDCODED — o funil ZERA se você não trocar 🟪
`area-cliente/lib/ghl.ts` tem os **stage IDs chumbados** (do 1º cliente que gerou o template). Ao replicar, se não trocar pelos stages do novo cliente, o `getFunnelStages` **não casa nenhum id** → **todas as barras do funil ao vivo ficam ZERO**. **Sem erro, só zerado** — parece que o funil está vazio. Troque pelos IDs vivos (🟦 `GET /opportunities/pipelines` · 🟧 `GET /api/v4/leads/pipelines`) e marque **`ia:true`** nas etapas que o agente move.

### §23 Central quebra (500) se o agente NÃO tem calendário 🟪
A página `/funil` renderiza `f.calendario.nome`/`janelaDias` **direto**. Agente sem agenda (ex.: fluxo de handoff) → o `/api/config` **não devolve** `funil.calendario` → **página 500** (`Cannot read properties of undefined`). **Fix:** `calendario?` **opcional** em `AgentConfig` (`lib/agent.ts`) + guardar a seção AGENDA com `{f.calendario && (...)}`. O `/api/live` já cai gracioso (`.catch(() => ({proximos:[],realizados7d:0}))`) — **mas a página SSR não**, tem que guardar.

### §31 Tema claro: "branco no branco" e flash no tema errado 🟪
O CSS nasce **dark com cor CHUMBADA** (`#000`, `#0a0a0a`, dezenas de `text-white`). Só ofereça tema claro depois de:
1. converter pra **variáveis** (`--surface`, `--line`, `--badge-bg`, `--text-*`) com override em `[data-theme='light']`;
2. trocar `text-white`→`text-foreground` e `bg-white/[x]`→`bg-foreground/[x]` (**senão vira branco no branco**);
3. no `tailwind.config`, usar `hsl(var(--x) / <alpha-value>)` (senão o `/95` não funciona);
4. aplicar o tema salvo num **script inline no `<head>` ANTES da 1ª pintura** (senão **pisca** no tema errado).
Badges coloridos precisam de tom **mais escuro** no claro, e o shimmer do hero **inverte** (clareia no dark, escurece no light).

### §21b Painel com polling automático = 429 no agente 🟪
O painel do cliente atualizando sozinho consome o mesmo rate limit que atende o lead (§10). **Só botão "Atualizar".**

---

## 🏫 A ESCOLA — reler conversa, PII e proxy entre dois deploys
*(Fase 0 da Escola no agente da Metrik/GHL, 22/07/2026 — 4 cicatrizes numa tarde; 3 delas pegas pelo TESTE, antes do ar)*

### §33 🚨 O diário registra que RESPONDEU, não O QUE respondeu 🟪
- **Sintoma:** a Escola (e replay, e análise de qualidade) precisa **reler a conversa** — e não há texto nenhum pra reler.
- **Causa:** o `ExecRecord` de `lib/execlog.ts` guardava `{ts, contactId, nome, resultado, detalhe, duracaoMs, tools, voz}` — **metadado puro**. O diário prova que o agente respondeu; **não guarda o que o lead disse nem o que a IA respondeu**.
- **Conserto:** dois campos **opcionais** no `ExecRecord` (`turnoLead`, `respostaIA`) + preenchê-los no `logExec` do `api/inbound.ts` — `target.body` e `reply.parts.join(...)` **já estão em escopo** (é uma linha, não refactor) — e **anonimizar na GRAVAÇÃO** (§35), nunca só na exibição.
- ⚠️ **Consequência que NÃO se conserta:** o histórico anterior **não tem texto e nunca terá**. A lista **nasce vazia** e só enche a partir do deploy. Avise o cliente — senão a primeira impressão da feature nova é *"está quebrada"*.
- **ANTICORPO:** antes de chamar um componente existente de **"de graça"**, **abra o arquivo e confira o SCHEMA**. *"X já existe"* **não é** *"X já guarda o que eu preciso"*. Vale pro diário, pro histórico, pro tracker e pra qualquer peça que você planeja reaproveitar numa feature nova.
- **Evidência:** Metrik/GHL **22/07/2026** — descoberto ao construir a Fase 0 da Escola: o `execlog` tinha 500 registros e **zero texto**.

### §34 Trava de perfil que MATA a própria feature 🟪
- **Sintoma:** o cliente abre a Central e o **"testar ao vivo" sumiu** — ou existe, mas o campo de texto **nunca responde**. Sem erro, sem log: a feature **morre em silêncio**.
- **Causa (front):** o playground morava **DENTRO** do bloco `{modo === 'editar'}`. Esconder o editor de prompt do perfil `dono` **escondeu o laboratório junto** — e o laboratório é a **porta de entrada da Escola**.
- **Causa (server):** a lista de ações bloqueadas pra não-admin. O reflexo natural é escrever `['publicar','restaurar','rollback','testar','chat']` — e o `'chat'` **desliga o laboratório do cliente**. O certo é `['publicar','restaurar','rollback','testar']`: **`'chat'` fica de FORA de propósito**.
- **Conserto:** **3 modos** — `ler | ensinar | editar` — com o playground **extraído** pra `components/Playground.tsx` e prop `onErrouAqui` opcional (é por ela que o "errou aqui" da Escola pega o turno).
- **ANTICORPO:** ao esconder algo por perfil, pergunte **o que mais estava aninhado ali dentro**. Permissão é **por AÇÃO**, não por bloco de JSX.
- **Evidência:** Metrik/GHL **22/07/2026** — pego na leitura do `page.tsx` **antes** de aplicar a trava; teria desligado a feature no primeiro cliente com perfil `dono`.

### §35 🚨 Celular BR tem 11 dígitos — EXATAMENTE como CPF (regex de PII) 🟪
Dois bugs numa regex que "já estava pronta":
- **(a) `\b` NÃO casa antes de parêntese.** Em `(11) 98765-4321` não existe fronteira de *palavra* entre o espaço e o `(` → o match começava no `1` e sobrava um parêntese órfão: **`([telefone]`**. **Cura:** a fronteira que importa é de **DÍGITO** — troque `\b` por **`(?<!\d)` / `(?!\d)`**, que funciona com `(`, `+` e espaço em volta.
- **(b) A ORDEM dos padrões é parte da correção.** Com o padrão de CPF **antes** do de telefone, `11987654321` virava **`[cpf]`** — **rótulo ERRADO em dado sensível**, o tipo de coisa que se descobre meses depois, quando alguém audita a régua de privacidade.

**A ordem correta (do inequívoco pro ambíguo):**

| # | Padrão | Por que nessa posição |
|---|---|---|
| 1 | e-mail | não colide com nada |
| 2 | **CPF PONTUADO** (`000.000.000-00`) | a pontuação o torna inequívoco |
| 3 | **celular** (DDD + 9 + 8 dígitos) | **tem que vir ANTES do CPF cru** |
| 4 | fixo (DDD + 8, começando 2–5) | |
| 5 | **CPF CRU** | só os 11 dígitos que **sobraram** |
| 6 | CEP | |
| 7 | cartão | por último — é o mais guloso |

- **O teste guarda OS DOIS LADOS:** que o PII **suma** *e* que **o que ensina fique**. `R$179`, `"12x"`, `"desde 2019"` passam **intactos** — anonimizador que come o preço **destrói a evidência** que a Escola precisa pra corrigir a IA.
- **Corolário que mudou a arquitetura: o que precisa de PROVA não pode depender de CREDENCIAL.** O `CONFIG` faz `required('GHL_TOKEN')` **no topo do módulo** → qualquer import na cadeia exige credencial de CRM e torna **impossível** testar a anonimização. Foi o teste que forçou o split **`escola-core.ts` (puro) × `escola.ts` (com CONFIG/Redis)** — e o split ainda matou um **ciclo de import** (`execlog → escola → config`, com `escola` precisando de `execlog`).
- **ANTICORPO:** **regex de PII sem teste é vazamento com data marcada.** E a ordem dos padrões só muda com **`npx tsx scripts/test-escola.ts` verde**.
- **Evidência:** Metrik/GHL 22/07/2026 — os dois bugs pegos **pelo teste, ANTES do ar**.

### §36 Proxy que espera JSON e recebe HTML 🟪
- **Sintoma:** `Unexpected token '<' ... is not valid JSON` na Central — erro que **não diz nada** e manda você caçar bug no lugar errado.
- **Causa:** a Central (Next) faz **proxy server-side** pro agente. Quando a Central sobe **antes** de o agente ter o endpoint, a Vercel devolve **o HTML do 404** e o `.json()` estoura.
- **Conserto:** leia **`.text()`** e tente `JSON.parse`; no `catch`, devolva **503 com mensagem em português** dizendo que **falta deploy do agente** (não "erro interno").
- **ANTICORPO:** **todo proxy entre dois deploys independentes** precisa tratar resposta não-JSON — **a ordem de deploy não é garantida** (e no dia do go-live ela é justamente a errada).
- **Evidência:** Metrik/GHL **22/07/2026** — reproduzido no dev server: Central no ar, agente sem o endpoint → `Unexpected token 'T'` (era o `The page could not be found` da Vercel).

---

## 🪟 AMBIENTE

### §37 🚨 Limite de mensagens não pode virar corte de parágrafos 🟪

- **Sintoma:** o agente anuncia que apresentará três opções, mas o cliente recebe somente as duas primeiras. A opção final aparece apenas no turno seguinte ou desaparece.
- **Causa:** o formatador usava `split(parágrafos).slice(0, 3)` para respeitar o limite de três mensagens. Uma introdução mais três opções gerava quatro parágrafos, e o quarto era apagado antes do transporte. O modelo havia produzido o conteúdo correto, mas o pós-processamento mutilou a resposta.
- **Cura:** limite a quantidade de envios, nunca a quantidade de conteúdo. Preserve as duas primeiras partes e agrupe todos os parágrafos excedentes na última mensagem.
- **Anticorpo:** o eval precisa julgar o texto depois da mesma política de saída usada em produção. Inclua um teste determinístico com introdução + A + B + C e afirme que C continua presente.
- **Evidência:** TS&D, 23/07/2026. O histórico Redis mostrou “vou mostrar as três opções”, seguido apenas de A e B. A causa foi confirmada em `toParts`, que descartava o quarto parágrafo.

### §21 curl no Git Bash Windows corrompe UTF-8 🟪
Body JSON **com acento** → `invalid_unicode`. Use **Python ou Node** pra chamadas com texto em português. (Companheira: `curl -F` falha com **exit 26** — §7.)

---

## 🔎 Debug rápido (sintoma → onde olhar)

| Sintoma | Primeiro passo |
|---|---|
| **"Nem respondeu"** | Saiu execução em `/api/executions`? **Não** = gatilho/workflow do CRM (dispare `POST /api/inbound` manual pra provar) · **Sim** = leia o erro do diário |
| **Resposta duplicada** | Redis ativo? (`/api/inbound` → `redis:true`) · número em 2 sistemas? **§9** · bot nativo/legado ligado? **§26** · eco do canal? **§27** |
| **Áudio vira texto** | **§1 → §2 → §3 → §4 → §5**, nessa ordem |
| **Resposta vazia, sem erro** | **§19** (thinking) |
| **Campo não preenche** | `/api/validate` — **§11** (ID morto grava com 200 OK) |
| **Followup não sai** | Janela comercial/domingo? **§25** · janela 24h da Meta? **§8** · handoff limpou a fila? **§24** · o relógio bate mesmo? **§17/§29** |
| **Guardião diz "endpoint inacessível" com tudo no ar** | **§15** (`VERCEL_URL`) |
| **Funil da Central todo ZERO** | **§22** |
| **Central 500 em `/funil`** | **§23** |
| **Central: `Unexpected token '<'`** | **§36** (o proxy recebeu o HTML de um 404 — falta deploy do agente) |
| **Central 500 depois de ativar perfil dono** | **§39** (endpoints antigos de leitura ainda aceitam só o secret operacional) |
| **"Testar ao vivo" sumiu / não responde** | **§34** (perfil escondeu o playground · `'chat'` na blocklist) |
| **Escola/lista de conversas vazia** | **§33** (o diário não guardava texto — só enche a partir do deploy) |
| **Anonimização deixou `([telefone]` / marcou celular como `[cpf]`** | **§35** (`\b` não casa antes de `(` · celular BR tem 11 dígitos, igual a CPF — é a ORDEM dos padrões) |
| **403 "Error 1010"** | **§14** (User-Agent) |
| **Monitor/rotina "roda" e não faz nada** | **§16** |

---

### §38 🚨 “Budget máximo” de LLM pode ultrapassar depois da resposta 🩸

**Sintoma:** a UI promete teto de R$0,10; uma única execução termina em
R$0,1039. O bloqueio só percebe depois que já gastou.

**Causa:** a API do modelo devolve usage/custo **depois** de gerar. Não existe
como interromper retroativamente uma chamada que ultrapassou por centavos.

**Conserto:** não chame de hard cap. Reserve valor conservador **antes de cada
caso**, limite `max_tokens`, limite tool loops e recuse iniciar o próximo caso
se o saldo de reserva não comportar. No Shadow da casa: R$0,20/caso, no máximo
5 casos, 2 steps e 700 tokens/chamada.

**Anticorpo:** a tela diz “reserva autorizada”, devolve custo real e mantém
publicação/CRM bloqueados. Prova 23/07/2026: R$0,1056 num caso, dentro da reserva
de R$0,20; 4/4 sinais; nenhuma publicação.

### §39 Perfil `dono` funciona no Cérebro, mas quebra o resto da Central com 500 🟪

**Sintoma:** `/api/prompt` e `/api/escola` respondem normalmente como `dono`,
mas Visão Geral, Diário e Recuperação dão 500 logo depois de trocar o
`AGENT_SECRET` da Central para o `CENTRAL_SECRET`.

**Causa:** a autenticação por perfil foi instalada apenas nos endpoints novos.
Os endpoints antigos e somente-leitura (`config`, `executions`,
`followup-stats`) continuaram comparando o secret diretamente com
`WEBHOOK_SECRET`. A Central estava corretamente no menor privilégio, mas perdeu
acesso às próprias fontes de leitura.

**Cura:** todo endpoint de leitura consumido pela Central autentica com
`perfilDoSecret(req.query.secret)`. Endpoints operacionais e mutáveis
(`inbound`, `followup`, `validate`, webhooks) continuam exclusivos do secret
operacional. Escrita do prompt continua limitada por
`podeEditarPromptCru(perfil)`.

**Anticorpo:** ao ligar `CENTRAL_SECRET`, rode smoke com o perfil dono em todas
as fontes: `config`, `executions`, `followup-stats`, `prompt` e `escola`, além
das cinco áreas da Central. Não valide apenas a tela Ensinar.

**Evidência:** Manoel Queiroz Advocacia, 24/07/2026 — após a troca controlada
de perfil, Prompt/Escola ficaram em 200 e Home/Recuperação em 500; a ampliação
somente dos três endpoints de leitura restaurou todas as 12 rotas em 200 sem
dar ao cliente acesso operacional.

---

## §40 · GPT chamou mais tools: ação irreversível precisa de guard no executor 🟪

**Sintoma:** na final nativa de 24/07/2026, GPT-5.4 Mini moveu
`mover_etapa_funil(Agendado)` sem reunião em 4/90 casos — sempre após checkout
ou link. O prompt endurecido não resolveu.

**Causa:** modelos tratam tool como sugestão semântica; repetição de regra no
prompt continua probabilística.

**Cura:** `mover_etapa_funil` rejeita `Agendado` sempre. A própria
`agendar_reuniao`, depois do sucesso real da API de calendário, faz a mudança
com dado fresco. No playground, a mesma tentativa retorna erro simulado.

**Anticorpo:** toda tool irreversível tem uma pré-condição verificável em código.
Evals testam a regra, mas não substituem o guard.

**Detalhe OpenAI descoberto no mesmo deploy:** `response_format:
json_object` devolve 400 se nenhuma mensagem contém literalmente a palavra
`JSON`. O helper de JSON acrescenta essa instrução sozinho; não dependa de cada
chamador lembrar.

**Evidência:** Metrik, 24/07/2026 — guard recusou a chamada antes de qualquer GET
ao CRM; eval server-side GPT aprovado 10/10, média 9,7; produção publicada.

---

## §41 · Pós-agendamento parece “travar” por causa de uma pergunta de permissão 🟡

**Sintoma:** a reunião é criada e o material é enviado, mas o time relata que a
IA parou e não fez as perguntas de pós-qualificação.

**Causa:** a sequência terminava em “posso te fazer algumas perguntas?” ou
“pode ser?”. Sem nova resposta do lead, o agente corretamente aguardava, mas a
operação enxergava isso como falha. Links antigos no prompt ainda podiam ser
enviados quando havia mais de uma fonte de instrução.

**Cura:** após o sucesso real do calendário, enviar em uma mesma execução: (1)
confirmação, (2) materiais vigentes e (3) a primeira pergunta diretamente.
Não usar gate de permissão. Tornar o material canônico e buscar instruções
residuais conflitantes no prompt, descrição da tool e simulador.

**Anticorpo:** eval específico exige os links vigentes, proíbe o material
anterior e verifica que a primeira pergunta aparece sem “pode ser?”. Se o link
da reunião deve vir do especialista, a tool nunca o expõe ao modelo.

**Evidência:** Psi Terapia, 28/07/2026 — conversa de Sueli Gattis mostrou que a
IA tinha concluído em “Pode ser?”; prompt, tool e sandbox foram alinhados e a
suíte passou em 12/12 cenários, média 10/10.

---

## 🧬 Como registrar uma cicatriz NOVA (senão a skill envelhece)

**Toda dor nova vira skill NA HORA** — skill parada envelhece em semanas: a API do CRM muda, a Meta muda regra, o modelo muda comportamento.

Formato obrigatório: **sintoma → causa → conserto → evidência com DATA**. E marque **`mente: true`** quando a cicatriz **loga sucesso e não entrega** (§1, §11, §24 são desse tipo — as mais perigosas do arsenal).

Depois: **as 3 pernas do ritual** (skill → Códex `npm run deploy` → plugin) + a **4ª perna** (propagar o código pros clientes no ar). ➡️ `SKILL.md`.

> **Contagem atual deste arquivo: 49 cicatrizes comuns** = os 25 slots canônicos (§1–§25, todos preservados) + §7b e §21b + as universais novas (§26–§47). As específicas de plataforma estão em `ghl/PEGADINHAS.md` e `kommo/PEGADINHAS.md`. Quando adicionar, use o **próximo número livre** — **nunca renumere as antigas** (SKILL, DIAGNOSTICO e os PLAYBOOKs referenciam por número).

## §42 · UAZAPI permite múltiplos webhooks, mas o teto não é documentado 🟡

**Sintoma de risco:** uma feature nova precisa receber mensagens e alguém substitui o webhook existente, derrubando Bridge API, CRM ou centenas de operações ligadas ao mesmo serviço.

**Causa:** tratar `/webhook` como campo único ou usar `replace` sem inventário. Na UAZAPI v2, `GET /webhook` devolve uma lista e `POST /webhook` com `action: "add"` acrescenta outro destino. Em 27/07/2026, a documentação não informava quantidade máxima por instância.

**Cura:** antes de qualquer escrita, `GET /webhook`; registrar URL, ID, eventos e `enabled`; adicionar com `action:add`; repetir o GET e provar que todos os destinos anteriores continuam idênticos e ativos. Nunca usar `globalwebhook`/`admintoken` numa instalação de cliente.

**Anticorpo:** poucos webhooks diretos. Se o número de consumidores começar a crescer, usar um relay central: a UAZAPI entrega uma vez, o relay distribui para Bridge, copiloto, observabilidade etc. Limite não documentado não é capacidade infinita.

**Evidência:** na Psi, em 27/07/2026, Bridge API e Copiloto ficaram simultaneamente ativos para `messages`, cada um com ID próprio, após `action:add`.

---

## §43 · Ter `generateFollowup()` não significa ter follow-up 🔴

---

**Sintoma:** o projeto tem prompt, função geradora e até textos de cadência, mas nenhum lead recebe follow-up e também não aparece erro de envio.

**Causa:** só existia a etapa de escrever a mensagem. Faltavam o encadeamento completo `outbound entregue → timer persistido → relógio → validação fresca → envio`, uma fila fora da RAM serverless e uma âncora no ID exato da mensagem outbound que iniciou o silêncio. A superfície do código parecia pronta, mas não havia mecanismo capaz de acordá-la. **`mente: true`.**

**Cura:** somente depois do envio confirmado, gravar no Redis um ciclo com ID próprio, etapa, vencimento e `expectedOutboundMessageId`; acordar o executor com um relógio compatível com a cadência; usar lock/idempotência; e, antes de enviar, reler CRM/conversa, gate, handoff, última direção, ID esperado e janela da Meta. Qualquer divergência cancela ou escala — nunca “tenta mesmo assim”.

**Anticorpo:** a definição de pronto exige quatro provas: (1) um outbound real criou timer no Redis; (2) o endpoint encontrou o item vencido; (3) o follow-up chegou no celular; (4) resposta do lead, resposta humana ou outro outbound cancelou o ciclo. O manifesto permanece `aguardando-prova` enquanto o primeiro envio natural não tiver acontecido.

**Evidência:** Psi Terapia, 29/07/2026 — havia `generateFollowup()`, mas não havia fila, endpoint nem cron; os dois workflows históricos de cadência no GHL estavam em rascunho. Auditoria cruzou 63 leads recentes; a nova fila persistente e o executor entraram em produção, e um ensaio controlado detectou um item vencido e o cancelou corretamente porque a janela de 24h já estava fechada. Nenhuma mensagem retroativa insegura foi enviada; a prova do primeiro toque natural continua pendente.

---

## §44 · O lead escolhe o slot oferecido, mas a IA diz que ocupou 🔴

**Sintoma:** a IA oferece horários reais; o lead responde “15h”, “16 horas” ou “o primeiro”; a tool de agendamento rejeita e a IA volta a oferecer o mesmo horário. O ciclo pode repetir várias vezes e parecer uma corrida de agenda, embora o slot continue livre.

**Causa:** o resultado da tool de consulta (`slot:<owner>|<ISO>`) existe apenas dentro daquela execução. O transcript persistido no CRM normalmente contém só as mensagens visíveis, não a tool call nem seu resultado. No turno seguinte, o modelo vê “15h”, mas não vê o identificador opaco e tenta reconstruí-lo; data, fuso ou owner podem mudar. Reconsultar a agenda e comparar o ISO inventado não resolve: apenas transforma perda de memória em falso “horário ocupado”.

**Cura:** ao consultar, persista no Redis os slots reais por contato com TTL. Ao agendar, resolva a resposta visível do lead (`15h`, `16 HORAS`, `primeiro`, `segundo`) contra essa oferta persistida; se a memória não existir, use uma consulta fresca como fallback. Depois revalide o slot resolvido na agenda real imediatamente antes do create. A tool deve devolver ao modelo o ISO efetivamente confirmado para ele escrever dia e hora sem inventar.

**Anticorpo:** teste obrigatório em dois turnos/processos separados: turno 1 consulta e oferece; turno 2 recebe apenas “o primeiro”/“15h”, sem tool result no histórico. O teste só passa se o executor recuperar o slot persistido, revalidar na fonte e não aceitar horário que não estava na oferta. Nunca dependa de `Map`, da memória da instância ou da capacidade do modelo de reconstruir identificador opaco.

**Evidência (30/07/2026):** em produção no GHL, uma lead confirmou 15h/16h repetidamente; três execuções chamaram `agendar_reuniao` e devolveram “não está mais livre”, enquanto novas consultas continuavam oferecendo os mesmos horários. A correção com Redis + resolução textual reproduziu `16 HORAS → ISO real` e eliminou a comparação contra ISO reconstruído.

---

## §45 · Oferta paga e agenda gratuita não podem compartilhar a mesma tool sem guard 🔴

**Sintoma:** o agente explicou corretamente que a consultoria de visto durava 40 minutos, mas omitiu o preço, consultou a agenda gratuita de slots de 15 minutos e criou o evento. Na mesma conversa em inglês, mensagens neutras como `YES`, e-mail e `ok` fizeram o modelo trocar para português. Depois do agendamento, ainda ficou um follow-up comum armado.

**Causa:** o prompt conhecia duas ofertas diferentes, mas `consultar_horarios_livres` e `agendar_reuniao` aceitavam qualquer contexto. A última mensagem curta era usada como pista de idioma sem preservar o último turno substantivo. E o armador de follow-up tratava qualquer resposta do agente da mesma forma, inclusive uma confirmação de reunião.

**Cura:** classificar oferta antes da agenda e aplicar o guard no executor: serviços pagos nunca consultam nem reservam a agenda gratuita; pedido explícito de agendamento pago faz handoff determinístico com modalidade e preço. Detectar idioma pelo histórico inbound substantivo, ignorando `YES`, `ok`, agradecimento e e-mail, injetar o idioma no contexto dinâmico e validar a saída com um retry de reescrita. `agendar_reuniao` e `escalar_para_humano` sempre limpam a fila de follow-up.

**Anticorpo:** toda agenda declara em código quais ofertas pode atender, duração externa e bloqueio interno. O eval inclui: oferta paga tentando abrir agenda gratuita; conversa em idioma estrangeiro seguida de resposta neutra; handoff com preço; e ausência de follow-up pós-agendamento. Prompt explica; executor autoriza ou recusa.

**Evidência (30/07/2026):** DAC/GHL, conversa real de Mohammad sobre visto D2. A produção havia prometido 40 minutos, reservado 15 e mudado de inglês para português. Após a correção: guard real recusou a agenda com `CONSULTORIA_PAGA_DE_VISTO`; idioma neutro preservou `en`; follow-up legado foi removido do Redis; typecheck limpo; suíte ampliada aprovada em 15/15, com D2 e persistência de idioma em 10/10.

---

## §46 · Fallback de closer ignora elegibilidade e disponibilidade declarada 🔴

**Sintoma:** um lead de faixa comercial incompatível cai na agenda de um closer reservado para tickets maiores. Em outro caso, o lead diz “trabalho até as 15h, consigo a partir das 16h”; a tool repete a primeira janela, não procura slots compatíveis e responde “vou confirmar com a equipe”, embora exista agenda real em outro closer ou em data posterior.

**Causa:** o fallback tratava “closer ativo” como sinônimo de “closer elegível” e não relia os campos comerciais do contato. A consulta também sabia apenas a janela temporal global; não transformava a última disponibilidade declarada pelo lead em filtro determinístico. O prompt conhecia a preferência, mas o executor continuava comparando todos os slots.

**Cura:** codificar `closerEligibleForContact(ownerId, campos)` com allowlist exata por faixa e comportamento **fail-closed** para campo ausente/desconhecido. Aplicar a mesma trava na consulta e imediatamente antes de criar o evento. Na consulta, reler o último bloco inbound, extrair restrições como “a partir das 16h”, “depois das 15h”, manhã/tarde e filtrar os slots antes de decidir: dono na janela curta → outro closer elegível na janela curta → dono elegível na janela normal; dono incompatível nunca volta a ser candidato. A troca só consolida owner de contato/oportunidade depois do evento confirmado.

**Anticorpo:** teste de matriz `faixa × closer × campo vazio`, incluindo o limite exato (ex.: R$ 1–3 mil bloqueado e R$ 3–5 mil permitido), mais casos de disponibilidade textual. A prova read-only usa contatos reais e exige: nenhum slot do closer proibido; nenhum horário anterior ao declarado; nenhuma mutação de CRM/calendário. Workflow de distribuição e fallback do agente são duas portas diferentes e ambas precisam ser auditadas.

**Evidência (30/07/2026):** Psi Terapia/GHL. O workflow vivo da faixa R$ 1–3 mil continha somente Hélvio, Douglas e Karenn, mas o fallback do agente transferiu Lorraine para Arthur. Juliana, dona Douglas, informou disponibilidade após 16h e recebeu handoff apesar de haver slot elegível. Após a correção, 16/16 testes determinísticos, 12/12 evals e prova read-only real: Lorraine foi roteada para Anderson, nunca Arthur; Juliana recebeu slot de Anderson às 17h dentro de 72h.

---

## §47 · A escolha do lead cai no dia errado, e "11" nem conta (estende §44 e §46) 🟪

**Sintoma:** três falhas na mesma etapa — resolver o horário que o lead escolheu. (1) Lead responde número seco "11", "as 9", "as 17" (sem "h") e a IA ignora e reoferece outro dia. (2) A IA oferece "terça 16h", o lead diz "16h", e o sistema agenda "segunda 16h" — outro dia com a mesma hora, logando agendamento com sucesso (ninguém percebe até o lead reclamar). (3) O lead pede "segunda" três vezes e a IA insiste em "sexta", chega a confirmar "sim, sexta", e o lead desiste.

**Causa:** (1) o extrator de horário exigia "h"/":", então número seco dava zero matches → escolha jogada fora. (2) a resolução casava a hora escolhida em TODOS os dias da oferta persistida (§44) e pegava o mais cedo, ignorando qual dia foi ofertado. (3) o filtro de disponibilidade (§46) só entendia HORA ("a partir das 16h", manhã/tarde), nunca dia da semana — o pedido de dia era descartado em silêncio. Soma-se o modelo papagaiando o dia da semana e confundindo "hoje/amanhã" (diz "sexta" pro que é hoje).

**Cura (determinística, código não prompt):** (1) o parser de escolha aceita número seco e "meio dia", casando com a hora realmente ofertada — explícito ("11h") vence número seco ("11"). (2) a resolução TRAVA no dia oferecido (lido do texto da última oferta e da fala do lead); só cai no "mais cedo" se não há dia no contexto; dia pedido inexistente na oferta → não agenda (retorna null, nunca outro dia). (3) a preferência passa a capturar dia da semana / "amanhã"/"hoje"/"dia N" e o construtor de slots filtra por esse dia. Marque os slots com HOJE/AMANHÃ no código e mande o prompt usar a palavra relativa (nunca "sexta" solto pro que é hoje/amanhã); proíba repetir a oferta que o lead acabou de recusar.

**Anticorpo:** teste determinístico cobrindo número seco "11"/"as 9" casando; "16h" com colisão de dia resolvendo o dia OFERTADO (nunca o mais cedo); dia da semana citado pelo lead mandando; dia inexistente na oferta → null; e `buildDays` filtrando por dia pedido. Nunca confie no modelo pra fazer conta de data — o rótulo HOJE/AMANHÃ é código, igual à decisão de voz (§2).

**Evidência (31/07/2026):** Psi Terapia/GHL. Varredura de 500 execuções do diário depois de o time reclamar "a IA confunde os agendamentos": número seco derrubou vários leads reais (Sandra "11", Lia "14", Sara "17"); "oferece um dia, o lead confirma, marca outro"; e Bárbara pediu "segunda" 3× e recebeu "sexta" (lead perdido). Após a correção: 27/27 testes determinísticos, 12/12 evals, deploy `2026.07.31-fix-agenda-dia-hora` Ready, diário sem erro novo.
