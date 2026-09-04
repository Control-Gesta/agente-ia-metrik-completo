# ESCALA — o arquivo do TEMPO (operar mais clientes com a mesma equipe)

> **O que é este documento.** O irmão operacional da `FRONTEIRA.md`. Aquele arquivo pergunta *"o que construir dentro do agente"*. Este pergunta **"o que construir em volta da frota para que 10 clientes virem 25 sem virar 25 vezes o trabalho"**.
>
> **Ele não repete a FRONTEIRA.** Harness, evals, observabilidade do agente, latência/custo, guardrails, voz, memória — está tudo lá e não volta aqui. Onde os dois se tocam (o carimbo de versão do `FRONTEIRA #5`, a chave de pausa do `FRONTEIRA #1`), este arquivo **consome** a peça de lá em vez de reconstruir.
>
> **Regra de admissão:** devolve **hora do dono** ou **transforma hora do dono em hora delegável** · cabe no stack de hoje (Vercel + Upstash + Claude API, zero VPS) · tem primeiro passo executável esta semana · o ganho está **quantificado com base declarada**, não chutado.
>
> **A tese em uma frase:** o que trava esta casa em ~10 clientes **não é capacidade técnica nem custo de infra** (margem ~93%, R$50–150/mês por cliente). É que **o motor é copiado, não versionado**, e **a frota não sabe se reportar** — então toda melhoria compartilhada custa um dia, e por isso não acontece.

**Legenda de prova:**

| Marca | Significado |
|---|---|
| 🩸 | Cicatriz/admissão **nossa**, com data ou com linha de arquivo — a prova mais forte que existe aqui |
| 📄 | Estudo, livro ou paper revisado — fonte independente |
| ⚠️ | **Doc de fornecedor / marketing de vendor** — vale como receita, **não** como prova |
| ⚙️ | **Estimativa fundamentada** — a base do cálculo está escrita ao lado. Não é medição |

🏛️ **DOUTRINA DESTE ARQUIVO:** *hora do dono é o único recurso escasso da casa.* Custo de token, custo de Vercel e custo de Redis são ruído (`comum/CONTEXT-ENG.md`: R$0,16 por conversa, IA ≈ 0,1% do ticket). **Toda alavanca aqui é medida em horas do mestre, não em reais de infra.**

---

## §1 · O GARGALO REAL — e onde o tempo vaza hoje

### 1.1 · O gargalo não é o que parece

A casa constrói um agente em **~1 dia no GHL e ~meio dia no Kommo** (`SKILL.md §4`). Isso é rápido. O gargalo **não é o build inicial** — é tudo que vem **depois do primeiro cliente**:

> 🩸 **A admissão que abre o caso.** `FRONTEIRA.md`, linha 17: *"componente compartilhado só está pronto quando todo cliente no ar foi redeployado. **Multiplique por ~30min × clientes ativos + evals + E2E**."*
> E `SKILL.md §7.3`, na mesma página em que a lei é escrita: *"(1º caso: playground 'Testar ao vivo' — no ar na Metrik 19/07; **propagar aos demais**)."*
>
> **A lei existe, está escrita, e não está sendo cumprida.** Isso não é preguiça: é o custo estar alto demais para ser pago. **5 horas por melhoria × 10 clientes é o preço que faz a 4ª perna virar dívida.**

O mecanismo é simples e é o mesmo de toda agência que escala serviço técnico:

```
custo de uma melhoria = build (1×)  +  propagação (N clientes)
```

Enquanto a propagação for **linear e manual**, cada cliente novo **encarece toda melhoria futura**. O cliente 11 não custa 1/10 a mais de operação — ele custa 1/10 a mais **em cada melhoria que você fizer pelo resto da vida do produto**. É por isso que agência de serviço técnico trava num número e para: não falta demanda, falta **custo marginal de mudança perto de zero**.

### 1.2 · Os quatro sintomas que provam o diagnóstico (todos internos, todos verificáveis)

| Sintoma | Onde está escrito | O que ele prova |
|---|---|---|
| `cp -r clientes/metriksales/agente-ia clientes/<cliente>/agente-ia` | `ghl/PLAYBOOK.md` Etapa 1 🩸 | **Fork por cliente.** Cada cliente é uma cópia divergente do motor, não uma instância dele |
| `sed -i 's/agente:/agente-<slug>:/g' lib/*.ts api/*.ts` + *"reverta na mão o `agente: {` do `api/config.ts`"* | `ARQUITETURA.md` §6 🩸 | Configuração aplicada por **edição de código-fonte**. Um `sed` que já corrompeu um arquivo é a definição de processo que não escala |
| *"Bump o `SISTEMA_VERSAO`… **é como você sabe qual cliente está atrasado**"* | `ARQUITETURA.md` §5.12 🩸 | A frota **só se reporta se um humano abrir a Central de cada cliente**. Inventário manual = inventário errado |
| *"**Kommo = SÓ o playground.** Portar `prompt-store.ts` + `evals.ts` … é o próximo passo"* | `ARQUITETURA.md` §5.11 🩸 | **São dois motores, não um.** Toda propagação já é feita duas vezes, e uma das duas fica para trás |

### 1.3 · O mapa do vazamento (⚙️ estimativa, base declarada em cada linha)

**Premissas declaradas:** ~10 clientes ativos · 1 operador (o mestre) · **~3 componentes compartilhados novos por mês** (base: playground 19/07, mídia/visão 19/07, relógio QStash 20/07 — três em duas semanas, pela própria `SKILL.md §1`) · 1–2 clientes novos/mês.

| # | Onde o tempo vaza | Base do cálculo | h/mês **se a lei fosse cumprida** | h/mês **que você paga hoje** |
|---|---|---|---|---|
| 1 | **Propagação da 4ª perna** | 30min × 10 clientes × 3 rodadas | **15,0h** | ~0h — **e a frota derreteu** |
| 2 | **"Quem está atrasado?"** | abrir 10 projetos Vercel/Centrais × 5min × 3 rodadas | 2,5h | 2,5h |
| 3 | **Onboarding (só a parte do dono)** | ~8h GHL × 1,5 cliente/mês | 12,0h | 12,0h |
| 4 | **Triagem de "o agente parou"** | ~2 pings/semana × 25min (`SKILL.md §4`: **8 em 10** são gatilho/gate/janela/credencial) | 3,5h | 3,5h |
| 5 | **Env/config divergente** | descoberta por bug, não por diff ("env só vale em novo deploy") | 1,5h | 1,5h |
| 6 | **Escopo não precificado** | pedido fora do combinado atendido "porque é rápido" | 4,0h | 4,0h |
| | **TOTAL** | | **38,5h/mês** | **23,5h/mês + dívida crescente** |

