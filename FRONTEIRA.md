# FRONTEIRA — o que construir depois (dossiê de evolução do agente)

> **O que é este documento.** Não é lista de ideias. É o resultado de uma caça: propostas de evolução do agente foram varridas em 8 frentes do estado da arte mundial (harness patterns, evals, memória, tool calling, simulação, estatística de portão, operação e produto), passadas por um **júri de 3 lentes** — negócio, engenharia e ineditismo — e depois **conferidas contra a documentação oficial da Claude API** e contra a nossa própria biblioteca (`comum/ARQUITETURA.md`, `comum/PEGADINHAS.md`, `comum/EVALS.md`, `comum/CONTEXT-ENG.md`, `comum/PLAYGROUND.md`).
>
> **Regra de admissão:** move reunião marcada, churn ou risco caro · cabe no stack (serverless + Upstash + Claude API) ou justifica muito bem a mudança · tem prova citável · **não é o que já existe**.
>
> **Honestidade sobre o material:** a lente de NEGÓCIO votou nas 8 propostas; a de ENGENHARIA votou em 3 antes do material ser cortado; a de INEDITISMO não chegou. Onde o veredito veio de uma lente só, está marcado. Onde eu conferi na doc oficial, está marcado. Onde é herança de proposta não verificada, também.

**Legenda de prova:**

| Marca | Significado |
|---|---|
| ✅ | **Verificado nesta sessão** contra a doc oficial da Claude API (skill `claude-api`) |
| 📄 | Citação trazida pela pesquisa — plausível, **confira antes de gastar o dia** |
| 🩸 | Cicatriz nossa, com data — a prova mais forte que existe aqui |

**Legenda de esforço:** o número é *build*. A coluna `+N` é a **4ª perna** (`SKILL.md §7`): componente compartilhado só está pronto quando todo cliente no ar foi redeployado. Multiplique por ~30min × clientes ativos + evals + E2E.

---

## §1 · O PÓDIO — as 6 que passaram

Ordenadas por **impacto ÷ esforço**. As duas primeiras defendem receita já contratada; as três seguintes consertam o portão que hoje decide deploy no sorteio; a última é a única que mexe no loop que ganha dinheiro.

| # | Proposta | Esforço | +N | O que ela impede/destrava |
|---|---|---|---|---|
| 1 | Parada de emergência + recado do dia | **horas** | +30min | Hoje não existe botão de pânico por cliente |
| 2 | Contrato default-FAIL + `slot_token` HMAC | **2-3 dias** | +1h | Card "Qualificado" vazio · horário inventado |
| 3 | Canário diário de drift + `pass^k` | **meio dia** | +30min | Modelo degrada e o cliente descobre antes de você |
| 4 | Rubrica binária ponderada com prova literal | **meio dia** | +30min | Nota 0-10 inventada decide deploy |
| 5 | Carimbo de versão + taxa REAL de agendamento | **1 dia** | +30min | Nenhuma métrica hoje é a que o cliente paga |
| 6 | Ficha de conversa (escopada) | **1 semana + 1 de observação** | +1h | Pegadinha §4 (voz vira alucinação) · briefing do closer |

---

### 🥇 1. PARADA DE EMERGÊNCIA + RECADO DO DIA (os dois controles de operador que faltam)

**O que é.** Duas chaves no Redis, lidas no topo do `api/inbound.ts`, antes de qualquer coisa:

- **`agente-<slug>:pausa`** — se existe, o agente responde 200 e **não faz nada**. Nem buffer, nem Claude, nem tool. Botão vermelho na Central: *"PAUSAR IA AGORA"*, com motivo e quem pausou, e um banner permanente enquanto estiver ligado.
- **`agente-<slug>:recado`** — um texto curto, com validade, que entra no **bloco dinâmico** do system. *"Closer de férias até dia 10 — não ofereça horário nesta semana"*, *"promoção de julho acabou, não cite os R$179 promocionais"*.

**Por que move o negócio.** Hoje, para desligar o agente de um cliente, o caminho é: tirar a tag de cada lead (inviável), desativar o workflow no GHL (o cliente não faz, e você precisa estar acordado) ou redeployar. **Isso é um incidente de 20 minutos que devia ser de 2 segundos** — e incidente longo em cliente novo é a coisa que mais barato mata contrato. O recado ataca outro custo escondido: hoje, para o agente parar de ofertar sexta-feira, você **edita o prompt, roda 10 evals e publica**. Um recado de operação não devia passar pelo mesmo ritual de uma mudança de cérebro.

**Como implementar (na stack de hoje).**

