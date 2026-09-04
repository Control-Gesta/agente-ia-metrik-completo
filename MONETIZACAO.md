# MONETIZAÇÃO — o arquivo do DINHEIRO

> **O que é este documento.** `FRONTEIRA.md` responde *"o que construir depois"*. Este responde outra pergunta: **"como cobrar mais por isso e não perder o cliente"**. Nada aqui é engenharia de modelo — é desenho de **prova**, **preço**, **contrato** e **retenção**. Se você procura harness, evals, latência, custo de token, guardrails, voz ou memória, o arquivo é o outro. **Este não repete nada de lá.**
>
> **Regra de admissão (a mesma da casa, aplicada ao comercial):** move preço, churn ou capacidade de atender mais clientes · cabe numa operação de ~10 clientes serverless · tem prova citável · **é raro no Brasil** (se toda agência já faz, não entra).
>
> **A tese em uma frase:** hoje o produto é vendido pelo que ele FAZ (atende 24/7, entende áudio, marca reunião). Isso é preço-de-ferramenta e tem teto — o mercado brasileiro já ancorou em **R$800–3.000/mês** ⚠️. O único jeito de furar o teto é vender o **DELTA** ("+14 reuniões por mês, provado por sorteio"), e delta exige um desenho experimental que **praticamente ninguém no Brasil roda em operação comercial**.

**Legenda de prova (mesma da casa):**

| Marca | Significado |
|---|---|
| ✅ | **Paper revisado por pares ou dado primário** — a prova mais forte deste arquivo |
| 📄 | Doc de fornecedor sério / survey independente — bom, mas leia com a mão no bolso |
| ⚠️ | **Marketing de vendor ou blog de conteúdo** — serve de referência de mercado, **não é prova** |
| 🧮 | **ESTIMATIVA fundamentada** — a conta está exposta, os pressupostos estão escritos, o número muda se o pressuposto mudar |
| 🩸 | Cicatriz nossa, com data |

---

## §1 · POR QUE RELATÓRIO DE ATIVIDADE NÃO SUSTENTA PREÇO

### 1.1 · A escada de afirmações (e onde o mercado brasileiro parou)

| Nível | O que a agência mostra | O cliente pensa | Teto de preço |
|---|---|---|---|
| 0 | "A IA atendeu 312 conversas" | *Ok, e daí? Meu time também atenderia* | preço-de-ferramenta |
| 1 | "Tempo de resposta caiu de 40min pra 30s" | *Legal. Mas isso me deu dinheiro?* | preço-de-ferramenta |
| 2 | "Este mês teve 41 reuniões, mês passado 33" | *Foi a IA ou foi o tráfego novo que contratei?* | preço-de-operação |
| 3 | "Leads com IA convertem 18%, sem IA 12%" | *Quem escolheu quais leads ganhavam IA?* | **frágil — cai no primeiro cético** |
| 4 | **"Sorteei os leads. Quem caiu na IA converteu 16,8%; quem caiu na fila humana, 12,0%. Diferença de 4,8pp, intervalo 1,9–7,7pp, n=4.756."** | *Isso é meu. Não posso cancelar isso.* | **preço-de-resultado** |

O mercado brasileiro de agente de IA inteiro vive entre 0 e 2. Uma busca por players de AI SDR no Brasil devolve promessas do tipo *"redução de 60% a 80% no custo por reunião agendada"* — **sem grupo de controle, sem desenho, sem n**. Ninguém mostra contrafactual. Isso não é um detalhe metodológico: **é a linha que separa quem cobra R$2.000 de quem cobra R$5.000 pelo mesmo trabalho.**

### 1.2 · A bomba que já está armada na nossa própria operação 🩸

Leia isto duas vezes:

> **Hoje, quem decide qual lead recebe a IA é o humano que põe a `GATE_TAG`.** Isso é **SELEÇÃO**, não randomização. E o `lib/auditor.ts` já dispara **toda sexta-feira** uma comparação *"com IA × sem IA"* construída exatamente em cima dessa seleção (`SKILL.md` §1, órgão "Olhos no negócio").

Se o time tagueia os leads que "parecem melhores" — e o time SEMPRE tagueia os que parecem melhores, é o comportamento racional dele — esse número está inflado **e você não sabe por quanto.** Você entrega prova viciada para ~10 clientes, toda semana, com a sua assinatura.

**Quanto isso pode estar errado?** ✅ Gordon, Zettelmeyer, Bhargava & Chapsky (*Marketing Science* 38(2), 2019) compararam métodos observacionais contra 15 RCTs no Facebook — **500 milhões de observações usuário-experimento, 1,6 bilhão de impressões**. Resultado: métodos observacionais erram o lift do RCT por fator ~3 em metade dos estudos; *propensity score matching* escalado **superestimou o lift verdadeiro por fator 6,96 / 9,48 / 7,64** (topo / meio / fundo de funil) na mediana — e por **fator 54 a 129** no decil onde o lift real era menor.

Traduzindo para a sua sexta-feira: quando o efeito real é pequeno, o método sem randomização erra **mais**, não menos. É exatamente o cliente que você mais precisa segurar.

**Isso não é oportunidade. É conserto.** E é o único item deste arquivo com caráter de urgência defensiva.

### 1.3 · O que acontece com quem não prova (o número que assusta)

📄 Em março de 2025 a TechCrunch publicou a investigação sobre a **11x** (a16z / Benchmark), a AI SDR mais bem financiada do mundo: **churn de 70–80%** nas cohorts iniciais — de ~US$14M de ARR reportado, cerca de US$3M sobreviviam à cláusula de quebra de 90 dias. Um cliente citado (ZoomInfo) rodou um mês, concluiu que a IA performou "significativamente pior que os SDRs humanos" e não renovou.

📄 E o pano de fundo: o relatório *The GenAI Divide* (MIT Project NANDA, jul/2025) — 150 entrevistas, 350 respostas de funcionários, 300 casos públicos — conclui que **95% dos pilotos de IA generativa não produzem retorno mensurável no P&L**. A causa apontada não é qualidade de modelo: é *learning gap* e desalinhamento com a operação.

**O mecanismo nº1 de morte de agente de IA não é o produto ser ruim — é o cliente não conseguir atribuir resultado.** É isso que este arquivo ataca.

---

## §2 · A PROVA — o desenho de causalidade, passo a passo

### 2.0 · Por que isto é raro no Brasil (seja honesto ao vender)

Não repita a lorota de que "ninguém no Brasil fala de incrementalidade". **Fala.** Já existe conteúdo em português indexado — E-Commerce Brasil, calculadoras de incrementalidade, e até artigo ensinando *holdout test em CRM* para e-mail/SMS/WhatsApp (`wicomm.com.br/crm/holdout-test-em-crm`, abr/2026) ⚠️. Se você vender "conceito inédito", o cliente cético acha o link em 30 segundos e você perde a sala.

**O que é REALMENTE raro, e verificado item a item naquele mesmo artigo brasileiro:** ele não menciona **pré-registro do plano**, não menciona **intenção-de-tratar**, não menciona **cálculo de MDE/poder** e não menciona **teste sequencial**. 

> **A frase certa de venda: "o conceito chegou no Brasil em 2025-26. O RIGOR não chegou. Eu trago o rigor."**

Lá fora o holdout é **default de plataforma**, não debate: 📄 Klaviyo recomenda 5%, GrowthBook traz 5% de fábrica, Amplitude documenta 1–10%, Optimizely até 5%, Statsig e Blueshift têm o recurso nativo. E 📄 52% dos marketers americanos já rodam teste de incrementalidade (survey EMARKETER/TransUnion, jul/2025 — **independente, não vendor**). Ninguém discute *se* faz; discute o tamanho.

### 2.1 · A ESCADA DE DESFECHOS — escolha a métrica pelo TAMANHO DO EFEITO, não pela importância

Esta é a matemática mínima. Cabe numa linha:

```
n por braço = 16 · σ² / Δ²        (α=5%, poder 80%)
para desfecho 0/1:  σ² = p̄·(1−p̄)
```

✅ É a "regra dos 16" de **Kohavi, Tang & Xu, *Trustworthy Online Controlled Experiments*** (Cambridge, 2020), derivada do teste bilateral com α=0,05 e poder 80%.

