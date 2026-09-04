# CENTRAL DE IA — o padrão da casa

> **A Central de IA é o "ó" de tudo que a casa faz.** Vercel, Redis, Claude, o CRM, o agente, os
> evals, a Escola — nada disso o cliente vê por dentro. Ele vê a **Central**. É a vitrine e o painel
> de controle: onde ele acompanha a IA ao vivo, entende o que ela faz, e a **ensina** sem tocar em
> prompt. Se a Central é confusa, o cliente acha que o produto é confuso — não importa quão bom seja
> o motor por baixo.

> **Este arquivo é o PADRÃO.** Toda Central de cliente segue ele. Não existe "a Central do fulano é
> de um jeito, a do ciclano é de outro". Existe **a Central v{N}**, e todo cliente está numa versão
> dela. Quando a gente evolui, evolui o padrão — e o padrão propaga, versionado, pra todo mundo.

**Leia este arquivo quando:** for criar a Central de um cliente novo · for evoluir qualquer aba ·
alguém propuser "vou fazer diferente nesse cliente" · você precisar decidir **onde um conhecimento
mora** (a régua do §2) · for propagar uma melhoria pra frota.

> 📦 **Código em três camadas:** `assets/central-v2/` mantém o motor de conteúdo
> (régua, catálogo, conhecimento, mídias e hub). `assets/central-v3/` instala o
> **cockpit canônico de 5 áreas + ledger de custos**. `assets/central-v4/`
> adiciona a **Central Autônoma em camadas (v4.1)**: Briefing, comando, Flight Recorder, Radar,
> Mapa Vivo, Shadow protegido, simulador e Recibo de Valor. A base foi construída no
> dogfood da Metrik em 23/07/2026: typecheck limpo, **74 asserções**, build,
> dark/light, desktop/mobile, deploy e smoke HTTP em produção. O Shadow foi
> provado com um caso real: R$0,1056 dentro da reserva de R$0,20, 4/4 sinais,
> tools simuladas e nenhuma publicação. O endpoint financeiro está provado; a
> primeira execução real de atendimento com ledger ainda precisa acontecer.
> Em 23/07/2026, a v4.1 foi publicada depois de uma auditoria de densidade:
> Resultados ganhou subabas exclusivas, Ensinar passou a abrir por escolha,
> Visão Geral esconde sinais secundários e o mobile fechou com
> `scrollWidth === clientWidth` em 375px.

**Legenda de origem** (de onde cada peça do padrão veio):
| Selo | Significado |
|---|---|
| 🏠 | **Nosso** — construído e provado na casa (Metrik) |
| 🔷 | **Continuare** — o padrão de produto que o sócio evoluiu e a casa adotou (análise 22/07/2026) |
| ✨ | **Novo** — nasce neste padrão; nem nós nem eles tínhamos |
| 🩸 | cicatriz — a razão nasceu de uma dor real, com data |

---

## §0 · A DOUTRINA — a Central é padrão, e o padrão evolui SEMPRE

Três leis, e elas resolvem a tensão que o mestre nomeou: *"a Central não pode ficar parada, mas não
pode virar um de cada jeito"*.

**LEI 1 — UM PADRÃO, TODOS OS CLIENTES.** As abas, o que cada uma faz, as travas por baixo: iguais
pra todo mundo. O que muda por cliente é o **conteúdo** (o cérebro dele, o catálogo dele, a marca),
**nunca a estrutura**. Central sem tema claro/escuro num cliente e com tema noutro é o sintoma da
doença — significa que alguém evoluiu um projeto e esqueceu o padrão.

**LEI 2 — BUG SE CORRIGE NA HORA; PADRÃO SÓ MUDA COM VERSÃO.** Achou um bug numa Central? conserta
naquele cliente imediatamente, e a correção vira cicatriz aqui. Quer **mudar o padrão** (aba nova,
fluxo novo)? isso **bump o `SISTEMA_VERSAO`** (§9) e entra pra propagação. A diferença importa:
correção é local e urgente; evolução de padrão é global e controlada.

**LEI 3 — A CENTRAL NUNCA FICA PARADA.** Ela é o produto vivo. Toda vez que a casa aprende algo —
uma aba melhor, um destino novo de conhecimento, uma trava — isso vira **próxima versão do padrão**,
e a skill sabe propagar. Central parada é produto morrendo devagar.