**Leia a última coluna com atenção, porque ela é a parte desconfortável.** Hoje você **não** gasta as 15h de propagação — você as deve. E a dívida cobra juros de dois jeitos: (a) o cliente antigo fica sem a peça que você já construiu e continua pagando o mesmo preço por um produto pior; (b) **todo debug passa a ser feito contra uma versão desconhecida**, que é o multiplicador silencioso de todo tempo de incidente.

> 🏛️ **A regra que resume o §1:** *frota que você não consegue inventariar em 30 segundos é frota que você não consegue atualizar — e frota que você não atualiza vira dez produtos diferentes com um preço só.*

### 1.4 · O teto de capacidade, em número

Ops hoje ≈ **23,5h ÷ 10 clientes ≈ 2,4h/mês por cliente** (excluindo o onboarding, que é one-off). Com uma pessoa dedicando ~60h/mês a operação, o teto é **~25 clientes** — mas só no papel, porque o item 1 (o mais caro) está sendo pago em dívida e não em horas. **Na prática, o teto percebido é onde você está: ~10.**

Depois das alavancas do §2: ops ≈ **0,45h/mês por cliente**. O teto de operação vai para **muito além de 40**, e o gargalo real passa a ser **diagnóstico e venda** — que é exatamente onde a hora do dono deveria estar.

---

## §2 · AS ALAVANCAS APROVADAS

Ordenadas por **horas devolvidas ÷ esforço**. As três primeiras são **um só movimento** — construa nesta ordem, e não some os ganhos das três separadamente (o número combinado está declarado em L3).

| # | Alavanca | Build | Devolve | O que ela destrava |
|---|---|---|---|---|
| L1 | O motor vira **pacote versionado** (mata o `cp -r`) | 1–1,5 dia | — (habilitador) | Propagação deixa de ser cópia manual |
| L2 | **Frota que se reporta sozinha** (`/api/version` + `frota.json`) | ~3h | 2,3h/mês | Inventário em 20 segundos |
| L3 | **Ondas + bake time + rollback de 1 comando** | ~3h | **13,5h/mês** (com L1+L2) | Atualizar 10 clientes sem medo |
| L4 | **O tenant vira arquivo** (`cliente.yaml` + diff de envs) | ~4h | 1,3h/mês | Config auditável, onboarding scriptável |
| L5 | **A fronteira do manual** + TTFV medido | ~4h | 6h/mês **delegáveis** | Sai do "só o dono faz" |
| L6 | **Meta-automação: o triador dos 8 em 10** | ~4h | 2,5h/mês | Cliente se atende sozinho |
| L7 | **O manifesto já é o catálogo de SKU** | ~2h | 2,5h/mês + upsell | Escopo para de vazar |

---

### L1 · O MOTOR VIRA PACOTE VERSIONADO — o fim do `cp -r`

**O que é.** Hoje `lib/*.ts` e `api/*.ts` são **copiados** para a pasta de cada cliente (`ghl/PLAYBOOK.md` Etapa 1) e depois re-copiados a cada melhoria ("copia SÓ os arquivos compartilhados que mudaram", `SKILL.md §7.3`). Isso é **fork por cliente**: dez cópias que divergem em silêncio, sem diff, sem versão, sem rollback.

A troca: o motor vira **pacote privado versionado por semver**, e o repositório do cliente vira **cinco arquivos**.

```
@metrik/agente-core        → o organismo (buffer, loop Claude, tools, followup, guardião, analista, auditora)
@metrik/adapter-ghl        → transporte, histórico via CRM, Calendars, hidratação de mídia
@metrik/adapter-kommo      → transporte Salesbot/uazapi, histórico no Redis, enum_id, tags por merge
```

```jsonc
// clientes/<slug>/agente-ia/package.json — o cliente inteiro, em 4 linhas
"dependencies": {
  "@metrik/agente-core": "1.4.0",
  "@metrik/adapter-ghl": "1.4.0"
}
```

```ts
// api/inbound.ts — no repo do cliente sobra ISTO (o Vercel exige o arquivo em api/)
export { default, config } from '@metrik/agente-core/inbound'
```

**Fica no cliente, e nunca no pacote:** `prompt.md` · `lib/crm-map.ts` · envs da Vercel · o **`status`** do `lib/manifest.ts`. É exatamente a fronteira que a `SKILL.md §7.3` já declara — a diferença é que agora ela é **imposta pelo empacotamento**, não pela disciplina de quem copia às 23h.

**A decisão de fronteira que vale meia propagação.** Hoje GHL e Kommo são **dois motores** (`ARQUITETURA.md` §5.11: *"Kommo = SÓ o playground"*). Se o `core` ficar com tudo que é comum — loop, buffer, followup, evals, prompt-store, guardião, analista, manifesto — e os adapters ficarem só com as **três diferenças estruturais** do `SKILL.md §2` (histórico, envio, modelo de dados), **toda melhoria compartilhada passa a ser propagada uma vez, não duas.** É a maior economia estrutural do arquivo, e ela é gratuita: é uma decisão de onde cortar, não código a mais.

**Como propagar depois de L1:**
```bash
npm i @metrik/agente-core@1.5.0 && npm run typecheck && node scripts/evals.mjs && vercel deploy --prod --yes
```
De ~30 minutos de cópia atenta por cliente para **~3 minutos desatendidos** — e agora com `git diff` do que mudou, changelog e **rollback por número de versão**.

**Ganho.** ⚙️ Propagação por rodada: **5h → ~50min de máquina + ~15min de leitura**. O número final aparece em L3 (é lá que a orquestração fecha).

**Por que é raro no Brasil.** Barreira cultural, e é a mais forte do arquivo: o modelo mental de agência aqui é **"cada cliente é um projeto"**, reforçado pela promessa comercial de "atendimento personalizado". Tratar o próprio código como **plataforma interna com clientes internos** é vocabulário de *Team Topologies* e de time de plataforma — praticamente ausente do mercado de agência/CRM brasileiro. Ninguém esconde isso; simplesmente não ocorre, porque ninguém enxerga dez pastas como **uma frota**.

