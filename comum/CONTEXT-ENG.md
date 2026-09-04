# CONTEXT ENGINEERING — a doutrina medida (prompt, RAG, custo, modelo, evals)

> **Vale IGUAL para GHL e Kommo.** O cérebro é o mesmo motor: mesma API, mesmo caching, mesmos limiares. O que muda é **quem guarda o histórico** e **quem entrega a mensagem** — está mapeado no §10.
>
> Tudo aqui foi **medido no nosso próprio laboratório** (Metrik, **12/07/2026**, Sonnet 5 + prompt caching). Quando alguém trouxer "a arquitetura de 2026 manda fazer X", **confira contra estes números antes de gastar semana**.

**Leia este arquivo quando:** for mexer em prompt, custo ou escala · alguém propuser RAG/roteador/otimização de token · precisar decidir Haiku × Sonnet · precisar defender uma escolha com número, não com opinião.

---

## 1 · Os números que decidem tudo (medidos 12/07/2026, Sonnet 5)

| Cenário | Custo/chamada | Latência |
|---|---|---|
| Prompt 6k tokens, cache **MISS** (1ª msg) | R$ 0,13 | 4,7s |
| Prompt 6k tokens, cache **HIT** (95% das chamadas) | **R$ 0,02** | 4,7s |
| Mesmo prompt em **Haiku 4.5** | R$ 0,01 | 5,0s |
| Prompt 10k tokens (FAQ 120 perguntas), HIT | R$ 0,08 | **9,5s** ⚠️ |

- **Conversa completa (~8 chamadas) = R$ 0,16** · **1.000 conversas/mês = R$ 162**
- Ticket do cliente: **R$ 179–997** → **custo de IA ≈ 0,1% do ticket**
- **Custo de operação completo por cliente: ~R$ 50–150/mês** (Claude + ElevenLabs + Groq + Upstash + Vercel). **Zero VPS, zero infra fixa.**

> 🎓 **A lição que muda a cabeça:** otimizar token antes de otimizar conversão é economizar gasolina do carro-forte. **Uma venda perdida por prompt vago custa 6.000 conversas.** Qualidade primeiro; custo é consequência.

**Como usar isso na venda:** quando o cliente pergunta "e se viralizar, quanto custa?", a resposta é um número, não um encolher de ombros — 10x o volume ainda é ~R$1.600/mês numa operação que fatura em ticket de centenas.

---

## 2 · Quando cada padrão entra (limiares por dado, não por hype)

| Situação | Faça | Por quê |
|---|---|---|
| Conhecimento **< 10k tokens** (oferta, FAQ curta, regras) | **Prompt direto + `cache_control`** | Cache = **90% de desconto** e o modelo vê TUDO — qualidade **garantida**, não probabilística |
| **10k–25k tokens** | Prompt, mas **enxugue**: exemplo redundante vira tabela | Latência começa a doer (4,7s → 9,5s **medido**) |
| **> 25k tokens** OU catálogo/preço por SKU OU **> 150 FAQs** OU latência > 12s | **RAG** (`knowledge/` + busca) | Aí sim: context rot real + latência inaceitável |
| Dado que **muda toda hora** (estoque, agenda, saldo) | **TOOL** (nunca prompt/RAG) | Dado vivo se **consulta**, não se memoriza |
| Domínios distintos (vendas + suporte + financeiro) | **Agentes separados** (deploys diferentes, mesmo template) | Monolito com 30 tools degrada |
| Tarefa mecânica (followup, classificação) | **Haiku** (`CLAUDE_MODEL_FAST`) | 3,5x mais barato — tom não importa ali |
| Conversa com lead (tom, objeção, fechamento) | **Sonnet** | Onde o dinheiro é ganho — **não economize** |

### Sinais de que chegou a hora do RAG (marque 2+)

☐ prompt > 25k tokens · ☐ latência ponta-a-ponta > 12s · ☐ catálogo/preços por SKU · ☐ conhecimento muda > 1x/semana · ☐ agente "esquecendo" regra do meio do prompt · ☐ **> 150 FAQs**

### O limiar aparece já no diagnóstico

- No **Bloco 1 do `comum/DIAGNOSTICO.md`** você pede *"as 10–15 perguntas que os leads mais fazem + as respostas oficiais"* → isso vira o FAQ do prompt. **Se passar de ~150 perguntas, o prompt não aguenta: muda a arquitetura para RAG.**
- Red flag correspondente: **"Tenho 300 FAQs e 5 mil SKUs"** → o prompt estoura. Fale **na hora**: *"aqui muda a arquitetura: entra RAG"* — e **vale cobrar escopo maior**. (Não é upsell inventado: é outra engenharia.)

---

## 3 · Haiku × Sonnet (a régua simples)