> 🏛️ **A skill é a professora que executa este padrão.** Ela sabe a ordem das tarefas pra criar uma
> Central nova (§10.1) e o ritual pra evoluir uma existente (§10.2). Não é improviso: é procedimento.

---

## §1 · O MAPA DAS ÁREAS (o contrato de cada uma)

A Central v3 tem **5 áreas principais**. Feature técnica não ganha item de menu
automaticamente: primeiro se decide qual pergunta do dono ela ajuda a responder.

| Área | Pergunta que responde | O que contém | Trava por baixo |
|---|---|---|---|
| **Visão Geral** | “Está saudável, produzindo e valendo o investimento?” | saúde, atenção, resultado de hoje, custo, funil resumido e próximos passos | só fica verde depois que **todas** as fontes responderem |
| **Operação** | “O que está acontecendo, o que aconteceu e quem o follow-up trouxe de volta?” | Agora · Recuperação · Histórico · Funil · Agenda | PII anonimizada + custo auditável por execução; recuperação separa resposta de objetivo |
| **Ensinar** | “Como corrijo ou atualizo a IA?” | Testar e corrigir · Regras · Conteúdo (vende/responde/envia) · editor técnico só agência | régua §2 + eval-porteiro + perfil |
| **Resultados** | “Que valor produziu e quanto custou?” | hoje/7d/30d, média por execução, série diária e composição do gasto | histórico sem custo fica “não medido”; nunca é inventado |
| **Configurações** | “Onde ajusto estrutura e sistema?” | conteúdo, habilidades, funil, sistema, segurança e roadmap | detalhes técnicos no segundo nível |

**Contrato didático de Ensinar (v3.1):** a tela não começa por abas técnicas.
Ela mostra a jornada **escolher exemplo → apontar erro → ensinar do seu jeito →
validar antes de publicar**. Depois oferece três fontes mutuamente exclusivas:
simular agora, conversa real ou conversa colada. “Regras” é leitura;
“Conteúdo” é destino próprio; “Editor técnico” só existe para agência. A pessoa
entende o processo antes de receber o campo de ação.

🩸 **A dor que forçou a v3:** nove itens no menu, todos com o mesmo peso, e
headlines de landing page em toda rota. As features eram boas, mas o cliente
precisava conhecer nossa arquitetura para encontrar o que queria. A v3 organiza
por **intenção de negócio**, não por nome de módulo.

### §1.1 · A camada Autônoma v4

A v4 não adiciona aba principal. Ela muda o verbo da Central:

> **mostrar → interpretar → priorizar → simular → provar**

| Peça | Onde aparece | Usa tokens? | Regra |
|---|---|---:|---|
| Briefing Executivo | Visão Geral | não | números e recomendações calculados em código |
| Pergunte à Central | global | não | respostas com contratos determinísticos e links de evidência |
| Flight Recorder | Operação/Histórico | não | usa turnos, tools, duração e ledger já gravados |
| Radar de Dinheiro | Resultados | não | `status=open`, valor preenchido e 7+ dias sem mudança |
| Mapa Vivo | Ensinar | não | lê prompt, catálogo, FAQ, exemplos, mídias e tools |
| Shadow Lab | Ensinar/agência | **sim, sob demanda** | só candidata, até 5 casos, 2 steps, 700 tokens/chamada, tools simuladas |
| Modo E se? | Resultados | não | sensibilidade matemática; premissa sempre visível |
| Recibo de Valor | Resultados | não | pipeline ≠ receita; horas são estimativa ajustável |

### §1.2 · Camadas de leitura v4.1 — uma pergunta por vez

> **Capacidade não precisa virar simultaneidade.** Uma Central pode ter oito
> features fortes e ainda ser confusa se todas aparecem na primeira rolagem.

Contrato de densidade:

| Área | Primeira leitura | Segundo nível |
|---|---|---|
| Visão Geral | veredito, uma prioridade e quatro números | sinais restantes recolhidos; Funil × Custos × Próximos Passos exclusivos |
| Operação | uma subaba entre Agora × Recuperação × Histórico × Funil × Agenda | Recuperação abre em Agora × Eficácia × Resultados × Definição; uma leitura por vez |
| Ensinar | tela de escolha com quatro intenções | uma ferramenta por vez + botão “Todas as opções”; ferramentas da agência recolhidas |
| Resultados | Resumo | Radar × E se? × Recibo em subabas independentes |
| Configurações | mapa de destinos | página específica só depois do clique |

