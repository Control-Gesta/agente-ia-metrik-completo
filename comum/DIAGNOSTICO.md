# DIAGNÓSTICO — as perguntas antes do código

> **Construir sem diagnóstico é operar sem exame.** Este roteiro é socrático de propósito: **cada resposta do cliente DECIDE uma peça da arquitetura**. Faça as perguntas NA ORDEM e anote as respostas — elas viram o `prompt.md` e o `crm-map.ts` **quase literalmente**.

**Leia este arquivo ANTES de escrever uma linha de código.** Ele é o pré-requisito bloqueante do `ghl/PLAYBOOK.md` e do `kommo/PLAYBOOK.md`: sem ele, **PARE** — o que sai do outro lado é um agente genérico.

---

## Por que o diagnóstico é a primeira lei (a doutrina)

| Princípio | O que acontece se você furar |
|---|---|
| **Nunca saia copiando template.** Primeiro entenda o cenário. | O agente nasce genérico e **o cliente CANCELA EM 30 DIAS**. |
| **Pergunte o que falta — não invente.** Não sei o preço da oferta, o tom da marca ou quando o lead vira Qualificado? **PERGUNTO.** | Prompt com dado inventado é **bomba-relógio**: o agente vende errado com **confiança total**. (Vale igual pra ficha do Códex do aluno: extraia do que já existe nos `.md` e pergunte o que faltar — ficha inventada é a mesma bomba.) |
| **Corrija com evidência, não obedeça por educação.** | Você entrega o erro que o cliente pediu e paga o preço junto com ele. |
| **Nada vai pro ar sem prova.** Evals 10/10 · E2E em número real · rampagem por tag. | Vexame no cliente — e "funcionou no meu teste" não é prova (vide a voz, que logava sucesso e **não entregava áudio nenhum**). |

**O que o diagnóstico compra:** com ele respondido, a construção leva **~1 dia no GHL** (11 etapas do `ghl/PLAYBOOK.md`) e **~meio dia no Kommo**. Sem ele, leva semanas — e ainda churna. O custo de infra do organismo é **~R$50–150/mês por cliente**; a IA sai a **~R$0,16 por conversa completa** (`comum/CONTEXT-ENG.md`). O que decide o preço da entrega é o negócio do cliente, não o token.

### Onde o diagnóstico entra na sessão

```
Cliente novo:
  DIAGNÓSTICO  →  desenho comentado ("vamos fazer X porque Y; o trade-off é Z")
  →  construção (ghl/PLAYBOOK.md  ou  kommo/PLAYBOOK.md)
  →  evals (comum/EVALS.md)  →  E2E em número real  →  rampagem por tag
  →  ensinar o time a operar (o que é o gate, como desligar a IA, como ler a Central)
```

---

## Como conduzir (postura)

- **Uma pergunta por vez**, em linguagem de dono de negócio — nunca *"qual seu pipeline_id"* e sim *"me conta o caminho que um lead percorre até virar cliente"*.
- **Grave a reunião.** As palavras exatas que o dono usa pra descrever o negócio são o **melhor material de prompt que existe** (e você vai querer o áudio depois).
- **Pergunte "por quê" DUAS vezes.** *"Quero um robô que atenda rápido"* → *por quê?* → *"porque perco lead à noite"* → *por que importa?* → *"porque 40% vêm de anúncio fora do horário"*. **Agora você sabe o que medir e o que o agente precisa fazer.**
- **Red flag = fale NA HORA**, nunca depois do contrato assinado (tabela no fim).
- **Explique o trade-off enquanto pergunta.** Toda decisão ganha e perde algo; quem entende o porquê decide sozinho no próximo cliente, em vez de copiar.

### Corrigir com evidência durante o diagnóstico (os 3 pedidos que parecem espertos)

O cliente (ou o aluno) vai pedir coisa que a produção já provou ruim. Recuse **com o número medido** — detalhe em `comum/CONTEXT-ENG.md`:

