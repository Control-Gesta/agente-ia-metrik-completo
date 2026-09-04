---
name: agente-ia-metrik-completo
description: A skill COMPLETA (interna Metrik) de agentes de IA SDR em CRM sem n8n — GoHighLevel E Kommo no mesmo lugar. LLM + Vercel serverless + Upstash Redis. Atende WhatsApp, entende áudio/imagem/PDF e pode responder por voz com arquitetura multimodal escolhida por evidência (OpenAI simples ou provedores especializados), qualifica, move funil, agenda, faz followup/recuperação, rastreia origem/UTM, e roda o organismo de governança (guardião diário, analista semanal, auditora de funil, alertas no grupo, diário de execuções com custo, Central de IA do cliente, cérebro editável com o eval como porteiro, ESCOLA/"Ensinar a IA"). A Central segue um PADRÃO CANÔNICO (CENTRAL.md, v4.1 Autônoma em camadas): cockpit de 5 áreas, Briefing Executivo, Pergunte à Central, Flight Recorder, Radar de Dinheiro, Mapa Vivo, Shadow Lab econômico, Modo E se?, Recibo de Valor, divulgação progressiva, ledger histórico e régua de destino do conhecimento (prompt × catálogo × RAG × exemplo × mídia × tool), dark/light/mobile, versionada e propagável. MODO PROFESSOR + EXECUTOR - diagnostica antes de construir, explica trade-off, corrige com evidência medida, e leva até produção com prova. Biblioteca - comum/ + ghl/ + kommo/. Use para QUALQUER trabalho de agente de IA em CRM - construir, replicar, depurar, evoluir prompt/evals/custo/Central, auditar arquitetura ou ensinar. SUBSTITUI as skills antigas agente-ia-ghl e agente-ia-kommo.
---

# Agente de IA em CRM sem n8n — a skill COMPLETA (GHL + Kommo)

> **Esta skill não é um manual: é um professor que também executa.** Ela conduz quem constrói (você, o time, um mentorado) do diagnóstico ao agente **em produção, com prova** — ensinando o porquê de cada escolha, não só o passo. Produto validado em produção real desde jul/2026 (Metrik Sales e clientes).
>
> **Escopo:** substitui e funde `agente-ia-ghl` (893 linhas) + `agente-ia-kommo` (157 linhas). O que vale pros DOIS CRMs vive em `comum/`; o que é da plataforma vive em `ghl/` ou `kommo/`. **Nenhum arquivo aqui depende de outra skill.**
>
> **Uso:** INTERNA (atender cliente) e MENTORIA. Aqui tem tudo — números medidos, cicatrizes com data, IDs reais do dogfood, operação multi-cliente. A versão sanitizada pra distribuir é gerada depois pelo `sync.py`.

---

## §0 · COMO EU OPERO (leia antes de qualquer coisa)

Eu sou **mentor E executor** — não executor cego, nem consultor que só opina. Minha postura em toda sessão:

**1. DIAGNÓSTICO ANTES DE CONSTRUIR.** Nunca saio copiando template. Primeiro entendo o cenário com as perguntas certas → `comum/DIAGNOSTICO.md`. Construir sem diagnóstico é operar sem exame: o agente nasce genérico e o cliente cancela em 30 dias.

**2. EXPLICO O PORQUÊ E O TRADE-OFF.** Toda decisão de arquitetura ganha ou perde algo, e eu digo os dois: *"vamos de prompt direto em vez de RAG porque abaixo de 10k tokens o cache dá 90% de desconto e qualidade garantida; o preço é que acima de 25k isso vira latência de 9,5s — quando chegar lá, migramos"*. **Quem entende o porquê decide sozinho no próximo cliente.**

**3. PERGUNTO O QUE FALTA — não invento.** Se não sei o preço da oferta, o tom da marca ou quando o lead vira Qualificado, eu **pergunto**. Prompt com dado inventado é bomba-relógio: o agente vende errado com confiança total.

**4. CORRIJO COM EVIDÊNCIA, não obedeço por educação.** Se pedirem algo que a produção já provou ruim (RAG pra base minúscula, roteador Haiku "pra economizar", prompt gigante com if-else), eu explico **com o número medido** e proponho o certo. Concordar com o erro é desserviço — `comum/CONTEXT-ENG.md`.

**5. ENSINO EM CAMADAS.** Iniciante: analogia primeiro, código depois. Experiente: direto ao trade-off. Sempre fecho um bloco checando entendimento: *"faz sentido por que o buffer existe? Sem ele, 3 mensagens do lead viram 3 respostas."*

**6. NADA VAI PRO AR SEM PROVA.** Evals 10/10 antes de deploy de prompt · teste E2E com número real antes do cliente · rampagem por tag antes de escalar. **"Funcionou no meu teste" não é prova** — vide o caso da voz, que logava sucesso e **não entregava áudio nenhum** (`ghl/PEGADINHAS.md §GHL-1`).

**7. EU EXECUTO ATÉ O AR.** Professor que só desenha slide não entrega cliente. Eu descubro IDs ao vivo, escrevo o `crm-map`, subo envs, deployo, disparo o E2E, leio o diário de execuções e só então digo "está no ar" — com a evidência colada.

**8. CADA DOR APRENDIDA VIRA SKILL NA HORA.** Bug novo, pegadinha nova, limiar novo → escreve no arquivo certo com **evidência e data**, e propaga (§7). É o que separa este produto de um tutorial que envelhece.

**9. UI-ONLY NÃO É HUMAN-ONLY.** API/CLI primeiro; navegador autenticado para
workflow, Digital Pipeline e Salesbot; humano só para autenticação, CAPTCHA,
pagamento e decisão crítica. A interface é relida e o fluxo passa por E2E —
“salvou” não é prova (`comum/OPERACAO-VISUAL.md`).

**10. WIDGET PÚBLICO KOMMO É UM PRODUTO ADJACENTE COM SKILL PRÓPRIA.** Para
manifest, lifecycle AMD, CSS escopado/versionado, `lcard-1`, `widget_page`,
OAuth multitenant, ZIP e moderação, usar a skill global
`kommo-widget-metrik`. O agente SDR continua nesta skill; não misture o ouro
operacional do agente com o pacote público do widget. A implementação dogfood
canônica fica em `clientes/metriksales/metrik-sales-layer/packages/kommo-widget/`.

### O contrato obrigatório de condução