Regras duras:

1. **Só uma análise especializada renderiza por vez.**
2. **Sinal secundário começa recolhido.**
3. **Estado sem dados é uma explicação, não um gráfico cheio de zeros.**
4. **Mobile pode ter scroll horizontal dentro da subnavegação; o documento não
   pode ter overflow.** Prove `scrollWidth === clientWidth`.
5. A URL profunda continua funcionando (`/resultados#radar`,
   `/operacao?aba=agenda`).

🩸 **Dor que forçou a v4.1:** no dogfood, as features foram aprovadas, mas o
cliente percebeu excesso de informação por tela. O problema não era “o que
existe”; era “tudo existir visualmente ao mesmo tempo”. A cura foi divulgação
progressiva, preservando 100% das capacidades.

🩸 **Falha fechada também é UX:** no primeiro smoke em produção, `/api/live`
recebeu 401 do GHL. A tela antiga podia nascer verde antes da resposta. A v3
mostra “verificando” e só declara saúde depois das fontes; erro de conector vira
atenção explícita. Nunca derive “saudável” da ausência temporária de dados.

🩸 **Tipografia e hover também são contrato:** o primeiro deploy da v3 ainda
herdou uma display pesada e cards que “pulavam” ou brilhavam sem indicar ação.
No dogfood de 23/07/2026, a display virou Manrope 500–700; só elemento clicável
recebe `interactive-card`, com mudança sutil de borda/superfície e foco visível.
Card informativo fica imóvel. Movimento não pode ser a única pista de clique.

**+ o TEMA claro/escuro** é padrão em todas (§8). **+ o organismo** (guardião diário, analista
semanal, auditora de funil) roda por trás e alimenta Visão Geral e Ao Vivo — o cliente não configura,
só colhe.

> 🩸 **Por que o motor é invisível:** o cliente que vê "eval score 8.4/10, rubrica v3, holdout 8%"
> não entende e assusta. O cliente que vê *"testei sua correção contra 11 casos e não publiquei
> porque quebraria a Porta 3"* entende e confia. **A inteligência aparece como CONSEQUÊNCIA em
> português, nunca como painel técnico.**

---

## §2 · A RÉGUA DE DESTINO DO CONHECIMENTO ⭐ (a peça-mãe)

**Este é o coração do padrão, e é o furo que nem a casa nem a Continuare tinham resolvido.** Quando o
cliente diz *"a IA deveria ter feito X"* ou *"quero que ela saiba Y"*, **onde isso mora?** Errar o
destino é a causa de metade dos problemas de agente de IA: preço no prompt apodrece, FAQ gigante no
prompt deixa lento, regra de tom no catálogo não faz sentido.

São **seis destinos**. A régua decide em ordem — **para no primeiro que casar**:

```
┌─ 1. É DADO QUE MUDA TODA HORA?  (agenda, status do lead, estoque em tempo real)
│     → TOOL / CRM.  A IA consulta na hora. NUNCA decora.
│
├─ 2. É PRODUTO / PREÇO / SERVIÇO que ela oferece e cota?
│     → CATÁLOGO.  Tabela viva. Ela lê a linha; muda? edita a linha. (§4)
│
├─ 3. É FATO / POLÍTICA / PROCEDIMENTO que ela consulta quando perguntam?
│     ├─ cabe no orçamento do cérebro (<10k tokens no total) e é consultado SEMPRE?
│     │     → CÉREBRO, numa seção. 
│     └─ é muito (dezenas de FAQs, documento longo, >150 itens, empurra >25k)?
│           → BASE DE CONHECIMENTO (RAG).  Ela busca o trecho e responde. (§5)
│
├─ 4. É REGRA DE COMPORTAMENTO / TOM / JORNADA?  (como conduz, o que faz e não faz)
│     ├─ dá pra escrever como instrução curta?
│     │     → CÉREBRO, na seção certa. (§3)
│     └─ é difícil instruir mas fácil demonstrar? (ritmo, acolhimento)
│           → EXEMPLO (few-shot).  Um turno modelo. 🔷
│
├─ 5. É uma FOTO / PDF / VÍDEO que ela envia?
│     → MÍDIA. (§7)
│
└─ 6. Não é nada disso, ou precisa de gente?
      → TICKET.  Vira chamado pra Metrik.
```