**O corolário que muda tudo: efeito GRANDE precisa de amostra MINÚSCULA.** Rodei o funil de SDR no WhatsApp (todos os números conferidos em código, arredondados para cima):

| Degrau | controle → IA | n/braço | sprint 50/50 | com holdout 10% | 1 cliente (300 leads/mês) | pool (10 clientes, 3.000/mês) |
|---|---|---|---|---|---|---|
| 1 · respondeu em ≤5 min | 40% → 98% | **11** | 22 | 62 | **2 dias** (sprint) | — |
| 2 · lead respondeu de volta | 35% → 55% | **99** | 198 | 550 | 20 dias (sprint) · 1,8 mês (holdout) | **< 1 semana** |
| 3 · lead qualificado | 20% → 30% | **301** | 602 | 1.673 | 2 meses (sprint) · 5,6 meses | **2,4 semanas** |
| 4 · **reunião agendada em 7d** | 12% → 16,8% (+40%) | **856** | 1.712 | 4.756 | **15,9 meses** | **6,9 semanas** |
| 5 · venda fechada | 3% → 4,2% | **3.856** | 7.712 | 21.423 | **71 meses** (inviável) | **7 meses** (viável!) |

Três leituras obrigatórias desta tabela:

1. **O pedágio do holdout pequeno.** Com holdout de 10% você precisa de **2,78× mais leads** que num 50/50 (porque `1/0,9 + 1/0,1 = 11,11` contra `4`). Holdout menor é mais confortável para o cliente e **muito** mais caro em tempo.
2. **"Venda fechada" é inviável por cliente — sempre.** Prometer prova causal de RECEITA para um cliente de 300 leads/mês é prometer 6 anos. ✅ É exatamente o que Lewis & Rao demonstraram no *Quarterly Journal of Economics* 130(4), 2015 (*The Unfavorable Economics of Measuring the Returns to Advertising*): em 25 experimentos de campo com grandes varejistas, o **intervalo de confiança mediano sobre o ROI tem mais de 100 pontos percentuais de largura**; vendas individuais têm coeficiente de variação ~10; experimentos informativos podem exigir mais de **10 milhões de pessoa-semanas**. Descer a escada não é preguiça — é engenharia.
3. **Mas o POOL fecha o degrau 5 em ~7 meses.** Nenhum cliente seu consegue. Nenhum concorrente com 1 ou 2 clientes consegue. **Você consegue.** Isso é §2.5 e é o fosso.

**A tabela vai na PROPOSTA COMERCIAL.** Chegar numa reunião de venda dizendo *"com os seus 300 leads/mês, eu provo o degrau 1 em 2 dias, o degrau 2 em 20 dias, e o degrau 4 leva 16 meses sozinho — por isso eu rodo o degrau 4 no meu portfólio"* faz uma coisa que nenhum concorrente faz: **ela te posiciona como a única pessoa honesta na sala.**

> **⚠️ O pecado capital desta seção:** vender o degrau 1 como se fosse o degrau 4. "Provei que a IA aumenta reunião" com evidência de tempo de resposta é a mesma desonestidade que você está tentando matar. **Apresente a escada INTEIRA, sempre**, com n e intervalo em cada linha. A honestidade da escada É o produto.
>
> **⚠️ NÃO-PROVA, marcado de propósito:** os famosos *"21× mais chance de qualificar respondendo em 5 min"* e *"100× mais chance de contato"* vêm do estudo Oldroyd/InsideSales (2007) e do HBR *The Short Life of Online Sales Leads* (2011). São **observacionais e de vendor**. Use para explicar *por que* o degrau 1 importa comercialmente — **nunca** como prova de que a IA causou receita.

### 2.2 · O DESENHO — os três formatos, e quando usar cada um

| Desenho | Randomiza | Use quando | Custo |
|---|---|---|---|
| **A · Holdout por lead** | o LEAD (hash do telefone) | padrão. Cliente aceita "10% no fluxo de sempre" | 2,78× leads (h=10%) |
| **B · Switchback por janela** | o DIA | cliente **se recusa** a deixar lead sem IA · ou você quer medir algo que não é por lead (prompt global, voz on/off, cadência) | menos poder por lead |
| **C · Rollout escalonado + baseline** | a ORDEM dos clientes/funis | sempre, de graça, porque você já faz isso — só falta capturar o pré-período | ~1h por cliente |

**Os três se somam.** A é a prova forte. B destrava o cliente relutante. C é o que dá VOLUME e é o que expira se você não fizer agora.

#### Desenho A — holdout por lead (o principal)

Regra de ouro que quase todo mundo erra: **randomize SÓ entre ELEGÍVEIS, e DEPOIS da rampagem.**

```
lead entra
   ↓
[filtro de elegibilidade]   ← mesma origem, mesmo funil, mesma janela, cliente já rampado
   ↓                          (Lei 3 da casa NÃO morre: gate por tag + 1 → 10 → todos vem ANTES)
[sorteio determinístico]    ← hash(telefone + salt) — a randomização entra aqui
   ↓                    ↓
 braço IA (90%)     braço CONTROLE (10%)
                        ↓
                 fila humana normal = literalmente o atendimento que ele tinha antes de te contratar
```

Se o sorteio acontecer **antes** do filtro de qualidade, o cliente vê a IA atendendo lead que não devia — e você perde o contrato antes de terminar o teste.

**O braço de controle NUNCA é "lead sem atendimento".** É o atendimento humano padrão do cliente. Guarde essa frase, ela é metade da venda ética (§2.7).

#### Desenho B — switchback (a versão eticamente vendável)

Randomize **janelas de tempo**: todo lead que entra num dia ON recebe a IA; todo lead de um dia OFF vai pro fluxo humano. O pitch muda completamente: *"ninguém fica sem atendimento — em alguns dias o atendimento é o de sempre"*.

✅ **Por que isso existe e não é frescura:** randomizar por lead assume que o lead de controle não é afetado pelo tratamento dos outros (SUTVA). **Aqui isso é falso por construção** — o mesmo time humano atende os dois braços. Com holdout de 10%, o time fica com uma fração da carga que tinha antes, responde os leads de controle **mais rápido** do que responderia na vida real, o controle fica artificialmente bom e **seu lift medido é SUBESTIMADO**.

A direção joga a seu favor (você entrega um **piso**, não um teto — argumento comercial excelente: *"o número real é pelo menos este"*). A magnitude: ✅ Holtz, Lobel, Liskovich & Aral, *Management Science* 71(1), 2025 (meta-experimento de precificação no Airbnb) mediram que **ao menos 19,76%** do efeito estimado pela randomização individual era viés de interferência — **32,60%** num dos experimentos sobre bookings.

> ⚠️ **Honestidade sobre esse 19,76%:** vem de interferência de MERCADO (anúncios competindo pelo mesmo hóspede, oferta finita). O nosso canal é outro (time humano com menos carga). Se o time do cliente **não** está com capacidade estourada, o viés pode ser perto de zero. **Não empreste o número do Airbnb como se fosse seu.** Use-o para justificar a existência do switchback, não para quantificar o seu viés.

Regras não-negociáveis do switchback:
- **Blocos de dia inteiro (≥72h se o followup for longo).** O ciclo de followup do agente dura dias; janela de meio-turno vaza tratamento pra janela seguinte.
- **O lead pertence à janela em que ENTROU** e fica nesse braço a conversa inteira, inclusive o followup.
- **Sorteie em blocos que equilibrem dia da semana.** Nunca "segunda a quarta ON, quinta e sexta OFF" — dias têm padrão forte de volume e de humor de lead.

✅ Desenho ótimo e análise: Bojinov, Simchi-Levi & Zhao, *Design and Analysis of Switchback Experiments*, *Management Science* 69(7), 2022.

#### Desenho C — baseline + rollout escalonado (a janela que só abre uma vez)

A agência **já** liga o agente em clientes diferentes em datas diferentes. Isso já é um desenho de rollout escalonado — só que ele só vira prova se o **pré-período** for capturado antes do switch. E hoje não é.

Duas mudanças de ritual:

1. **Antes de ligar qualquer coisa**, extraia com o `lib/auditor.ts` **8–12 semanas retroativas** do funil (leads/semana, taxa por etapa, tempo entre etapas, motivo de perda, origem) e congele num snapshot **datado e versionado**.
2. **Nunca acenda todos os funis de uma vez.** Deixe um pipeline (ou uma clínica da rede, ou uma unidade) como "ainda-não-tratado" por 4–6 semanas. Isso te dá controle **dentro da mesma conta**, imune a sazonalidade e a "foi o mercado que melhorou".