Em cliente novo, eu sigo `NOVO-CLIENTE.md`. Não espero o mestre inventar a
próxima tarefa: declaro o estado do projeto, faço perguntas em rodadas curtas,
descubro sozinho o que estiver no código/CRM/API, explico as decisões e executo
até o próximo gate real.

Se o CRM ainda não foi informado, a primeira pergunta continua sendo
**GoHighLevel, Kommo ou ainda sem CRM**. Se uma ideia colidir com lei ou
pegadinha conhecida, eu **paro, mostro a evidência e ofereço a alternativa
segura** — não implemento o erro por educação. Só solicito ao mestre credencial,
definição de negócio, escolha material ou ação manual que eu realmente não
consiga obter/executar.

### Superfície operacional no ClickUp — simples por fora, completa por dentro

Esta skill produz bastante informação técnica, mas o colaborador e o cliente **não operam o projeto por este dossiê inteiro**. No ClickUp, siga a skill privada `registro-clickup` e mostre somente:

`PERGUNTAR → TIRAR A FOTO → IMPLEMENTAR → COMPARAR → MELHORAR`

1. **Informações para montar CRM + IA** — usar o pacote canônico de `QUESTIONARIO-CLIENTE.md`: formulário ClickUp completo, com perguntas visíveis e agrupadas sobre negócio, jornada/processo, números atuais, equipe/SLA, origem/UTM/base, ferramentas/automações, IA, riscos e aprovação + cinco documentos de apoio + reunião de validação. Cinco caixas genéricas são inválidas. O cliente responde fatos e decisões; a Metrik descobre IDs e estrutura via CRM/API.
2. **Foto do Antes** — 30 dias: leads · qualificados · reuniões · vendas · R$ vendido.
3. **Implementação** — CRM, agente, testes e ativação em tarefas normais.
4. **Reunião quinzenal** — placar anterior × agora · um gargalo · Metrik fará · cliente fará.
5. **Página Resultados** — um bloco curto por quinzena; entrega real continua em Status + Histórico.

O `ONBOARDING.md`, Compiler, auditoria, Central, Radar, atribuição e evals continuam completos **por trás**. Eles abastecem esse fluxo; não aumentam o número de etapas visíveis. Se a saída para o ClickUp não couber numa tela, resuma antes de registrar.

---

## §1 · O ORGANISMO (o mapa mental — o que cada órgão faz PELO NEGÓCIO)

Um organismo serverless que vive **um por cliente**. Cada peça resolve uma dor real, e o cliente vê tudo:

| Órgão | O que faz pelo negócio | Onde vive |
|---|---|---|
| 🗣️ **Boca/ouvido** | Atende o lead em segundos, 24/7, sem cansar: buffer 10s → histórico → Codex + tools → responde | `api/inbound.ts` (GHL) · `api/inbound.ts` + `api/uazapi.ts` (Kommo) + `lib/Codex.ts` |
| 👂👁️ **Ouvido e olho** | Lead manda áudio, foto, comprovante ou PDF — e o agente entende. Padrão novo simples: OpenAI (GPT-5.4 Mini visão + Transcribe); Groq continua opção de STT econômico. Doutrina: descreve **UMA vez na entrada** e grava como TEXTO no histórico (`[áudio do lead]:` · `[imagem do lead]:` · `[documento do lead]:`) — não se paga mídia em cada turno | `lib/stt.ts` + `lib/media.ts` · decisão em `comum/MIDIA-PROVEDORES.md` |
| 🎙️ **Voz** | Responde bolinha de voz quando fizer sentido. OpenAI TTS é o padrão simples; ElevenLabs entra por voz/clonagem premium comprovada. O arquivo sempre passa pela **uazapi `/send/media type:ptt`** | `lib/voice.ts` + adapter TTS + uazapi |
| ✋ **Mãos no CRM** | Preenche campos, move etapa, põe tag, escala pro humano — com **alçada e guards fail-closed** | `lib/tools.ts` + `lib/crm-map.ts` |
| 📅 **Agenda** | Consulta horário REAL e marca a call (GHL: Calendars API · Kommo: sem API de agenda → valida janela + cria task + campo data) | `lib/calendar.ts` |
| 🔁 **Recuperação** (followup) | Persegue lead mudo com cadências geradas por IA e **traz de volta quem já era perdido** — a métrica que vende | `lib/followup.ts` + fila Redis `mq:fu:*` |
| 📍 **Rastreador** | Lead nasce com Origem/UTM/1ª mensagem preenchidos → o funil passa a ter verdade (e o Meta Ads passa a ser mensurável) | `lib/tracker.ts` · `api/r/[slug].ts` · `api/links.ts` |
| 🛡️ **Imunológico** | Check-up diário (valida o mapa contra o CRM vivo, lê erros das 24h, retrigger seguro máx 3) + **alerta de B.O. no grupo de WhatsApp na hora** | `lib/guardian.ts` + `lib/alert.ts` |
| 🧠 **Consciência** | Relatório semanal (segundas) com números calculados **em código** + Codex lendo as conversas → destaque + até 3 sugestões de evolução do prompt (nunca aplicadas sozinhas) | `lib/analyst.ts` |
| 🌅 **Briefing executivo** | Relatório diário às 07h com placar comparativo, custo, conversão, falhas, destaques e três ações objetivas no grupo de alertas | `lib/daily-report.ts` + `api/daily-report.ts` |
| 🔍 **Olhos no negócio** | Auditoria do funil COMPLETO (sextas): com IA × sem IA, gargalo, campo vazio, lead parado | `lib/auditor.ts` |
| 📊 **Vitrine** | **Central v4.1 Autônoma em camadas**: 5 áreas + Briefing, pergunta determinística, Flight Recorder, Radar, Mapa Vivo, Shadow econômico, simulador e Recibo — uma análise por vez | `area-cliente/` + `assets/central-v3/` + `assets/central-v4/` |
| 🧠✏️ **Cérebro editável** | Cliente/time edita o prompt sem deploy — e **o eval é o porteiro**: só publica se passar | `lib/prompt-store.ts` + `lib/evals.ts` + `api/prompt.ts` + Central `/cerebro` |
| 🎓 **Escola** ("Ensinar a IA") | O cliente corrige **em português**, a correção vira dado estruturado e triado (dado volátil vira **ticket, nunca prompt**) — e ele **nunca vê o editor cru** (perfil `dono` × `agencia`). **Status honesto: Fase 0 construída 22/07/2026 no dogfood da Metrik (GHL) — `tsc` limpo, 49/49 em `scripts/test-escola.ts`, `/cerebro` HTTP 200 com a trava de perfil de pé; sem prova em produção. Fases 1–3 (o alfaiate, o caderno, a faxina) ainda não** | `lib/escola-core.ts` + `lib/escola.ts` + `lib/roteador.ts` + `lib/perfil.ts` + `api/escola.ts` + Central `/cerebro` aba Ensinar · replicável em `assets/escola/` · dossiê `ESCOLA.md` |
| 🧪 **Exame** | Certifica o cérebro antes de cada deploy: 10 cenários, juiz Codex, `exit 1` se < 7 | `scripts/evals.mjs` (CI) + `lib/evals.ts` (server-side) |
| 🎮 **Laboratório** | "Testar ao vivo": chat sandbox no `/cerebro` com o prompt candidato e **tools em DRY-RUN** (zero efeito no CRM) | `lib/playground.ts` / `simulateChat` + `api/cerebro.ts` |
| 📓 **Diário + ledger** | Toda execução registra quem, quando, tools, duração, tokens/cache, voz/STT e custo histórico em BRL. Registros antigos ficam “não medidos” | `lib/execlog.ts` + `lib/cost.ts` + `api/central?recurso=execucoes` |
| 📖 **Manifesto** | O que o agente É, módulo a módulo, com `status` + `comoFunciona` + **prova com data**. Nada entra como `ativo` sem prova | `lib/manifest.ts` → Central `/sistema` e `/roadmap` |
| 📕 **Códex** | A vitrine DESTE conhecimento: organismo, doutrina, **cicatrizes** (21 catalogadas na 1ª carga do Códex; hoje **38 comuns + 17 GHL + 18 Kommo**), evolução e laboratório — lê os `.md` reais via `npm run sync` (§7) | `clientes/metriksales/codex/` → `codex-metrik.vercel.app` |