**Os limiares NÃO são chute — são medidos** (`comum/CONTEXT-ENG.md`, 12/07/2026):

| Sinal | Vai pro CÉREBRO | Vira RAG |
|---|---|---|
| tamanho total do prompt | até **~10k tokens** (cache 90% desconto, resposta ~4,7s) | acima de **~25k** (latência sobe pra ~9,5s) |
| nº de FAQs / fatos | até ~150 | acima disso |
| frequência de consulta | usado em quase toda conversa | consultado só quando perguntam daquilo |

> 🩸 **Por que "preço → catálogo" e não "preço → cérebro":** número no prompt vira texto fixo. No dia
> em que o cliente muda o preço, a IA continua cotando o valor velho **com toda a confiança do
> mundo**, e ninguém percebe até um lead reclamar. A régua manda preço pro catálogo (tabela viva) ou
> pra tool (dado vivo) — **nunca pro texto do cérebro.** É a mesma lei que a Escola já aplica; aqui
> ela ganha o destino estruturado (catálogo) em vez de só "vira ticket".

> ✨ **O destino que faltava — RAG:** antes desta versão, quando um cliente tinha muito conteúdo
> (manual de 40 páginas, 200 FAQs, políticas extensas), a casa **não tinha onde pôr**. Ou entupia o
> cérebro (lento, caro) ou virava ticket sem fim. Agora tem a Base de Conhecimento (§5), e a régua
> diz **exatamente** quando um conhecimento cruza a fronteira do cérebro pra ela.

**A régua é o cérebro da aba "Ensinar a IA".** Toda correção do cliente passa por ela antes de virar
proposta. E ela é **determinística onde dá** (dado volátil, tamanho) e só chama modelo pra classificar
o que é genuinamente ambíguo (regra vs exemplo) — igual à triagem da Escola, agora com 6 saídas em vez
de 2.

---

## §3 · O CÉREBRO POR SEÇÕES DE NEGÓCIO 🔷

**O que muda:** em vez de um textão de prompt dividido por blocos técnicos, o Cérebro é **seccionado
pelo momento do atendimento** — nomes que o dono entende sem manual:

```
· Saudação                        (como ela abre)
· Qualificação                    (o que ela descobre antes de oferecer)
· Envio de informações / produto  (como apresenta o que vende)
· Envio do orçamento              (como cota — puxando do CATÁLOGO, §4)
· Agendamento                     (como marca)
· Transferência para humano       (quando e como escala)
· Finalização de atendimento      (como fecha)
· Fora do escopo                  (o que ela NÃO responde) ← a trava de recusa
```

**Por que é melhor que o textão:** o dono não pensa em "bloco 3 do prompt". Ele pensa *"a saudação
está fria"* ou *"ela está cotando errado"*. A seção casa com o vocabulário dele. E a **régua §2**
sabe rotear: correção de saudação → seção Saudação; correção de preço → Catálogo, não seção nenhuma.

**Como convive com o `prompt.md`:** as seções são os **12 blocos do `prompt.md` de fábrica**,
renomeados pra linguagem de dono e agrupados por momento. O `render()` monta o prompt final juntando
as seções na ordem canônica — **byte a byte igual ao `prompt.md` quando nada foi editado** (a mesma
invariante da Escola). O eval-porteiro e o perfil dono×agência (a Escola, `ESCOLA.md`) valem igual
aqui: o dono lê e ensina; só a agência edita texto cru.

> 🔷 **"Fora do escopo" é a trava de recusa da Continuare, e a casa adota.** Uma seção que lista o
> que a IA **não** faz e devolve uma recusa educada. Na clínica era *"não dá diagnóstico, não fala
> preço de tratamento, não processa reembolso, não se revela como IA"*. Genérico: **toda Central tem
> uma seção Fora do Escopo**, e a régua §2 manda pra lá o que o cliente pedir que a IA **não deve**
> fazer.

---

## §4 · O CATÁLOGO 🔷 — a tabela viva do que ela oferece

**A sacada da Continuare, adotada inteira.** Uma tabela estruturada — `produto · preço · descrição ·
categoria` — que o dono importa de planilha (`.xlsx`/`.csv`) ou edita na mão. **Regra dura: a IA
nunca oferece nem cota o que não está no catálogo.**