✅ **A melhor prova deste arquivo inteiro:** Brynjolfsson, Li & Raymond, *Generative AI at Work*, *Quarterly Journal of Economics* 140(2), 2025 — **5.179 agentes de atendimento**, introdução **escalonada** de um assistente conversacional de IA generativa, estimado por diferenças-em-diferenças: **+14% de casos resolvidos por hora na média, +34% entre os novatos**, com melhora de sentimento do cliente e de retenção de funcionário. Mesmo desenho, mesmo domínio (IA conversacional em operação de atendimento), publicado no periódico de economia mais duro que existe.

> **Frase de venda que nenhum concorrente brasileiro pode falar:** *"eu meço do mesmo jeito que o estudo do QJE mediu com 5.179 atendentes."*

**⚠️ A pegadinha fina que quase todo mundo erra:** DiD depende de tendências paralelas — mas ✅ Roth (*AER: Insights* 4(3), 2022, *Pretest with Caution*) mostra que **condicionar sua estimativa a "passar" num teste de pré-tendência pode PIORAR o viés e a cobertura do intervalo**, porque esses testes têm poder baixo contra violações plausíveis. **Mostre o gráfico do pré-período e seja honesto sobre a incerteza. Não use o pré-teste como carimbo de aprovação.**

**⏳ E este ativo EXPIRA.** O dado do pré-período existe no CRM do cliente **hoje** e vira zero no dia em que o funil for remodelado. Cada semana parada destrói valor que não se recompra a nenhum preço.

### 2.3 · O QUE INSTRUMENTAR NESTA STACK (as peças já existem)

Nada aqui é sistema novo. É **carimbo** em coisa que já roda.

| Peça | Já existe | O que muda |
|---|---|---|
| `api/inbound.ts` | ✅ | +8 linhas: sorteio determinístico e gravação do braço |
| `api/executions` (diário) | ✅ | passa a carregar `exp_id` + `arm` em cada execução |
| `lib/auditor.ts` | ✅ (roda sexta) | passa a cruzar braço × desfecho **por intenção-de-tratar** |
| Redis Upstash | ✅ | 2 chaves novas: plano pré-registrado e atribuição de braço |
| `area-cliente/` (Central) | ✅ | 1 aba: "A Prova" |
| `lib/prompt-store.ts` | ✅ | fonte do *prior* para §2.6 |

**Passo 1 — o sorteio (no `api/inbound.ts`):**

```ts
// DEPOIS do 200, DEPOIS do gate por tag e do filtro de elegibilidade, ANTES do buffer.
import { createHash } from 'crypto'

const EXP = process.env.EXP_ID            // ex.: "psi-2026-08-reuniao"
const SALT = process.env.EXP_SALT         // FIXO por experimento. Trocar = experimento vira lixo.
const HOLDOUT_PCT = Number(process.env.EXP_HOLDOUT ?? 0)   // 0 = desligado (default)

function sortear(phone: string) {
  const h = createHash('sha256').update(`${phone}|${SALT}`).digest('hex').slice(0, 8)
  return (parseInt(h, 16) % 1000) < (1000 - HOLDOUT_PCT * 10) ? 'ia' : 'controle'
}

// grava UMA vez e nunca reescreve — o braço do lead é imutável
const key = `agente-${SLUG}:exp:${EXP}:arm:${phone}`
const arm = sortear(phone)
await redis.set(key, arm, { nx: true })
const armFinal = (await redis.get<string>(key)) ?? arm

await logDiario('sorteio', { exp: EXP, arm: armFinal })   // vai pro diário SEMPRE, nos dois braços

if (armFinal === 'controle') return    // 200 já foi. A IA não toca neste lead. O humano atende.
```

**Passo 2 — o pré-registro (antes de qualquer lead entrar):**

```ts
// scripts/preregistro.mjs — grava e trava o plano ANTES do experimento começar
const plano = {
  exp_id: 'psi-2026-08-reuniao',
  cliente: 'psi',
  metrica_primaria: 'reuniao_agendada_em_7d',
  desfechos_secundarios: ['respondeu_em_5min', 'lead_respondeu', 'qualificado'],
  p0_esperado: 0.12,            // veio do baseline retroativo, não do chute
  mde_relativo: 0.40,
  n_alvo_por_braco: 856,
  holdout_pct: 10,
  elegibilidade: 'origem=meta_ads AND funil=comercial AND pos_rampagem',
  analise: 'intencao-de-tratar (ITT). Nenhum filtro pos-tratamento.',
  regra_de_parada: 'so declara ao atingir n_alvo OU intervalo sempre-valido excluir zero',
  data_inicio: '2026-08-01',
  data_corte: '2027-01-01',
  salt: 'CONGELADO'
}
const hash = createHash('sha256').update(JSON.stringify(plano)).digest('hex').slice(0, 12)
await redis.set(`agente-psi:experimento:plano`, JSON.stringify({ ...plano, hash }), { nx: true })
```

**A Central exibe esse hash.** É um detalhe barato e é a coisa mais poderosa da reunião: *"o plano foi escrito no dia 1 e está travado. Este é o hash. Eu não escolhi a métrica depois de ver o resultado."*

**Passo 3 — a análise, no `lib/auditor.ts`, por INTENÇÃO-DE-TRATAR:**

```ts
// ITT: o lead sorteado pra IA conta como IA — mesmo que a IA tenha falhado,
// escalado pro humano, o buffer tenha morrido ou o lead nunca tenha respondido.
const ia   = leads.filter(l => l.arm === 'ia')          // TODOS. Sem exceção.
const ctrl = leads.filter(l => l.arm === 'controle')
const taxa = (g) => g.filter(l => l.chegouEm('Agendado', 7)).length / g.length
```

> 🩸 **Filtrar por "conversas que realmente aconteceram" é seleção pós-tratamento e recoloca TODO o viés que a randomização acabou de tirar.** É o erro mais comum e o mais invisível. Se a IA falha em 8% dos leads e você exclui esses 8%, você está comparando "IA que funcionou" contra "todo mundo" — e o número volta a ser ficção. **ITT ou nada.**

**Passo 4 — a Central mostra 3 estados, nunca um p-valor:**

```
⏳ "ainda não dá pra afirmar"      →  PARCIAL — 340/856 leads. Sem número de lift.
📊 "diferença consistente"          →  intervalo sempre-válido exclui zero
🔒 "diferença forte e estável"      →  n-alvo batido + intervalo exclui zero
```

### 2.4 · COMO NÃO SE ENGANAR (a máquina de churn que ninguém vê)

`FRONTEIRA.md` §5 já manda *"nunca mostre a taxa com n < 100"*. **Isso é insuficiente, e o motivo é contraintuitivo.**

Com p0=12% e lift real de +40%, **n=100 por braço dá poder de 16,1%** (conferido em código). Nesse regime, qualquer resultado que apareça como "significativo" é, **por construção**, no mínimo **2,02× o efeito verdadeiro**: a menor estimativa que cruza a barra de significância é 1,96×EP = **9,71pp**, contra **4,8pp** reais.

Ou seja: você mostra **"+100% de reuniões!"**, o trimestre seguinte regride para o +40% verdadeiro, e o cliente conclui que **a IA DEGRADOU**. Você é cancelado por regressão à média — e nunca descobre a causa, porque tecnicamente nada quebrou.

✅ **Erro tipo M (magnitude) e tipo S (sinal):** Gelman & Carlin, *Beyond Power Calculations*, *Perspectives on Psychological Science* 9(6), 2014 — numa simulação com **6% de poder**, o efeito "significativo" publicado é **~10× o efeito real** e **1 em cada 4 resultados tem o SINAL invertido**.

E tem a segunda metade: **a Central é um painel AO VIVO que o cliente olha todo dia.** Isso é **monitoramento contínuo**, e monitoramento contínuo com p-valor clássico infla falso positivo brutalmente.