| Pedido | Por que é engenharia negativa | O que responder |
|---|---|---|
| **"Faz RAG"** com base minúscula (6k tokens) | Troca **qualidade garantida** por busca probabilística + latência + ponto de falha... pra economizar **R$0,002** | "Abaixo de ~10k tokens o cache dá 90% de desconto e o modelo vê TUDO. RAG só acima de ~25k." |
| **"Põe um roteador Haiku antes do Sonnet pra economizar"** | O Sonnet roteia as portas **de graça, dentro da mesma chamada**. Roteador = +1 request, +latência, **zero ganho** | "Haiku é pra tarefa mecânica (followup, classificação). Conversa com lead é onde o dinheiro é ganho." |
| **"Prompt gigante com if-else por cenário"** | A Anthropic chama de **"altitude errada"** — vira inmanutenível | "**Princípios > árvore de decisão.** O que é determinístico vira CÓDIGO, não instrução." |

---

## 🔀 BLOCO 0 — A PERGUNTA QUE DECIDE O CAMINHO: **GoHighLevel ou Kommo?**

> Faça esta pergunta **antes de todas as outras**. Ela não muda o que você pergunta nos blocos 1–5 — muda **o que cada resposta vira em código**, qual `PLAYBOOK` você abre e quais pegadinhas te esperam. ~80% da arquitetura é a mesma; as diferenças abaixo definem TUDO o que sobra.

**Como perguntar:** *"Onde ficam os leads de vocês hoje? O time trabalha o card em qual sistema?"* (e confirme com print/acesso — cliente às vezes tem os dois e não conta).

| Dimensão | **GoHighLevel** | **Kommo** |
|---|---|---|
| **Histórico da conversa** | O CRM **devolve o transcript** → é a **fonte da verdade**, agente 100% stateless | **NÃO devolve transcript** → o histórico é **nosso**, mora no Redis (`ak:conv:{leadId}`). **Redis vira OBRIGATÓRIO** |
| **Forma de envio** | API envia direto (`POST /conversations/messages`) | **API v4 NÃO envia mensagem** → envio **indireto**: **Desenho A** (Salesbot) ou **Desenho B** (uazapi) |
| **Modelo de dados** | **contact + opportunity** (dois objetos, dois conjuntos de custom fields) | **lead-cêntrico**: as tools operam no **LEAD** |
| **Campos de select** | Options por valor/`field_value` no PUT da opportunity | **select/multiselect gravam por `enum_id`**, não por texto — o `crm-map` carrega os enums |
| **Tags (gate)** | Tag no **contact** | Tag no **LEAD** — e **PATCH de tags SUBSTITUI o conjunto inteiro** (sempre merge local) |
| **Agenda** | Calendars API real → tool consulta horários livres e agenda de verdade | **Sem Calendars API** → a tool valida a **janela** (do `crm-map`) e cria **task** (`task_type_id 2`) + campo `date_time` (**epoch em SEGUNDOS**) + move etapa |
| **Voz** | Provedor de WhatsApp do GHL **descarta áudio outbound** → voz **só via uazapi** | **Salesbot = 1 mensagem por resposta** (partes viram parágrafos); **multi-msg e voz só no Desenho B (uazapi)** |
| **Followup fora da janela 24h** | Tag `ia-fu-cN` → **Workflow "Tag Added" → template WhatsApp aprovado** (a API do GHL não envia template) | Cadência 1 (12h) entra; 2+ não entregam texto livre → **uazapi** ou **bloco de template WABA no bot** |
| **Rastreio de origem/UTM** | `lib/tracker.ts` + workflows `Contact Created` / `Customer Replied` com "Origem is empty" | `/api/r/{slug}` (link público com código de 4 chars, TTL 7d, uso único) → resolve no inbound e grava `tracking_data` nativo |
| **Onde ler depois** | `ghl/PLAYBOOK.md` · `ghl/PEGADINHAS.md` | `kommo/PLAYBOOK.md` · `kommo/PEGADINHAS.md` |
| **Tempo de construção (diagnóstico pronto)** | **~1 dia** (11 etapas) | **~meio dia** (reusa o motor) |