**Por que resolve preço melhor que a nossa triagem:** a Escola manda preço virar ticket (não deixa
entrar no cérebro — certo). Mas ticket é passivo: alguém tem que atender. O catálogo é **ativo**: a
IA cota da tabela em tempo real. Preço mudou? o dono edita uma linha e **a IA já cota o novo** —
sem deploy, sem prompt, sem ticket.

**O contrato:**
- a IA recebe o catálogo como **dado** (não como texto decorado no prompt) — igual a uma tool
- import de planilha com de-para de coluna (o dono mapeia "qual coluna é o preço")
- categorias organizam (a IA sabe agrupar: "temos 3 planos nessa faixa")
- **fonte única de verdade de preço/oferta** — a régua §2 manda todo preço pra cá

> 🩸 Isto fecha, do lado do produto, a mesma dor que a triagem fecha do lado do motor: **número não
> mora em texto.** A triagem impede (defesa); o catálogo oferece o lugar certo (solução).

---

## §5 · A BASE DE CONHECIMENTO (RAG) ✨ — o destino que faltava

**Ninguém tinha isto — nem a casa, nem a Continuare.** É onde mora o conhecimento **extenso** que a
IA consulta sob demanda: manual de procedimentos, 200 FAQs, políticas, catálogo de casos. Coisa que
**não cabe no cérebro** (estouraria o orçamento de tokens, deixaria lenta e cara) mas que ela precisa
saber quando perguntam.

**Quando um conhecimento entra aqui (a régua §2, destino 3-RAG):**
- é consultado **só quando perguntam daquilo** (não em toda conversa)
- é **muito** (empurra o cérebro pra >25k tokens, ou passa de ~150 itens)
- é **semi-estável** (muda às vezes, não toda hora — senão é tool)

**Como funciona (o contrato):**
1. o dono sobe documentos ou escreve FAQs, **organizados por tópico**
2. o conteúdo é **indexado** (chunk + embedding) numa store de vetores
3. no atendimento, a IA **busca o trecho relevante** e responde com ele — não carrega tudo
4. o que não achar, ela diz que vai confirmar (nunca inventa)

**O limiar de decisão está no §2 e é medido.** A Central mostra pro dono, em português: *"esse
conteúdo é grande demais pro cérebro (ela ficaria lenta). Vou guardar na Base de Conhecimento — ela
consulta quando alguém perguntar."* — a mesma lógica de "cérebro editável", agora com o destino RAG.

> ⚠️ **RAG só entra quando o volume PEDE.** Cliente com 20 FAQs **não** precisa de RAG — vai no
> cérebro e pronto (mais simples, mais rápido, cache de graça). Ligar RAG cedo demais é engenharia
> negativa: custo e latência de busca sem necessidade. A régua §2 protege contra isso.

---

## §6 · ENSINAR A IA — testar e corrigir no MESMO fluxo 🔷 + o motor 🏠

**A Continuare fundiu testar e corrigir; a casa adota o fluxo E mantém o motor.**

O cliente conversa com a IA no laboratório (sandbox, nada é salvo). Quando ela responde torto, ele
corrige **ali mesmo** — não muda de tela. A correção passa pela **régua §2** (que decide o destino) e
vira **proposta**. Ele confirma. **E é aqui que o motor da casa entra, invisível:**

| Etapa | Continuare | A casa mantém |
|---|---|---|
| testar | ✅ chat sandbox | ✅ igual |
| classificar destino | regra / exemplo / recusado | **a régua §2 completa** (6 destinos) |
| propor | ✅ proposta antes de aplicar | ✅ igual |
| **provar** | ❌ só confirmação humana | ✅ **eval-porteiro: roda os cenários, BLOQUEIA se quebrar** |
| aplicar | ✅ versionado | ✅ igual + rollback |

> 🩸 **O eval-porteiro é inegociável, e é a única coisa que a Continuare não tem.** Eles confiam na
> confirmação humana. Mas humano aprova sem ler — e foi assim que a casa quase publicou a regressão
> da Porta 3 (nota 10→2 numa "melhoria" inocente, `comum/EVALS.md` §8). O porteiro rodou os 10
> cenários, viu a queda e **não deixou publicar**. **Adotar o fluxo deles sem o porteiro nosso seria
> trocar segurança por beleza — exatamente o que o mestre disse pra não fazer.**