**Primeiro passo (esta semana, 2h — a versão barata que já paga).** Não comece pelo registry. Comece por **provar a fronteira**:
```bash
# 1. lista os arquivos que são MOTOR e os que são do CLIENTE
node scripts/fronteira.mjs        # ~30 linhas: lê SKILL.md §7.3 e classifica lib/* api/*
# 2. diffa TODO cliente contra o template — o resultado é o mapa da sua dívida
for c in clientes/*/agente-ia; do diff -rq clientes/metriksales/agente-ia/lib "$c/lib"; done
```
Se esse diff vier limpo nos arquivos de motor, o pacote é mecânico. Se vier sujo (e vai), **cada divergência é uma decisão que você tomou num cliente e esqueceu nos outros** — resolva antes de empacotar, senão você congela a bagunça dentro de uma versão.

**Prova.** 📄 *Accelerate* / relatórios DORA: as práticas que mais separam times de alta performance são **automação de deploy, lotes pequenos e trunk-based** — todas impossíveis quando o artefato é uma cópia manual. 📄 *Team Topologies* (Skelton & Pais): o "platform team" existe para que times de fluxo consumam capacidade **por interface versionada**, não por cópia. 🩸 A prova doméstica é mais dura que as duas: `FRONTEIRA.md` L17 e o playground preso na Metrik desde 19/07.

**Risco.** (a) O Vercel roteia **por arquivo** em `api/` — os shims de re-export têm que existir e ser testados no primeiro cliente antes de tocar nos outros. (b) A tentação de "só desta vez" editar `lib/` dentro de um cliente **destrói o modelo inteiro** — a regra vira: mexeu em `lib/` do cliente, é bug do pacote, sobe no pacote. (c) `prompt.md` e `crm-map.ts` **jamais** entram no pacote; um `postinstall` que os sobrescreva apaga a alma do cliente.

---

### L2 · A FROTA QUE SE REPORTA SOZINHA (`/api/version` + `frota.json`)

**O que é.** Todo deploy passa a responder o que ele é. Um endpoint de ~20 linhas, e um arquivo com a lista da frota.

```ts
// api/version.ts — no pacote (L1), servido por todo cliente
export default async function handler(req, res) {
  if (req.query.secret !== process.env.WEBHOOK_SECRET) return res.status(401).json({ ok: false })
  res.json({
    slug:           process.env.CLIENT_SLUG,
    cliente:        process.env.CLIENT_NAME,
    crm:            process.env.GHL_TOKEN ? 'ghl' : 'kommo',
    transport:      process.env.TRANSPORT ?? 'ghl',
    core_versao:    CORE_VERSION,                 // do package.json do pacote
    sistema_versao: SISTEMA_VERSAO,               // lib/manifest.ts (já existe)
    prompt_versao:  await versaoAtual(),          // lib/prompt-store.ts (já existe)
    modulos_ativos: MODULOS.filter(m => m.status === 'ativo').map(m => m.id),
    gate_tag:       process.env.GATE_TAG,
    pausado:        Boolean(await redis.get(`agente-${SLUG}:pausa`)),   // FRONTEIRA #1
    commit:         process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
  })
}
```

```jsonc
// frota.json — versionado. Segredos NÃO entram aqui (leia de .frota.secrets.json, fora do git)
[
  { "slug": "metriksales", "onda": 0, "crm": "ghl",   "url": "https://agente-ia-metriksales.vercel.app", "ativo": true },
  { "slug": "<cliente-a>", "onda": 1, "crm": "ghl",   "url": "…", "ativo": true },
  { "slug": "<cliente-b>", "onda": 2, "crm": "kommo", "url": "…", "ativo": true }
]
```

```js
// scripts/frota.mjs — ~60 linhas. É o comando que você vai rodar todo dia.
const linhas = await Promise.all(frota.filter(c => c.ativo).map(async c => {
  const v = await j(`${c.url}/api/version?secret=${seg(c.slug)}`)
  const m = await j(`${c.url}/api/validate?secret=${seg(c.slug)}`)   // JÁ EXISTE
  return { cliente: c.slug, onda: c.onda, core: v.core_versao, prompt: v.prompt_versao,
           mapa: m.ok ? 'ok' : 'QUEBRADO', pausa: v.pausado ? 'PAUSADO' : '', erro: v.erro ?? '' }
}))
console.table(linhas)
```

**Três coisas que ele resolve de graça, porque as peças já existem:**

1. **`/api/validate` já existe e já compara o mapa contra o CRM vivo** (`ghl/PLAYBOOK.md` Etapa 7). Hoje o guardião roda um por cliente e alerta um por cliente. Agregado, ele vira **uma linha**: *"10/10 no ar · 3 atrasados na core 1.4 · 1 mapa quebrado no cliente X"*.
2. **A pausa esquecida morre aqui.** O `FRONTEIRA #1` já identificou o risco (*"pausa esquecida = cliente sem atendimento sem ninguém notar"*). O boletim da frota mostra `PAUSADO` todo dia, na cara, sem precisar de alerta próprio.
3. **O carimbo de versão do `FRONTEIRA #5`** (`prompt_versao` no diário) vira o insumo do `/api/version`. **Construa uma vez, serve às duas.**

**Boletim diário no grupo de alertas:** o `lib/alert.ts` e o `ALERT_GROUP_JID` já existem. Uma mensagem por dia, às 8h, com a tabela acima. **Regra:** se está tudo em dia, o boletim é **uma linha**. Boletim longo em dia bom é boletim que ninguém lê em dia ruim.

**Ganho.** ⚙️ **2,3h/mês** (os 2,5h de "quem está atrasado" viram ~10 minutos), mais o ganho que não cabe em hora: **você para de debugar contra versão desconhecida**.

**Por que é raro no Brasil.** Barreira de vocabulário. **Catálogo de serviço** (Backstage/Spotify), inventário de frota e "o artefato se reporta" são práticas de SRE que não circulam no mercado de agência daqui — a versão brasileira disso é uma planilha ou uma página no Notion, que **mente em duas semanas** exatamente como a documentação escrita à mão que o Códex já proíbe (`SKILL.md §7.2`: *"documentação que não é gerada da fonte vira mentira em duas semanas"*). **A doutrina do Códex aplicada à frota: o inventário tem que ser lido da fonte viva, nunca digitado.**

**Primeiro passo (2h, hoje).** Escreva `api/version.ts` no template, deploy só na Metrik, crie `frota.json` com os 10 clientes e rode `node scripts/frota.mjs`. **A primeira tabela que sair é o retrato da sua dívida** — e é o único artefato deste arquivo que você pode ter em duas horas.