| Uso | Modelo | Motivo |
|---|---|---|
| Conversa com o lead (tom, objeção, roteamento de porta, fechamento) | **Sonnet** | É onde a venda acontece. Economia aqui é prejuízo. |
| Followup gerado, classificação, resumo, tarefa mecânica | **Haiku** (`CLAUDE_MODEL_FAST`) | 3,5x mais barato, resultado equivalente na tarefa |
| "Roteador barato antes do Sonnet" | ❌ **Nunca** | O Sonnet roteia as portas **de graça, dentro da mesma chamada** |

---

## 4 · ❌ Anti-padrões que parecem sofisticados (e custam caro)

Recuse **com o número medido**, não com opinião — concordar com o erro é desserviço:

| Anti-padrão | A evidência que derruba |
|---|---|
| **RAG pra base de 6k tokens** | Troca qualidade garantida por busca probabilística + latência + ponto de falha... pra economizar **R$ 0,002**. **Engenharia negativa.** |
| **Roteador Haiku antes do Sonnet "pra economizar"** | O Sonnet roteia as portas de graça, na mesma chamada. Roteador = +1 request, +latência, **zero ganho**. |
| **Prompt gigante com if-else por cenário** | A própria Anthropic chama de "altitude errada": vira inmanutenível. **Princípios > árvore de decisão.** |
| **Otimizar token antes de ter eval** | Economiza centavos e **perde venda sem saber**. |
| **Medo de "context rot" em 6k tokens** | O fenômeno é real acima de ~50k. Em **3% da janela**, não existe. |

> **Postura:** se pedirem qualquer um destes, explique o porquê com o dado e proponha o certo. É isso que separa mentor de executor cego.

---

## 5 · Prompt caching — como não jogar o desconto de 90% fora

- **Bloco estático** (o `prompt.md` inteiro) com `cache_control: {type:'ephemeral'}`.
- **Contexto dinâmico** (data/hora, nome do lead, tags, etapa) vai em **bloco SEPARADO** — senão o timestamp **invalida o cache a cada minuto** e você paga cheio em 100% das chamadas.
- **Nos evals também:** `cache_control` no prompt faz a suíte inteira custar **centavos** (ver `comum/EVALS.md`).
- **`thinking: {type:'disabled'}`** em agente conversacional: sem isso o adaptive thinking liga sozinho e **come o `max_tokens` pensando** → resposta vazia, lead sem resposta, **sem erro nenhum**. (Cicatriz verificada — `comum/PEGADINHAS.md` §19.) Trate `stop_reason: 'max_tokens'` com retry.

### Onde o prompt mora (o trade-off que afeta custo e qualidade)

| Opção | Ganha | Paga |
|---|---|---|
| **Prompt em arquivo (`prompt.md`)** — o padrão | Versionado em git (diff, histórico, rollback) · **cacheado pela API (90% mais barato)** · testável por eval | Mudar exige deploy (20s) — **e isso é bom: força passar pelo eval** |
| **Prompt em banco/painel editável** | Cliente ajusta sozinho, sem te acionar | **Some o eval** — cuidado. Só faça com o exame como porteiro (abaixo) |

**A conciliação que usamos (cérebro editável com trava):** a Central edita o prompt sem deploy; a versão publicada vive num **override no Redis** que o agente lê ANTES do arquivo do bundle — e `POST /api/prompt {acao:'publicar'}` **roda os 10 evals no candidato e só publica se passar**. O `prompt.md` em git segue sendo o **padrão de fábrica** (botão "voltar ao de fábrica" apaga o override). Detalhe da peça em `comum/ARQUITETURA.md`.

---

## 6 · 🏅 A REGRA DE OURO DO PROMPT (descoberta pelo eval — custou venda)

> **ORDEM SAGRADA: responda a dúvida do lead COMPLETA — com o NOME da oferta e o VALOR — e SÓ DEPOIS pergunte algo. UMA pergunta por resposta.**

Perguntar o nome antes de responder o que ele perguntou = **robô burocrático = conversa morta**. Foi exatamente o que uma "melhoria" inocente causou: **a Porta de venda caiu de 10 → 2 no eval** (o agente passou a pedir o nome e **ignorar a pergunta do lead sobre a oferta**) — e isso iria pra produção **matando a venda em silêncio**.

---

## 7 · As outras regras de prompt que a produção validou