**Comum aos dois (não se decide aqui):** LLM + tools em loop · buffer 10s · gate por tag · alçada até "Agendado" · STT Groq · mídia descrita uma vez na entrada · followup · guardião/analista/auditora · evals · Central de IA · Vercel + Upstash. **O provedor da LLM ganha uma rodada própria** (`comum/ESCOLHA-LLM.md`); Claude Sonnet 5 continua o padrão comprovado enquanto os desafiantes não passam no bake-off.

### As 3 perguntas-satélite do Bloco 0

| Pergunta | O que decide |
|---|---|
| **"O WhatsApp está conectado no CRM (oficial/Meta) ou numa instância própria (uazapi)?"** | **No Kommo essa resposta escolhe o Desenho A (Salesbot) ou B (uazapi)** — e no GHL decide se a voz é possível. Ver Bloco 3. |
| **"Esse número roda em mais de um sistema?"** | **Coexistência = RESPOSTA DUPLA.** Ver red flags e `comum/PEGADINHAS.md` §9 número. |
| **"Já existe automação/bot nessa conta (n8n, Conversation AI nativo, outro Salesbot)?"** | Gates precisam ser **disjuntos**. No dogfood da Metrik convivem o fluxo n8n (gate tag `IA`) e o agente novo (gate `IAV`) — **nunca as duas tags no mesmo lead**. No GHL: **desligue o Conversation AI nativo (Autopilot)** no canal, senão dois bots respondem. |

> **Cliente com os DOIS CRMs?** Um número = um agente. Escolha o CRM onde o time realmente trabalha o card e mantenha **um único gate aberto por vez** pro mesmo contato.

---

## Bloco 1 — O NEGÓCIO (decide o `prompt.md`)

| Pergunta | O que a resposta decide |
|---|---|
| "Me explica o que vocês vendem, como se eu fosse um cliente entrando agora." | **Catálogo do prompt · tom** |
| "Quem é o cliente ideal? E quem **NÃO** é?" | Regras de **qualificação E de descarte** |
| "Quais as **10–15 perguntas** que os leads mais fazem? E as respostas oficiais?" | **FAQ do prompt** (se passar de **~150 perguntas** o prompt não aguenta → **muda a arquitetura pra RAG**, `comum/CONTEXT-ENG.md`) |
| "O agente **PODE falar preço**? De tudo ou só de alguns produtos?" | **A regra anti-alucinação MAIS IMPORTANTE do prompt** |
| "Tem promessa que ele **NUNCA** pode fazer?" (prazo, garantia, desconto) | Seção **"Limites"** do prompt |
| "Qual o objetivo final da conversa?" (call? venda no chat? visita?) | O **CTA** e se precisa de integração de agenda |
| "**Existe mais de um caminho?**" (ex.: empresa→call, aluno→checkout) | **Múltiplas "portas" no prompt** — o padrão que MAIS CONVERTE |

> 🏅 **A REGRA DE OURO que o rascunho do prompt já tem que nascer respeitando** (descoberta pelos evals, custou venda):
> **ORDEM SAGRADA — responda a dúvida do lead COMPLETA, com o nome da oferta e o valor, e SÓ DEPOIS pergunte algo. UMA pergunta por resposta.**
> Perguntar o nome antes de responder o que ele perguntou = **robô burocrático = conversa morta**. O eval flagrou quando a Porta de venda caiu de **10 → 2** numa "melhoria" inocente. Detalhe em `comum/CONTEXT-ENG.md` e `comum/EVALS.md`.

**O "cérebro" que você precisa levar embora da reunião:** tom da marca · **catálogo com preços** (o que **PODE** e o que **NÃO PODE** falar) · **FAQ real com 10–15 perguntas dos leads** · regras de escalação · **CTA principal**.

---