Detalhe completo do fluxo, telas, travas e o modelo de dados: **`ESCOLA.md`** (o dossiê da aba) e
**`assets/escola/`** (o código). Este arquivo define o **padrão**; a Escola é a **implementação**.

---

## §7 · MÍDIAS 🔷

Foto, PDF e vídeo que a IA envia no atendimento, organizados por categoria. O tipo é validado por
**content-type da resposta** (nunca pela extensão — `ghl/PEGADINHAS.md §GHL-14`: link de mídia vem
sem extensão, e um HEAD leva 405). O dono sobe; a régua §2 manda pra cá o que o cliente pedir que a
IA **mostre** (cardápio em PDF, tabela de preço em imagem, vídeo do espaço).

### 7.1 · O LEDGER DE CUSTOS — valor por execução e gasto geral

Cada execução nova congela o custo estimado **na hora em que aconteceu**:

```ts
{
  tokens: { input, cacheWrite, cacheRead, output, chamadas },
  vozCaracteres,
  sttSegundos,
  claudeUsd, vozUsd, sttUsd, infraBrl,
  usdBrl, tabela, modelo,
  totalUsd, totalBrl
}
```

**Por que gravar e não recalcular:** preço de modelo, contrato e câmbio mudam.
Recalcular dezembro com a tabela de março falsifica o passado. A execução guarda
a tabela e a cotação usadas; a fatura do provedor permanece o fechamento
contábil.

**O acumulador soma tudo:** chamada inicial, loops de tool, retry por
`max_tokens`, resposta final forçada, voz realmente entregue e transcrição nova.
Contar só a resposta final subestima justamente as conversas complexas.

**Honestidade do histórico:** registros anteriores ao ledger aparecem como
`não medido`. Nunca aplique uma média retroativa e apresente como fato.

**Valores padrão em 23/07/2026:** Sonnet 5 usa preço introdutório oficial até
31/08/2026 e muda automaticamente para a tabela padrão depois; cache write =
1,25× input e cache read = 10% do input. ElevenLabs Flash e Groq Whisper usam
env configurável. Ao propagar, confirme preços oficiais e contrato do cliente.

🩸 **Primeira prova:** endpoint financeiro em produção em 23/07/2026, separando
5 registros antigos como `sem custo`. A prova E2E final é uma conversa nova
gerar `custo.totalBrl`; até isso acontecer, diga “ledger no ar, aguardando
primeira execução”, não “validado ponta a ponta”.

---

## §8 · O TEMA claro/escuro 🏠 — padrão visual, não opção

**Tema claro/escuro é PADRÃO de toda Central, não um extra de alguns projetos.** Foi a divergência
que o mestre citou ("uns têm, outros não") como sintoma da falta de padrão. A partir desta versão:

- **tokens de tema no `globals.css`** — fundo, superfície, borda, 4 níveis de texto, cada um com par
  claro/escuro. **Nenhum componente escreve cor na mão** (se escrever, quebra num tema).
- **script anti-flash** no `layout` — aplica o tema salvo antes do primeiro paint (sem piscar).
- **respeita o SO** na 1ª visita; a escolha do usuário manda depois, salva em `localStorage`.
- **toggle** no topo da barra lateral.

> 🩸 A lição que virou padrão: cor cravada no componente (`bg-white/[0.03]`, `#0a0a0a`, `text-white`)
> vira texto invisível ou caixa preta no tema oposto. **Cor sempre em token; hover sempre em
> `hover-raise`; superfície sempre em `.surface`.** Detalhe em `reference_design_system_metrik`.

> 🩸 **E a segunda lição, medida em produção (22/07/2026): alpha não funciona no tema CLARO.**
> `rgba(15,23,42,0.035)` sobre fundo branco é **invisível** — o campo some e o cliente vê uma tela
> quebrada ("as caixas estão apagadas, quase ilegíveis"). No claro, superfície usa **cor sólida**
> (`#f2f4f8`) e todo input usa a classe **`.campo`** (fundo branco + borda visível). O escuro
> continua com alpha, que ali funciona. **Nunca teste um tema só.**

### 8.1 · 🩸 O FLASH DE PERFIL — a tela que pisca

**Sintoma (relatado pelo cliente):** *"aparece outra tela por 1 segundo e depois some, aparecendo a
tela certa"*.

**Causa:** a tela nasce com o perfil `dono` (fail-closed, e isso está **certo** — §11.5) e só descobre
que é `agencia` quando o `GET /api/prompt` responde. No intervalo, o React já renderizou o **título,
o texto e as abas da versão errada**. Quando o perfil chega, tudo troca na cara do usuário.