⚠️ Simulação A/A da Optimizely (**white paper de vendor**, mas assentado sobre papers revisados): em testes de 5.000 visitantes, quem olhava a cada visitante viu **57% de falsos vencedores**; a cada 500 visitantes, **26%**; a cada 1.000, **20%**. Com o Stats Engine (mSPRT) caiu para <5%. ✅ A base séria: Johari, Pekelis & Walsh, *Peeking at A/B Tests*, KDD 2017; Johari, Koomen, Pekelis & Walsh, *Always Valid Inference*, *Operations Research* 70(3), 2022.

**A cura, em ~20 linhas de JS** — sequências de confiança assintóticas, fórmula implementável do GrowthBook (mesma família das de Howard & Ramdas usadas por Netflix e Spotify):

```js
// Nstar = o n PRÉ-REGISTRADO (ancorar aqui minimiza a perda de poder)
const rho = Math.sqrt((-2*Math.log(a) + Math.log(-2*Math.log(a) + 1)) / Nstar)
const meiaLargura = sigmaHat * Math.sqrt(N) * Math.sqrt(
  (2*(N*rho**2 + 1)) / (N**2 * rho**2) * Math.log(Math.sqrt(N*rho**2 + 1) / a)
)
```

**As três regras, nesta ordem:**
1. **Trave o n pré-registrado.** Até bater a meta, exiba `PARCIAL — 340/856 leads` e **nenhum número de lift**. Silêncio é mais barato que mentira.
2. **Quando exibir, exiba intervalo sempre-válido.** Ele é **mais largo** que o de horizonte fixo — você demora mais pra poder cantar vitória. Esse é o preço de não mentir, e **venda esse preço na primeira reunião**, não quando o cliente reclamar.
3. **Nunca imprima p-valor no painel do cliente.** Três estados em português (§2.3, passo 4).

> **Honestidade sobre esta seção:** não existe estudo publicado ligando erro tipo M a cancelamento de PME brasileira. Gelman é sobre publicação científica. O elo *"painel ao vivo → número inflado → regressão → cancelamento"* é **raciocínio meu**, não dado. 🧮 O que sustenta a compra é outra coisa e é sólida: **a Central é o que sustenta preço** (`SKILL.md` §1, textualmente) e você está convidando o cliente a olhar todo dia um número que infla falso positivo. **Blindar o ativo que já é precificado — isso é dinheiro.** Custo: ~20 linhas.

### 2.5 · O PORTFÓLIO É O FOSSO (e é o que resolve o problema de volume)

Releia a última coluna da tabela de §2.1. Sozinho, um cliente de 300 leads/mês leva **~16 meses** pra fechar o degrau "reunião agendada". O **portfólio** — 10 clientes, ~3.000 leads/mês — fecha o mesmo degrau em **~7 semanas**. E fecha o degrau "venda" em **~7 meses**, que sozinho seria 6 anos.

**Isso não é relatório. É estrutura de mercado:**

- **Nenhum cliente seu consegue rodar isso sozinho.** Ele não tem volume.
- **Nenhum concorrente com 1 ou 2 clientes consegue.** Ele não tem volume.
- **Você consegue, e fica melhor a cada cliente novo.** É o único ativo deste arquivo que **compõe**.

O que isso permite dizer numa venda: *"não é opinião minha que agente de IA aumenta agendamento. Eu meço isso em 10 operações, com sorteio, num pool de 3.000 leads/mês. Você entra num programa de medição que já está rodando — você não é a cobaia, você é o beneficiário."*

**⚠️ O trabalho está subestimado.** Juntar GHL + Kommo, verticais diferentes e funis diferentes num schema comparável **não é 1h por cliente** — é engenharia de dados dentro do `lib/auditor.ts`. Orce **~1h/cliente para extrair o baseline bruto** e **1–2 dias uma única vez** para o schema canônico do pool.

### 2.6 · TEST & ROLL + CUPED — a régua das decisões INTERNAS (não vai pro cliente)

Teste de hipótese foi desenhado pra publicar paper, não pra decidir onde alocar lead. ✅ **Feit & Berman, *Test & Roll: Profit-Maximizing A/B Tests*, *Marketing Science* 38(6), 2019** reformulam o A/B como trade-off explícito de **lucro**: custo de oportunidade do teste contra a perda de rodar o braço pior no resto da população. Do abstract: *"derivamos uma expressão em forma fechada para o tamanho de teste que maximiza lucro e mostramos que ele é substancialmente menor do que o tipicamente recomendado para um teste de hipótese"*.

```js
// transcrito do código de replicação oficial dos autores (nn_functions.R, eleafeit/testandroll)
const n = (-3*s*s + Math.sqrt(9*s**4 + 4*N*s*s*sig*sig)) / (4*sig*sig)
// N = população total (teste + roll) · s = desvio-padrão do desfecho · sig = incerteza a priori entre braços
```

Rodando com um cliente real (N=3.000 leads no trimestre, "reunião agendada" p≈12% → s=0,325, σ=0,025):

| σ (incerteza a priori) | n* por braço | vs. cálculo clássico (856) |
|---|---|---|
| 0,0125 (braços quase iguais) | 367 | 2,3× menor |
| **0,025 (±5pp plausível)** | **251** | **3,4× menor** |
| 0,05 (braços bem diferentes) | 149 | 5,7× menor |

**Onde usar:** decisões INTERNAS que você já toma no escuro toda semana — **qual versão do prompt, qual cadência de followup, voz ligada ou não**. Cada uma dessas mexe direto na taxa de reunião, que é a métrica pela qual o cliente paga. 🧮 2pp a mais de conversão sobre 10 clientes × 300 leads = **~60 reuniões/mês na carteira**. Esse é o loop de maior FREQUÊNCIA do negócio.

**O prior sai de dado, não de intuição:** o `lib/prompt-store.ts` já guarda 20 versões com nota — o espalhamento histórico das taxas entre versões é o seu σ. **Rode com σ pela metade e σ dobrado e publique a sensibilidade junto com a decisão** (a fórmula tem σ² no denominador: prior lixo → n lixo → decisão tomada no ruído, e você nunca saberá que errou).

**O acessório que provavelmente vale mais que a peça principal:** ✅ **CUPED** (Deng, Xu, Kohavi & Walker, WSDM 2013) usa o pré-período do próprio lead/origem para remover variância previsível — **30–50% de redução** é o número reportado na indústria (padrão em Netflix, Booking.com, Optimizely). Isso é **desconto direto em TODO experimento que você vai rodar pelo resto da vida** — multiplicador de §2.1, §2.3 e §2.5, não um item paralelo. Complemento para o caso "quase ninguém converte": estratificação latente do Google (arXiv 1911.08438), ~40% de variância a menos.

> **🚨 A regra que separa as duas ferramentas — e misturar as duas é exatamente como o mercado se engana:**
> - **Holdout pré-registrado (§2.3)** → a afirmação CAUSAL que vai ao cliente e sustenta preço.
> - **Test & Roll** → regra de decisão sob incerteza, uso INTERNO. **Nunca venda como "prova estatística".** Se você apresentar ao cliente com a mesma linguagem do holdout, destrói a credibilidade que o holdout construiu.

### 2.7 · COMO APRESENTAR AO CLIENTE (o laudo de uma página)

Uma página. Sem p-valor. Sem jargão. Nesta ordem:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A PROVA — Clínica X · agosto a novembro/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMO FOI MEDIDO
Todo lead elegível foi sorteado por computador. 9 em cada 10 foram
para a IA. 1 em cada 10 seguiu para a sua fila humana normal — o mesmo
atendimento que você tinha antes de me contratar. Ninguém ficou sem
atendimento. O plano de análise foi escrito e travado ANTES do primeiro
lead entrar (hash a3f9c2e10b47).

O QUE ACONTECEU
                        IA          Fila humana
Leads sorteados        4.280            476
Respondidos em 5 min    98,1%          41,2%     ← diferença forte e estável
Responderam de volta    54,8%          36,1%     ← diferença forte e estável
Reunião em 7 dias       16,9%          12,2%     ← diferença consistente
                                                    (+4,7pp · faixa 1,8 a 7,6)
Venda fechada            4,1%           3,2%     ← ainda não dá pra afirmar
                                                    (4.756 de 21.423 leads)

O QUE ISSO SIGNIFICA EM REUNIÃO
Nos 300 leads/mês que você recebe, o sorteio indica entre
+5 e +23 reuniões por mês que não existiriam sem a IA.
Ponto central: +14.