## Bloco 2 — O FUNIL (decide o `crm-map.ts`)

| Pergunta | O que decide |
|---|---|
| "Qual pipeline o agente opera?" | `pipelineId` (GHL) / `pipeline_id` (Kommo) |
| **"O que precisa acontecer na conversa pro lead virar Qualificado?"** — **repita pra CADA etapa** | O `quando` de cada stage — **a pergunta MAIS VALIOSA do diagnóstico**: a resposta vira **instrução literal da IA** |
| "Até onde a IA vai, e onde o humano assume?" | **Alçada** — o **PADRÃO é a IA ir até "Agendado"** |
| "Que dados o time precisa ver no card **antes** de falar com o lead?" | **Campos de qualificação** + o `quando` de preenchimento de cada um. (No GHL eles vão na **Opportunity**; no Kommo, no **lead** — e o que qualifica é do **negócio**, não do template) |
| "**Alguém mexe no funil sem avisar?**" (renomeia etapa, apaga campo) | Se **SIM** → **obrigatório `/api/validate` no cron + laudo no grupo** |
| "Lead que some: **quantos toques e em quanto tempo**? E quando desiste?" | **Cadências do followup** + o que fazer ao **ESGOTAR** a cadência |
| "Depois do follow-up, o que significa **voltou a conversar** e qual evento significa **concretizou**?" | duas conversões separadas + sinal verificável no CRM + janela de atribuição (`RECUPERACAO.md`) |

**O que anotar junto (senão vira retrabalho na Etapa 5 do playbook):**
- **`stageOrder` com TODOS os stages vivos** na ordem real (guard anti-retrocesso) — não só os da alçada.
- **Cadência sub-diária?** Se a 1ª cutucada é em 6h, **o cron diário da Vercel não basta** → entra o **QStash** como relógio horário (`comum/PEGADINHAS.md`).
- **Janela comercial do followup** (ex.: 8h–18h) e **timezone**. ⚠️ **A janela engole o tique do relógio**: quem vence **17h38** não é pego pelo tique das 17h (cedo) nem pelo das 18h (janela já rejeita) — **22 min viram 14h de atraso**. Se você prometeu "6h", ou antecipa no motor ou promete a coisa certa: **a granularidade do gatilho é o piso da sua promessa**.
- **Escalação NÃO pode virar perseguição:** quando a IA manda pro humano, o followup do lead tem que morrer **na mesma volta** (`escalar_para_humano` → `clearFollowup`). Pergunte desde já **quem** recebe o lead escalado.

---

## Bloco 3 — CANAL E MÍDIA (decide voz/STT/uazapi — e, no Kommo, o **Desenho A ou B**)

| Pergunta | O que decide |
|---|---|
| **"O WhatsApp é oficial (API/Meta) ou aparelho/instância própria?"** | **Janela de 24h e templates** (`comum/PEGADINHAS.md` §8) · **no Kommo: oficial → Desenho A (Salesbot) · uazapi → Desenho B** |
| "Esse número é usado por mais alguém/outro sistema?" | **Coexistência = RESPOSTA DUPLA** (`comum/PEGADINHAS.md` §9 número) |
| "Seus leads mandam áudio?" (quase sempre: **sim**) | **STT via Groq — praticamente OBRIGATÓRIO no Brasil** |
| "Você quer que a IA responda **em áudio**?" | **Só PROMETA depois de testar a ENTREGA REAL** (`comum/PEGADINHAS.md` §1) — **voz exige uazapi** nos dois CRMs |
| "Tem uazapi/instância própria?" | **Voz**, **alertas em grupo de WhatsApp** e (no Kommo) **o Desenho B** |
| "Manda **link/imagem/PDF** pro lead?" | Regras de mídia — **link JAMAIS pode ir em áudio/voz** |

**Árvore de decisão do canal (leia em voz alta com o cliente):**