```ts
// api/inbound.ts — PRIMEIRA coisa depois do 200
const pausa = await redis.get(`agente-${SLUG}:pausa`)
if (pausa) { await logDiario('pausado', { motivo: pausa }); return }   // 200 já foi

// lib/claude.ts — buildSystem(), bloco DINÂMICO (nunca no cacheado)
const recado = await redis.get(`agente-${SLUG}:recado`)   // TTL definido na Central
if (recado) dinamico.push(`# RECADO DA OPERAÇÃO (vale hoje)\n${recado}`)
```

- ⚠️ **Onde colocar o recado é a parte que erra.** Bloco dinâmico, **nunca** no bloco com `cache_control` — senão cada recado invalida o cache do prompt inteiro (`comum/PEGADINHAS.md` §30). ✅
- ✅ **Existe algo melhor, mas ainda não pra nós:** a Claude API tem `{"role": "system"}` **dentro do array `messages`** — o canal de operador à prova de prompt injection, que preserva o prefixo cacheado. **É exclusivo do Opus 4.8** e o agente roda Sonnet. O fallback documentado para os demais modelos é exatamente o que descrevi acima (bloco de texto marcado no turno). Registre isso: quando/se o agente migrar de modelo, o recado tem um lar melhor.
- A Central expõe as duas chaves; o guardião diário **alerta no grupo se um cliente está pausado há mais de 24h** (senão a pausa vira esquecimento e o cliente jura que a IA não funciona).

**Prova.**
- ✅ Doc oficial (`shared/prompt-caching.md` § Mid-conversation system messages): *"Editing the system prompt mid-session invalidates the cache… a `role: "system"` message sits after the history and leaves the cached prefix intact"* — e a nota de que é o substituto **não-falsificável** do padrão `<system-reminder>` embutido no turno do usuário. Disponível **apenas no Claude Opus 4.8**, sem beta header.
- 📄 Repo `anthropics/cwc-long-running-agents` (Code with Claude 2026): `kill-switch.sh` (arquivo `AGENT_STOP` mata todas as tool calls) e `steer.sh` (`STEER.md` injeta correção no meio do run) — os dois controles de operador que o harness deles tem e o nosso não.

**Risco.** Pausa esquecida = cliente sem atendimento sem ninguém notar (é a cicatriz #1 da casa: loga sucesso, não entrega). O alerta de 24h no guardião **não é opcional**. Recado é texto livre que entra no cérebro sem passar pelo eval — limite tamanho (~300 chars), coloque TTL obrigatório e **grave todo recado no diário**, para que o analista semanal explique um comportamento estranho de terça-feira.

---

### 🥈 2. CONTRATO DEFAULT-FAIL + GATE DE EVIDÊNCIA NAS TOOLS (com `slot_token` HMAC)

> **Nota 9 na lente de negócio. Nota 9 na lente de engenharia.** Foi a única proposta que as duas puseram em primeiro lugar.

**O que é.** Os guards de hoje (`comum/ARQUITETURA.md` §7) governam **permissão**: whitelist de etapa, só-avança, fail-closed. Falta a trava que governa **prova**: cada etapa/campo que o agente pode marcar declara o que precisa **existir** para ser marcado, e tudo começa em `false`.

- `mover_etapa(Qualificado)` só passa se os campos de qualificação foram coletados **nesta conversa**.
- `agendar_reuniao` só aceita um slot que veio de um `consultar_horarios_livres` **real**, dos últimos 10 minutos, carimbado com **HMAC**. O modelo fica **fisicamente incapaz** de inventar horário.
- Quando bloqueia, devolve `tool_result` com **`is_error: true`** e a lista do que falta (`"faltam: orçamento, prazo"`) — o modelo lê e faz a pergunta certa, em vez de travar.

**Por que move o negócio.** Os dois eventos que cancelam contrato: (a) card marcado "Qualificado" vazio → o comercial perde a fé, desliga a IA, cancela em 30 dias; (b) reunião marcada em horário inexistente → queima o lead **e** o closer no mesmo movimento. Isso tira a alçada do campo das boas intenções do prompt e coloca no código — que é a doutrina que já pregamos (*"o que é determinístico vira código, não instrução"*), só que aplicada à **PROVA**, não só à permissão.

**Como implementar (na stack de hoje).**

```ts
// lib/contract.ts
export const CONTRATO = {
  Qualificado: { requires: ['orcamento', 'prazo', 'dor'], escopo: 'esta_conversa' },
  Agendado:    { requires: ['slot_token_valido'] },
} as const

// lib/tools.ts — no TOPO do runTool, uma função, não um framework de hooks
const falta = checkPreconditions(tool, input, estado)
if (falta.length) return { is_error: true, content: `Ainda falta saber: ${falta.join(', ')}` }
```

```ts
// slot_token: crypto do Node, WEBHOOK_SECRET que já existe, stateless (nem Redis precisa)
const sign = (iso: string, contactId: string, exp: number) =>
  createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(`${iso}|${contactId}|${exp}`).digest('base64url')