| Regra | Por que existe (evidência) |
|---|---|
| **Números exatos no prompt** (alunos, aulas, preços, tempo de casa) | "não tenho esse número" **mata autoridade** na hora |
| **Nomeie a oferta E o valor na 1ª resposta de interesse** | "temos um curso" = **venda perdida** (eval deu 4/10 nesse caso exato) |
| **Portas explícitas** (perfil do lead → oferta certa → caminho a seguir) | Convertem muito mais que prompt genérico — e impedem o agente de empurrar a oferta errada |
| **Regra de suporte: cliente/aluno com problema → escalar SEM pitch** | Vender pra quem pede ajuda **queima a marca** |
| **"É um bot?" → assumir com orgulho** ("sou a IA feita aqui — é o que a gente vende") | Transforma objeção em **prova de produto** |
| **O que é determinístico vira CÓDIGO, não instrução** | O modelo escorrega; o código não. A **decisão de responder em voz virou código exatamente por isso** — o marcador `[AUDIO]` no prompt fazia o modelo voicar até resposta a texto |
| **Canal (voz × texto) é decisão de código, e é BIDIRECIONAL** | O modelo **imita o padrão do histórico nos dois sentidos** — chega a responder texto em voz. Regra: turno de áudio → voz forçada; turno de texto → voz derrubada; exceção: lead pediu áudio **por escrito**. O prompt guia só o **conteúdo** (validado no canal uazapi, 12/07/2026) |
| **Voz é CURTA: ~500 chars / 2–3 frases** (ponto principal + gancho → puxa pra reunião) | ElevenLabs a 64kbps ≈ 8KB/s: ~800 chars batem no teto de 500KB e a resposta **cai pra texto silenciosamente**. Detalhe em `ghl/PEGADINHAS.md` |
| **Link JAMAIS em voz** | Ninguém clica em URL falada |
| **Mídia chega JÁ descrita, com marcadores** (`[áudio do lead]:` · `[imagem do lead]:` · `[documento do lead]:`) — avise isso no prompt e proíba "não consigo ver/ouvir" | Sem esse aviso o agente nega o que já está no contexto, na hora mais sensível |
| **O prompt de DESCRIÇÃO de mídia carrega o contexto do negócio** ("escritório previdenciário: que documento é? que dados aparecem?") | Sem isso o modelo descreve **"um papel branco"** em vez de **"RG de João, nº X"**. E mande admitir quando não dá: *"se ilegível/cortado, diga; NÃO invente"* |
| **Descreva a mídia UMA vez na ENTRADA e grave como TEXTO no histórico** | Histórico, followup, evals e Central seguem sendo texto puro — e **você não paga visão a cada turno** |
| **Prompt com dado inventado é BOMBA-RELÓGIO** | O agente **vende errado com confiança total**. Não sabe o preço/tom/regra? **PERGUNTE** (`comum/DIAGNOSTICO.md`) |

---

## 8 · A anatomia do cérebro (`prompt.md`) — 12 blocos

Ordem que a produção validou (detalhe de execução no `ghl/PLAYBOOK.md` / `kommo/PLAYBOOK.md`):

`identidade` · `números reais da empresa` · **`portas`** (perfil → oferta → caminho) · `tom/formato WhatsApp` · **`regra de ouro`** (responder antes de perguntar, uma pergunta por vez) · `uso das tools` · `funil/qualificação` · `agendamento` · `followup (cadências)` · `voz` · **`limites`** (o que NUNCA falar: prazo, garantia, desconto) · **`regra de suporte`** (escalar sem pitch).

> **Referência de estrutura:** `clientes/metriksales/agente-ia/prompt.md` — **pontuou 9,7/10 nos evals**. Copie a ESTRUTURA, nunca o conteúdo (o conteúdo é do cliente e sai do diagnóstico).

---

## 9 · 🧪 Evals — resumo (detalhe completo + harness: `comum/EVALS.md`)