```
WhatsApp OFICIAL no CRM?
  ├─ SIM  → janela de 24h vale  → followup 2+ precisa de TEMPLATE aprovado (Meta, categoria Marketing, ~R$0,35/envio)
  │          GHL: tag ia-fu-cN → Workflow → template     Kommo: bloco de template WABA no bot
  │          Voz? só se ALÉM disso existir uazapi no mesmo número (coexistência — cuidado com resposta dupla)
  └─ uazapi/instância própria → texto livre sem janela · voz (ptt) · multi-msg · alertas em grupo
             Kommo: é o Desenho B (transport dinâmico por lead: quem entra pela uazapi responde pela uazapi)
```

**O que a resposta "sim, mandam áudio/foto/PDF" te obriga a construir** (doutrina de mídia — `comum/ARQUITETURA.md`):
- **Áudio** → Groq Whisper → vira `[áudio do lead]: <transcrição>` no histórico.
- **Imagem e PDF** → **visão do próprio Claude** (blocos `image` / `document`), **UMA vez na ENTRADA**, gravando como TEXTO (`[imagem do lead]:` / `[documento do lead]:`). **Não precisa de Gemini/OCR à parte** e você não paga visão a cada turno.
- **Peça o contexto do negócio pro prompt de descrição** ("escritório previdenciário: que documento é? que dados aparecem?") — senão o modelo descreve "um papel branco" em vez de "RG de João, nº X".
- **O agente NÃO interpreta o documento juridicamente** (isso é do advogado): reconhece, agradece e **emenda a próxima pergunta**.

**Se o cliente contratar voz, avise os 3 preços agora:**
1. **Voz tem que ser CURTA** (~500 chars / 2–3 frases): ElevenLabs a 64kbps ≈ 8KB/s → ~800 chars batem no teto de 500KB e **cai pra texto silenciosamente**. Prompt tipo **"showcase"** (que explica o ecossistema inteiro) **estoura sem avisar**.
2. **Áudio demora ~30s pra responder** (hidratação da mídia) — é **de propósito**, avise antes.
3. **A nota de voz volta como outbound vazio no CRM** → se o histórico descartar vazios, o modelo lê uma conversa onde **ELE nunca respondeu** e **alucina** ("aguardando você escolher o horário") em loop. Por isso existe o marcador `[<Agente> respondeu por áudio aqui]`.
4. **Voz da biblioteca ou clone?** Se clone: 1–2 min de gravação limpa.

---

## Bloco 4 — OPERAÇÃO (decide governança)

| Pergunta | O que decide |
|---|---|
| "**Quem no time aprova o que a IA fala?**" | **Dono do prompt** · quem valida os evals |
| "Como vocês querem ser avisados quando der problema?" | **Grupo de alertas** (envs `CLIENT_NAME` + **JID do grupo**) |
| "Quantos leads/dia hoje? E o **pico**?" | **Redis obrigatório?** · **rate limit?** · **frequência do cron** (diário basta ou precisa de horário/QStash?) |
| "Alguém do time responde no WhatsApp **junto** com a IA?" | Regra da tag **`atendimento-humano`** (IA cala) |
| "Que assunto **NÃO** pode passar pela IA?" | **Escalação** (suporte, financeiro, reclamação) |

**Perguntas de governança que evitam dor depois:**
- **"Vocês vão querer editar o prompt sozinhos?"** → dá pra entregar o **cérebro editável ao vivo** (Central `/cerebro`), mas **com o eval como PORTEIRO**: publicar só destrava se os 10 cenários passarem. ⚠️ Prompt em painel **sem** esse portão **some com o eval** — aí é aposta, não engenharia.
- **"Quem decide quando a IA atende quem?"** → **gate por tag desde o dia 1**, sem exceção. **Sem gate: dia 1 do cliente = IA respondendo lead errado = confiança destruída antes de provar valor.**
- **"O que vocês querem VER?"** → define a Central de IA (funil ao vivo, cérebro,
  **aba Recuperação**). Nunca aceite “recuperado” sem definição: pergunte o que
  prova **resposta** e o que prova **objetivo comercial** no CRM. Leia
  `RECUPERACAO.md`.