// consultar_horarios_livres devolve { iso, slot_token }
// agendar_reuniao exige slot_token — NÃO aceita string de data
```

**A armadilha que a lente de engenharia flagrou e que ninguém mais viu:**

> **Cada bloqueio QUEIMA UM STEP do `MAX_STEPS ≤ 6`.** Duas tentativas bloqueadas + o retry de `max_tokens` esgotam o loop e produzem exatamente *"resposta vazia → lead sem resposta, sem erro nenhum"* (`comum/PEGADINHAS.md` §19). O teto de 2 bloqueios **tem que descontar do orçamento de steps e forçar saída em texto** — não pode ser um contador solto.

**Não construa o registro de hooks.** A proposta original pedia um ciclo de vida `preToolUse`/`postToolUse`. Para ~10 tools com **um** call site, isso contradiz frontalmente a decisão #2 da `ARQUITETURA.md` (*"Claude API direto, ~80 linhas transparentes, sem framework"*). Uma função `checkPreconditions()` entrega 100% do valor com 10% da abstração. **O que vale do lado dos hooks é o log**: passe a registrar no diário **o que o agente TENTOU fazer e foi impedido** — hoje isso é cego, e é exatamente o insumo que faz o analista semanal virar consultoria.

**Prova.**
- ✅ Doc oficial de tool use: retornar `tool_result` com **`is_error: true`** e uma mensagem informativa faz o Claude *"acknowledge the error and either try a different approach or ask for clarification"* — é o caminho documentado para guard que **ensina** em vez de travar.
- ✅ `shared/agent-design.md`: a razão nº1 para promover uma ação a tool dedicada é a **checagem de estado** — *"a dedicated edit tool can reject writes if the file changed since Claude last read it. Bash can't enforce that invariant."* É o mesmo argumento do `slot_token`.
- 📄 Repo `anthropics/cwc-long-running-agents`: o **Default-FAIL Contract** — todo critério nasce `false`; o agente precisa abrir a evidência antes de marcar como passando; imposto por callbacks `PreToolUse`. Existe declaradamente para *"impedir que agentes aleguem sucesso falsamente sem prova observável"*.
- 🩸 Nosso: `ARQUITETURA.md` §7 já diz *"slot de agenda vindo de consulta real"*. **Não venda isso como novo** — venda como o token que fecha o buraco que a instrução deixava aberto.

**Risco.** Gate rígido demais gera loop e conversa robótica. Mensagem de erro em linguagem de negócio, teto de 2 bloqueios **descontando steps**, e um eval do caminho bloqueado (*"lead pede pra marcar sem ter dito nada — o agente NÃO pode chamar `agendar_reuniao`"*). O token precisa de relógio confiável na TZ do cliente — mesma armadilha da janela comercial (`comum/PEGADINHAS.md` §25).

---

### 🥉 3. CANÁRIO DIÁRIO DE DRIFT + PORTÃO `pass^k` (k=5)

**O que é.** Duas coisas pequenas no cron que já existe:

- **Canário:** 3 cenários **bloqueantes** (alucina preço · vende pra quem pede suporte · cai em prompt injection) rodados todo dia contra o prompt **VIGENTE** de cada cliente. Reprovou → alerta no grupo, na hora, com o transcript.
- **`pass^k`:** o portão de publicar roda cada cenário **5 vezes** e exige aprovação nas 5. Hoje o portão decide deploy com n=10, K=1 — ou seja, **no sorteio**.

**Por que move o negócio.** Você tem ~10 clientes rodando num modelo que a Anthropic atualiza sem avisar. Hoje, a única forma de descobrir que o cérebro degradou é o cliente reclamar. **Um canário de 3 cenários é seguro contra incêndio simultâneo em toda a carteira por poucos reais por mês** — e automatiza a regra *"rode mensalmente mesmo sem mexer"* (`comum/EVALS.md` §2, item 5) que todo mundo prega e ninguém cumpre. O `pass^k` mata o falso verde: um prompt que passa 1 vez em 2 hoje sobe.

**Como implementar.**

```js
// scripts/evals.mjs — é um for e um Math.min
const K = Number(process.env.EVAL_K || 5)
const notas = []
for (let i = 0; i < K; i++) notas.push(await rodarCenario(c))
const passou = notas.every(n => n.aprovado)     // pass^k, não média
```

⚠️ **NÃO pendure o canário no `api/cron-daily.ts`.** O dispatcher já carrega followup → guardião → (seg) analista → (sex) auditora, e tem teto de **300s**. Quando estoura, **não dá erro vermelho: o rabo do dispatcher simplesmente não roda** — o vigia morre em silêncio, que é a cicatriz #1 da casa reencarnada dentro do próprio vigia. Endpoint próprio (`/api/canario`) + tique **QStash** — mesma conta do Redis, padrão já validado no Manoel (`comum/PEGADINHAS.md` §17).

**Dois brindes técnicos que eu verifiquei e que a suíte de hoje está perdendo:**

- ✅ **Fan-out paralelo de eval paga cache cheio.** *"A cache entry becomes readable only after the first response begins streaming. N parallel requests with identical prefixes all pay full price."* Se o harness dispara os 10 cenários em paralelo (mesmo prompt cacheado), você paga **10 escritas de cache** em vez de 1 escrita + 9 leituras. **Cura:** dispare 1, espere o primeiro token, dispare os outros 9. Uma hora de trabalho, corta o custo da suíte em ~1 ordem de grandeza — e o `pass^k` multiplica esse desperdício por 5 se não for consertado antes.
- ✅ **Mínimo de prefixo cacheável muda por modelo:** Opus 4.8/4.7/4.6/4.5 e **Haiku 4.5 = 4096 tokens**; Fable 5 / Sonnet 4.6 = 2048; Sonnet 4.5 e anteriores = 1024. Abaixo do mínimo **não cacheia e não dá erro** — `cache_creation_input_tokens: 0` em silêncio. Relevante para qualquer cérebro auxiliar barato que a gente monte em Haiku (ver #6): um prompt de 3k tokens **não cacheia** em Haiku 4.5.

**Prova.**
- ✅ Doc oficial (`shared/prompt-caching.md`): timing de requisições concorrentes e a tabela de mínimo por modelo, ambos acima.
- 🩸 Nosso, e é a prova que importa: a **Porta 3 caiu de 10 → 2** numa "melhoria" inocente (`comum/EVALS.md` §6). Aquilo foi pego por sorte de uma rodada única. Com `pass^k` teria sido pego 5 vezes.
- 📄 τ-bench e a literatura de `pass^k`. **Não venda isso como prova direta** — aquilo mede agente multi-passo complexo, não resposta de SDR.

**Risco.** Custo ×5 na suíte de publicar (mitigado pelo fan-out acima). Canário barulhento vira alerta que ninguém lê: só cenários **bloqueantes** entram, nunca "qualidade de tom".

---

### 4. MATAR A NOTA 0-10: RUBRICA BINÁRIA PONDERADA COM PROVA LITERAL

**O que é.** Hoje o juiz **inventa** um número de 0 a 10 e `<7` reprova. Troque por: o juiz responde **SIM/NÃO por critério** e **cita o trecho literal** que prova; a **nota é calculada em JS** (soma dos pesos atendidos ÷ total). Critérios marcados `bloqueante` (alucinar preço, vender pra quem pede suporte, cair em injection) reprovam sozinhos, independente da nota.

**Por que move o negócio.** Nota contínua de LLM tem viés de verbosidade (resposta longa ganha nota), viés de auto-preferência (Claude julgando Claude) e escala instável entre rodadas. Consequência cara e concreta: **prompt ruim passa com um 8 falso e vai pro ar; prompt bom é barrado com um 6 falso e o cliente fica esperando.** Com rubrica binária, cada reprovação aponta o critério exato **e a prova textual** — o eval deixa de dizer "6,5" e passa a dizer *"não citou o valor (peso 3). Trecho: 'temos um curso ótimo, quer saber mais?'"*.

**Como implementar.**

```js
// O juiz devolve SÓ isto — o campo "nota" some do prompt dele
{ criterios: [ { id: 'cita_valor', atendido: false, prova: '<trecho literal>' } ] }
// A nota vira aritmética, em JS:
const nota = soma(pesos.filter(atendido)) / soma(pesos)
const reprovou = criterios.some(c => c.bloqueante && !c.atendido) || nota < LIMIAR
```

- ✅ Use **structured outputs** para a saída do juiz nunca vir malformada: `output_config: { format: { type: 'json_schema', schema } }`. É **GA, sem beta header**. O parâmetro antigo `output_format` está deprecado — não use. Suportado em Opus 4.8, Sonnet 5, Haiku 4.5 e Fable 5.
- Peso e flag bloqueante ficam **no arquivo do cenário**, não no código do juiz.
- ✅ Reaproveite 100% do que já existe — inclusive a regra de ouro: **a oferta oficial vai no system do juiz** (`comum/EVALS.md` §3), senão ele acusa de alucinação o que está no prompt. Só muda o formato da saída e quem faz a conta.
- Marginal: rode o juiz com `output_config: { effort: 'low' }` — julgar critério binário com citação não precisa de raciocínio profundo.

**Prova.**
- ✅ Doc oficial: structured outputs via `output_config.format`, GA; limitações do schema (sem recursivo, sem `minimum`/`maxLength`, `additionalProperties: false` obrigatório); primeira requisição com schema novo paga compilação, depois cacheia 24h.
- 📄 HealthBench (OpenAI, mai/2025): 5.000 conversas, 262 médicos, 48.562 critérios de rubrica **únicos, cada um com peso**; o grader responde **binário por critério** e a nota é soma ponderada. É o desenho de referência para rubrica de domínio.
- 📄 Anthropic, *Harness design for long-running application development*: *"agentes consistentemente superestimam o próprio output; separar avaliação de geração é muito mais efetivo do que pedir ao agente que se auto-avalie"*.

**Risco.** Rubrica é versionada **junto do prompt** — senão você compara notas de réguas diferentes entre versões. Guarde `rubrica_versao` no `evals-resultado.json`.

> **A outra metade da proposta original está no cemitério** (calibração TPR/TNR + correção de viés theta + IC por bootstrap). Ver §4.

---

### 5. CARIMBO DE VERSÃO + TAXA REAL DE AGENDAMENTO (a proposta que faltou no comitê)

> **Nenhuma das 8 propostas mede o único número que o cliente paga.** Todas otimizam proxy: nota de juiz, desfecho simulado, conformidade de contrato. Isso é o buraco do lote inteiro, e a lente de negócio disse que essa peça sozinha **vale mais, comercialmente, que as oito juntas**.

**O que é.** Carimbar `prompt_versao` (e `sistema_versao` do `lib/manifest.ts`) em **toda conversa** no diário do Redis, e ler no CRM a taxa **real** de agendamento por versão. Uma linha na Central:

> *v7 · 340 leads atendidos · **23% viraram reunião** · v5 · 512 leads · 18%*

**Por que move o negócio.** É o slide que segura renovação, e é o único número que sobrevive à pergunta *"tá, mas a IA vendeu?"*. Também é o que transforma o cérebro editável de brinquedo em instrumento: hoje o cliente edita o prompt e o único feedback é uma nota de juiz. Com isso, ele edita, espera 2 semanas e **vê a conversão da versão dele**.

**Como implementar.** É quase de graça porque as três pontas já existem:

1. `lib/prompt-store.ts` já versiona o prompt (histórico de 20 versões). Exponha `versaoAtual()`.
2. `api/inbound.ts` já grava no diário → adicione `{ prompt_versao, sistema_versao, contactId }`.
3. `lib/auditor.ts` já lê o funil completo do CRM → cruze `contactId → chegou em Agendado?` com o carimbo do Redis. **Só conte leads cuja PRIMEIRA conversa aconteceu sob aquela versão** (senão você atribui a v7 uma reunião que a v5 preparou).
4. Aba nova na Central: conversão por versão, com **n** e data de corte visíveis.

**Prova.** 🩸 Doutrina da casa, `comum/CONTEXT-ENG.md`: *"otimizar token antes de otimizar conversão é economizar gasolina do carro-forte."* Este item é a única coisa no dossiê que mede a **conversão**. Todo o resto mede a gasolina.

**Risco — e é sério.** Amostra pequena engana com confiança total. **Nunca mostre a taxa com n < 100 leads na versão**; abaixo disso mostre `n` e a palavra "parcial". Segundo risco: versão trocada no meio de uma safra de tráfego pago com origem diferente = comparação envenenada. Cruze com a origem que o `lib/tracker.ts` já grava, e prefira janelas de tempo iguais.

---

### 6. FICHA DE CONVERSA — ESCOPADA (fecha a §4 e o briefing do closer)

**O que é.** Um estado explícito por lead, fora do contexto, com schema fechado: o que já foi descoberto, o que FALTA descobrir, objeções levantadas, perguntas já feitas (proibido repetir), **o texto do que o agente respondeu por ÁUDIO**, e a próxima pergunta. Entra no bloco **dinâmico** do system.

**Escopo aprovado — construa nesta ordem e PARE quando (a) e (b) estiverem no ar:**

- **(a) Fecha a pegadinha §4.** Hoje a nota de voz enviada pela uazapi volta do CRM como **outbound vazio**; o remendo é um marcador `[Agente respondeu por áudio aqui]`, que é **oco** — o modelo lê um histórico onde ele nunca disse nada de concreto e alucina *"aguardando você escolher o horário"*. A própria `comum/PEGADINHAS.md` §4 já lista *"gravar o texto da fala e reinjetar"* como o fix pendente. **Construir isso é fechar uma cicatriz aberta, não inventar necessidade.** 🩸
- **(b) Briefing do closer SEMPRE atual**, não gerado no fim. Time comercial que recebe card pronto é exatamente o time que **não desliga a IA** — e time que desliga a IA cancela em 30 dias.
- (c) Não repetir pergunta. Bom, mas é o terceiro.

**Corte do pitch de custo.** A proposta original vendia economia de tokens. **O número não fecha:** você ADICIONA uma chamada por turno E tokens de ficha **não cacheados** (bloco dinâmico paga 1×). Numa conversa de 6-12 turnos — a mediana de SDR no WhatsApp — o histórico ainda é curto e você só somou custo. O ganho real só aparece acima do limiar. **Venda como memória e anti-alucinação, nunca como economia.**

**Como implementar.**

```ts
// lib/ficha.ts — roda no waitUntil, FORA do caminho de resposta (latência zero pro lead)
const ficha = await atualizarFicha(fichaAnterior, turno)   // 1 chamada Haiku 4.5, barata
```

- ✅ **Schema fechado com structured outputs** (`output_config.format`, GA) — a ficha nunca vem malformada. Nunca deixe o modelo reescrever a ficha inteira: aplique **deltas por campo**.
- ✅ **`claude-haiku-4-5`** ($1/$5 por MTok) para o atualizador. ⚠️ **Mínimo cacheável do Haiku 4.5 é 4096 tokens** — se o prompt do atualizador for menor, ele **não cacheia e não avisa**. Ou você engorda o prompt até o mínimo, ou aceita pagar cheio (é barato de qualquer jeito) — mas **não fique achando que cacheou**.
- **Bloco dinâmico, sempre** (`comum/PEGADINHAS.md` §30) — no bloco cacheado, a ficha invalida o cache a cada turno.
- **As 8 mensagens cruas SEMPRE acompanham a ficha.** Ancoragem: ficha errada com histórico junto é recuperável; ficha errada sozinha vira verdade permanente.
- Espelhe no custom field do CRM (o time vê).

**Os dois furos obrigatórios (a lente de engenharia):**

1. **Fail-open, sempre.** Ficha ausente ou corrompida → manda o **histórico completo**. Nunca uma ficha meio-vazia, nunca travar.
2. **Falha silenciosa clássica.** A escrita roda no `waitUntil`, **depois** da resposta. Se falhar, ninguém vê: a ficha congela e o modelo raciocina sobre estado velho com confiança total — **pior que não ter ficha**. Obrigatório: contador de turno **dentro** da ficha + alerta no guardião quando `ficha.turno` ficar pra trás do turno real da conversa. Sem isso é a cicatriz #1 de novo.
3. **Schema versionado (`v: 1`)** — a primeira mudança de campo vai encontrar fichas antigas no Redis.

**Prova.**
- 📄 Anthropic, *Effective context engineering for AI agents*: padrão **structured note-taking** (o Claude jogando Pokémon manteve memória própria em arquivo por horas).
- 📄 Anthropic, *Effective harnesses for long-running agents*: *"o agente é amnésico, o filesystem não é"* — initializer + arquivo de progresso lido no começo e atualizado no fim.
- 📄 Anthropic, *Harness design*: context **RESET** com handoff estruturado foi necessário porque *"compaction sozinha não bastava"*.
- ✅ Doc oficial: `output_config.format` GA; ✅ preço e mínimo de cache do Haiku 4.5.
- 🩸 A pegadinha §4 é nossa, com data (DAC, 13/07).

**Esforço honesto.** "Dias" é otimista. Schema + updater + limiar + bloco dinâmico + fallback + espelho no CRM + cenário de eval + propagação = **1 semana, mais uma semana de observação em produção antes de confiar**. É a **única proposta do pódio que mexe no loop que ganha dinheiro** — trate com o respeito correspondente.

---

## §2 · A SEGUNDA ONDA — boas, mas dependem de algo antes

| Proposta | Depende de | Esforço | Por que esperar |
|---|---|---|---|
| Simulador adversarial de leads (6-8 personas) | **#6 ficha** + **#4 rubrica** | ~1 semana | Sem ficha, o agente não sustenta 12 turnos e você mede o defeito errado; sem rubrica binária, o "desfecho" é outra nota inventada |
| Replay das conversas reais (N=50, Batch API) | Máquina de estado assíncrona (QStash poller) + anonimização LGPD | 1–1,5 semana | Batch é assíncrono e serverless não espera |
| Juiz noturno + auto-alimentação da suíte | Endpoint próprio + QStash (o `cron-daily` está lotado) + política de aposentadoria de cenário | dias | Suíte que só cresce é dívida |
| Playbook de operação como BLOCO do prompt | Analista semanal ter o que dizer | meio dia | É o 20% aproveitável da memory tool, sem a memory tool |
| Programmatic tool calling no cérebro analítico | **Rate-limiter no executor de tools** + um cliente que pague auditoria como entregável | dias | Sem rate-limiter, rajada analítica tira resposta do lead ao vivo |

### 2.1 · Simulador adversarial (self-play) — aprovado com teto

**O diagnóstico está certo e é o mais desconfortável do lote:** os 10 cenários testam o **turno 1**, e a venda morre no turno 6, na objeção, no lead que volta frio. E *"testamos seu agente contra 25 tipos de lead antes de ligar"* fecha contrato.

**O teto que o júri impôs:**
- **6-8 personas extraídas de transcript REAL** (do diário), não 25 inventadas. Persona inventada vira folclore em um trimestre.
- Reaproveita o **`simulateTool` do playground que já existe** (`comum/PLAYGROUND.md`) — raio zero no CRM, é a fundação e já está construída.
- ✅ **Rode em Batch API** (50% de desconto, até 100.000 requests ou 256MB por batch, maioria termina em <1h, teto 24h, resultados guardados 29 dias). ⚠️ **Resultados voltam em qualquer ordem — chaveie por `custom_id`, nunca por posição.**
- ⚠️ **Taxa de agendamento SIMULADA é métrica sedutora e perigosa.** Use só como **comparador relativo** entre versões de prompt. Se você escolher prompt por *"62% vs 48%"* contra um lead interpretado por Haiku, vai otimizar para agradar um robô educado — não para o brasileiro que responde "quanto é?" e some. **Nunca mostre ao cliente como previsão.**

📄 Prova: Coval (fundada por gente da Waymo) — *"em vez de descobrir falhas em ligações reais, você roda milhares de conversas simuladas realistas contra o seu agente antes do lançamento"*, com personas de modo-de-falha configuráveis. Hamming AI: *"1.000+ simulações concorrentes e replay de ligações de produção"*.

### 2.2 · Replay das conversas reais — **só a versão consertada**

A peça boa: é a única coisa aqui que teria pego a regressão da Porta 3 (10→2) com **dado real** em vez de sorte, e *"em 50 conversas reais, 2 mudaram pra pior — aqui estão"* é argumento de reunião de renovação.

**Mas o método proposto tem um furo, não só esforço:** re-rodar os turnos 4-15 de uma conversa que divergiu no turno 3 é comparar contra um histórico que **nunca existiria**. Só o **primeiro turno divergente** carrega informação; o resto é ruído bonito que você vai perseguir por semanas.

**A versão que vale:** N=50, **diff só do primeiro turno divergente por conversa**, telefone e nome anonimizados antes de virar cenário, TTL de 90d respeitado. Se você quiser medir conversa inteira, isso é o **simulador (2.1)**, não replay.

⚠️ Custo de engenharia subestimado: Batch é assíncrono → submit → guardar `batch_id` no Redis → poller QStash → retrieve → diff → persistir, com retry e reconciliação de batch órfão. É uma máquina de estado, o problema clássico de job assíncrono em serverless.

### 2.3 · Juiz noturno + auto-alimentação (com portão humano)

Rodar o juiz sobre **transcripts reais do diário** (não cenários sintéticos) e transformar toda conversa <7 em cenário novo, com botão **aceitar/rejeitar** na Central. É a receita do `lib/evals.ts` que já existe, apontada para outro lado.

Duas travas antes de construir: **(1)** endpoint próprio + QStash, nunca no `cron-daily` (teto 300s, e o rabo morre calado); **(2) política de aposentadoria de cenário** — 10 cenários custam centavos, 200 auto-gerados × k=5 fazem cada deploy custar minutos e dinheiro, e **um critério auto-gerado mal escrito trava o portão pra sempre**. Amostra estratificada, Haiku no pré-filtro, Sonnet só no que parece ruim.

### 2.4 · Playbook de operação (o 20% aproveitável da memory tool)

A história comercial é forte — *"um vendedor que aprende com o time"* sustenta mensalidade em vez de setup. **Mas o mecanismo já existe:** é o prompt editável ao vivo com o eval de porteiro (`comum/ARQUITETURA.md` §10).

Faça o playbook como um **BLOCO de markdown dentro do prompt** — a frase que virou o "tá caro", o argumento que fechou com dentista, o que comprovadamente NÃO funciona — escrito pelo analista semanal, publicado **pelo mesmo portão de eval**. Meio dia de trabalho, zero superfície nova, zero risco de memória envenenada virando verdade eterna.

### 2.5 · Programmatic tool calling no cérebro analítico

✅ **Verifiquei e a receita está exata:** declare `{"type": "code_execution_20260120", "name": "code_execution"}` **sem beta header** (é GA no Messages API) e ponha `"allowed_callers": ["code_execution_20260120"]` nas tools de **LEITURA**. Requer Opus 4.5+ / Sonnet 4.5+. ⚠️ **Incompatível com `strict: true`, `disable_parallel_tool_use`, `tool_choice` forçado e tools MCP** — não misture. Ao responder uma chamada programática pendente, a mensagem `user` deve conter **apenas** blocos `tool_result`, sem texto.

**Por que ainda assim é segunda onda:**
- 📄 Os 37% de economia de token são num **cron semanal** — centavos. Não cite isso como benefício de negócio; enfraquece a proposta.
- **Raio compartilhado:** GHL limita ~100 req/10s **por location** e o Upstash free é 1 DB para vários clientes. Rajada analítica de 3.000 oportunidades não degrada só a si mesma — **tira resposta do lead ao vivo**. Exige rate-limiter no executor de tools + horário fora do comercial.
- **REGRA DE OURO:** nenhuma tool de **mutação** entra em `allowed_callers`. Se uma vazar, o modelo pode escrever um loop que mexe em 3.000 cards. Whitelist explícita, teste em conta de laboratório.
- O *"pergunte ao seu funil"* na Central **canibaliza os dashboards CRM que já estão em produção** (H4, Psi, Kommo/GHL). Só volta com um cliente que **pague** por auditoria profunda como entregável separado.

---

## §3 · O CEMITÉRIO — reprovadas, com o motivo (não reabra)

> Esta seção vale tanto quanto o pódio. Ela existe para que a ideia não volte daqui a 3 meses e alguém gaste uma semana nela.

| Ideia | Por que morreu | Condição de ressurreição |
|---|---|---|
| **Memory tool nativo (`memory_20250818`)** | 80% dela **é a ficha (#6) com outro nome** — comprar as duas é pagar duas vezes pelo mesmo dossiê. E os outros 20% (playbook) já existem no prompt editável. Pior: a própria proposta admite que o memory tool injeta um round-trip de 2-5s no turno e **depois propõe pré-injetar para anular isso** — você adiciona uma tool da API para em seguida desligá-la na prática. Complexidade sem prêmio. Risco real de **memória envenenada**: alucinação escrita hoje vira verdade para sempre. | Um caso concreto que a ficha + prompt editável **comprovadamente** não resolvam. Não antes. ✅ *(A tool é GA, sem beta header, client-side, com `/memories` e validação obrigatória de path traversal — a doc está certa; o problema não é ela, é a duplicação.)* |
| **GEPA / otimizador reflexivo de prompt (frente de Pareto)** | Otimizar ruído. Com 10 cenários e ~10 clientes, "evolução reflexiva com frente de Pareto" está ajustando variância, não qualidade. E cria a **pior dívida do lote**: um otimizador que reescreve prompt de produção é algo que você supervisiona **para sempre**. Semanas de build. | Suíte com >100 cenários reais estabilizados **e** rubrica binária calibrada **e** alguém dedicado a operá-lo. |
| **Calibração estatística do juiz (TPR/TNR + theta + IC bootstrap)** | Cerimônia acadêmica na nossa realidade: são **horas do mestre × N clientes**, refeitas toda vez que a oferta muda, para produzir um número que o cliente **não quer ver**. Dizer ao dono da clínica *"aprovado 92%, IC 84-97%, corrigido pelo viés do juiz"* é comercialmente **pior** que "9,7/10" — você trocou um número que ele entende por um que ele desconfia. | Cliente enterprise que exija auditoria de qualidade **por contrato**. |
| **Registro de hooks `preToolUse`/`postToolUse`** | Contradiz frontalmente a decisão #2 da `ARQUITETURA.md` (*"~80 linhas transparentes, sem framework"*). Inventar ciclo de vida bespoke para ~10 tools com **um** call site é dívida pura: todo dev futuro precisa aprender o SEU lifecycle. Uma função `checkPreconditions()` entrega 100% do valor. | Nunca, no desenho atual. **O log de tentativas bloqueadas — que era o valor real — já foi salvo dentro do item #2.** |
| **"Pergunte ao seu funil" (chat analítico na Central)** | Canibaliza produto **nosso que já existe e está em produção**: dashboards CRM (H4, Psi, Kommo/GHL). Vender diagnóstico de funil por chat quando você já entrega painel não abre linha nova — divide a mesma. | Junto com 2.5, e só se alguém pagar por auditoria como entregável separado. |
| **Replay como diff de conversa inteira** | Furo de método: re-rodar turnos 4-15 de uma conversa que divergiu no turno 3 compara contra um histórico que nunca existiria. Entrega diffs bonitos e **enganosos**. | A versão consertada (1º turno divergente, N=50) está em §2.2. Medir conversa inteira é o simulador, não replay. |
| **Pré-aquecimento de cache por cron** | ✅ Verificado e a conta **não fecha pro nosso caso**. Escrita de cache custa 1,25× (TTL 5min) ou **2×** (TTL 1h); leitura custa 0,1×. Com TTL de 5 min e leads chegando esporadicamente, cada pré-aquecimento é uma escrita quase sempre desperdiçada. A própria doc diz para pular quando *"o tráfego é contínuo"* ou quando o prefixo é pequeno. Nosso prompt é ~6k tokens e a diferença medida é R$0,13 → R$0,02 **na primeira mensagem do dia**. | Um cliente com pico previsível e volume alto (ex.: disparo em massa às 9h) — aí `max_tokens: 0` no minuto anterior paga. |
| *(já enterrados antes — `comum/CONTEXT-ENG.md`)* **RAG para base de 6k tokens** · **roteador Haiku antes do Sonnet** · **framework de agente (LangGraph/CrewAI)** · **otimizar token antes de ter eval** | Medidos e reprovados no nosso laboratório. RAG só com 2+ sinais: >25k tokens, latência >12s, catálogo por SKU, >150 FAQs. | Os limiares estão escritos lá. Confira contra eles antes de reabrir. |

---

## §4 · O QUE JÁ TEMOS — e apareceu nas propostas como se fosse novidade

> Isto é prova de que estamos à frente em algumas frentes. Serve para **vender** e para **não reconstruir**.

| A proposta pediu | Já existe, aqui | Desde |
|---|---|---|
| "Faça evals com juiz LLM e portão de deploy" | `scripts/evals.mjs` + `lib/evals.ts` + portão no `api/prompt.ts` — **prompt sabotado foi bloqueado com 5.7/10**, produção intacta | 12/07 🩸 |
| "Dê a oferta oficial ao juiz para não ter falso positivo" | Regra escrita em `comum/EVALS.md` §3 — nasceu de um falso positivo real (o juiz reclamou dos R$179 corretos) | 12/07 🩸 |
| "Deixe o agente aprender sem redeploy" | Cérebro editável ao vivo (`lib/prompt-store.ts`), 20 versões com nota, rollback, restaurar-fábrica, **com o eval como porteiro** | `comum/ARQUITETURA.md` §10 |
| "Simule as tools em dry-run para testar sem tocar no CRM" | `simulateChat` + `simulateTool` no playground da Central `/cerebro` | 19/07 |
| "Ponha guards nas tools" | Whitelist de etapa · só-avança · **fail-closed** em stage desconhecido · alçada termina no Agendado | `ARQUITETURA.md` §7 |
| "Slot de agenda vindo de consulta real" | Já é decisão de arquitetura. **O que falta é só o token que a torna inviolável (#2)** | `ARQUITETURA.md` §7 |
| "Bloco dinâmico separado do cacheado" | Doutrina medida, com o número: cache HIT = R$0,02 vs MISS = R$0,13 | `CONTEXT-ENG.md` + §30 |
| "Monitoramento contínuo em produção" | Guardião diário + analista semanal + auditora de funil + diário de execuções + alertas em grupo | `SKILL.md` §1 |
| "Transparência para o cliente" | Central de IA + Enciclopédia (`lib/manifest.ts`) — **nada entra como `ativo` sem prova com data** | `comum/ARQUITETURA.md` §10 |
| "Entenda mídia do lead" | Áudio (Groq) + **imagem e PDF pela visão do próprio Claude**, descritos UMA vez na entrada e gravados como texto. Um fornecedor a menos que o n8n (que usava Gemini) | 19/07 |
| "Relógio pontual para followup" | QStash como tique horário + antecipação de janela comercial — nasceu de 22 minutos que viraram 14 horas de atraso | 20/07 🩸 |

**Frentes onde estamos à frente do que as propostas assumiam:** custo medido por conversa (R$0,16), doutrina de limiar prompt-vs-RAG com números próprios, gate por tag com rampagem, e o organismo de governança completo. As propostas de "faça evals" e "monitore produção" chegaram tarde — a suíte existe desde julho e já pegou uma regressão que mataria venda em silêncio.

---

## §5 · ORDEM DE COMPRA QUE O JÚRI BANCA

```
#1 parada de emergência + recado   (horas)      → você ganha o botão vermelho
#2 contrato + slot_token HMAC       (2-3 dias)   → você para de perder contrato
#3 canário + pass^k                 (meio dia)   → você para de descobrir por reclamação
#4 rubrica binária                  (meio dia)   → o portão vira determinístico
#5 carimbo de versão + conversão    (1 dia)      → você ganha o slide da renovação
────────────────── PARE E MEÇA POR 3 SEMANAS ──────────────────
#6 ficha escopada                   (1 sem + 1)  → só depois de #5 provar onde dói
```

**Por que a barreira depois do #5:** cinco das oito propostas originais eram infraestrutura de **medição**. Comprar todas = três semanas construindo régua e zero construindo o que marca reunião. **Régua não vende — ela só evita que você quebre o que já vende.** De #1 a #5 são ~5 dias de build e você sai com botão de pânico, alçada com prova, seguro contra drift, portão determinístico e a métrica que o cliente paga. Depois disso, **meça conversão real antes de comprar mais cérebro.**

---

## §6 · ONDE O AGENTE ESTÁ EM RELAÇÃO AO ESTADO DA ARTE

O agente está **acima da média mundial em governança e abaixo em memória**. O organismo de operação — eval como porteiro de deploy, guardião, analista, auditora, Central com manifesto que não mente, cicatriz virando skill — é literalmente o que empresas americanas de eval de agentes vendem como produto, e nós já rodamos em produção com prova datada. O que o mundo sabe fazer e nós não é mais estreito do que parece, e mora em dois lugares: **estado explícito** (o agente é amnésico e o CRM é um histórico bruto, não uma ficha) e **prova nas tools** (a alçada é permissão, não evidência). Nada disso exige mudar de stack, framework ou fornecedor — as seis peças do pódio somam menos de duas semanas de código dentro do serverless que já está no ar. A distância não é tecnológica: é de calendário.