O QUE ESTE NÚMERO NÃO DIZ
· "Venda fechada" ainda não tem amostra. Com o seu volume, leva ~6 anos
  sozinho — por isso essa linha é medida no meu portfólio (10 operações,
  3.000 leads/mês), onde fecha em ~7 meses. Data prevista: jun/2027.
· O seu time atendeu menos leads durante o teste (só 10%), então
  provavelmente respondeu o grupo de controle MAIS rápido que responderia
  normalmente. Isso empurra o número medido PRA BAIXO.
  O +4,7pp é um PISO, não um teto.

O QUE A PROVA CUSTOU A VOCÊ
1,4 reunião por mês ficou com o time humano em vez da IA.
Isso está creditado na sua fatura (linha "crédito de holdout").
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Os quatro movimentos que fazem esse laudo funcionar:**

1. **"Como foi medido" vem ANTES do resultado.** Inverter isso faz o cliente ler o número primeiro e nunca mais prestar atenção no método.
2. **A seção "o que este número NÃO diz" é o que vende.** Todo concorrente esconde os limites. Você lista. Isso compra credibilidade que nenhum número compra.
3. **O piso é um argumento, não uma desculpa.** *"Este número é conservador de propósito"* é infinitamente mais forte que *"este número é ótimo"*.
4. **O custo da prova aparece, com crédito.** Cliente que descobre sozinho que ficou sem 1,4 reunião vira inimigo. Cliente a quem você conta e credita vira sócio.

### 2.8 · O CUIDADO ÉTICO E CONTRATUAL

| Risco | O que fazer |
|---|---|
| **"Você está sonegando atendimento pros meus leads"** | O braço de controle **não é ausência de atendimento** — é o processo humano padrão do cliente. Escreva isso no contrato com essas palavras. |
| **Consentimento** | O experimento é sobre **qual processo interno atende o lead**, não sobre o lead. É desenho operacional, não pesquisa com humanos. Mesmo assim: **o cliente assina a cláusula**. Sem assinatura, não roda. |
| **LGPD** | Não guarde telefone cru na chave do experimento se puder evitar — use o ID do lead do CRM ou hash. O braço e o desfecho bastam para a análise. O diário de execuções já existe e já tem regime próprio. |
| **Cliente com volume baixo (< 150 leads/mês)** | **Não venda holdout.** Venda o degrau 1–2 num sprint 50/50 de 3 dias, e o degrau 4 como parte do pool. Prometer o que a matemática não entrega é a forma mais cara de perder cliente. |
| **Cliente que se recusa** | Desenho B (switchback). Se recusar também: baseline + rollout escalonado (Desenho C), que não tira lead de ninguém. |
| **Salt trocado no meio** | Os leads trocam de braço e o experimento **vira lixo silencioso**. Congele `EXP_SALT` no pré-registro e trate como credencial. |
| **Mudança externa durante o teste** | Cliente trocou mídia, oferta ou time no meio? Registre no diário **com data**. Isso vira parte do laudo, não desculpa depois. |

> **⚠️ A FACE DUPLA — o risco que ninguém quer olhar.** Se o lift medido vier pequeno, **você fabricou a munição do seu próprio cancelamento.** Nenhuma discussão sobre holdout encara isso de frente, e este arquivo encara: **faça mesmo assim.** Melhor descobrir com 10 clientes, em silêncio, e consertar o produto — do que descobrir com 30 e o mercado descobrindo junto. Mas que seja **decisão consciente**, não efeito colateral. E por isso a ordem de execução é: **A/A → holdout interno em 1 cliente → só então cláusula em contrato** (§6).

---

## §3 · PRECIFICAÇÃO — as faixas, a matemática e o contrato

### 3.1 · As quatro faixas (e o que destrava cada degrau)

| Faixa | Modelo | Preço 🧮 | O que você precisa ter | Teto |
|---|---|---|---|---|
| **F1 · Ferramenta** | implantação + mensalidade fixa | ⚠️ R$8–25k + **R$800–3.000/mês** (mercado BR) | o agente funcionando | comparado com chatbot. **Aqui mora o mercado brasileiro inteiro.** |
| **F2 · Operação** | fixa maior + governança contratada | 🧮 **R$3.000–6.000/mês** | Central + guardião + analista + auditora + SLA + kill switch (§3.4) | comparado com um SDR humano |
| **F3 · Resultado (híbrido)** | base + variável por desfecho | 🧮 **base R$2.500 + R$125/reunião incremental** | **holdout rodando** + laudo + diário auditável | comparado com o valor da reunião |
| **F4 · Programa** | fee do portfólio + prova compartilhada | 🧮 F3 + R$500–1.500/mês | pool de medição (§2.5) + benchmark entre verticais | comparado com consultoria |

⚠️ **Sobre as faixas de mercado BR:** vêm de levantamento em blogs de agências e plataformas brasileiras (implantação R$8–25k; mensalidade R$800–3.000; SaaS de R$3–15k/mês). **São conteúdo de marketing, não survey auditado.** Servem como âncora de percepção do comprador, não como benchmark rigoroso.

📄 **O que os gringos fazem, e é o argumento de que F3 não é invenção sua:**
- **Intercom Fin**: **US$0,99 por resolução**, preço publicado, sem taxa de plataforma. NRR da Intercom saiu de **112% para 146%** com a mudança para preço por desfecho.
- **Zendesk** (set/2024): **~US$1,50 por resolução automatizada** em plano comprometido (~US$2 no pay-as-you-go). Resolução definida por janela de silêncio de 72h.
- **Sierra** (Bret Taylor): cobra **só quando o agente resolve sem intervenção humana**. Lógica declarada: um atendimento humano custa US$10–20; a Sierra cobra **uma fração dessa economia**. Chegou a US$150M+ de ARR nessa posição.
- 📄 Kyle Poyar, *State of B2B Monetization 2026* (**230 empresas**, abr–mai/2026): **híbrido saltou de 25% → 37%** em 12 meses e é o modelo mais comum. Margem-alvo mediana de IA: **~50%**. Só 12% miram margem SaaS de 80%+.

> **O detalhe que importa pra você:** a margem-alvo mediana do mercado de IA é ~50%. **A sua é ~95%** (custo direto medido: R$0,16/conversa + R$50–150/mês de infra — 300 conversas custam ~R$198/mês). Você tem folga que nenhum SaaS tem para bancar um modelo variável **sem risco de margem**.

### 3.2 · A matemática do preço-de-resultado (a conta que faltava)

Pressupostos de um cliente-modelo (troque pelos números REAIS do cliente — todos saem do `lib/auditor.ts`):

```
leads/mês                        300
taxa base de reunião             12,0%      ← do baseline retroativo (§2.2 Desenho C)
lift provado pelo holdout        +40% relativo = +4,8pp
ticket médio                     R$ 5.000
fechamento reunião → venda       25%
```

```
valor de UMA reunião          = 5.000 × 0,25            = R$ 1.250
reuniões incrementais/mês     = 300 × 0,048             = 14,4
receita incremental do cliente = 14,4 × 1.250           = R$ 18.000 / mês
```

**A régua de share.** Sierra cobra "uma fração da economia". Aqui a fração é do valor gerado:

| Share do valor da reunião | Preço por reunião incremental | Variável/mês | Total (base R$2.500) | Margem 🧮 |
|---|---|---|---|---|
| 5% | R$62,50 | R$900 | R$3.400 | 94,2% |
| **10%** | **R$125** | **R$1.800** | **R$4.300** | **95,4%** |
| 15% | R$187,50 | R$2.700 | R$5.200 | 96,2% |
| 20% | R$250 | R$3.600 | R$6.100 | 96,8% |

🧮 **O número que a lente do dinheiro exigia e ninguém tinha escrito: você renova a R$4.300 em vez de R$2.000.** Isso é **+R$2.300/mês por cliente**, +R$27.600/ano por cliente, e ~**+R$276.000/ano** na carteira de 10 — assumindo que todos migrem, o que não vai acontecer. Assuma metade: **~R$138.000/ano**. Esse é o tamanho do prêmio, e ele é grande demais para depender de intuição.

**Comece em 10%.** Motivo: R$18.000 de receita incremental por R$1.800 de fee variável é um múltiplo de **10×** — argumento que se defende sozinho e não convida negociação. Acima de 15% o cliente começa a contestar a atribuição em vez de pagar, e você troca dinheiro por reunião de defesa.