- **Prometeu módulo?** **Nada entra no manifesto como `ativo` sem `prova` (data + evidência real).** Manifesto que mente é pior que não ter.

---

## Bloco 5 — O ALUNO (quando quem constrói está aprendendo)

Antes de mandar código, **calibre o nível** com 3 perguntas: **"você já mexeu com API/webhook antes?"** · **"sabe o que é uma variável de ambiente?"** · **"já usou Vercel/Git?"**

| Nível | Como conduzir |
|---|---|
| **Zero técnico** | Ensine **o organismo** (§1 da `SKILL.md`) com analogia, faça você e **mostre cada peça funcionando**. Ele opera e vende; a construção é sua. |
| **Intermediário** | Ele executa o `PLAYBOOK` do CRM dele **com você revisando cada etapa**. Explique o porquê de cada decisão — o objetivo é ele **replicar sozinho no 2º cliente**. |
| **Avançado** | Direto ao **trade-off** e às **pegadinhas**. Ele vai querer mudar coisa — mostre `comum/CONTEXT-ENG.md` **antes** que ele "otimize" o que não devia. |

> **A ordem de aprendizado é sagrada:** mapa do organismo (§1) → **diagnosticar um cliente fictício** → só então código. **Quem entende o organismo replica sozinho; quem decora comando trava no primeiro imprevisto.**

---

## 🚩 Red flags (fale ANTES de fechar)

| Sinal | Risco | O que dizer |
|---|---|---|
| **"Quero que a IA feche a venda inteira sozinha"** | Alçada demais → **confiança do time destruída** | "A IA leva até o agendamento com qualidade. **Fechamento é onde seu closer ganha dinheiro** — e a IA entrega o lead pronto pra ele." |
| **"Não tenho FAQ, a IA se vira"** | Agente genérico = **cliente cancela** | "Sem o teu conhecimento, ela vira chatbot igual aos outros. **Me dá 15 perguntas reais e ela vira você.**" |
| **"Pode inventar preço/prazo se o lead insistir"** | **Passivo jurídico + churn** | "Ela nunca inventa. Prefere dizer que o time confirma — **mentira de IA é processo na certa**." |
| **"Meu número já tem outro bot"** | **Resposta dupla GARANTIDA** | "**Um número = um agente.** Senão o lead recebe duas respostas — **já vimos acontecer**." |
| **"Quero em 2 dias, pode pular teste"** | Vai quebrar **no cliente** | "**O E2E leva 1 hora** e evita o vexame. **Sem ele eu não coloco lead real.**" |
| **"Tenho 300 FAQs e 5 mil SKUs"** | **O prompt estoura** | "Aqui **muda a arquitetura: entra RAG**. Vale o escopo maior." (`comum/CONTEXT-ENG.md`) |
| **"O funil a gente mexe direto, sem avisar"** | Campo morto grava com **200 OK silencioso** = perda de dado invisível | "Então `/api/validate` no cron **e laudo no grupo** — senão vocês descobrem o dado sumido no mês seguinte." |
| **"Não precisa de gate, liga pra todo mundo"** | Dia 1 com IA no lead errado | "Rampagem: **você → 10 leads → todos**. Uma semana pra provar, e aí abre." |

---

## Saída do diagnóstico (o que você TEM que ter em mãos)