**Prova.** 📄 Google SRE Book, cap. *Eliminating Toil*: define toil (manual, repetitivo, automatizável, sem valor duradouro, **cresce linearmente com o serviço**) e prescreve **teto de 50%**. Inventário manual de frota é o exemplo canônico. 📄 Backstage (Spotify → CNCF): o catálogo de software existe para responder *"o que está rodando, em qual versão, de quem é"* — a pergunta que hoje custa 5 minutos por cliente aqui. 🩸 `ARQUITETURA.md` §5.12 já admite a necessidade e propõe a solução manual.

**Risco.** O segredo por cliente **não pode entrar no `frota.json`** (é `WEBHOOK_SECRET`, novo por cliente). Use um `.frota.secrets.json` fora do git ou `vercel env pull`. E o endpoint tem que exigir segredo — `/api/version` aberto entrega o mapa da sua operação.

---

### L3 · ONDAS DE IMPLANTAÇÃO + BAKE TIME + ROLLBACK DE UM COMANDO

**O que é.** Rollout progressivo **entre clientes**, não entre porcentagem de tráfego. Cada cliente tem uma **onda** no `frota.json`:

| Onda | Quem | Por quê |
|---|---|---|
| **0** | Metrik (dogfood, tráfego real) | A casa é a primeira a sofrer o próprio bug. Já é a prática — só falta ser regra |
| **1** | 1–2 clientes tolerantes, de preferência um GHL e um Kommo | Cobre os dois adapters antes do resto |
| **2** | O resto da carteira | Só depois do bake |

```bash
node scripts/propagar.mjs --onda 0 --core 1.5.0
```

O script, por cliente da onda:

```
1. registra o deployment atual em frota-rollback.json      ← o ponto de volta, ANTES de qualquer coisa
2. npm i @metrik/agente-core@<v> && npm run typecheck
3. node scripts/evals.mjs                                   ← 10/10 ou PULA este cliente e segue
4. vercel deploy --prod --yes
5. smoke: /api/version (core == <v>) · /api/validate (ok:true) · /api/inbound ({ok,redis:true})
6. qualquer smoke falhou → vercel rollback <deployment-anterior> + alerta no grupo
```

**O portão de sinais (o que separa isto de "deployar em ordem").** Depois da onda 0, o script **se recusa** a aceitar `--onda 1` enquanto as duas condições não forem verdadeiras:

- **Bake de 24h**, atravessando **um pico comercial inteiro** (um agente de SDR não erra às 3h da manhã — erra às 14h de terça, com lead falando);
- **Taxa de erro do diário nas 24h da onda 0 ≤ baseline de 7 dias.** O `/api/executions` já grava tudo (`SKILL.md §1`); a query é uma contagem.

**⚠️ Honestidade sobre esta alavanca.** Isso **não é segredo gringo** — é higiene de release conhecida em qualquer time de software sério. O que é raro no Brasil é **aplicar doutrina de frota a uma carteira de clientes de uma agência de uma pessoa**: aqui, "subir pra todo mundo" é o default, e "raio de dano" (*blast radius*), "bake time" e "exposição progressiva" não são palavras que circulam fora de engenharia. Compre isto pelo TEMPO que devolve e pelo medo que remove, não por ineditismo.

**⚠️ E não empreste o número dos outros.** A tentação é citar CFR de relatório DORA. **Você tem o dado próprio a uma query de distância** e não mediu:

```bash
# CFR caseiro, 1 hora de trabalho, número SEU:
#   numerador  = deploys de produção seguidos de outro deploy em <24h (proxy de hotfix/rollback)
vercel ls --prod --json | node scripts/cfr.mjs
#   denominador = total de deploys de produção nos últimos 30 dias
# e cruze com: execuções com erro / total, por cliente, em /api/executions
```
Meça antes de construir. Se o seu CFR for perto de zero, as ondas valem menos e você deve ir direto ao L4 — **e é bom saber disso antes, não depois.**

**Ganho combinado L1+L2+L3.** ⚙️ Propagação de **15h/mês (se a lei fosse cumprida) → ~1,5h/mês** de trabalho atendido, com a frota **efetivamente em dia**. Chame do jeito honesto: **~13,5h/mês de dívida que deixa de existir**, não 13,5h que você recupera do bolso hoje.

**Primeiro passo (3h, depois do L2).** Adicione `"onda"` no `frota.json` e escreva `propagar.mjs` com **só o passo 1 e o passo 6** (registrar o ponto de rollback e saber voltar). Depois **teste o rollback de propósito** num cliente da onda 0, num horário morto. Rollback que nunca foi testado não existe — é a cicatriz nº 1 da casa (*loga sucesso, não entrega*) na sua forma mais cara.