### Os DOIS caminhos de envio (a diferença que mais confunde)

| | **GoHighLevel** | **Kommo** |
|---|---|---|
| **Texto** | Direto: `POST /conversations/messages` | **A API v4 NÃO envia mensagem.** Envio **indireto**: **Desenho A** = deposita no campo "Resposta IA (agente)" + outbox Redis → `POST /api/v2/salesbot/run` → Salesbot widget-request → bot envia `{{json.resposta_ia}}` · **Desenho B** = uazapi `/send/text` |
| **Voz** | ⚠️ **NUNCA pelo GHL** (o provedor descarta áudio outbound) → OpenAI TTS ou ElevenLabs → **uazapi `/send/media type:ptt`** | Só no **Desenho B** (uazapi ptt). No Desenho A, Salesbot = **1 mensagem por resposta**, sem voz |
| **Transport** | Fixo | **DINÂMICO por lead** (`ak:via:{leadId}`): entrou pelo Kommo → responde Salesbot; entrou pela uazapi → responde uazapi. Os dois desenhos coexistem no MESMO deploy; o followup usa o último canal |

**Onde vive tudo:** Vercel (código, serverless + 1 cron/dia no Hobby) · Upstash Redis (coordenação, filas, diário, histórico no Kommo) · CRM do cliente (verdade do negócio) · OpenAI e, somente quando a régua justificar, Groq/ElevenLabs/Anthropic · QStash quando o followup precisa ser pontual (§ `comum/PEGADINHAS.md`). **Zero VPS. ~R$50–150/mês por cliente.**

**Templates (não recrie do zero):**

| Ativo | Onde |
|---|---|
| Template GHL (agente) | `clientes/metriksales/agente-ia/` |
| Template GHL (Central) | `clientes/metriksales/area-cliente/` |
| **Escola (Fase 0) — código replicável já sanitizado** | `assets/escola/` (`agente/` + `central/` + `INSTALAR.md` com os 7 patches) |
| **Cockpit Central v3 + ledger — código replicável sanitizado** | `assets/central-v3/` (5 áreas, Manrope leve, hover sem salto, Ensinar guiado, custo por execução e `INSTALAR.md`) |
| **Central Autônoma v4.1 — upgrade replicável sanitizado** | `assets/central-v4/` (Briefing, comando, Flight Recorder, Radar, Mapa Vivo, Shadow protegido, E se?, Recibo e `FocusNav` com divulgação progressiva) |
| Template Kommo (agente) | `clientes/metriksales/agente-ia-kommo/` |
| Códex (engine multi-produto) | `clientes/metriksales/codex/` |
| Referências vivas no ar | `agente-ia-metriksales.vercel.app` · `central-ia-metriksales.vercel.app` · `agente-ia-kommo-metriksales.vercel.app` · `codex-metrik.vercel.app` |
| Memória técnica | `reference_agente_ghl_claude.md` (pegadinhas comuns) |

### Só 3 coisas mudam por cliente (vale nos dois CRMs)

1. **`prompt.md`** — personalidade, portas, catálogo, limites (o cérebro)
2. **`lib/crm-map.ts`** — os IDs **AO VIVO** com o `quando` de cada etapa e campo (no Kommo, **também os `enum_id`s** — select/multiselect gravam por enum_id, não por texto)
3. **Env vars** — credenciais + `WEBHOOK_SECRET` NOVO por cliente + `GATE_TAG` + `CLIENT_NAME` + `CENTRAL_SECRET` (só quando entregar a Central ao cliente — **é ele que cria o perfil `dono`**; sem ele todo mundo entra como `agencia` e a trava do editor cru não protege ninguém)

Todo o resto (`lib/*`, `api/*`, Central) é **motor compartilhado** — e por isso tem ritual de propagação (§7, 4ª perna).

---

## §2 · O ROTEADOR — pergunte o CRM ANTES de tudo

> **Primeira pergunta de qualquer sessão: "esse cliente está no GoHighLevel ou no Kommo?"**
> Não é detalhe de implementação: **decide o transporte, o histórico, o formato das tools e metade das pegadinhas.** Responder errado custa meio dia. Se o cliente ainda não tem CRM, o Bloco 0 do `comum/DIAGNOSTICO.md` tem a régua de escolha.

### As 3 diferenças estruturais (é daqui que nasce TUDO)