1. **CRM escolhido e confirmado** (GHL ou Kommo) + **desenho de canal** (oficial/Salesbot **ou** uazapi/Desenho B) — o Bloco 0 fechado.
2. **Rascunho do `prompt.md`** — identidade · **portas** · catálogo **com preços** · FAQ · **limites** · CTA · regra de suporte (escalar **sem pitch**).
3. **Rascunho do `crm-map.ts`** — pipeline · stages com o `quando` · campos com o `quando` (no Kommo, **com os `enum_id`**) · calendário/janela · followup (intervalos, janela comercial, ao esgotar).
4. **Lista de credenciais** a pedir/criar (tabela abaixo).
5. **Decisões de arquitetura anotadas** — voz sim/não · Redis · RAG sim/não · **LLM/provedor + motivo + política de cache + eval de comparação** · gate (nome da tag) · cadências · cron diário ou QStash horário · Central sim/não.
6. **Cenários de eval** — os casos que **TÊM que passar**: cada porta do cliente, o que ele **não pode** falar, a **objeção clássica** dele, suporte (não vender), "é um bot?", prompt injection, fora de escopo (`comum/EVALS.md`).

> Os IDs você **NÃO** anota de memória: descubra **AO VIVO** na hora de montar o `crm-map` (`GET /opportunities/pipelines` no GHL · `GET /api/v4/leads/pipelines` + `/api/v4/leads/custom_fields` no Kommo). **A conta do cliente muda no mesmo dia** — já aconteceu: 4 campos deletados e 2 stages novos entre a manhã e a noite.

### Credenciais a pedir (formato e pegadinha de cada)

| Credencial | Formato / pegadinha |
|---|---|
| **GHL PIT** | `pit-` — precisa de **admin** do GHL (pra PIT + workflows + templates) |
| **Kommo** | `KOMMO_DOMAIN` · `KOMMO_TOKEN` · `KOMMO_ACCOUNT_ID` · **`KOMMO_BOT_ID`** (só existe depois do Salesbot de envio criado no UI) |
| **LLM escolhida** | Anthropic `sk-ant-` · OpenAI `sk-` · Kimi/Moonshot · DeepSeek. Peça **uma chave de API comercial**, nunca credencial de assinatura pessoal. O provedor só é escolhido depois de `comum/ESCOLHA-LLM.md`; padrão comprovado = Anthropic |
| **ElevenLabs** | `sk_` — ⚠️ **marque os escopos TTS + Voices Read: a key nasce SEM eles** |
| **Groq** | `gsk_` — ⚠️ **Groq (Whisper/LPU) ≠ Grok (xAI)**. Confundir é erro clássico |
| **Upstash REST** | URL + token. **Free = 1 database** → compartilhe por **namespace** (`agente-<slug>:` / `ak:` no Kommo) |
| **uazapi** | URL + token (voz `ptt` + alertas em grupo). **1 webhook POR instância** — POST substitui o anterior |
| **Do projeto** | `WEBHOOK_SECRET` **novo por cliente** (`openssl rand -hex 24`) · `CRON_SECRET` · `SELF_URL` (**alias público**, nunca `VERCEL_URL`) · `CLIENT_NAME` ("Cliente · Agente") · `ALERT_GROUP_JID` · `GATE_TAG` · (Kommo) `TRANSPORT` |

**Acessos a pedir junto:** admin do CRM · **WhatsApp conectado e testado** · calendário com **disponibilidade real** (GHL) ou a **janela de reunião** acordada (Kommo).

---

## Onde continuar depois do diagnóstico

| Próximo passo | Arquivo |
|---|---|
| Entender/explicar o sistema e decidir uma peça | `comum/ARQUITETURA.md` |
| Construir (GHL) | `ghl/PLAYBOOK.md` → `ghl/PEGADINHAS.md` |
| Construir (Kommo) | `kommo/PLAYBOOK.md` → `kommo/PEGADINHAS.md` |
| Mexer em prompt, custo ou escala | `comum/CONTEXT-ENG.md` |
| Certificar o cérebro antes de subir | `comum/EVALS.md` |
| Dores que valem pros dois CRMs (voz, janela 24h, coexistência, Vercel, Central, followup) | `comum/PEGADINHAS.md` |
| Montar o "Testar ao vivo" da Central | `comum/PLAYGROUND.md` |

> **Regra de leitura:** carregue só o que a tarefa pede. Ler tudo de uma vez é o mesmo erro de enfiar 40k tokens de FAQ no prompt — a doutrina vale pra você também.