**Prova.** ⚠️ Azure *Safe Deployment Practices* e AWS SaaS Factory (waves / cell-based deployment): exposição progressiva com bake time entre anéis. **É doc de fornecedor — receita, não prova.** ⚠️ Vercel: deployments imutáveis com promoção/rollback instantâneo (capacidade factual do fornecedor que você já paga e não usa). 📄 DORA/*Accelerate*: lotes menores e deploy automatizado correlacionam com menor taxa de falha de mudança e recuperação mais rápida — mas **use o seu número, não o do relatório**. 🩸 O motivo doméstico é mais forte que os três: hoje um bug no `lib/` chega em 10 clientes no mesmo `vercel --prod`, e o único freio é você não estar cansado.

**Risco.** (a) Onda vira desculpa para nunca terminar: **quem fica na onda 2 por dois meses está fora da frota**. O boletim do L2 tem que gritar quem está atrasado. (b) Bake longo demais mata a agilidade — 24h é teto, não meta. (c) `evals.mjs` reprovando num cliente **não pode travar a fila inteira**: pula, registra e segue.

---

### L4 · O TENANT VIRA ARQUIVO (`cliente.yaml` + diff de envs)

**O que é.** Hoje a configuração de um cliente vive espalhada em quatro lugares invisíveis: o painel de envs da Vercel, o `crm-map.ts`, o `status` do manifesto e a cabeça do mestre. Nada disso é diffável, nada é auditável, e a descoberta de que falta uma env acontece **por bug** (`ARQUITETURA.md`: *"env var só vale em novo deploy"*).

```yaml
# clientes/<slug>/cliente.yaml — a ficha do tenant. NENHUM valor secreto aqui, só nomes.
slug: <slug>
nome: "<Cliente> · <Agente>"
crm: ghl                  # ghl | kommo
transport: ghl            # ghl | salesbot | uazapi
onda: 2
gate_tag: <TAG>
modulos:                  # espelha o lib/manifest.ts — e vira o contrato comercial (L7)
  voz: ativo
  followup: ativo
  rastreio: ativo
  central: ativo
envs_obrigatorias: [ANTHROPIC_API_KEY, WEBHOOK_SECRET, CRON_SECRET, SELF_URL, CLIENT_NAME,
                    UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, GHL_TOKEN, GHL_LOCATION_ID]
relogio: qstash           # cron-vercel | qstash   (ARQUITETURA §5.15)
ttfv_alvo_dias: 5
```

```bash
node scripts/envs.mjs --slug <slug>
# lê cliente.yaml, roda `vercel env ls production`, e imprime:
#   FALTA:  ELEVENLABS_VOICE_ID        ← voz declarada "ativo" e a env não existe
#   SOBRA:  KOMMO_TOKEN                ← lixo de cópia de outro cliente
```

**O que muda no processo.** O `cliente.yaml` vira o **input único** do onboarding (L5) e do `frota.json` (que passa a ser gerado, não digitado). E o `envs.mjs` roda dentro do `propagar.mjs`, antes do deploy: **config divergente vira erro de máquina, não incidente de cliente.**

**Ganho.** ⚙️ **1,3h/mês** direto (as 1,5h de config divergente), e é pré-requisito do L5 e do L7 — o valor real dele é ser o **contrato legível** que os dois consomem.

**Por que é raro no Brasil.** Aqui a configuração de cliente mora no painel do fornecedor (Vercel, GHL, n8n) porque é onde se clica. **Config como arquivo versionado** é prática de infraestrutura-como-código que agência de marketing/CRM não pratica — e o resultado é o clássico "funciona no cliente A e ninguém sabe por quê".

**Primeiro passo (1h).** Escreva o `cliente.yaml` de **um** cliente à mão e rode o diff de envs contra a Vercel. ⚙️ Aposta fundamentada: você acha pelo menos uma env sobrando (lixo de `cp -r`) ou uma faltando **agora**, sem nenhum bug reportado.

**Prova.** 📄 Google SRE, *Eliminating Toil*: configuração manual repetida por instância é o exemplo de manual do livro. ⚠️ AWS SaaS Factory: *tenant configuration/onboarding as data* — o tenant é um registro, nunca um fork de código. 🩸 `ARQUITETURA.md` §6 já descreve a fronteira isolado × compartilhado; o `cliente.yaml` só a torna **executável**.

**Risco.** Segredo nenhum entra no YAML — só **nomes** de env. E o YAML **não é fonte da verdade de IDs de CRM**: a Lei 1 continua valendo (`SKILL.md §3`), IDs sempre ao vivo, no `crm-map.ts`, validados pelo `/api/validate`.

---

### L5 · A FRONTEIRA DO MANUAL — o que vira script, o que vira checklist, e o TTFV medido

**O que é.** Onboarding hoje é ~8h de **hora do dono** (`ghl/PLAYBOOK.md`, 11 etapas). Duas partes precisam ser separadas com brutalidade, porque **elas têm curas diferentes**:

| Automatizável hoje (vira `scripts/novo-cliente.mjs`) | **Impossível de automatizar** (a API não expõe) |
|---|---|
| Scaffold do repo a partir do `cliente.yaml` · discovery dos IDs ao vivo (os `curl` da Etapa 2 já estão escritos) · **rascunho** do `crm-map.ts` a partir da resposta do CRM · `vercel env add` em laço · deploy · `/api/validate` · `evals.mjs` · deploy da Central | **GHL Etapa 8:** os 4 workflows na UI (*"a API do GHL **não cria workflow**"* 🩸) · desligar o Conversation AI nativo · **Kommo Passo 5:** o Salesbot de envio (~3min, *"o ÚNICO passo manual"* 🩸) · conectar e testar o WhatsApp · escrever o `prompt.md` |

**A alavanca não é automatizar o impossível — é fazer o impossível caber num checklist que outra pessoa executa.** O que resta manual é ~3h de clique guiado. Clique guiado com print e critério de aceite é **trabalho de júnior**; descobrir ID e escrever cérebro é **trabalho de dono**. Enquanto os dois estiverem misturados numa etapa só, tudo é trabalho de dono.

**O checklist tem que ter três colunas, sempre:** *o clique* · *como saber que deu certo* · *o que quebra se pular*. Sem a terceira coluna, o júnior pula. (A terceira coluna você já tem escrita: são as pegadinhas.)

**E meça o TTFV** (*time to first value*): `t0` = contrato assinado, `t1` = **primeira conversa real de lead atendida pela IA**. Duas chaves no Redis, uma linha no boletim da frota. Sem esse número, "onboarding rápido" é opinião — e é o número que vira **promessa contratual** ("no ar em 5 dias úteis"), que é vantagem comercial que nenhum concorrente daqui consegue prometer com dado.

**Ganho.** ⚙️ Das 12h/mês de onboarding, ~**6h viram delegáveis** e ~2h somem (scaffold + envs + validate automatizados). O ganho principal **não é hora economizada, é hora convertida**: hora de dono a R$X vira hora de júnior a R$X/4, e o dono volta para diagnóstico e venda — que é o gargalo novo depois do §1.

**Por que é raro no Brasil.** *Productized service* — escopo fixo, processo fixo, SOP como ativo — é assunto de agência americana; aqui o padrão é "projeto sob medida", que é a desculpa estrutural para nunca escrever o processo. E a fé no talento individual ("meu processo está na minha cabeça") é cultural: o brasileiro médio de serviço acha que checklist é para quem não sabe. **É exatamente o contrário, e existe estudo grande sobre isso.**

**Primeiro passo (2h, no próximo cliente — não retroativo).** Ao fazer o próximo onboarding, **grave a tela e cronometre cada etapa**. No fim, você tem (a) o tempo real de cada etapa — que substitui minhas estimativas por medição — e (b) o vídeo que vira o checklist. Não tente escrever o SOP de memória: memória subestima etapa chata.

**Prova.** 📄 **Haynes et al., *A Surgical Safety Checklist to Reduce Morbidity and Mortality in a Global Population*, New England Journal of Medicine, 2009**: 8 hospitais, 3.733 pacientes antes / 3.955 depois; complicações **11,0% → 7,0%**, mortalidade **1,5% → 0,8%**. Cirurgiões são os especialistas mais treinados que existem, e um checklist de 19 itens cortou complicação em ~1/3. É a prova independente mais forte que existe de que **checklist bate expertise sozinha em trabalho especializado de alta variância** — e é literalmente o argumento contra "está na minha cabeça". 📄 Google SRE, *Eliminating Toil*: trabalho manual que cresce com o número de serviços tem que ser cortado antes de crescer. 🩸 Os dois limites manuais (GHL Etapa 8 e Kommo Passo 5) estão documentados na própria casa — a fronteira já foi mapeada, só não foi usada como linha de delegação.

**Risco.** Júnior com acesso de admin ao CRM do cliente. O checklist tem que ser **de execução, não de decisão**: qualquer coisa que exija julgamento (alçada, qualificação, tom, o que a IA pode falar) continua sendo do dono. E **nada vai ao ar sem a Lei 4** (`SKILL.md §3`): E2E em número real + rampagem, feitos por quem sabe ler o resultado.

---

### L6 · META-AUTOMAÇÃO: o triador dos "8 em 10"

**O que é.** A própria `SKILL.md §4` já escreveu a escada de isolamento e o número: *"**8 em cada 10** 'o agente parou' são gatilho, gate, janela ou credencial."* Ou seja: **80% do seu suporte técnico é um roteiro determinístico que você executa a mão, por WhatsApp, no meio de outra coisa.** Isso é o exemplo de manual do livro do SRE: repetitivo, automatizável, sem valor duradouro.

```ts
// api/diagnostico.ts — a escada da SKILL §4 virada código. ~120 linhas, zero IA.
// GET /api/diagnostico?secret=…&telefone=5511…
1. saiu execução pra esse telefone nas últimas 24h?    → não  ⇒ "GATILHO: o CRM não chamou o agente"
2. o lead tem a GATE_TAG?                              → não  ⇒ "GATE: a IA não foi autorizada nesse lead"
3. o lead tem a tag de handoff humano?                 → sim  ⇒ "HANDOFF: alguém do time assumiu"
4. /api/validate ok?                                   → não  ⇒ "MAPA: campo/etapa mudou no CRM"
5. última msg DO LEAD > 24h e transporte oficial?      → sim  ⇒ "JANELA 24h da Meta"
6. ping barato no CRM e na Anthropic                   → 401  ⇒ "CREDENCIAL"
7. relógio: QStash lastScheduleTime > 2h?              → sim  ⇒ "RELÓGIO parado"
⇒ { veredito, explicacao_em_portugues, proximo_passo, evidencia }
```

**E a parte que devolve a hora de verdade:** ligue isso a um comando no **grupo de alertas que já existe**. `lib/alert.ts`, `ALERT_GROUP_JID` e o webhook da uazapi já estão no ar:

```
/diag 5511999999999      → o boletim de diagnóstico volta no grupo em ~10s
/frota                   → a tabela do L2
/pausa <slug> <motivo>   → aciona a chave do FRONTEIRA #1
```

**Ganho.** ⚙️ Triagem de **3,5h/mês → ~1h/mês** (sobra só o 1 em 5 que é de verdade). E um ganho comercial que não é hora: hoje o cliente espera **você acordar** para saber que não era bug; com o `/diag`, ele tem a resposta em 10 segundos e a percepção de "sistema que se explica" — que é a mesma coisa que a Central faz pelo preço.

**Por que é raro no Brasil.** *Support deflection* e runbook automatizado são padrão em SaaS gringo e quase inexistentes em agência daqui, onde o suporte É o WhatsApp do dono. E há uma barreira de estômago: parece que automatizar o suporte "esfria" a relação. É o inverso — **o cliente não quer falar com você, ele quer a resposta**; sua atenção fica valiosa quando ela é usada nos 20% que importam.

**Primeiro passo (2h).** Escreva **só os passos 1 e 2** (execução saiu? tem a tag?). Eles sozinhos cobrem a maioria dos casos e são duas leituras que o código já sabe fazer. Rode você mesmo, pelo navegador, no próximo "parou" — e só depois exponha no grupo.

**Prova.** 🩸 O "8 em 10" é número da casa, escrito na `SKILL.md §4` — é a melhor prova possível para esta alavanca porque é o seu próprio funil de suporte. 📄 Google SRE, *Eliminating Toil*: a receita é literalmente "pegue o item de toil mais frequente e transforme o runbook em código". ⚠️ Vendors de suporte publicam taxas de deflection de 20–60%; **é marketing, não use**.

**Risco.** Comando em grupo é superfície de ataque: **aceite comandos só do `ALERT_GROUP_JID` e de números da equipe**, e **nenhum comando destrutivo** (`/pausa` sim; `/deploy` e `/rollback`, jamais — esses ficam no terminal). E cuidado com a pegadinha da uazapi: **1 webhook por instância, o POST substitui o anterior** — se o grupo compartilha instância com cliente, use o `UAZAPI_RELAY_URL`.

---

### L7 · O MANIFESTO JÁ É O CATÁLOGO DE SKU — só falta o preço

**O que é.** A casa já tem, em produção, a peça que quase nenhuma agência tem: o `lib/manifest.ts`, com **status por módulo, por cliente** (*"cliente sem voz? `voz: roadmap`"*, `ARQUITETURA.md` §5.12). Isso **já é** uma tabela de *entitlements* — o mecanismo que SaaS usa para amarrar plano contratado a funcionalidade ligada. Falta uma coluna: **o que foi vendido.**

```yaml
# no cliente.yaml (L4)
plano: agente+voz+central          # o que ele COMPRA
modulos: { voz: ativo, followup: ativo, rastreio: ativo, central: ativo, recuperacao: ativo }
```

E o `frota.mjs` (L2) passa a cruzar as duas colunas, imprimindo duas listas que hoje ninguém tem:

- **VAZAMENTO** — módulo `ativo` que **não está no plano**. É trabalho e custo que você entrega de graça, e cada linha aqui é uma conversa de upsell com prova.
- **PROMESSA ABERTA** — módulo no plano que **não está `ativo`**. É risco de churn com data marcada: o cliente pagou por recuperação e ela está em `roadmap` há três meses.

**Ganho.** ⚙️ **2,5h/mês** de escopo não precificado (das 4h estimadas no §1) — porque o pedido fora do plano passa a ter uma resposta pronta e sem atrito: *"isso é o módulo X, que não está no seu plano; ligo em 2 dias por R$Y"*. Mais o efeito de receita, que não é hora: cada linha de VAZAMENTO na frota de 10 clientes é um upsell que já está entregue e não cobrado.

**Por que é raro no Brasil.** Agência daqui vende **pacote fechado com escopo verbal** e depois absorve o extra "porque é rápido". *Entitlement/plan gating* é vocabulário de SaaS. E o detalhe que faz esta alavanca ser barata é doméstico: **o mecanismo já está construído** — o manifesto foi feito para o cliente entender o produto, e ele funciona igualmente bem como contrato legível por máquina. Ninguém aqui tem isso porque quase ninguém tem manifesto nenhum.

**Primeiro passo (1h).** Adicione o campo `plano` no `cliente.yaml` de cada cliente com o que está no contrato de verdade (não o que você lembra) e rode o cruzamento. ⚙️ Aposta fundamentada: aparece pelo menos um vazamento e pelo menos uma promessa aberta na carteira de 10.

**Prova.** ⚠️ AWS SaaS Factory / literatura de tiering e entitlements: plano do tenant como dado, aplicado em runtime — **doc de fornecedor**. 🩸 A prova que vale é interna: o manifesto existe, tem regra dura (*"nada entra como `ativo` sem prova com data"*) e já é renderizado por cliente. A metade que falta é uma string.

**Risco.** Não transforme o manifesto num paywall técnico. Ele é **catálogo e contrato**, não gate de execução — se o código passar a bloquear módulo por plano, você criou uma superfície de bug nova no caminho da resposta ao lead, que é o último lugar onde se mexe por dinheiro.

---

## §3 · O QUE FICA PRA DEPOIS (bom, mas depende de algo antes)

| Item | Depende de | Por que esperar |
|---|---|---|
| **Paridade Kommo (portar `prompt-store` + `evals` + publicar/rollback)** | L1 | Enquanto forem **dois motores**, toda propagação é feita duas vezes. Depois do pacote, a paridade é mover arquivo do adapter para o core — antes dele, é reescrever tudo de novo. **É o primeiro item da fila do §3, com data.** |
| Monorepo + `changesets` (changelog e bump automáticos) | L1 no ar e estável | Sem o pacote, monorepo é só uma pasta com nome bonito |
| Painel web da frota | L2 rodando ~1 mês | O boletim no grupo resolve 90%. Painel só quando existir **outra pessoa** que precise olhar sem terminal |
| Rodar os evals da frota inteira de madrugada em **Batch API** (50% de desconto) | L1 + L3 | Só faz sentido quando propagar for um comando; e a máquina de estado assíncrona já está avaliada em `FRONTEIRA §2.2` |
| `novo-cliente.mjs` **provisionando** projeto Vercel + namespace Upstash + agendamento QStash via API | L4 + L5 medidos | Automatizar provisionamento antes de medir o onboarding é otimizar a etapa errada |
| **SLA/uptime por cliente na Central** (vitrine do boletim) | L2 | Vira argumento de renovação: o cliente vê a frota cuidando dele. Mas só com histórico real, nunca com número inventado |
| Segundo par de mãos (júnior de implantação) | **L5 concluído** | Contratar antes do SOP executável multiplica variância. Ver §4 |

---

## §4 · O QUE FOI REPROVADO (não reabra sem a condição de ressurreição)

| Ideia | Por que morreu | Condição de ressurreição |
|---|---|---|
| **Multi-tenant de verdade** (1 deploy servindo N clientes, tenant no path/header) | Trocaria a **maior vantagem da arquitetura** — isolamento total, raio de dano de um cliente — por uma economia que **não existe**: infra já custa R$50–150/mês por cliente com margem ~93%. Um bug passaria a derrubar a carteira inteira, e um vazamento de dado entre tenants é risco de LGPD que nenhuma economia paga | >40 clientes **e** infra passando de ~15% da receita. Não antes, e provavelmente nunca |
| **Backstage / IDP de verdade** | Plataforma de catálogo feita para centenas de serviços e dezenas de times. Para 10 serviços e 1 pessoa, `frota.json` + 60 linhas entrega ~90% do valor com ~2% do peso | >25 serviços **ou** 3+ pessoas deployando |
| **Terraform/Pulumi para os projetos Vercel** | O inventário é 10 projetos que mudam raramente. O *state file* vira dívida imediata e o `vercel env add` em laço já resolve. É engenharia negativa, o mesmo erro do RAG para 6k tokens (`CONTEXT-ENG.md`) | Quando o `novo-cliente.mjs` estiver criando projeto + domínio + Upstash + QStash — mas aí **ele já é o provisionador**, e a pergunta muda |
| **n8n para orquestrar a frota** | Contraria a doutrina da casa (serverless > n8n) e, no mérito: orquestração de propagação é um script de 60 linhas que roda na sua máquina ou no CI, com `git diff` e log. Pôr isso num fluxo visual adiciona um fornecedor, um ponto de falha e um lugar a mais para olhar | Nunca, no desenho atual |
| **Esteira de CI por cliente** (10 pipelines rodando evals em toda PR) | 10 pipelines para manter, e evals × 10 a cada commit custa dinheiro sem decidir nada — a decisão acontece **3 vezes por mês**, na propagação. O portão certo é o `propagar.mjs` (L3), não o GitHub Actions | Quando houver mais de uma pessoa commitando no motor |
| **Automatizar a UI do GHL com Playwright** (criar os workflows da Etapa 8 por robô) | Superfície que quebra a cada release do GHL e que falha **em silêncio** — exatamente a cicatriz nº 1 da casa (loga sucesso, não entrega), só que agora na fundação do onboarding. Você trocaria 3h de clique conferido por uma classe inteira de bug invisível | O GHL publicar API de workflow |
| **Contratar antes do L5** | O gargalo não é braço, é **processo não escrito**. Júnior sem checklist executável não divide o trabalho: ele multiplica a variância e devolve revisão para o dono — que é a hora mais cara | Depois do L5, com TTFV medido e checklist testado por outra pessoa uma vez |
| **Dashboard de "produtividade da agência"** (horas, gráficos, KPIs de time) | Régua de time de 1 pessoa é auto-vigilância cara. Duas semanas de time tracking no ClickUp que você já usa entregam o mesmo insumo e depois se desligam | Quando o time tiver 3+ pessoas |

---

## §5 · O PLANO DE 30 DIAS

> **Custo total: ~28h de build.** ⚙️ Devolve ~14h/mês medidas + elimina ~13,5h/mês de dívida de propagação. **Payback em ~5 semanas**, e a partir daí é composto: cada cliente novo entra na frota em vez de entrar na pilha.

### Semana 1 — VER (a frota, e o próprio número). ~6h

| Dia | O que fazer | Saída |
|---|---|---|
| 1 | `api/version.ts` no template + deploy na Metrik + `frota.json` com os 10 | **A primeira tabela da frota** |
| 1 | `scripts/frota.mjs` (~60 linhas) rodando contra os 10 | O retrato da dívida: quem está em qual versão |
| 2 | **Meça o seu toil**: ligue o time tracking do ClickUp (a skill `registro-clickup` já organiza por cliente) numa lista "Operação da Frota" | Substituir minhas estimativas do §1.3 por **medição** em 2 semanas |
| 2 | **Meça o seu CFR**: `vercel ls --prod` + contagem de erro no `/api/executions` por cliente, 30 dias | O número que decide se L3 vale muito ou pouco **pra você** |
| 3 | Diff de motor: todo cliente contra o template (`diff -rq`) | O mapa das divergências que o `cp -r` criou |
| 4 | Boletim diário da frota no grupo (usa `lib/alert.ts` que já existe) | Uma linha por dia. `PAUSADO` e `MAPA QUEBRADO` aparecem sozinhos |

**Portão da semana 1:** você consegue responder *"quem está atrasado?"* em 20 segundos. Se não, não avance.

### Semana 2 — EMPACOTAR. ~10h

| O que | Detalhe |
|---|---|
| Resolver as divergências achadas no dia 3 | **Antes** de empacotar. Empacotar bagunça congela bagunça |
| Extrair `@metrik/agente-core` + `@metrik/adapter-ghl` | Git tag ou GitHub Packages privado. Semver de verdade |
| Migrar **só a Metrik** (onda 0) para o pacote | Shims de re-export em `api/`, `npm run typecheck`, evals 10/10, E2E real |
| **Testar o rollback de propósito**, em horário morto | Rollback não testado não existe |

**Portão da semana 2:** a Metrik roda 100% do pacote e você voltou dela e foi de novo, com prova.

### Semana 3 — PROPAGAR COM ONDA. ~6h

| O que | Detalhe |
|---|---|
| `scripts/propagar.mjs --onda N --core <v>` completo | Ponto de rollback → typecheck → evals → deploy → smoke → rollback automático |
| Portão de bake: 24h + taxa de erro ≤ baseline | O script **recusa** onda seguinte sem isso |
| Onda 1 (1 GHL + 1 Kommo) → bake → onda 2 | **A frota inteira na mesma versão, pela primeira vez** |
| `cliente.yaml` + `scripts/envs.mjs` (diff de env) | Rodando dentro do `propagar.mjs`, antes do deploy |

**Portão da semana 3:** `node scripts/frota.mjs` mostra **uma versão só** em toda a coluna `core`.

### Semana 4 — DELEGAR E DESLIGAR O TELEFONE. ~6h

| O que | Detalhe |
|---|---|
| `api/diagnostico.ts` com os passos 1 e 2 (execução + gate) | Cobre a maior parte dos "parou" |
| `/diag`, `/frota` e `/pausa` no grupo de alertas | Só do JID da equipe. Nada destrutivo |
| **Grave e cronometre** o próximo onboarding | O vídeo vira o checklist de 3 colunas (clique · como saber que deu certo · o que quebra) |
| `plano` no `cliente.yaml` + cruzamento no `frota.mjs` | As listas de **VAZAMENTO** e **PROMESSA ABERTA** |
| Ligue o TTFV (`t0`/`t1` no Redis) | O número que vira promessa contratual |

**Portão da semana 4:** o próximo cliente entra com `cliente.yaml`, checklist e TTFV medido — e alguém que não é você consegue executar a parte de clique.

### A regra de parada (escreva no calendário do dia 30)

> **Se no dia 30 uma rodada de propagação não couber em 30 minutos atendidos, o problema NÃO é falta de script — é a fronteira do pacote estar errada.** Volte ao L1, veja o que ficou do lado errado da linha (quase sempre: algo do cliente vazou para o motor, ou algo do motor ficou duplicado nos dois adapters) e conserte a fronteira. **Não adicione automação em cima de uma fronteira ruim** — isso é como enfiar mais FAQ num prompt que já está na altitude errada.

---

## §6 · ONDE ESTA OPERAÇÃO ESTÁ EM RELAÇÃO AO ESTADO DA ARTE

A `FRONTEIRA.md §6` fechou dizendo que o agente está **acima da média mundial em governança e abaixo em memória**. Na dimensão de **operação de frota**, o retrato é diferente e mais duro:

O produto é maduro — evals como porteiro, guardião, analista, auditora, manifesto que não mente, Central que sustenta preço. **A fábrica que produz esse produto ainda é artesanal.** `cp -r`, `sed -i`, "abra a Central de cada cliente para saber quem está atrasado", dois motores para o mesmo organismo. Isso não é falha de conhecimento: é a consequência natural de uma casa que cresceu construindo, com a mesma pessoa fazendo build e operação — e é exatamente o ponto onde toda agência técnica trava, porque o custo de consertar aparece justamente quando você está mais ocupado.

A boa notícia é que **nada aqui pede stack nova, fornecedor novo ou dinheiro novo**. Pede ~28h de trabalho de encanamento sobre peças que já existem: `/api/validate`, `lib/manifest.ts`, `lib/prompt-store.ts`, `lib/alert.ts`, `api/executions`, o grupo de alertas, o ClickUp. **A distância entre 10 e 30 clientes não é tecnológica — é a mesma coisa que a `FRONTEIRA` disse do agente: é de calendário.** A diferença é que aqui o calendário está trabalhando contra você: cada cliente novo assinado antes do L1 encarece o L1 em ~30 minutos por rodada, para sempre.

---

> **Última palavra.** A `FRONTEIRA.md` é o arquivo do que o agente faz. **Este é o arquivo do que a agência aguenta.** Os dois se encontram num ponto só: toda peça nova da FRONTEIRA só vale o que vale **multiplicada pelo número de clientes que a recebem** — e hoje esse multiplicador é 1. O L1 é o que transforma o multiplicador em 10. **Construa o encanamento antes de construir mais cérebro.**