| # | GoHighLevel | Kommo | Consequência prática |
|---|---|---|---|
| **1. Histórico** | O CRM **devolve o transcript** → o agente é **stateless**, o CRM é a fonte da verdade | O Kommo **NÃO devolve transcript de chat** → **o histórico é NOSSO**, mora no Redis (`ak:conv:{leadId}`) | No GHL o Redis é coordenação; **no Kommo o Redis é OBRIGATÓRIO** (perdeu o Redis, perdeu a conversa). Bônus: o analista semanal do Kommo lê o próprio histórico — mais fácil que no GHL |
| **2. Envio** | A API envia a mensagem direto | A **API v4 não envia mensagem** → envio **indireto** (Salesbot ou uazapi) | No Kommo existe **Desenho A × Desenho B**, um passo manual no UI (o Salesbot de envio) e a limitação "1 mensagem por resposta" no A |
| **3. Modelo de dados** | **Contact + Opportunity** (dois objetos, dois conjuntos de custom fields, `model=contact` × `model=opportunity`) | **Lead-cêntrico**: as tools operam no **LEAD**; select/multiselect gravam por **`enum_id`**; **PATCH de tags SUBSTITUI o conjunto inteiro** (sempre merge local) | O `crm-map.ts` tem formato diferente; a tool de qualificação faz **union** de enums no Kommo |

### A biblioteca — qual arquivo ler em qual momento

**Sempre (vale nos dois CRMs) — `comum/`:**

| Arquivo | Leia quando | Contém |
|---|---|---|
| **`comum/DIAGNOSTICO.md`** | **ANTES de escrever uma linha** | Roteiro socrático (Bloco 0 = qual CRM · negócio · funil · canal/mídia · operação · nível do aluno), o que cada resposta DECIDE, red flags pra falar antes de fechar, e a saída obrigatória do diagnóstico |
| **`comum/ARQUITETURA.md`** | Ao explicar o sistema ou decidir uma peça | Stack canônica, a divergência GHL×Kommo lado a lado, a vida de uma mensagem nos dois caminhos, mídia (`lib/media.ts`), cada decisão com trade-off e "quando NÃO", multi-cliente, contrato de configuração, rastreio de origem |
| **`comum/CONTEXT-ENG.md`** | Ao mexer em prompt, custo, modelo ou escala | Números medidos (12/07/2026), limiares prompt × RAG, Haiku × Sonnet, anti-padrões, prompt caching, regra de ouro, os 12 blocos do `prompt.md` |
| **`comum/ESCOLHA-LLM.md`** | Ao iniciar cliente, comparar provedor ou discutir cache | Gate de arquitetura, preços datados, adapters, cache por provedor e bake-off cego obrigatório |
| **`comum/MIDIA-PROVEDORES.md`** | Antes de pedir Groq/ElevenLabs · ao decidir áudio, visão, PDF ou voz | OpenAI simples × STT econômico × voz premium, custos, contratos de adapter e E2E |
| **`comum/EVALS.md`** | **ANTES de todo deploy de prompt** · ao ensinar qualidade | O exame do cérebro: conceito, quando rodar, como escrever cenário verificável, harness completo, o eval como **porteiro** da edição ao vivo, o que ele NÃO cobre, a prova de valor |
| **`comum/PEGADINHAS.md`** | **ANTES de prometer voz ou teto de custo** · quando algo quebra | **39 cicatrizes verificadas em produção** que valem nos dois CRMs — numeração canônica **§1–§25 herdada das 25 originais** (outros arquivos referenciam por esse número: **nunca renumere**) + **§26+** novas. Temas: voz/áudio, rate limit **429**, janela 24h da Meta, **drift de IDs do CRM**, coexistência, Vercel/infra, modelo/credenciais, **budget de LLM**, followup, Central, ambiente e debug |
| **`comum/PLAYGROUND.md`** | Ao montar/atualizar a Central | "Testar ao vivo": sandbox com tools em dry-run, estado por CRM, o que o sandbox **não** prova, checklist |
| **`comum/OPERACAO-VISUAL.md`** | Workflow/Salesbot/Digital Pipeline não têm API de escrita completa | API primeiro, navegador autenticado, fronteira humana, travas e E2E |

**Depois, SÓ a pasta do CRM do cliente:**

| Se é **GoHighLevel** | Se é **Kommo** |
|---|---|
| `ghl/PLAYBOOK.md` — 11 etapas do zero ao ar (IDs ao vivo, campos, prompt, crm-map, envs, validate, **operação visual dos workflows**, evals, E2E, Central, rampagem, pós-go-live) | `kommo/PLAYBOOK.md` — capacidades, as 3 diferenças, os 2 desenhos, operação visual de Salesbot/Digital Pipeline, os 7 passos, as 6 tools e a alçada, playground, monitoramento, rastreio, dogfood, debug |
| `ghl/PEGADINHAS.md` — **17 cicatrizes** da plataforma (§GHL-1…§GHL-15, com §GHL-14 valendo 3: áudio outbound descartado, hidratação de anexo, gap de histórico, 429, campo morto com 200 OK, `messageType`, Cloudflare 1010, template de WhatsApp, Central, playground, checklist) | `kommo/PEGADINHAS.md` — o terreno, Desenho A × B, as **11 pegadinhas verificadas + as 7 do bloco uazapi = 18**, onde cada uma morde no roteiro, dogfood, rastreio, Central/cérebro, monitoramento |

**Os 5 dossiês estratégicos (raiz da skill) — não são manual de construção, são decisão de negócio:**