**Cura — vale para QUALQUER tela cujo conteúdo dependa de perfil ou de dado remoto:**

```tsx
const [pronto, setPronto] = useState(false)
// no carregador:  .finally(() => setPronto(true))

{!pronto ? <Esqueleto/> : <ConteudoReal/>}   // nunca a versão errada
```

**ANTICORPO:** *fail-closed no PERMISSIONAMENTO, esqueleto na RENDERIZAÇÃO.* O padrão seguro de
segurança (assumir o menor privilégio) vira bug de UX se for renderizado — porque o palpite seguro
**aparece** e depois é desmentido. Guarde os três modos atrás de `pronto &&`, não só o header.

**Como conferir:** abra a tela e leia o HTML inicial. Se ele contiver o título de **qualquer** um dos
perfis, ainda pisca. Certo é conter só o esqueleto.

---

## §9 · VERSIONAMENTO E PROPAGAÇÃO — evoluir controladamente

**Como a Central evolui sem virar "um de cada jeito":**

**`SISTEMA_VERSAO`** (`lib/manifest.ts`) é a versão do **motor/padrão compartilhado** — não do
conteúdo do cliente. Formato `AAAA.MM.DD-marco`. Toda mudança de **padrão** (aba nova, destino novo,
trava nova) bump essa versão. A Enciclopédia da Central mostra a versão de cada cliente → **você bate
o olho e sabe quem está atrás.**

> 🩸 A `SISTEMA_VERSAO` foi mandada em 5 documentos por meses **sem existir no código** — a doutrina
> dizia "bump" e a constante não existia. Foi criada em 22/07/2026 (`ESCOLA.md`). **Doc que afirma
> que algo existe é pior que doc omissa.** Este §9 só vale porque a constante agora existe.

**O ritual de propagação** (quando o padrão evolui):
1. a evolução entra **no padrão** (aqui e no código do template), com bump de `SISTEMA_VERSAO`
2. cicatriz nova → entra na fonte (a skill) e propaga (a regra de `feedback_propagacao_cicatriz`)
3. cada cliente ativo recebe a atualização **redeployado** — componente que só vive no template não
   chegou em ninguém (a "4ª perna", `SKILL.md §7.3`)
4. **nada entra no manifesto como `ativo` sem prova com data**

**Bug × evolução (a Lei 2 do §0):** bug se conserta no cliente na hora e vira cicatriz. Evolução de
padrão bump versão e propaga. Não confunda — correção urgente local ≠ mudança de padrão global.

---

## §10 · A ORDEM DE CONSTRUÇÃO — a professora que executa

### 10.1 · Criar a Central de um cliente NOVO (a 1ª tarefa, a 2ª…)

```
1. o agente do cliente já está no ar?  (ghl/PLAYBOOK.md ou kommo/PLAYBOOK.md)
      └─ SEM isso, não há o que a Central mostre. Pare e faça o agente primeiro.
2. clone o template da Central (área-cliente) — NÃO monte aba por aba do zero
3. aplique as camadas na ordem: central-v2 → central-v3 → Escola → central-v4.1
      └─ central-v4.1 é SEMPRE a última e vence toda sobreposição visual.
      └─ /cerebro final = assets/central-v4/central/app/cerebro/page.tsx
4. aponte AGENT_URL / AGENT_SECRET pro agente do cliente
5. troque o conteúdo, NUNCA a estrutura:
      · cérebro (as seções) · catálogo (a planilha dele) · marca (logo, nome)
6. confira o TEMA (claro/escuro funcionando), mobile 390px e perfil dono×agência
7. rode o smoke v4.1: `/` · `/operacao` · `/cerebro` · `/resultados`
   · `/configuracoes` · `/api/exec` em 200
8. confirme o fail-closed: antes das fontes responderem mostra “verificando”;
   CRM/API com erro nunca aparece como saudável
9. gere uma conversa real e confirme `execucao.custo.totalBrl`
10. valide divulgação progressiva: uma análise/ferramenta por vez, Radar com 2
    prioridades e estado vazio didático
11. rode `node scripts/audit-skill.mjs` na fonte da skill
12. registre a SISTEMA_VERSAO do cliente no manifesto, com data
```