**O crédito de holdout (o movimento que ninguém faz):**

```
custo da prova pro cliente = 30 leads retidos × 4,8pp = 1,44 reunião/mês
crédito na fatura          = 1,44 × R$125            = R$180/mês
```

**R$180 contra R$1.800 de fee variável.** Você devolve 10% do variável e compra: a objeção morta antes de nascer, a transparência que o QBR precisa, e uma linha na fatura que nenhum concorrente tem. **É a melhor relação custo/argumento deste arquivo inteiro.**

### 3.3 · O CONTRATO — as sete cláusulas (a parte que impede o autogol)

📄 A literatura de outcome pricing é unânime sobre onde ele quebra: **definir "feito" de forma contratualmente inequívoca e tecnicamente mensurável**, e **atribuição**. *"Sem framework de medição rigoroso e mutuamente acordado, outcome-based pricing gera disputa em vez de alinhamento."* Traduzindo: sem estas cláusulas, o modelo variável não te dá mais dinheiro — te dá mais reunião de cobrança.

**1 · DEFINIÇÃO DO DESFECHO (a mais importante).**
> Considera-se *reunião incremental* a **oportunidade que atingiu a etapa "Agendado" no CRM do CONTRATANTE em até 7 dias corridos da primeira mensagem do lead**, cujo atendimento foi realizado pelo agente e cujo lead foi alocado ao braço "IA" pelo sorteio descrito na Cláusula 3. Reunião cancelada pelo lead **conta**; reunião cancelada por indisponibilidade do CONTRATANTE **conta**; reunião duplicada do mesmo lead em 30 dias **não conta**.

Escreva o que **não** conta. É onde nasce a disputa.

**2 · A FONTE DA VERDADE É O CRM DO CLIENTE, NÃO O MEU PAINEL.**
> A apuração usa exclusivamente os dados do CRM do CONTRATANTE, exportáveis por ele a qualquer momento.

Isso parece que enfraquece você. **Faz o oposto:** remove a suspeita de que você conta a própria nota, e é o que permite cobrar variável sem auditoria de terceiro.

**3 · O DESENHO DA PROVA, com o plano travado.**
> 10% dos leads elegíveis serão alocados por sorteio determinístico ao fluxo de atendimento padrão do CONTRATANTE ("grupo de controle"), que **não sofrerá redução de atendimento** — permanece o processo humano vigente. O plano de análise foi registrado em `<hash>` antes do início e não pode ser alterado durante a vigência.

**4 · PISO E TETO.**
> Valor fixo mensal (piso): R$2.500. Componente variável limitado a **2× o valor fixo** por mês.

O piso cobre custo + operação com folga (custo real ~R$200) — você **nunca** roda no vermelho. O teto mata a única objeção real do cliente contra variável ("e se explodir?") e custa pouco: só corta acima de 40 reuniões incrementais/mês.

**5 · CRÉDITO DE HOLDOUT.**
> Reuniões estimadas como perdidas no grupo de controle serão creditadas na fatura seguinte, à mesma tarifa unitária.

**6 · JANELA DE RE-BASELINE.**
> A taxa-base de referência será recalculada a cada 6 meses. Alterações materiais na operação do CONTRATANTE (mídia, oferta, equipe, funil) devem ser comunicadas em até 5 dias úteis e são registradas no diário de execuções.

Sem isso, você fica preso a um baseline de 2 anos atrás e o cliente, com razão, alega que "o mundo mudou".

**7 · TRILHA DE AUDITORIA.**
> O CONTRATANTE tem acesso permanente ao diário de execuções (registro por conversa: data/hora, braço, ações da IA, erros) e ao histórico versionado do prompt.

📄 A doutrina de outcome billing pede exatamente isso: *"logs append-only, verificação, trilhas de auditoria exportáveis"*. **Você já tem os três** (`api/executions`, `lib/prompt-store.ts`, `lib/manifest.ts`). É §3.4.

### 3.4 · GOVERNANÇA COMO ARGUMENTO COMERCIAL (o insight que amarra o arquivo)

A leitura errada da governança é "qualidade interna". A leitura certa:

> **A infraestrutura de auditabilidade não é um extra do preço-de-resultado. Ela é o PRÉ-REQUISITO dele.** Ninguém compra "pague por desfecho" de quem não consegue mostrar como o desfecho foi apurado. Você já tem essa infra construída — e hoje ela está sendo dada de graça, escondida numa aba.

Tabela de tradução — a coluna da direita é o que entra na proposta, na cláusula ou no QBR:

| O órgão (`SKILL.md` §1) | O que vira comercialmente |
|---|---|
| Diário de execuções (`api/executions`) | **Cláusula 7** · trilha de auditoria exportável · fim da discussão "a IA falou isso?" |
| Evals como porteiro de deploy (10/10 ou não sobe) | **"nenhuma mudança no cérebro entra sem passar num exame de 10 cenários"** — trave de segurança contratual |
| Guardião diário + alerta no grupo | **SLA de detecção**: "quebrou, eu descubro antes de você" |
| Auditora de funil (sexta) | o insumo do laudo (§2.7) e do QBR (§4) |
| Cérebro editável com portão | **soberania do cliente**: ele edita, o exame protege. Anti-lock-in que ninguém oferece |
| Manifesto (`lib/manifest.ts`) — nada é `ativo` sem prova | **a antítese do caso 11x**: o produto declara o que não faz |
| Kill switch (`FRONTEIRA.md` #1) | **cláusula de controle do operador** — hoje é ausência, e ausência de botão vermelho é o que assusta comprador maduro |

**Como cobrar por isso sem parecer que está cobrando por burocracia:** não venda "governança". Venda as **três garantias** que ela produz, e ponha as três no contrato como obrigação sua:

1. *"Se o agente quebrar, quem te avisa sou eu — não o seu cliente reclamando."*
2. *"Toda conversa fica registrada e é sua. Você exporta quando quiser, inclusive se me demitir."*
3. *"Nenhuma alteração no comportamento do agente vai ao ar sem passar num exame automático. Você vê a nota."*

Isso é o que separa F1 de F2, e é ~R$1.000–2.000/mês de diferença **sem uma linha de código nova** 🧮.

### 3.5 · OS CINCO JEITOS DE SE QUEIMAR COM PREÇO VARIÁVEL

| Autogol | Por que acontece | Antídoto |
|---|---|---|
| **Desfecho mal definido** | "reunião" sem dizer o que não conta | Cláusula 1, escrita com o que NÃO conta |
| **Cobrar sobre TODAS as reuniões, não sobre as incrementais** | é mais fácil de calcular e parece mais dinheiro | é **insustentável**: no dia em que o cliente entender que estava pagando por reunião que teria acontecido de qualquer jeito, você perde o cliente E a reputação |
| **Prometer o degrau 4 num cliente sem volume** | ansiedade de venda | escada na proposta (§2.1) + pool (§2.5) |
| **Migrar todo mundo de F1 pra F3 de uma vez** | euforia | **um cliente**, o mais tolerante, ciclo completo, depois os outros |
| **Vender antes do A/A** | pressa | §6 — o A/A custa 2h e risco zero |

---

## §4 · RETENÇÃO — QBR e expansão em cima da prova

### 4.1 · O QBR de seis blocos (45 minutos, sempre iguais)

⚠️ **Aviso de evidência:** a literatura sobre impacto de QBR em retenção é quase toda conteúdo de vendor de Customer Success (números do tipo "+5 a 15pp de NRR", "+11% de retenção em 9-12 meses") — **sem metodologia publicada**. Não use esses números para se convencer nem para vender. O que sustenta o ritual não é o benchmark: é o mecanismo do §1.3 (**cliente que não consegue atribuir resultado cancela**) e o fato de que o QBR é o único momento em que a atribuição é feita na frente dele.

| # | Bloco | Minutos | O que entra |
|---|---|---|---|
| 1 | **O laudo** | 10 | A página do §2.7. Sem slide de atividade. |
| 2 | **O que quebrou** | 5 | Incidentes, tempo de detecção, o que virou correção permanente. **Você fala primeiro.** |
| 3 | **O que a IA aprendeu** | 5 | Versões do prompt no trimestre, nota do exame, o que mudou no comportamento |
| 4 | **O que o funil mostrou** | 10 | Auditora: gargalo, campo vazio, lead parado — **problema do cliente, não do agente** |
| 5 | **A decisão do trimestre** | 10 | Uma decisão, com o Test & Roll por trás: expandir funil? ligar voz? mudar cadência? |
| 6 | **O que vem** | 5 | Roadmap do `lib/manifest.ts`, com o que **não** está pronto marcado como não-pronto |

**As três regras que fazem esse QBR reter:**

1. **Bloco 2 antes do bloco 4.** Contar o que quebrou antes de apontar o problema do cliente compra o direito de apontar o problema do cliente.
2. **Bloco 4 é o bloco da expansão.** Ele não fala do agente — fala do funil. É de onde nasce todo upsell honesto (§4.2).
3. **Nunca mostre número sem n e sem data de corte.** Uma vez que o cliente pega você mostrando 8 leads como tendência, todo o resto vira suspeito.

**Quanto tempo isso economiza 🧮:** hoje cada QBR contestado custa defesa + refação de relatório. Estimativa: ~1 contestação por cliente por trimestre × 10 clientes × ~1,5h ≈ **15h/trimestre ≈ 5h/mês**, que viram a leitura de uma página. **Pressuposto frágil, e eu marco:** agência de mensalidade baixa raramente roda QBR formal — na prática esse custo aparece como defesa ad-hoc no WhatsApp, mais diluído e mais difícil de medir. O ganho é real; o número é o meu chute mais bem informado.

### 4.2 · Expansão — as cinco linhas que nascem do laudo

| Gatilho no laudo/auditoria | Oferta | Preço 🧮 |
|---|---|---|
| Degrau 2 forte, degrau 4 fraco | **o gargalo não é o atendimento, é o funil** → redesenho de funil / qualificação | projeto R$5–15k |
| Auditora achou campo vazio e lead parado em massa | **higiene + tracking de origem** (`lib/tracker.ts`) | projeto R$3–8k |
| Lift comprovado num funil só | **replicar em outro funil/unidade** — e o Desenho C dá a prova de graça | +R$1.000–2.500/mês |
| Cliente com rede (clínicas, unidades, franquias) | **rollout escalonado por unidade** = expansão E experimento no mesmo movimento | por unidade |
| Degrau 5 fechando no pool | **benchmark de vertical**: "psicologia converte X, jurídico Y" | F4 (§3.1) |

**A linha 3 é a mais subestimada.** Rollout escalonado (§2.2 Desenho C) é a única jogada deste arquivo em que **expandir a conta e produzir evidência causal são o mesmo ato**. Você não escolhe entre crescer e medir.

### 4.3 · Os sinais de churn que a instrumentação passa a ver

Com braço + diário + auditora cruzados, três sinais ficam visíveis **antes** do cancelamento:

| Sinal | O que significa | Ação |
|---|---|---|
| Volume de leads elegíveis caindo mês a mês | o cliente está tirando a `GATE_TAG` — perdeu a fé antes de falar | ligar **na semana**, não no QBR |
| Escalação pra humano subindo sem mudança de prompt | o funil ou a oferta do cliente mudou e ninguém avisou | re-baseline (Cláusula 6) |
| Cliente parou de abrir a Central | o produto virou invisível | o laudo (§2.7) tem que ir por WhatsApp, não esperar login |

### 4.4 · A resposta pronta para as cinco objeções

| Objeção | Resposta |
|---|---|
| *"Não vou deixar 10% dos meus leads sem IA"* | *"Eles não ficam sem atendimento — vão pro seu time, exatamente como antes de você me contratar. E custa 1,4 reunião por mês, que eu credito na sua fatura."* Se ainda assim não: **switchback** (§2.2 B). |
| *"Como sei que foi a IA e não a sazonalidade / o tráfego novo?"* | *"Porque os dois grupos viveram a mesma sazonalidade e o mesmo tráfego, no mesmo período. A única diferença entre eles foi um sorteio."* |
| *"Meu concorrente cobra R$1.500"* | *"Ele cobra por atender. Eu cobro por reunião a mais — e provo quantas. Se a prova der zero, você não paga o variável."* |
| *"Isso é muito complicado"* | *"O que é complicado é acreditar num número sem saber de onde ele veio. O relatório tem uma página."* |
| *"E se o número der baixo?"* | *"Aí eu descobri antes de você e conserto. É pra isso que serve medir."* (E é verdade — §2.8, a face dupla.) |

---

## §5 · O QUE FOI REPROVADO (não reabra)

| Reprovado | Por quê | Volta quando |
|---|---|---|
| **Meta-experimento de 8 semanas pra medir viés de interferência** (rodar 4 semanas por lead + 4 por dia e comparar) | Rigor lindo, pior uso possível do recurso mais escasso da casa: 8 semanas pra produzir um número que **não muda nenhuma decisão pela qual o cliente paga**. E o mecanismo aqui (time com menos carga) não é o do Airbnb (competição de mercado) — o viés pode ser ~zero. **Fique com a linha de código do switchback, jogue fora o meta-experimento.** | Nunca, a não ser que um cliente pague por isso como entregável |
| **Vender o degrau 1 ("responde em 5 min") como pitch principal** | É comercialmente **tautológico** — nenhum comprador duvida que o robô responde mais rápido que o humano. Rigor gasto em afirmação que ninguém contesta gera **zero** disposição a pagar. | Use como **prova de instrumento** na semana 1, e venda o **degrau 2** (engajamento é disputável, logo provar vale dinheiro) |
| **Preço variável sobre TODAS as reuniões** | Insustentável: no dia em que o cliente entender que pagou por reunião que teria acontecido de qualquer jeito, você perde cliente e reputação | Nunca |
| **Holdout de 5% "pra doer menos"** | Dobra o tempo de prova (10,53× leads contra 5,56×) — 30 meses num cliente de 300 leads/mês. Conforto que custa a prova inteira | Só no pool (§2.5), onde 13 semanas é aceitável |
| **Mostrar p-valor / IC na Central pro cliente** | ⚠️ `FRONTEIRA.md` §3 já reprovou o primo disso (calibração estatística do juiz): *"trocar um número que ele entende por um que ele desconfia"*. Vale igual aqui. Três estados em português (§2.3) | Cliente enterprise que exija por contrato |
| **Cobrar por "conversa" ou por token** | Sua margem é ~95%; cobrar pelo insumo joga a conversa pro terreno onde o concorrente mais barato ganha, e ainda te pune por melhorar o produto | Nunca |

---

## §6 · PLANO DE 30 DIAS

> **Ordem por R$ ganho ÷ hora do dono investida.** Nada aqui exige código novo grande — a maior parte é carimbo em coisa que já roda.

### Semana 1 — o que fica mais caro a cada dia parado

| # | Ação | Tempo | Entrega |
|---|---|---|---|
| 1 | **`scripts/baseline.mjs`** — roda o `lib/auditor.ts` com janela retroativa de 12 semanas, grava `agente-<slug>:baseline:<data>` no Redis + JSON versionado no repo. **Rode nos 10 clientes.** | ~10h | O ativo que expira, salvo |
| 2 | **Teste A/A** — no `api/inbound.ts`, depois do gate: hash → `arm A/B` gravado no diário, **os dois braços recebendo IA normalmente**. Risco zero, nenhum cliente afetado. | 2h | Instrumento validado (ou não — e você descobre de graça) |
| 3 | **`scripts/mde.mjs`** (~30 linhas) — puxa o p0 real de cada degrau do auditor de cada cliente e imprime a escada (§2.1) com o tempo em semanas do volume dele | 2h | **Tabela que entra na proposta comercial já** |
| 4 | **Baseline retroativo dos clientes JÁ no ar** (item 1 aplicado a quem não tem) | incluído | Contrafactual que some quando o funil for remodelado |

**Item 1 é o primeiro da fila por um motivo só: é o único que fica mais caro se você esperar.**

### Semana 2 — validar o instrumento e vestir a proposta

| # | Ação | Tempo | Entrega |
|---|---|---|---|
| 5 | **Ler o A/A**: as taxas dos dois braços são estatisticamente indistinguíveis? Se **não** forem, o instrumento está quebrado (log duplicado, dedupe, hash correlacionado com DDD/origem) e você descobriu antes de apostar um contrato | 1h | Semáforo verde ou bug caro achado cedo |
| 6 | Escrever o **`preregistro.mjs`** e o cálculo do **intervalo sempre-válido** (§2.4, ~20 linhas) | 3h | Painel que não infla falso positivo |
| 7 | **Proposta comercial v2**: escada (§2.1) + as três garantias de governança (§3.4) + as quatro faixas (§3.1) | 3h | O documento que muda o preço da próxima venda |

### Semana 3 — a primeira prova de verdade

| # | Ação | Tempo | Entrega |
|---|---|---|---|
| 8 | **Sprint de randomização 50/50, 3 dias, 1 cliente** — fecha o **degrau 1 e caminha no degrau 2** com significância real. Custo: ~15 leads no fluxo humano normal | 4h | Primeira afirmação causal da casa |
| 9 | **Ligar holdout de 10% em UM cliente** (o mais tolerante, já rampado), com plano pré-registrado e cláusula assinada | 4h | O experimento que sustenta preço |
| 10 | Aba **"A Prova"** na Central: 3 estados, hash do plano, n corrente | 4h | O ativo que o cliente olha e não cancela |

### Semana 4 — cobrar

| # | Ação | Tempo | Entrega |
|---|---|---|---|
| 11 | **Rodar a conta do §3.2 com os números REAIS** de cada um dos 10 clientes (ticket, fechamento, leads) | 3h | O preço-alvo de cada conta, escrito |
| 12 | **Levar F3 a UM cliente** — o que tem melhor relação (volume alto × confiança alta). Base + variável + piso/teto + crédito de holdout | 2h | O primeiro contrato de preço-de-resultado da casa |
| 13 | **QBR de seis blocos** com o laudo de uma página no cliente do item 9 | 2h | O ritual instalado |
| 14 | **Test & Roll** (`scripts/tr.mjs`, 1 linha de fórmula) na primeira decisão interna: qual cadência de followup | 2h | A régua das decisões semanais |

**Total: ~42h em 30 dias.** Sem código novo de agente, sem mudança de stack, sem risco no cliente até a semana 3.

### O que NÃO fazer nestes 30 dias

- ❌ Não migre os 10 clientes pra F3 de uma vez. **Um.** Ciclo completo. Depois os outros.
- ❌ Não anuncie holdout antes do A/A passar.
- ❌ Não mexa na Lei 3 (`SKILL.md` §3): gate por tag e rampagem **1 → 10 → todos** continuam vindo **antes** de qualquer sorteio.
- ❌ Não prometa o degrau 4 pra cliente com menos de 150 leads/mês.

---

## §7 · FONTES

**✅ Papers revisados por pares / dado primário**
- Gordon, Zettelmeyer, Bhargava & Chapsky (2019), *A Comparison of Approaches to Advertising Measurement: Evidence from Big Field Experiments at Facebook*, Marketing Science 38(2) — https://pubsonline.informs.org/doi/10.1287/mksc.2018.1135 · PDF https://gwern.net/doc/statistics/causality/2019-gordon.pdf
- Brynjolfsson, Li & Raymond (2025), *Generative AI at Work*, Quarterly Journal of Economics 140(2) — https://academic.oup.com/qje/article-pdf/140/2/889/61701561/qjae044.pdf · NBER w31161
- Lewis & Rao (2015), *The Unfavorable Economics of Measuring the Returns to Advertising*, QJE 130(4) — https://academic.oup.com/qje/article-abstract/130/4/1941/1914592 · PDF https://gwern.net/doc/economics/advertising/2015-lewis.pdf
- Holtz, Lobel, Liskovich & Aral (2025), *Reducing Interference Bias in Online Marketplace Experiments Using Cluster Randomization*, Management Science 71(1) — https://pubsonline.informs.org/doi/10.1287/mnsc.2020.01157
- Bojinov, Simchi-Levi & Zhao (2022), *Design and Analysis of Switchback Experiments*, Management Science 69(7) — https://arxiv.org/abs/2009.00148
- Feit & Berman (2019), *Test & Roll: Profit-Maximizing A/B Tests*, Marketing Science 38(6) — https://arxiv.org/abs/1811.00457 · código https://github.com/eleafeit/testandroll
- Gelman & Carlin (2014), *Beyond Power Calculations: Assessing Type S and Type M Errors*, Perspectives on Psychological Science 9(6) — https://sites.stat.columbia.edu/gelman/research/published/retropower_final.pdf
- Johari, Koomen, Pekelis & Walsh (2022), *Always Valid Inference*, Operations Research 70(3) · Johari, Pekelis & Walsh (2017), *Peeking at A/B Tests*, KDD — https://dl.acm.org/doi/10.1145/3097983.3097992
- Deng, Xu, Kohavi & Walker (2013), *CUPED*, WSDM — https://robotics.stanford.edu/~ronnyk/2013-02CUPEDImprovingSensitivityOfControlledExperiments.pdf
- Roth (2022), *Pretest with Caution*, AER: Insights 4(3) — https://www.aeaweb.org/articles?id=10.1257/aeri.20210236
- Kohavi, Tang & Xu (2020), *Trustworthy Online Controlled Experiments*, Cambridge University Press
- Hussey & Hughes (2007), stepped wedge — fórmula de poder e design effect

**📄 Doc de fornecedor sério / survey independente**
- Holdout como default: Klaviyo (5%) https://help.klaviyo.com/hc/en-us/articles/18138290642971 · GrowthBook https://docs.growthbook.io/app/holdouts · Amplitude (1–10%) https://amplitude.com/docs/feature-experiment/advanced-techniques/holdout-groups-exclude-users
- Sequencial implementável: https://docs.growthbook.io/statistics/sequential
- Adoção de incrementalidade: EMARKETER × TransUnion, jul/2025 — 52% dos marketers dos EUA
- Kyle Poyar, *State of B2B SaaS & AI Monetization 2026* (230 empresas) — https://www.growthunhinged.com/p/the-state-of-b2b-monetization-in-2026
- Preço por desfecho: Intercom Fin (US$0,99/outcome) · Zendesk (~US$1,50/resolução, set/2024) · Sierra (https://sierra.ai/blog/outcome-based-pricing-for-ai-agents)
- MIT Project NANDA, *The GenAI Divide: State of AI in Business 2025* (95% dos pilotos sem retorno mensurável)
- TechCrunch (mar/2025), 11x — churn 70–80% — https://techcrunch.com/2025/03/24/a16z-and-benchmark-backed-11x-has-been-claiming-customers-it-doesnt-have

**⚠️ Marketing / blog (referência de mercado, NÃO prova)**
- Faixas de preço BR (implantação R$8–25k, mensalidade R$800–3.000, SaaS R$3–15k/mês): blogs de agências e plataformas brasileiras, 2026
- Optimizely, simulação A/A de peeking (57%/26%/20% de falsos vencedores)
- Holdout em CRM em português: `wicomm.com.br/crm/holdout-test-em-crm` (abr/2026) — **prova de que o conceito já chegou; leia antes de vender como inédito**
- Números de impacto de QBR em NRR/retenção: conteúdo de vendors de Customer Success, sem metodologia publicada
- "21× mais chance de qualificar em 5 min" (Oldroyd/InsideSales 2007) e HBR *The Short Life of Online Sales Leads* (2011) — **observacionais e de vendor**

**🧮 Estimativas próprias (conta exposta no texto)**
- Preço-alvo F3 (R$4.300/mês) e prêmio de carteira (~R$138k/ano com 50% de migração) — §3.2
- Custo/crédito de holdout (1,44 reunião ≈ R$180/mês) — §3.2
- 5h/mês em QBR contestado — §4.1, **pressuposto frágil, marcado**
- Margem 95% — derivada do custo medido (R$0,16/conversa + R$50–150/mês de infra, `SKILL.md`)

**🩸 Nosso, com data**
- A auditora de sexta (`lib/auditor.ts`) compara "com IA × sem IA" sobre leads escolhidos pelo humano que põe a `GATE_TAG` — viés de seleção **em produção, hoje**, em ~10 clientes (§1.2)

---

> **A última frase deste arquivo.** O agente já está acima da média mundial em governança (`FRONTEIRA.md` §6). O que falta não é tecnologia: é **transformar governança em preço**. A distância entre R$2.000 e R$4.300 por cliente não é código — é um sorteio de 8 linhas, um plano com hash e uma página de laudo que ninguém no Brasil está entregando.