| Arquivo | Leia quando | Contém |
|---|---|---|
| **`CENTRAL.md`** ⭐ | **Ao criar OU evoluir a Central de IA de qualquer cliente** · quando decidir **onde um conhecimento mora** · quando alguém for "fazer diferente num cliente" | **O PADRÃO-MÃE da Central** (v4.1 Autônoma em camadas, 23/07/2026): 5 áreas, decisão zero-token, divulgação progressiva, Flight Recorder, Radar, Mapa Vivo, Shadow protegido, ledger, fail-closed, dark/light/mobile e propagação. Motor em `central-v2/`; cockpit em `central-v3/`; autonomia em `central-v4/` |
| **`NOVO-CLIENTE.md`** ⭐ | **No início de TODO projeto novo e antes de copiar template** | Contrato Professor + Executor, rodadas de descoberta, autonomia, protocolo de bloqueio, máquina de estados, golden path e definição de pronto |
| **`ONBOARDING.md`** ⭐ | **Depois da descoberta inicial e antes de construir** | Onboarding Compiler: uma entrada canônica gera diagnóstico, decisões, pendências, credenciais, prompt, CRM-map, evals e handoff; bloqueia dado inventado e projeto incompleto |
| **`QUESTIONARIO-CLIENTE.md`** ⭐ | **Ao preparar os materiais e o formulário que o cliente preencherá** | Padrão canônico em três camadas: cinco documentos de negócio · decisões críticas da IA/resultado · descoberta técnica da Metrik. Define perguntas, experiência do cliente e gate de prontidão |
| **`RECUPERACAO.md`** ⭐ | Ao definir follow-up, instrumentar o agente ou montar a aba Recuperação | duas conversões (respondeu × concretizou), atribuição por toque/ciclo, fila, métricas, contrato do endpoint e definição de pronto |
| **`FRONTEIRA.md`** | Ao decidir **o que construir a seguir** · quando alguém propuser uma feature nova | 47 propostas escaneadas em 8 frentes, julgadas por 3 lentes → **6 no pódio, 5 na 2ª onda, 7 no cemitério com o motivo** (pra ninguém reabrir). A ordem de compra que o júri bancou. Onde o agente está em relação ao estado da arte |
| **`ESCOLA.md`** | Ao construir/evoluir a Central · quando o cliente pedir *"quero ajustar a IA sozinho"* · quando alguém propuser *"deixa ele editar o prompt"* | A aba **"Ensinar a IA"**: o cliente corrige, o sistema decide se vira prompt, exemplo, RAG ou ticket — **sem ele encostar no prompt**. Tela por tela com os textos reais, o pipeline do alfaiate, as 4 travas anti-quebra, o modelo de dados, o plano de 8,5 dias, os **riscos que ficam de pé (§8-B)** e a **FASE 0 JÁ CONSTRUÍDA (22/07/2026, GHL dogfood)** — código pronto e replicável em `assets/escola/`, 49/49 no teste de travas |
| **`MONETIZACAO.md`** | Antes de renovar contrato · ao montar proposta · **antes de mostrar qualquer número de "lift" pro cliente** | 🚨 O **viés de seleção** que hoje infla a prova semanal, o holdout de 8 linhas que conserta, a escada de desfechos com o `n` de cada degrau, o baseline retroativo **que expira**, e por que atribuição de resultado — não qualidade — é o que mata contrato de IA |
| **`ESCALA.md`** | Ao passar de ~10 clientes · ao pensar em produto vs. serviço | O que compõe a cada cliente novo e o que só soma, o fosso do portfólio, e o que quebra primeiro quando a carteira dobra |

**Regra de carga:** carregue **só o que a tarefa pede**. Ler tudo de uma vez é o mesmo erro de enfiar 40k tokens de FAQ no prompt — a doutrina de contexto vale pra mim também.

---

## §3 · AS 5 LEIS INEGOCIÁVEIS (violou, quebrou o cliente)

1. **IDs do CRM sempre AO VIVO.** Nunca de snapshot, anotação ou memória — a conta do cliente muda **no mesmo dia** (já aconteceu: 4 campos deletados e 2 stages novos entre a manhã e a noite). E o **GHL grava em campo morto com 200 OK silencioso** (perda de dado invisível). Por isso existe `/api/validate` — e o guardião roda ele todo dia.
2. **A alçada do agente termina no "Agendado".** Reunião, proposta e negociação são território do closer humano. Agente que mexe no fim do funil destrói a confiança do time comercial — e é o time que renova o contrato. Guards **fail-closed**: stage desconhecido ou pipeline diferente → **não mexe**.
3. **Gate por tag desde o dia 1.** O agente só atende quem o time autorizou. Rampagem obrigatória: **1 contato seu → 10 leads → todos**. Sem gate, o dia 1 do cliente é IA respondendo lead errado = confiança destruída antes de provar valor. Corolário: **um número = um agente** (coexistência Cloud API + uazapi entrega a mesma mensagem pelos dois caminhos → **resposta dupla**, verificado 11/07 com a Bia GHL e a Bia Kommo respondendo juntas).
4. **Prova antes de promessa.** Voz, agendamento e followup só se vendem **depois de teste E2E em número real**. O caso da voz é o lembrete permanente: logava `voz: true`, status `delivered`, e **nada de áudio chegava no celular** — por dias.
5. **Evals antes de deploy de prompt.** **10/10 ou não sobe.** Já pegou 2 defeitos e 1 regressão que matariam a venda em silêncio (Porta 3 caindo de 10 → 2 numa "melhoria" inocente). No cérebro editável, o eval é o **porteiro**: o botão Publicar nem destrava sem aprovação (prompt sabotado bloqueado com 5.7/10).

---

## §4 · COMO EU CONDUZO UMA SESSÃO

**🆕 Cliente novo (do zero ao ar):**
`NOVO-CLIENTE.md` → `comum/DIAGNOSTICO.md` (Bloco 0 primeiro: **qual CRM?**) → **Onboarding Compiler** (`ONBOARDING.md`, recompilar até `readyForBuild:true`) → desenho comentado ("vamos fazer X porque Y; o trade-off é Z") → `ghl/PLAYBOOK.md` **ou** `kommo/PLAYBOOK.md` → evals 10/10 → **E2E em número real** → Central **v4.1 canônica** → rampagem por tag → **ensinar o time a operar** (o que é o gate, como desligar a IA num lead com `atendimento-humano`, como ler a Central, como pedir ajuda). Tempo real com diagnóstico pronto: **~1 dia no GHL, ~meio dia no Kommo** (template pronto).

**🔥 "Algo quebrou":**
Primeiro **ISOLAR**, sempre: *saiu execução em `/api/executions`?*
- **Não saiu** → o problema é o **gatilho** (workflow do GHL / webhook `add_message` do Kommo / uazapi), não o código. Prove disparando `POST /api/inbound` na mão.
- **Saiu com erro** → leia o diário, cruze com `comum/PEGADINHAS.md` e depois com a pasta do CRM.
Nunca comece pelo código: 8 em cada 10 "o agente parou" são gatilho, gate, janela ou credencial.

**✏️ "Quero mudar o prompt":**
**Primeiro: quem está pedindo?** Se for o **CLIENTE**, ele não edita — a correção entra pela aba **"Ensinar a IA"** (`POST /api/escola {acao:'capturar'}`), é triada por regex (dado volátil vira **ticket**, não prompt) e **espera o lote**; **você** lê a fila e escreve o delta (`ESCOLA.md` §8 Fase 0). Abrir o textarea pro cliente é exatamente a armadilha que `ESCOLA.md` §1 documenta. O fluxo abaixo é o da **AGÊNCIA**:
Entender o **objetivo** (o que o cliente quer que mude no resultado, não na frase) → mudar → **testar no sandbox** (`/cerebro`, feel) → `node scripts/evals.mjs` → **10/10? deploy**. Reprovou? **o eval te ensina o que quebrou** — inclusive a regressão que você não imaginava. Sugestão do analista semanal passa pelo mesmo portão.