> **Autoridade final:** o Patch 7 legado de `assets/escola/INSTALAR.md` ensina a
> instalar a Escola numa Central antiga. Em cliente novo ele não define a UX
> final. A v4.1 é aplicada por último e seu `/cerebro` de seis modos
> (`inicio`, `ler`, `ensinar`, `mapa`, `laboratorio`, `editar`) é o contrato.

### 10.2 · Evoluir uma Central EXISTENTE (o ritual)

```
1. a mudança é BUG ou PADRÃO?
      · bug   → conserta no cliente, vira cicatriz aqui, fim.
      · padrão→ segue abaixo.
2. escreve o padrão novo AQUI primeiro (a professora aprende antes de executar)
3. implementa no template + bump SISTEMA_VERSAO
4. testa (tsc limpo, teste do motor verde, smoke na tela)
5. propaga pros clientes ativos, um a um, redeployando (a 4ª perna)
6. atualiza o manifesto de cada um com a versão nova + prova datada
```

> 🏛️ **Esta é a resposta ao pedido do mestre:** a skill **sabe** a primeira tarefa e a segunda. Criar
> Central nova é o §10.1; evoluir é o §10.2. Não é adivinhação a cada projeto — é o mesmo caminho,
> sempre, e ele melhora com versão.

---

## §11 · O QUE É NOSSO E NÃO SE PERDE (o motor de segurança)

A Continuare ganhou no produto; a casa ganhou no motor. **Estas peças ficam por baixo de TODA
Central, invisíveis, e adotar o layout deles jamais pode custar qualquer uma:**

1. **Eval como PORTEIRO** — juiz automático, cenários com nota, **bloqueia** publicação que quebre o
   que já passava. A trava que a Continuare não tem. (`comum/EVALS.md`)
2. **Triagem determinística** — regex que impede dado volátil (preço/prazo/data) de entrar no
   cérebro, com a régua §2 completa. (`assets/escola/`)
3. **Anonimização de PII** — antes de guardar qualquer conversa (o celular-BR = CPF, etc.).
4. **O organismo** — guardião diário (valida o mapa contra o CRM vivo), analista semanal, auditora de
   funil, alertas no grupo, diário estruturado. A Central **colhe** o que ele produz.
5. **Perfil dono × agência** — o dono ensina em português e nunca vê o editor de prompt cru.

> 🩸 **A frase que resume o padrão:** *pegue a casca da Continuare e o motor da casa.* O cliente vê a
> simplicidade deles; a segurança nossa roda escondida. Nenhuma das duas metades é opcional.

---

## §12 · FONTES

**🔷 A análise da Continuare** (`continuare-ia.vercel.app`, acesso autorizado pelo mestre — sócio da
Continuare —, 22/07/2026). Mapeadas: 7 rotas (`/` `/ao-vivo` `/cerebro` `/configurar` `/dashboard`
`/rastreio` `/testar`) e 9 endpoints (`/api/testar` `/api/treinar` `/api/simulador` `/api/admin/prompt`
`/api/admin/business` `/api/live` `/api/media/upload` + login/reset). Confirmado: cérebro por seções,
catálogo com import de planilha, mídias por categoria, testar+corrigir fundido, few-shot como destino,
guarda de recusa — **e ausência de eval-porteiro** (têm cenários que "rodam", sem nota/bloqueio; a
trava deles é confirmação humana). Conteúdo da clínica **não** foi copiado — só o desenho de produto.

**🏠 A base da casa:**
| Peça | Onde |
|---|---|
| A Escola (testar+corrigir, o motor, o modelo de dados) | `ESCOLA.md` + `assets/escola/` |
| Limiares medidos prompt × RAG × custo | `comum/CONTEXT-ENG.md` |
| O eval como porteiro | `comum/EVALS.md` |
| O organismo e a Central atual | `SKILL.md` §1 · `comum/ARQUITETURA.md` |
| Versionamento e propagação (a 4ª perna) | `SKILL.md` §7.3 · `ESCALA.md` |
| Design system e tema | `reference_design_system_metrik` |

---

> **A régra de ouro deste arquivo:** a Central é o rosto do que a casa faz. Ela segue **um** padrão,
> evolui **sempre**, e propaga **versionada**. Casca simples pro cliente, motor de segurança por
> baixo. Quando em dúvida sobre onde um conhecimento mora, volte ao **§2** — é a peça-mãe.