`scripts/evals.mjs` roda cenários contra o **prompt EM PRODUÇÃO** (baixa de `/api/config`), um **juiz Claude** dá nota 0–10 por critério objetivo e **`exit 1` se algum reprovar** (< 7):

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/evals.mjs
```

**Cenários padrão** (adapte ao cliente): uma por porta/oferta · prova social (números exatos) · **suporte (NÃO vender!)** · anti-alucinação de preço · objeção clássica · "é bot?" · prompt injection · fora de escopo.

**Como escrever um bom cenário:** critérios **verificáveis**, não gosto. Ruim: "responde bem". Bom: "cita R$179", "NÃO oferece call (comunidade fecha no chat)", "chama `escalar_para_humano`". E **dê ao juiz a oferta oficial no system** — senão ele acusa de alucinação o que está no prompt (falso positivo real que tivemos: o juiz reclamou dos R$179 **corretos**).

### 🎓 Por que evals valem mais que qualquer otimização (a estreia, 12/07/2026 — Bia/Metrik)

Teste manual de 5 cenários deu "tudo ótimo". O harness rodou e:

1. **Porta 2 = 4/10** — a agente dizia "nosso curso" **sem nomear a oferta nem citar o preço** → **venda perdida em silêncio**
2. **Porta 1 = 6/10** — perguntava o nome e qualificava na mesma mensagem (atropelo)
3. Ao corrigir o item 2, o eval pegou uma **REGRESSÃO**: a **Porta 3 despencou 10 → 2** (passou a pedir nome e ignorar a pergunta do lead sobre a oferta). **Iria pra produção matando a venda de GHL sem ninguém perceber.**

**Resultado: 8,2 → 9,7/10 · 10/10 aprovados · 3 iterações de 10 minutos.** Dessa dor nasceu a **regra de ouro** do §6.

### O eval como PORTEIRO (prova medida)

No cérebro editável da Central, publicar só destrava com o exame aprovado. Validado com um **prompt sabotado** (inventava preço, pedia nome antes, vendia pra quem pedia suporte): **bloqueado com 5,7/10 e apenas 4/10 cenários aprovados — produção intacta.**

### As leis que caem sobre este arquivo

- **LEI: evals antes de deploy de prompt — 10/10 ou NÃO SOBE.** Já pegou regressão que mataria a venda em silêncio.
- **NADA VAI PRO AR SEM PROVA:** evals 10/10 antes de deploy de prompt · teste E2E com número real antes do cliente · rampagem por tag antes de escalar.
- **Ritual de mudar prompt:** entender o objetivo → mudar → `node scripts/evals.mjs` → **10/10 sobe**. Reprovou? **o eval te ENSINA o que quebrou** (inclusive a regressão que você não imaginava).
- **Toda sugestão do analista semanal (`lib/analyst.ts`) passa pelo eval antes do ar** — sugestão nunca é aplicada automaticamente.
- Antes do "feel" manual existe o sandbox: **"Testar ao vivo"** no `/cerebro` roda o prompt candidato com **tools SIMULADAS** (dry-run, não tocam o CRM) — `comum/PLAYGROUND.md`. Fluxo completo: editar → testar (feel) → **evals (exame)** → publicar.

---

## 10 · O que muda por CRM (a doutrina é a mesma; o entorno não)

| Tema | GHL | Kommo |
|---|---|---|
| **Quem guarda o histórico** (o contexto que entra na chamada) | O CRM é a fonte da verdade — agente stateless. Exige **filtrar `messageType`** (nota interna vaza!) e **hidratar mídia** | **Redis nosso** (`ak:conv:{leadId}`) — o Kommo não devolve transcript. Mais controle e o analista lê direto de lá |
| **Formato da resposta (afeta como você escreve o prompt)** | Multi-mensagem no canal | **Desenho A (Salesbot) = 1 mensagem por resposta** (as partes viram parágrafos) → prompt escreve **parágrafo**, não rajada. **Desenho B (uazapi)** = multi-msg e voz |
| **Harness de evals** | `/api/config` | `/api/config` **idem** — o mesmo `scripts/evals.mjs` funciona sem adaptação |
| **Limiares, custos, caching, Haiku × Sonnet, regra de ouro** | ✅ igual | ✅ igual |

> Resumo operacional que vale nos dois (era o §"portar do GHL" da skill Kommo, agora é **comum**): conversa completa ~**R$0,16** · prompt direto + `cache_control` até **~10k tokens** · **RAG só acima de ~25k** OU catálogo dinâmico OU **>150 FAQs** OU latência >12s · dado que muda toda hora = **TOOL** · **Haiku** pra mecânico, **Sonnet** pra conversa · **evals obrigatórios** · **regra de ouro** do §6.

---

## 11 · A doutrina vale pra MIM também (carga seletiva de contexto)

**Carregue só o arquivo que a tarefa pede.** Ler a biblioteca inteira de uma vez é **o mesmo erro** de enfiar 40k tokens de FAQ no prompt: mais contexto ≠ melhor resposta. O roteador da `SKILL.md` existe exatamente pra isso — pergunta o CRM primeiro, carrega `comum/` + a pasta do CRM certo, e só o arquivo da vez.

---

## 12 · Quando você medir um número novo (manutenção deste arquivo)

1. **Escreva aqui na hora**, com **evidência e data** (`validado 20/07: X aconteceu porque Y`). Número sem data envelhece e vira lenda.
2. **Registre no Códex** — limiar, custo medido, lei ou doutrina vão em `produtos/agente-ia/doutrina.ts`; a cicatriz que gerou o número vai em `produtos/agente-ia/cicatrizes.ts` (ver ritual das 3 pernas na `SKILL.md`).
3. **Re-meça periodicamente:** o modelo muda, o preço da API muda, o mundo muda. Rode os evals **mensalmente mesmo sem mexer no prompt** — é o mesmo princípio: troque achismo por número.