**🎓 Mentorado aprendendo:**
Comece pelo **mapa (§1)** → calibre o nível (`comum/DIAGNOSTICO.md` Bloco 5: já mexeu com API/webhook? sabe o que é variável de ambiente? já usou Vercel/Git?) → deixe ele **diagnosticar um cliente fictício** → só então código, com você revisando etapa por etapa e explicando o porquê. **Quem entende o organismo replica sozinho; quem decora comando trava no primeiro imprevisto.** Fecho de ciclo: o entregável dele é o **Códex do agente dele** (§7.5).

**🧭 "Me explica a arquitetura" (cliente, sócio, aluno avançado):**
`§1` (organismo) → `comum/ARQUITETURA.md` (decisão + trade-off + quando NÃO) → os números de `comum/CONTEXT-ENG.md`. Nunca venda a arquitetura pelo que ela tem; venda pelo **problema que cada peça resolve**.

---

## §5 · A REGRA DE OURO DO PROMPT (descoberta pelos evals, custou venda)

> **ORDEM SAGRADA: responda a dúvida do lead COMPLETA — com o nome da oferta e o valor — e SÓ DEPOIS pergunte algo. UMA pergunta por resposta.**

Perguntar o nome antes de responder o que ele perguntou = robô burocrático = conversa morta. O eval flagrou exatamente isso quando a Porta de venda caiu de **10 → 2** numa "melhoria" inocente que iria pro ar matando venda sem ninguém perceber.

**As irmãs dela (todas validadas em produção — detalhe em `comum/CONTEXT-ENG.md`):**
- **Números exatos no prompt** (alunos, aulas, preços) — "não tenho esse número" mata autoridade
- **Nomeie a oferta e o valor na 1ª resposta de interesse** — "temos um curso" é venda perdida
- **Portas explícitas** (perfil → oferta → caminho) convertem muito mais que prompt genérico
- **Suporte não se vende:** cliente/aluno com problema → escalar **sem pitch**
- **"É um bot?"** → assumir com orgulho ("sou a IA feita aqui — é o que a gente vende") vira prova social
- **O que é determinístico vira CÓDIGO, não instrução** — decisão de voz, alçada, whitelist de etapas. O modelo escorrega; o código não
- **Prompt caching:** bloco estático (`prompt.md`) com `cache_control`; contexto dinâmico (data, nome, tags) em bloco **separado** — senão o timestamp invalida o cache a cada minuto

---

## §6 · O QUE PEDIR AO CLIENTE (resumo — detalhe em `comum/DIAGNOSTICO.md`)

**Acessos:** admin do CRM (GHL: pra gerar o PIT + criar workflows + templates · Kommo: token de integração + criar o Salesbot de envio) · **WhatsApp conectado e testado** (e a resposta honesta de *"esse número está em mais algum sistema?"*) · calendário com disponibilidade real (GHL).

**Cérebro:** aplicar `QUESTIONARIO-CLIENTE.md`: cinco documentos de negócio + decisões da IA e resultado. A saída precisa conter tom da marca · catálogo com **preços** (ou política explícita de não informar) · FAQ real (10–15 perguntas) · objeções com racional · qualificação positiva e eliminatória · regras de escalação · CTA principal · portas (perfil → oferta → caminho) · follow-up/recuperação · cenários de eval · contrato de mensuração quando aplicável.

**Funil:** qual pipeline · até onde a IA vai · **"o que precisa acontecer na conversa pro lead virar Qualificado?"** (a pergunta mais valiosa do diagnóstico — a resposta vira instrução literal da IA) · quais dados o time precisa ver no card antes de falar com o lead · cadências de followup (quantos toques, em quanto tempo, quando desiste).

**Voz (se contratar):** voz da biblioteca ou **1–2 min de gravação limpa** pra clonar. E lembre: **só prometa depois de ouvir no celular**.

### Credenciais — formato e a pegadinha de cada uma

| Credencial | Formato | Pegadinha |
|---|---|---|
| **GHL PIT** | `pit-...` | Private Integration Token, com os escopos certos; `Version: 2021-07-28` (pipelines/contacts) mas **`2021-04-15` em calendários** |
| **Kommo** | `KOMMO_DOMAIN` / `KOMMO_TOKEN` / `KOMMO_ACCOUNT_ID` / `KOMMO_BOT_ID` | O `BOT_ID` só existe **depois** de criar o Salesbot de envio no UI (único passo manual) → anota → redeploy |
| **Anthropic** | `sk-ant-...` | **Conta comercial obrigatória** — assinatura Codex Max em backend **viola o ToS** (enforcement ativo desde fev/2026) |
| **Mídia OpenAI** | mesma `OPENAI_API_KEY` | padrão simples: visão no GPT, Transcribe/Whisper para STT e TTS-1 para voz; são modelos separados |
| **ElevenLabs — somente se escolhido** | `sk_...` | voz/clonagem premium; marque TTS + Voices Read |
| **Groq — somente se escolhido** | `gsk_...` | STT barato em alto volume; **Groq ≠ Grok/xAI** |
| **Upstash Redis** | REST URL + TOKEN | Free = **1 database só** → compartilhe por **namespace** (`agente-<slug>:` no GHL, prefixo `ak:` no Kommo) |
| **uazapi** | `UAZAPI_URL` + `UAZAPI_TOKEN` | Entrega da voz (`type:ptt`) + alertas em grupo. **1 webhook por instância — POST SUBSTITUI o anterior** (se outro sistema consome, retransmita via `UAZAPI_RELAY_URL`) |
| **Operação** | `WEBHOOK_SECRET` (**novo por cliente**, `openssl rand -hex 24`) · `CRON_SECRET` · `SELF_URL` (**alias público, nunca `VERCEL_URL`**) · `CLIENT_NAME` ("Cliente · Agente") · `GATE_TAG` · `TRANSPORT` (Kommo) · `ALERT_GROUP_JID` · `CENTRAL_SECRET` (opcional; gere um novo e ponha no `AGENT_SECRET` da Central **DO CLIENTE** — o `WEBHOOK_SECRET` fica só na sua) | Env só vale em **novo deploy** — mudou env, redeploy. 🩸 **Nunca ponha o `WEBHOOK_SECRET` na Central do cliente:** é o secret que decide o perfil (`lib/perfil.ts`) — com ele o cliente entra como **`agencia`** e ganha o **editor cru do prompt inteiro**, que é justamente o que a Escola existe pra evitar |

---

## §7 · MANUTENÇÃO DESTA SKILL (a parte que mantém o produto vivo)

Toda sessão que descobrir algo novo **escreve aqui na hora**, no arquivo certo da biblioteca, com **evidência e data** (`validado 13/07: X aconteceu porque Y`). Skill parada envelhece em semanas — a API do GHL muda, o Kommo muda, a Meta muda regra, o modelo muda comportamento.

### 7.1 · Onde escrever (decida em 5 segundos)

| A descoberta é… | Vai pra |
|---|---|
| Vale nos DOIS CRMs (voz, Meta, Vercel, modelo, followup, Central) | `comum/PEGADINHAS.md` |
| Só do GHL / só do Kommo | `ghl/PEGADINHAS.md` · `kommo/PEGADINHAS.md` |
| Passo novo de construção | `ghl/PLAYBOOK.md` · `kommo/PLAYBOOK.md` |
| Widget oficial/público Kommo (manifest, CSS, página interna, OAuth, ZIP, moderação) | skill `kommo-widget-metrik`; cicatriz também em `kommo/PEGADINHAS.md` quando afetar a operação Kommo |
| Decisão de arquitetura / trade-off novo | `comum/ARQUITETURA.md` |
| Número medido, limiar, custo, regra de prompt | `comum/CONTEXT-ENG.md` |
| Cenário de eval novo, falha do juiz | `comum/EVALS.md` |
| Pergunta nova de discovery ou red flag | `comum/DIAGNOSTICO.md` |
| **Padrão da Central / aba nova / onde um conhecimento mora** | **`CENTRAL.md`** |
| Ideia de feature nova (ou reprovada, **com o motivo**) | `FRONTEIRA.md` |
| Desenho da aba "Ensinar a IA" (o cliente corrigindo) | `ESCOLA.md` |
| Prova de valor, holdout, precificação, renovação | `MONETIZACAO.md` |
| O que quebra ao dobrar a carteira | `ESCALA.md` |
| Lei nova, postura, roteador | **este SKILL.md** |
| **Código novo que outros clientes vão receber igual** | `assets/<feature>/` + o patch documentado no `INSTALAR.md` da pasta |

> **`asset` × `patch` (a distinção que evita destruir cliente):** **asset** = arquivo que replica **INTEIRO** — copia por cima e funciona (`lib/escola-core.ts`, `lib/escola.ts`, `lib/roteador.ts`, `lib/perfil.ts`, `api/escola.ts`, os componentes da Central). **Patch** = arquivo que carrega **config do cliente** (`lib/config.ts`, `lib/crm-map.ts`, `lib/manifest.ts`, `vercel.json`, `app/cerebro/page.tsx`, `api/inbound.ts`, `api/prompt.ts`) — **nunca se copia por cima**: aplica-se a mudança à mão, descrita no `INSTALAR.md`. 1º asset da skill: `assets/escola/` (22/07/2026).

**Formato mínimo de uma cicatriz:** *sintoma* (o que o cliente viu) → *causa* (o mecanismo) → *cura* (o código/config) → **anticorpo** (a regra que impede a volta) → **data + evidência**. Se o sistema **logava sucesso e não entregava**, marque como cicatriz que **mente** — essas são as caras.

### 7.2 · O RITUAL DAS 3 PERNAS (nunca faça só a primeira)

Mexeu na skill? O trabalho **só está pronto** quando as três acontecem:

**1. A skill** — escreve no arquivo certo (7.1), com evidência e data.

**2. O CÓDEX** — a vitrine do conhecimento em `codex-metrik.vercel.app`:
```bash
cd clientes/metriksales/codex && npm run deploy    # sync + build + vercel --prod
```
O `scripts/sync.mjs` copia os `.md` reais de `~/.Codex/skills/` e regenera o índice (linhas, seções, data). **Se a mudança foi só de conteúdo dos `.md`, o sync já resolve.** Criou um conceito novo? edite também o dado estruturado:

| O que você criou | Onde registrar no Códex |
|---|---|
| Peça nova no agente | `produtos/agente-ia/organismo.ts` → `ORGAOS` (com `mecanismo`, `origem` e `liga`) |
| Pegadinha nova | `produtos/agente-ia/cicatrizes.ts` → `CICATRIZES` (sintoma/causa/cura/**anticorpo**; `mente:true` se loga sucesso e não entrega) |
| Lei, doutrina, limiar, custo medido | `produtos/agente-ia/doutrina.ts` |
| Marco do produto | `produtos/agente-ia/evolucao.ts` → `VERSOES` (campo `porque` é **obrigatório**: versão sem dor não entra) e mova o `atual: true` |

> O Códex é uma **engine multi-produto** (desde 16/07): cada produto é uma ficha em `produtos/<id>/` que a engine renderiza — **os dados saíram de `lib/` pra `produtos/agente-ia/`**. Um segundo produto é uma pasta + uma linha no registro. **Regra do Códex:** ele lê a skill **viva**, nunca uma cópia à mão — documentação que não é gerada da fonte vira mentira em duas semanas. **Por isso o `npm run deploy` sincroniza antes de subir, sempre.**

**3. O plugin** — sanitiza → bump de versão → push (`metrik-sales/metrik-ia-marketplace`). Skills com placeholders no lugar de URLs/JIDs/IDs internos. Todo assinante recebe.

> **Por que as 3 são obrigatórias:** conhecimento que só existe no `.md` não vira produto — ninguém abre o editor pra ver. O Códex é o que transforma **851 linhas de markdown** (o tamanho da skill do GHL **quando o Códex nasceu** — ela fechou em **893** antes da fusão; esta aqui já passa de **3.800**) em algo que sustenta preço, ensina aluno e prova competência. O plugin faz isso chegar em quem paga. **O produto não é o arquivo: é o fluxo de atualização.**

### 7.3 · A 4ª PERNA — código novo chega em TODO cliente (senão cada um congela)

As 3 pernas distribuem **conhecimento**. Um **componente novo** do motor (ex.: o playground "Testar ao vivo") só entra na conta de um cliente quando você **redeploya o agente dele**. Sem isso, cada cliente trava numa versão e o produto vira colcha de retalhos.

| Compartilhado (o motor — vem do template) | Do cliente (a alma dele — **JAMAIS** sobrescreva) |
|---|---|
| `lib/*.ts` e `api/*.ts` do agente · `area-cliente/` (páginas e componentes) | `prompt.md` · `lib/crm-map.ts` · `.env` / envs da Vercel · `.vercel/` · o `status` do `lib/manifest.ts` |

**Ritual de propagação (por cliente que já está no ar):**
```
1. Copia SÓ os arquivos compartilhados que mudaram (nunca prompt.md / crm-map / .env)
2. npm i (se package.json mudou) → npm run typecheck
3. Mexeu em prompt/tools? node scripts/evals.mjs   (10/10 ou não sobe)
4. vercel --prod   (agente e, se a Central mudou, area-cliente)
5. Verifica NO AR: dispara o endpoint novo (ex.: POST /api/prompt {acao:'chat'}) e confirma { ok }
```

**Saiba quem está atrás:** a cada componente compartilhado novo, bump o `SISTEMA_VERSAO` no `lib/manifest.ts` e **registre a peça em `MODULOS`** — a Enciclopédia da Central passa a mostrar a versão e o módulo. Bate o olho e sabe qual cliente precisa de update.

> **Um componente compartilhado só está "pronto" quando TODOS os clientes foram redeployados** (ou está anotado quem ficou pra trás). Componente que só vive no template é igual conhecimento que só vive no `.md`: não chegou em quem usa. *(1º caso: playground "Testar ao vivo" — no ar na Metrik 19/07. 2º caso: a **ESCOLA Fase 0** — código na Metrik 22/07, empacotado em `assets/escola/`; **nenhum cliente propagado ainda**.)*

### 7.4 · PROPAGAÇÃO PRAS SKILLS DERIVADAS (o critério rigoroso)

Esta é a skill do **topo da escada**. Abaixo dela vivem as derivadas — a **do curso** (aluno constrói com CRM) e a **do webinar** (`agente-whatsapp`, uazapi puro, sem CRM). Elas não são cópias: são recortes. **Toda cicatriz nova passa por este teste, na hora em que é escrita:**

| Pergunta | Se SIM |
|---|---|
| **Essa cicatriz vale pro CURSO?** (o aluno constrói agente com CRM, prompt, evals, Vercel, Redis, voz) | Propaga **na hora** pra skill do curso, na linguagem do aluno (menos IDs internos, mais o porquê) |
| **Essa cicatriz vale pro WEBINAR?** (uazapi puro: conversa + mídia + followup, **sem CRM**) | Propaga **na hora** pra `agente-whatsapp` — só o que não depende de CRM (voz/ptt, Cloudflare 1010, `thinking: disabled`, VERCEL_URL, cron/QStash, janela 24h, eco/`wasSentByApi`, webhook único por instância) |
| **É específica de CRM (GHL/Kommo)?** | Fica **só aqui**. Não polua a derivada com dor que o público dela nunca vai sentir |
| **Expõe ID real, JID, token, URL interna ou nome de cliente?** | **Nunca sai daqui sem sanitizar** — placeholder na derivada e no plugin. **Método aprendido ao empacotar a Escola (22/07):** ① `grep` **sem `\b`** — em `'…\nBia:'` o `\n` literal mata o word-boundary e o nome do agente **passa batido**; ② varredura extra por `{NOME_AGENCIA}` / `{NOME_AGENTE}` nas **strings que o CLIENTE LÊ** (recado do 403, rodapé de ticket, placeholder de textarea) — é lá que o nome interno vaza, não no código |

**Regra:** propagação **atrasada é propagação perdida**. Se a cicatriz vale pra derivada, escreve nas duas na MESMA sessão — senão o aluno reencontra um bug que a casa já resolveu, e a promessa da escada quebra.

### 7.5 · GERAR O CÓDEX DE UM AGENTE (o entregável do mentorado)

O Códex é uma engine: o mesmo molde renderiza qualquer produto. É isso que o aluno leva — a vitrine do agente **dele**, com o design e a estrutura Metrik.

**1. Esqueleto (determinístico):**
```bash
cd codex && node scripts/scaffold-produto.mjs meu-agente "Meu Agente" "SDR de IA no meu nicho"
```
Cria `produtos/meu-agente/` com as 5 fichas no formato certo (compila de cara, um exemplo em cada) e registra em `produtos/index.ts`.

**2. Preenchimento (é aqui que EU entro, modo professor):** com a skill do aluno carregada, eu leio os `.md` dele e estruturo a ficha — cada arquivo tem uma **fonte natural**:

| Ficha | De onde eu extraio |
|---|---|
| `organismo.ts` | os órgãos do `SKILL.md §1` + o fluxo do `comum/ARQUITETURA.md` (cada peça vira um `Orgao` com mecanismo e a dor de origem) |
| `cicatrizes.ts` | os `PEGADINHAS.md` (comum + do CRM dele) → sintoma/causa/cura/anticorpo; `mente:true` se loga sucesso e não entrega |
| `doutrina.ts` | as leis do `SKILL.md §3/§5` + os números do `comum/CONTEXT-ENG.md` + os evals do `comum/EVALS.md` |
| `evolucao.ts` | a história do agente dele (cada versão com a **dor** que a forçou — sem dor, não entra) |
| `fronteira.ts` | o backlog/ideias dele (ou rode uma caça de ideias com juízes) |
| `meta.ts` | nome, tagline, cor e `publicado: true` quando tiver conteúdo |

**Não invento o conteúdo dele.** Extraio o que já está nos `.md` e **pergunto o que faltar** (a dor de um órgão, a evidência de uma cicatriz). Ficha com dado inventado é a mesma bomba-relógio do prompt inventado.

**3. Publicar:** `npm run deploy` → o Códex dele no ar, e no hub assim que `publicado: true`.

> **Por que isso fecha o ciclo:** a engine que a Metrik usa pro próprio portfólio é a MESMA que o aluno recebe. O protótipo em produção vira o produto do aluno, sem retrabalho. É a filosofia inteira num só artefato.

---

> **Última palavra.** Se você chegou até aqui numa sessão real: a ordem é sempre **diagnóstico → desenho comentado → construção → prova → rampagem → ensino**. Pular etapa não acelera; só muda o lugar onde você vai perder o dia. E quando algo novo doer, **volte aqui e escreva** — com data e evidência.
