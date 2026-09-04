# ESCOLA — a aba "Ensinar a IA" da Central (o cliente corrige, o sistema conserta)

> **O que é este documento.** O projeto completo da aba onde o **cliente** testa a IA dele, marca o que saiu errado, diz o que deveria ter saído — e o **sistema** decide sozinho se aquilo vira regra no prompt, exemplo, ticket de engenharia ou nada. É a peça que fecha o ciclo do cérebro editável: hoje o cliente pode **editar** o prompt; a partir daqui ele pode **ensinar** sem nunca encostar nele.
>
> **A frase do dono, literal:** *"A INTENÇÃO É QUE O CLIENTE NÃO ENCOSTE NO PROMPT — ele pede, e o sistema decide se aquilo vai pro prompt, pro RAG, pra base de conhecimento ou pra outro lugar, sem quebrar nada, só melhorando."*
>
> **O que ela NÃO é:** não é otimizador automático de prompt, não é fine-tuning, não é memória que aprende sozinha. Toda mudança passa por **duas portas**: um humano aprova a proposta, e o **eval que já existe** aprova a publicação.

**Leia este arquivo quando:** for construir/evoluir a Central · o cliente pedir "quero ajustar a IA sozinho" · alguém propuser "deixa ele editar o prompt" · você for decidir onde um conhecimento novo mora (prompt × tool × código) · for vender autonomia do cliente na renovação.

> 🏛️ **Este desenho passou por um júri de 3 lentes** (blindagem · custo · entropia em 12 meses) contra duas arquiteturas alternativas — uma minimalista ("só uma fila de tickets") e uma intermediária. **Venceu, e venceu sendo a mais barata em dias de build**, não a mais cara: o número que a fazia parecer catedral (*"2 a 3 semanas"*) era o único das três que embutia a **semana de observação em produção**. Em dias de build honestos: **~8,5 aqui** contra ~9,5 e ~11 das alternativas. As peças boas das outras duas foram enxertadas e estão marcadas ao longo do texto. Os riscos que **nenhuma** das três fecha estão no **§8-B** — leia antes de vender isto.

**Legenda de prova:**

| Marca | Significado |
|---|---|
| 🩸 | **Cicatriz nossa, com data** — a prova mais forte que existe aqui |
| ✅ | Verificado contra a doc oficial da Claude API ou contra código nosso em produção |
| 📄 | Citação de pesquisa — plausível, **confira antes de gastar o dia** |

**Dependências deste arquivo:** `comum/PLAYGROUND.md` (o sandbox é a fundação da captura) · `comum/EVALS.md` (o portão é a trava mestra) · `comum/CONTEXT-ENG.md` (os limiares de token e a régua prompt × tool) · `FRONTEIRA.md` §3 (o cemitério que proíbe o otimizador) e §1 proposta #4 (a rubrica binária, **pré-requisito duro**).

---

## §1 · O PROBLEMA — por que "deixar o cliente editar o prompt" é uma armadilha

### 1.1 · O pedido por trás do pedido

Todo cliente, no segundo mês, pede a mesma coisa: *"queria poder ajustar a IA sozinho"*. E a leitura ingênua disso é dar a ele um `<textarea>` com o prompt dentro.

**Ele não quer ser engenheiro de prompt. Ele quer ser OUVIDO.**

A prova está no que ele faz quando você dá o textarea: ele não escreve regra, ele escreve **a frase que a IA deveria ter dito**. Ele não pensa em bloco, condição ou escopo — ele pensa no lead específico que ele viu errar hoje de manhã. O textarea traduz mal essa intenção, e o resultado é sempre um dos quatro desastres do §5.

### 1.2 · O que quebra quando o cliente edita direto

| O que acontece | Por quê | Custo real |
|---|---|---|
| Ele **cola a resposta desejada** dentro do prompt | Ele é dono de negócio, não redator. O texto dele é pior em tom que o da marca | A IA fica com duas vozes. O tom que você vendeu morre |
| Ele **contradiz o que pediu em março** | Ninguém lembra do que pediu há 4 meses | Prompt com A e ¬A: o modelo escolhe no sorteio, e você debuga no escuro |
| Ele **transforma um caso esquisito em lei global** | Um lead maluco na terça vira regra pra todos os leads | A IA passa a tratar todo mundo como o maluco de terça |
| Ele **empilha** — 200 correções em 6 meses | Ninguém apaga nada. Prompt só cresce | 40k tokens, latência 9,5s (**medido**), contradição em todo lugar, impossível de auditar |
| Ele escreve **preço** no prompt | Preço parece conhecimento; é **dado** | 🩸 A pior falha do catálogo: **prompt com dado inventado é bomba-relógio — o agente vende errado com confiança total** |

E o pior de todos: **some o eval.** No momento em que a edição vira livre, o exame deixa de ser porteiro e vira sugestão. `comum/EVALS.md` §6 já registra isso como o cuidado explícito: *"cliente que quer editar sozinho o tempo todo → prompt no painel, MAS aí some o eval"*.

### 1.3 · O que já existe (não reconstrua)

Este projeto **não começa do zero**. A metade difícil está no ar:

| Peça | Estado | Onde |
|---|---|---|
| 🎮 **Playground "Testar ao vivo"** — chat com o prompt candidato, tools em **dry-run** | ✅ no ar 19/07/2026 (GHL e Kommo) | `comum/PLAYGROUND.md` |
| 🧠✏️ **Cérebro editável** — override no Redis lido ANTES do bundle, 20 versões com nota, rollback, restaurar-fábrica | ✅ no ar (GHL) | `lib/prompt-store.ts` |
| 🧪 **Portão de publicação** — `POST /api/prompt {acao:'publicar'}` roda os 10 evals e **só publica se passar** | ✅ validado: prompt sabotado bloqueado com **5,7/10** 🩸 | `lib/evals.ts` + `api/prompt.ts` |
| 🧠 **Analista semanal** — lê o diário e propõe até 3 evoluções com evidência, **nunca aplicadas sozinhas** | ✅ no ar | `lib/analyst.ts` |
| 📓 **Diário de execuções** — tudo que a IA fez | ✅ no ar · **agora grava `turnoLead`/`respostaIA` anonimizados** (é a **porta preferida** da captura: escolher do diário = zero parser) | `lib/execlog.ts` |
| 📊 **Central** — a vitrine | ✅ no ar | `area-cliente/` |
| 🎓 **Escola Fase 0** — captura, triagem determinística, fila por bloco e ticket | ✅ **código pronto (22/07/2026), 49/49 no teste de travas, `tsc` limpo — sem prova em produção** | `assets/escola/` · §8 Fase 0 |

**O que falta é exatamente uma coisa:** o caminho que leva **da frase que o cliente escreve** até **o delta certo, no lugar certo, provado pelo portão**. Esse caminho é a ESCOLA — e a **primeira metade dele (a Fase 0: ouvir, triar, enfileirar) já foi construída em 22/07/2026** (§8). O que falta agora é a metade automática: alfaiate, caderno, faxina.

> ⚠️ **Estado por CRM.** No **GHL** o alicerce está inteiro. No **KOMMO** existe **só o playground** — `prompt-store.ts`, `evals.ts` e as ações publicar/restaurar/rollback **ainda não foram portadas** (`PLAYGROUND.md` §9.1). **A ESCOLA no Kommo exige esse port antes de qualquer linha desta aba.**

---

## §2 · A REGRA DE OURO — feedback é INTENÇÃO, não texto final

> 🏛️ **LEI DA ESCOLA: o que o cliente escreve é DIAGNÓSTICO, nunca COLA.**
> A frase dele entra no sistema como **evidência do que está errado**. Quem escreve o texto que vai pro cérebro é o **redator** (Claude, com o prompt vigente e a voz da marca em mãos). O cliente descreve a intenção; o modelo extrai o princípio e reescreve.

Isso não é preferência estética — é o contrato técnico que a pesquisa chama de **reflexão guiada por feedback textual**: a string do humano chega verbatim no passo de reflexão como *diagnóstico da falha*, e o modelo que redige a nova instrução é outro. 📄 (GEPA, arXiv:2507.19457.) A alternativa — tratar a frase do cliente como saída desejada e colá-la — é o caminho direto pra Patologia 1.

**Consequência de UI, e ela é dura:** a correção só vale com o **par completo**. Sem "o que ela deveria ter dito", você não tem contraste; tem reclamação. 📄 (É o mesmo princípio do `AvatarOptimizer`: o sinal está na **diferença** entre o exemplo ruim e o bom, não no bom sozinho.)

### 2.1 · Onde esse conhecimento mora (a tabela que é o coração do sistema)

Cada correção tem **um** destino. O trabalho do sistema é acertar qual — e a literatura já dividiu isso em regra × demonstração; a doutrina da casa acrescenta os outros dois. 📄 (`SIMBA`: `append_a_rule` × `append_a_demo`.) 🩸 (`CONTEXT-ENG.md` §2 e §7: dado que muda toda hora = **TOOL**; o que é determinístico vira **CÓDIGO**.)

| Destino | O que é | Onde entra | Exemplo de correção que cai aqui | Quem escreve |
|---|---|---|---|---|
| **LEI** | Regra **condicional**: `quando <gatilho> → <ação>` | bloco correspondente dos 12 do `prompt.md` | *"quando o lead já é aluno e pede ajuda, ela não pode oferecer nada"* | redator |
| **VOZ** | Regra de **tom/forma**, sem condição | bloco `tom/formato WhatsApp` | *"ficou seco demais, parece robô"* · *"mensagem muito longa"* | redator |
| **EXEMPLO** | **Demonstração** anonimizada de um turno bem resolvido | bloco `<exemplos>` no fim do estático | só nasce da **consolidação de ≥3 VOZ** do mesmo defeito | redator |
| **FATO** | Número/nome **verificável e estável** | bloco `números reais da empresa` | *"são 4.200 alunos, não 3.000"* | redator, **com `sunset` obrigatório** |
| **TOOL/CRM** | **Dado que muda** — preço, agenda, estoque, prazo, disponibilidade | ❌ **nunca no prompt** — vira ticket | *"o preço agora é R$229"* | 🎫 engenheiro |
| **CÓDIGO** | Comportamento **determinístico** — canal (voz×texto), alçada, gate, whitelist de etapa | ❌ **nunca no prompt** — vira ticket | *"ela não pode mandar áudio pra quem escreveu"* | 🎫 engenheiro |
| **RECUSAR** | Fora de escopo, reclamação sem par, pedido que fere um `limite` de fábrica | devolve ao cliente com o motivo | *"faz ela dar 50% de desconto"* | — |

**Dois tipos ficam FORA do alcance do cliente, por construção:** `identidade` (quem a IA é) e `limite` (o que ela NUNCA pode falar: prazo, garantia, desconto). Só engenheiro/fábrica cria ou mexe. É o que impede a escola de virar porta dos fundos pro risco jurídico.

### 2.2 · A árvore de decisão (é isto que o roteador implementa)

```
A correção cita R$, %, data, horário, quantidade, prazo, nome de plano?
│   (regex determinístico — o modelo NÃO opina aqui)
├── SIM ─────────────────────────────────────────► TOOL/CRM  🎫 ticket
└── NÃO
    │
    Ela pede que a IA mude QUEM/QUANDO/POR ONDE responde
    (canal, alçada, gate, quem recebe, mover etapa)?
    ├── SIM ─────────────────────────────────────► CÓDIGO    🎫 ticket
    └── NÃO
        │
        Ela fere um `limite` ou `identidade` de fábrica?
        ├── SIM ─────────────────────────────────► RECUSAR   ↩️ devolve
        └── NÃO
            │
            Ela descreve uma CONDIÇÃO ("quando X, faça Y")?
            ├── SIM ─────────────────────────────► LEI       ✏️ pipeline
            └── NÃO
                │
                Ela é sobre TOM / TAMANHO / FORMATO?
                ├── SIM ─────────────────────────► VOZ       ✏️ pipeline
                │        └── 3+ VOZ do mesmo defeito ──────► EXEMPLO (consolidação)
                └── NÃO ─────────────────────────► FATO      ✏️ pipeline (com sunset)
```

> 🏛️ **DEFAULT = INSTRUÇÃO, NÃO EXEMPLO.** Nossa suíte tem **10 cenários** — isso é "conjunto de avaliação pequeno" por qualquer critério. Demo aprendida em poucos casos **descreve** aqueles casos; instrução captura o padrão um nível acima e **transfere**. 📄 (MIPROv2, arXiv:2406.11695: *"instruction optimization is particularly valuable for tasks with intricate conditional logic that are hard to learn solely from few-shot examples"*.) Traduzindo pro nosso cérebro: **regra de ouro, regra de suporte, limites e portas são condicionais → INSTRUÇÃO.** Ritmo de WhatsApp e jeito de contornar objeção → **DEMONSTRAÇÃO**, e só com ≥3 casos.

---

## §3 · O QUE O CLIENTE VÊ — tela por tela, com os textos de verdade

A aba **"Ensinar a IA"** entra no `/cerebro` que já existe, com **duas sub-abas**: **Corrigir** (a captura) e **Caderno** (a lista viva de tudo que ele já ensinou).

No topo, sempre visível, a **barra de orçamento do cérebro**:

```
🧠  Cérebro: 8,4k de 10k tokens   ▓▓▓▓▓▓▓▓░░  verde
    Até 10k a IA responde em ~4,7s. Acima disso começa a demorar (medimos 9,5s).
```

### 3.1 · Tela A — testar e corrigir na hora

O playground que já está no ar ganha **um botão embaixo de cada resposta da IA**:

```
  🤖 Oi! O Método Metrik Sales é R$179 por mês e te dá [...]
                                          [ 👍 ]  [ ✏️ errou aqui ]
```

Clicar abre o card — **com dois campos já preenchidos e travados**:

> **✏️ Corrigir esta resposta**
>
> **O lead disse** *(travado)*
> `quanto custa?`
>
> **A IA respondeu** *(travado)*
> `Oi! Antes de te passar o valor, me conta seu nome?`
>
> **O que ela deveria ter dito?** ⭑ *obrigatório*
> `[ Escreva do seu jeito — não precisa ficar bonito. A gente cuida do texto. ]`
>
> **O que ela errou?** *(clique no que se aplica — 1 segundo)*
> `[ ficou seca ]` `[ faltou o preço ]` `[ perguntou antes de responder ]` `[ entendeu errado ]` `[ ordem errada ]` `[ longa demais ]` `[ outro… ]`
>
> **Por que isso importa?** *(opcional, mas ajuda muito)*
> `[ Ex.: quem vem do Instagram sempre pergunta preço primeiro. Se ela enrola, o cara some. ]`
>
> `[ Enviar correção ]`   `[ Cancelar ]`

**Por que os chips existem, e por que eles vêm ANTES do campo livre:** o cliente preguiçoso — que é a maioria depois da segunda semana — preenche (c) e pula (d). Aí o roteador recebe um texto final sem diagnóstico e tem que **adivinhar** se aquilo é VOZ, FATO ou REGRA. O chip é o diagnóstico que ele daria se tivesse paciência, capturado em um clique. Três ganhos de uma tacada:

1. **Roteamento fica mais determinístico.** `ficou seca` e `longa demais` são VOZ com quase certeza; `faltou o preço` é FATO; `perguntou antes de responder` e `ordem errada` são REGRA. O chip entra no roteador como sinal de alta confiança **antes** de qualquer heurística de texto.
2. **Menos prosa crua entrando = menos superfície pra blindar.** Isto é blindagem por redução de superfície, não por trava adicional.
3. **Agrupamento de correções fica trivial.** Juntar "as outras do mesmo assunto" (o que a confirmação promete) vira `GROUP BY chip`, não similaridade semântica.

⚠️ **O chip NUNCA substitui o campo (c).** Ele diagnostica; (c) é o que o alfaiate escreve. Chip sozinho, sem "o que ela deveria ter dito", cai na mesma trava — é reclamação com etiqueta.

**Trava de UI — mensagem exata quando ele tenta enviar sem o campo obrigatório:**

> ⚠️ **Preciso do par completo.** Sem "o que ela deveria ter dito", isso é uma reclamação — e reclamação eu não sei consertar. Não precisa ser a frase perfeita: escreva a ideia, que eu escrevo o texto.

**Confirmação depois de enviar — e ela é deliberadamente fria:**

> ✅ **Anotado.** Nada muda agora, de propósito. Vou ler esta correção junto com as outras do mesmo assunto e te trazer uma proposta **antes** de mexer no cérebro. Você aprova, eu testo, e só então publico.

> 🩸 **Por que a expectativa é calibrada assim, na primeira tela:** cliente que aperta "corrigir" e vê a IA mudar na hora aprende que o sistema é um textarea com passos a mais. Cliente que lê "vou juntar com as outras e te trazer a proposta" aprende que existe um processo — e **para de pedir mudança de tom no meio da tarde**.

### 3.2 · Tela B — trazer uma conversa REAL

Duas portas, e **a ordem entre elas importa**:

> **📂 Escolher uma conversa de verdade**  ← *porta preferida*
>
> | Quando | Lead | Como terminou | |
> |---|---|---|---|
> | ontem 14:32 | João (Instagram) | 💀 sumiu depois do 2º turno | `[ abrir ]` |
> | ontem 09:10 | Marina (anúncio) | ✅ reunião marcada | `[ abrir ]` |
> | 19/07 16:45 | Rafael (indicação) | 💀 sumiu no 1º turno | `[ abrir ]` |
>
> `[ ver mais ]`   Filtrar: `⦿ as que morreram` `○ todas` `○ as que converteram`
>
> ---
>
> **📋 Ou colar de outro lugar**  *(WhatsApp, print, outro CRM)*
>
> ```
> [ Lead: oi, vi o anúncio
>   Bia: Oi! Que bom que você chegou 🙌 Me conta seu nome?
>   Lead: joão. quanto é?
>   Bia: Prazer, João! Você já trabalha com vendas?           ]
> ```
>
> `[ Separar a conversa ]`
>
> 🔒 Telefone, e-mail e CPF são apagados antes de guardar. **Fica só o que ensina.**

Em qualquer das duas portas, cada turno da IA ganha o mesmo `[ ✏️ foi aqui ]` da Tela A, e o fluxo é idêntico — os campos (a) e (b) vêm preenchidos do turno marcado.

🩸 **Por que "escolher do diário" é a porta PREFERIDA, e "colar" a segunda:**

| | Escolher do diário | Colar |
|---|---|---|
| Parser | **nenhum** — os turnos já vêm estruturados do `agente:diario:*` | regex, com fallback pro Haiku quando vem sujo |
| Anonimização | **já aconteceu** na gravação | regex na hora, e regex erra |
| Fidelidade | é a conversa que a IA **realmente** teve, com o prompt daquele dia | é o que o cliente lembrou de copiar — e ele corta o contexto |
| Atrito | 2 cliques | abrir o WhatsApp, achar, selecionar, copiar, voltar, colar |
| Origem | 100% dos casos são reais | cliente cola conversa **de concorrente** e pede pra IA imitar |

O diário já existe (§1.3) e é a porta que produz evidência de melhor qualidade. O "colar" continua no produto porque cobre o que o diário não vê: conversa que aconteceu **antes** do agente entrar no ar, e print que o cliente recebeu de um vendedor humano.

> 🩸 **CICATRIZ DA CONSTRUÇÃO (22/07/2026) — "quase de graça" era FALSO, e o erro é instrutivo.**
> A primeira versão deste parágrafo dizia que a porta do diário sai **de graça porque o diário já existe**. Ao construir a Fase 0 no agente da Metrik, o `lib/execlog.ts` real guardava `{ts, contactId, nome, resultado, detalhe, duracaoMs, tools, voz}` — **e nenhum texto de mensagem.** O diário registrava *que* a IA respondeu, nunca *o que* ela respondeu.
>
> O conserto foi barato (dois campos no `ExecRecord`, dois valores no `logExec` do `api/inbound.ts` — `target.body` e `reply.parts.join('\n')`, ambos já em escopo, mais a anonimização na gravação). **Mas a consequência de produto não é barata e precisa estar na tela:**
>
> ⚠️ **No dia 1 a porta preferida nasce VAZIA.** Ela só enche com as conversas que acontecerem **depois** do deploy. O histórico anterior não tem texto e nunca terá. Então a tela precisa de um estado vazio que não pareça defeito: *"Ainda não tenho conversa guardada com o texto completo. Elas começam a aparecer aqui conforme a IA for atendendo. Enquanto isso, use o laboratório ou cole uma conversa abaixo."*
>
> **A lição geral, que vale pra toda estimativa deste documento:** "o componente X já existe" não é o mesmo que "**o componente X já guarda o que eu preciso**". Antes de chamar uma peça de gratuita, abra o arquivo e confira o schema. Foi o que transformou uma linha de estimativa numa emenda de UI.

> **Nota de projeto:** o parser da segunda porta é **código** (regex de `Nome:` no início da linha), não modelo. Só cai pro Haiku quando o formato vem sujo demais — e nesse caso a UI avisa: *"o formato veio estranho, confira se separei certo antes de continuar"*. Parser de colagem é exatamente o tipo de coisa determinística que a doutrina manda virar código.

#### 🩸 A anonimização: dois bugs que só apareceram porque existia teste

A regex de anonimização é o tipo de código que **parece pronto na primeira escrita e vaza calado por meses**. As duas falhas abaixo estavam na versão que eu teria mandado pro ar sem o `scripts/test-escola.ts` (22/07/2026):

**1. `\b` não casa antes de parêntese.** Em `(11) 98765-4321`, não há fronteira de palavra entre o espaço e o `(` — os dois são non-word. O casamento começava no `1` e o resultado era **`([telefone]`**, com o parêntese órfão. Use `(?<!\d)` / `(?!\d)`: aqui a fronteira que importa é de **dígito**, não de palavra, e ela funciona com `(`, `+` e espaço em volta.

**2. Celular brasileiro com DDD tem 11 dígitos — exatamente como CPF.** Com o padrão de CPF antes na lista, `11987654321` virava **`[cpf]`**. É PII rotulada errado: some do texto (bom), mas mostra que a régua de privacidade nunca foi exercitada — e é assim que se descobre, meses depois, que ela também errava no que importa.

**A ordem é parte da correção**, e por isso ela é comentada no código:

```
1. e-mail
2. CPF PONTUADO      ← inequívoco (123.456.789-00), sai primeiro
3. celular           ← DDD + 9 + 8 dígitos
4. fixo              ← DDD + 8 dígitos começando em 2–5 (10 dígitos, não colide)
5. CPF CRU           ← o que sobrou de 11 dígitos não era telefone
6. CEP
7. cartão            ← 13–19 dígitos, por último
```

E o teste guarda os dois lados: que o PII **some** (`(11) 98765-4321`, `+55 11 98765-4321`, `11987654321`, fixo, CPF nos dois formatos, CEP) e que o que **ensina fique** — `custa R$179 por mês`, `parcela em 12x`, `desde 2019 no mercado` passam intactos. Anonimizador que come o preço destrói a evidência que a correção existe pra carregar.

### 3.3 · Tela C — a fila de sugestões PROATIVAS do sistema

O analista semanal (`lib/analyst.ts`) **para de mandar 3 sugestões em texto no WhatsApp** e passa a alimentar esta mesma fila. O cliente vê:

> **🔍 O que eu notei sozinho — semana de 14 a 20/07**
>
> **1.** Em **3 conversas** desta semana o lead perguntou sobre parcelamento e a Bia respondeu *"depois a gente vê isso"*. Duas dessas conversas morreram no turno seguinte.
> **Sugiro:** responder direto que parcela em até 12x, e só então perguntar.
> `[ 👀 ver as 3 conversas ]`   `[ ✅ faz sentido ]`   `[ ✋ não é assim ]`
>
> **2.** Em **5 conversas** a Bia mandou mensagens de 6+ linhas. A mediana das conversas que viraram reunião é de 2 linhas.
> **Sugiro:** encurtar o padrão de resposta.
> `[ 👀 ver as 5 conversas ]`   `[ ✅ faz sentido ]`   `[ ✋ não é assim ]`

Clicar em **"faz sentido"** injeta a sugestão no **mesmo pipeline** da correção do cliente — mesma reflexão, mesmo conflito, mesmo portão. Clicar em **"não é assim"** pede uma linha de motivo e **grava a recusa** (é assim que o analista para de repetir a mesma sugestão todo mês).

> 🏛️ **Decisão:** analista e cliente entram pela **mesma porta**. Duas filas paralelas de "melhorias do prompt" é o desenho que garante contradição em 60 dias.

### 3.4 · Tela D — a proposta, em linguagem de dono

É a tela que faz este produto ser vendável. Nenhuma palavra técnica, e **o custo em tokens aparece**.

> **📝 Proposta de mudança no cérebro**
>
> **O QUE MUDA**
> A Bia passa a responder o preço **antes** de perguntar qualquer coisa, sempre que o lead perguntar valor logo de cara.
>
> **ONDE ENTRA**
> No bloco **"Regra de ouro"** — junto com as regras de como ela conduz a conversa.
>
> **VEJA NA PRÁTICA** — *o lead pergunta "quanto custa?"*
> | Como ela responde **hoje** | Como ela vai responder |
> |---|---|
> | *"Oi! Antes de te passar o valor, me conta seu nome?"* | *"É R$179/mês, ou 12x se preferir. Posso te mostrar o que entra? E como você se chama?"* |
>
> `[ 🔁 rodar de novo ]`  `[ 👀 testar com outra pergunta ]`
>
> **POR QUÊ**
> 3 casos seus: 14/07 (lead do Instagram), 16/07 (lead do anúncio), 18/07 (você testou no laboratório). Nos três, o lead perguntou preço e ela pediu o nome primeiro.
> `[ 👀 ver os 3 casos ]`
>
> **VALE PARA**
> ⦿ Todas as conversas   ○ Só quem vem do Instagram   ○ Só na Porta 2
>
> **CUSTO**
> +120 tokens. Seu cérebro vai de **8,4k → 8,5k** — continua no verde.
>
> **COMO EU VOU PROVAR**
> Vou criar um teste novo com esse caso exato e rodar ele **junto com os 10 que já protegem seu cérebro**. Só publico se o caso novo passar **E** os 10 antigos continuarem passando.
>
> `[ ✅ Aprovar e testar ]`   `[ ✂️ Vale só para... ]`   `[ 🗑️ Descartar ]`

**Estado enquanto testa:**

> ⏳ Testando sua correção contra **11 casos**... *(isso leva ~40 segundos)*

**Publicou:**

> ✅ **Publicado — versão v8.** Sua correção passou, e os 10 casos antigos continuam passando. Já está valendo pros leads que chegarem agora. `[ ver no Caderno ]` `[ desfazer ]`

**Reprovou — e este é o texto mais importante da aba inteira:**

> ⛔ **Não publiquei.** Sua correção resolveu o caso do lead que pergunta preço, **mas derrubou a Porta 3**: a Bia passou a pedir o nome antes de responder sobre GHL, e a nota daquele caso caiu de **10 → 2**.
> Seu cérebro **não foi tocado** — continua exatamente como estava.
> `[ 👀 ver o que quebrou ]`   `[ ✂️ tentar só no Instagram ]`   `[ 🗑️ desistir dessa ]`

> 🩸 Esse texto não é hipótese: **é a regressão real de 12/07/2026** (`EVALS.md` §8), transformada em produto. A dor que custou uma venda vira a tela que o cliente vê e diz *"caramba, ele testou mesmo"*.

#### O replay antes/depois — a maior relação valor/hora do sistema inteiro

A linha **VEJA NA PRÁTICA** custa quase nada e é **o que faz o dedo do cliente ir no botão verde**. Motivo: as outras cinco linhas da proposta são *descrição* — "o que muda", "onde entra", "por quê". Descrição é abstrata e o dono não consegue julgar. O replay é a **coisa em si**: ele lê as duas frases lado a lado e sabe em dois segundos se aquilo é o que ele queria.

**Como se implementa (é reúso, não construção):**

1. O `simulateChat` do playground **já existe e já está no ar**. Ele roda o agente contra um prompt arbitrário sem gravar nada no diário e sem tocar em CRM.
2. A proposta já carrega o `prompt_candidato` (o render do caderno **com** o item novo) — é ele que vai pro portão logo depois.
3. Então o replay é: `simulateChat(prompt_atual, gatilho)` e `simulateChat(prompt_candidato, gatilho)` em paralelo, onde `gatilho` é a **mensagem do lead do caso que originou a correção** — o campo (a), que já está travado no registro desde a Tela A.

Ou seja: **zero infra nova.** Duas chamadas do que já roda, com dois prompts que já estão em memória e um input que já está no banco.

**Regras de exibição — e elas importam:**

- ⏱️ O replay roda **quando a proposta é montada**, não quando a tela abre. Se rodasse no `render` da tela, o cliente esperaria 8s olhando spinner antes de conseguir ler a proposta.
- 🔒 O resultado é **cacheado no registro da proposta** (`replay: {antes, depois, gerado_em}`). Reabrir a proposta não regenera — senão o "depois" muda entre uma visita e outra, e o cliente **perde a confiança no sistema inteiro** ao ver o mesmo botão prometer coisas diferentes.
- 🔁 `[ 🔁 rodar de novo ]` existe justamente pra dar essa saída de forma **explícita e consentida** — ele sabe que pediu uma nova amostra.
- ⚠️ Se as duas colunas saírem **iguais** (acontece: o item novo não mudou o comportamento naquele gatilho), a UI **diz isso na cara**: *"Rodei e ela respondeu igual. Sua correção pode estar mirando um caso que ela já acerta — quer testar com outra pergunta?"* Esconder a igualdade seria vender mudança que não existe.
- 🚫 O replay **NÃO substitui o portão**. Ele é uma amostra de 1 caso, sem juiz e sem nota. O texto **COMO EU VOU PROVAR** continua exatamente onde está — e a ordem na tela é deliberada: replay primeiro (convence), portão depois (protege). O cliente que aprova pelo replay ainda passa pelas 11 provas.

### 3.5 · Tela E — o conflito (quando ele pede hoje o contrário do que pediu em março)

> **⚠️ Isso briga com uma regra sua**
>
> | Você pediu em **12/03** | Você está pedindo **hoje** |
> |---|---|
> | *"Nunca fale preço antes de saber o nome — quero o lead identificado"* | *"Fale o preço na hora, sem enrolar"* |
> | Nasceu do caso do lead #4471, que sumiu sem se identificar | Nasceu de 3 casos desta semana |
>
> **O que eu faço?**
> `[ Vale a de hoje — aposente a de março ]`
> `[ Mantenha a de março — descarte a de hoje ]`
> `[ As duas valem, em situações diferentes ]`

Se ele escolher **"as duas valem"**, a tela **não pede que ele escreva regra**. Ela pergunta em português:

> **Me conta em que situação cada uma vale.** Pode escrever do seu jeito — eu transformo em regra.
>
> A de março vale quando: `[ quando o lead vem da lista fria, que eu preciso saber quem é ]`
> A de hoje vale quando: `[ quando ele já veio do anúncio e já tá quente ]`

> ⚠️ **Este detalhe foi corrigido depois de uma auditoria de desenho.** A versão anterior pedia que o cliente escrevesse o **gatilho** de cada regra — e isso é exatamente o cliente escrevendo instrução de prompt, o vazamento que a arquitetura inteira jurou impedir. E era o caminho de menor resistência da UI: todo mundo clica em "as duas valem" pra não decidir. **O cliente descreve a situação; o redator escreve o gatilho.**

**A consequência de schema — e ela é o que faz a correção acima valer de verdade:**

O que ele digita nesses dois campos vai para `evidencia.situacao_cliente[]`, **nunca** para `item.gatilho`. E daí saem três invariantes que o código tem que garantir, não só a UI:

1. **`render()` não lê `evidencia`.** A `evidencia` inteira — casos, datas, `porque`, `situacao_cliente` — é **metadado de auditoria**. Nada dela chega no prompt. Se um dia alguém "otimizar" o render pra incluir o `porque` do cliente "porque dá contexto", o vazamento volta pela porta dos fundos, e volta em silêncio. Deixe isso como comentário no próprio `render()`.
2. **O `gatilho` é escrito pelo redator**, a partir da `situacao_cliente`, e passa pelo mesmo portão que o `texto`. *"quando o lead vem da lista fria"* vira `gatilho: "lead de origem=lista_fria ou sem UTM de anúncio"` — que é vocabulário do sistema, não do cliente.
3. **O guard de trigramas compara `item.texto + item.gatilho` contra `intencao + porque + situacao_cliente`** (§4.2). Sem incluir `gatilho` e `situacao_cliente` nessa comparação, o cliente que escreve uma situação bem redigida vê aquilo copiado literalmente pro cérebro **sem acionar trava nenhuma** — que era exatamente o buraco que esta tela existia pra fechar.

🩸 O padrão geral, e vale pra qualquer tela futura desta aba: **todo campo de texto livre do cliente é EVIDÊNCIA. Nenhum campo de texto livre do cliente é CONTEÚDO.** Se um campo novo não couber em `evidencia`, ele provavelmente não deveria existir.

### 3.6 · Tela F — o ticket ("isso não é cérebro, é dado")

> **🎫 Isso não vai pro cérebro — e eu te explico por quê**
>
> Você pediu: *"o preço agora é R$229"*.
>
> **Preço é dado vivo, não é conhecimento.** Se eu escrever R$229 dentro do cérebro dela, no dia em que você mudar de novo a IA vai continuar vendendo o preço antigo **com toda a confiança do mundo** — e ninguém vai perceber até um cliente reclamar.
>
> Preço vem do CRM. Virou o **chamado #12** pra Metrik, com prazo de resposta em 1 dia útil.
> `[ ok, entendi ]`   `[ não é bem isso ]`

### 3.7 · Sub-aba "Caderno" — a lista viva

Tudo que ele já ensinou, **agrupado pelos 12 blocos do cérebro**, com origem, data e o caso que gerou:

```
📕 CADERNO DO CÉREBRO                         14 regras ativas · 8,4k tokens

▸ REGRA DE OURO (3)
   • Responde o preço antes de perguntar        você · 20/07 · 3 casos   [🧪 protegida] [✂️] [🗑️]
   • Uma pergunta por resposta                  fábrica                  [🔒]
   • Nunca repete pergunta já respondida        analista · 12/07 · 4 casos [🧪] [✂️] [🗑️]

▸ NÚMEROS DA EMPRESA (2)
   • 4.200 alunos formados                      você · 03/06 · ⏳ confirmar até 01/09
   • 6 anos de mercado                          fábrica                  [🔒]

▸ TOM E FORMATO (4)  ...
```

- 🧪 = tem um caso de eval que a protege · 🔒 = de fábrica, o cliente não mexe · ⏳ = `fato` com validade chegando
- `[✂️]` = reduzir escopo · `[🗑️]` = aposentar (roda o portão de novo antes de valer)

### 3.8 · Perfil `dono` × `agencia` — quem vê o quê (a trava de identidade)

O Caderno é **a única tela do cérebro que o cliente vê**. O editor de texto cru do prompt existe, continua existindo, e é **invisível para o perfil `dono`**:

| | `dono` (o cliente) | `agencia` (você) |
|---|---|---|
| Aba **Ensinar a IA** | ✅ completa | ✅ completa |
| **Caderno** (lista viva) | ✅ vê tudo, aposenta o que é dele | ✅ + edita item a item |
| **Editor de texto cru** do prompt | ❌ **não existe na navegação** | ✅ |
| Bloco `fábrica` 🔒 | vê, não mexe | edita |
| Publicar **contornando o portão** | ❌ | ✅ com justificativa gravada |
| Ver nota do juiz / rubrica / p-valor | ❌ | ✅ |

```ts
// lib/perfil.ts — 3 linhas que fazem mais pela blindagem que qualquer trava de estado
export type Perfil = 'dono' | 'agencia'
export const perfilDe = (req): Perfil =>
  req.session?.role === 'agencia' ? 'agencia' : 'dono'   // fail-closed: default é dono
```

E no servidor, **não só na UI** — esconder o botão não é trava, é decoração:

```ts
// api/prompt.ts — PUT do texto cru
if (perfilDe(req) !== 'agencia') return res.status(403).json({ erro: 'use a aba Ensinar a IA' })
```

🩸 **Por que isto substitui a trava anterior, e não apenas soma a ela.** A versão anterior travava o editor cru **por estado**: *"bloqueado enquanto o caderno tiver item ativo"*. Isso tem um furo de calendário que o próprio documento declarava: **no dia 1 o caderno está vazio, logo o editor está aberto** — e o dia 1 é exatamente o dia em que o cliente está mais empolgado e mais propenso a "dar uma ajeitadinha". Trava condicional a estado protege depois que o hábito já se formou; **trava de identidade protege na segunda-feira de manhã, que é quando importa.**

E é a única peça do desenho inteiro que cumpre ao pé da letra o pedido que originou esta aba: **o cliente não encosta no prompt.** Não porque está desencorajado, não porque está travado enquanto tal condição vale — porque **aquela tela não existe pra ele**.

> ⏱️ Custo: ~1h. Entra no **dia 1** da Fase 0, junto com o botão de captura.

**🩸 CICATRIZ DA CONSTRUÇÃO — o playground morava DENTRO do editor.**

Na Central real, o "testar ao vivo" estava aninhado no `{modo === 'editar' && (…)}` do `app/cerebro/page.tsx`. Esconder o editor do perfil `dono` **esconderia o laboratório junto — e o laboratório é a porta de entrada da Escola inteira.** A trava de identidade teria matado a feature que ela existe pra proteger.

O conserto é estrutural e vale como regra: **três modos, não dois.**

| Modo | `dono` | `agencia` | O que tem |
|---|---|---|---|
| **Ler** | ✅ | ✅ | as seções do cérebro, colapsáveis — transparência é parte do produto |
| **Ensinar** | ✅ | ✅ | laboratório + `[✏️ errou aqui]` + as duas portas + a fila |
| **Editar texto** | ❌ **não existe na navegação** | ✅ | o textarea cru, evals, publicar, histórico |

O laboratório vira componente próprio (`components/Playground.tsx`) com uma prop `prompt` e uma `onErrouAqui` **opcional**. No modo Ensinar ele roda o **prompt vigente** (é a IA que o cliente tem hoje) e mostra o botão de correção; no modo Editar ele roda o **texto candidato** e **não** mostra o botão — corrigir um prompt que talvez nunca seja publicado gera evidência órfã.

⚠️ **E o `403` no servidor precisa deixar `chat` de fora da lista de ações bloqueadas.** A lista certa é `['publicar', 'restaurar', 'rollback', 'testar']`. Bloquear `chat` junto — o reflexo natural de quem escreve o guard — desliga o laboratório do cliente e a Escola morre em silêncio, com a UI mostrando um campo de texto que nunca responde.

---

## §4 · O QUE O SISTEMA FAZ — o pipeline do alfaiate

> **A metáfora que explica tudo pro cliente:** *"você não desenha o terno. Você diz onde está apertando. O alfaiate mede, corta o mínimo necessário e prova na sua frente antes de entregar."*

```
1 CAPTURA        (código, 0 modelo)   par obrigatório: turno do lead + resposta que saiu + o que deveria
2 TRIAGEM        (código, 0 modelo)   regex de dado volátil → força TOOL/CRM ANTES de qualquer modelo
3 ROTEAMENTO     (Haiku, ~R$0,01)     6 rótulos: LEI · VOZ · FATO · TOOL/CRM · CÓDIGO · RECUSAR
4 ACÚMULO        (código, 0 modelo)   espera ≥3 correções no MESMO bloco (ou 48h, ou "processar agora")
5 REDAÇÃO        (Sonnet, R$0,13-0,30) diagnostica a CAUSA na instrução; escreve o MENOR delta na voz da marca
6 CASO DE EVAL   (mesma chamada)      o cenário que prova a correção nasce junto com ela
7 CONFLITO       (código + 1 Haiku)   índice de gatilho + comparação contra os itens vivos do bloco
8 PROPOSTA       (UI)                 humano aprova · ajusta escopo · descarta
9 PORTÃO         (evals que já existem) suíte inteira + o caso novo. Só publica se resolveu E não quebrou
10 VIDA          (cron)               sunset · poda · consolidação semanal
```

### 4.1 · Passo 2 — a triagem determinística (a trava mais barata do sistema)

**Antes de qualquer modelo opinar**, um regex varre o campo "o que ela deveria ter dito":

```ts
// lib/roteador.ts — é isto que impede a pior falha possível do produto
const VOLATIL = /R\$|reais|\d+\s*%|\bpre[çc]o\b|\bvalor\b|\bparcel|\bdesconto\b|\bhor[áa]rio\b|
                 \bvaga[s]?\b|\bestoque\b|\bprazo\b|\d{1,2}\/\d{1,2}|\d{1,2}h\b/i
if (VOLATIL.test(correcao.deveria)) return { destino: 'TOOL_CRM', porQue: 'dado_volatil', forcado: true }
```

> 🩸 **Por que o modelo não pode ter a primeira palavra aqui:** classificação errada manda pro prompt algo que deveria ser tool — e aí você **criou uma bomba-relógio de dado desatualizado dentro do bloco cacheado**. É a falha nº1 do catálogo da casa (`CONTEXT-ENG.md` §7: *"prompt com dado inventado é bomba-relógio: o agente vende errado com confiança total"*). Regex primeiro, modelo depois. Falso positivo aqui custa um ticket a mais; falso negativo custa o contrato.

### 4.2 · Passo 5 — a redação (o único lugar onde um modelo escreve pro cérebro)

`lib/redator.ts` monta **um** payload e faz **uma** chamada por lote:

```
ENTRADA (o que o redator recebe)
  ├── o prompt VIGENTE renderizado (pra ele saber o que já existe)
  ├── os itens vivos DAQUELE bloco (pra não repetir nem contradizer)
  ├── até 3 correções do mesmo bloco, cada uma com:
  │      turno do lead · resposta que saiu · intenção do cliente (VERBATIM) · o "por quê" dele
  └── o resultado dos evals naqueles casos (quando existir)

TAREFA (literal, no prompt do redator)
  "Diagnostique a CAUSA na instrução — não reescreva a resposta.
   NÃO copie o texto do cliente: ele é diagnóstico, não é cola.
   Proponha UM delta, o MENOR possível, na voz da marca.
   Se duas correções se contradizem, NÃO invente meio-termo: sinalize conflito."

SAÍDA (structured output — output_config.format, GA) ✅
  { tipo, bloco, gatilho?, texto, escopo, evidencia, tokens,
    cenario_de_eval_gerado, conflito_suspeito[] }
```

> ✅ **Use structured outputs** (`output_config: { format: { type:'json_schema', schema } }`) — é **GA, sem beta header**; o parâmetro antigo `output_format` está deprecado. Sem schema fechado, a proposta volta malformada num dia ruim e o pipeline trava em silêncio.

**O guard de código no caminho de volta:**

```ts
// lib/redator.ts — TODO texto que o modelo escreve × TODO texto que o cliente escreveu
const escritoPeloModelo  = [item.texto, item.gatilho].filter(Boolean).join(' ')
const escritoPeloCliente = [
  correcao.intencao,                    // campo (c) — "o que ela deveria ter dito"
  correcao.porque,                      // campo (d) — "por que isso importa"
  ...(correcao.situacao_cliente ?? []), // Tela E — "a de março vale quando…"
].filter(Boolean).join(' ')

if (sobreposicaoTrigramas(escritoPeloModelo, escritoPeloCliente) > 0.60) {
  return refletirDeNovo(lote, 'você copiou o texto do cliente. Extraia o PRINCÍPIO e reescreva na voz da marca.')
}
```

Modelo educado copia o humano. **Uma linha de código impede a Patologia 1 de entrar pela porta dos fundos.**

---

### 🩸 §4.1-a · A TRIAGEM ERRA MUITO MAIS DO QUE O DESENHO PREVIA — medido no 1º dia de produção

O §8-B risco #3 avisava do **falso negativo** (o que a whitelist não pega: *"o Dr. não atende mais às quintas"*). O que ninguém previu foi o **falso positivo**, e ele é mais frequente e mais corrosivo. Medição real, 22/07/2026, primeiro dia no ar:

| Correção legítima de TOM | Ia virar | Por causa de |
|---|---|---|
| *"ela precisa dar mais **valor** ao que o lead falou"* | 🎫 chamado | `valor` |
| *"ela tem que ter paciência, sem **prazo** pra fechar"* | 🎫 chamado | `prazo` |
| *"outro dia, **15/07**, ela respondeu muito seca"* | 🎫 chamado | data |

**3 de 6 correções plausíveis.** E a terceira é a pior das três, por um motivo que só aparece olhando o cliente escrever: **datar a correção é o hábito mais natural que ele tem.** *"Ontem, dia 20, ela ignorou o cara"* é como uma pessoa normal descreve um problema. A triagem transformava isso num chamado inútil — e cliente que recebe *"isso é um dado que muda com o tempo"* para um pedido sobre tom aprende, em uma tarde, que **a aba não entende o que ele escreve**. Ele para de escrever o contexto, que é justamente o que dá valor à correção.

**O conserto tem três classes, e a distinção vale para qualquer whitelist de português:**

```
FORTE   R$ · % · reais · preço · parcela · desconto · estoque · mensalidade
        → sozinha já é dado vivo. Nenhuma aparece em correção de tom.

FRACA   valor · prazo · vaga · horário
        → POLISSÊMICA. Só conta com número (ou R$) a ±20 caracteres.
          Separa "o valor é R$229" de "dar valor ao lead".

DATA    dd/mm · 14h · 09:30
        → só conta junto de vocabulário de OFERTA (turma começa, promoção
          até, vence, lote) ou de AGENDA (marca, agenda, oferece, sempre às).
          Data solta é REFERÊNCIA TEMPORAL, não dado a ensinar.
```

⚠️ **E a distinção mais fina de todas: hora PRESCRITA × hora NARRADA.**
*"marca sempre 09:30"* precisa virar chamado — vira horário fixo no cérebro e passa a desmentir a agenda real. *"responde às 9h da manhã com mais energia"* é sobre disposição, não sobre agenda. O sinal que separa os dois **não é o número — é o verbo em volta.**

**A válvula que fecha o resto, e ela NÃO é opcional:** o `[ não é bem isso ]` da Tela F precisa estar implementado desde a Fase 0, com uma ação `reclassificar` que tira da fila de ticket, joga na fila do bloco, encerra o chamado como improcedente e **guarda o motivo**. Nenhuma whitelist de palavras sobrevive ao português sem uma saída de escape — e o motivo que o cliente escreve ali é exatamente o material que conserta o regex na rodada seguinte.

> 🏛️ **O princípio, que vale além desta tela:** a triagem deve errar **para o lado do chamado** (melhor um chamado a mais que um número fixo no cérebro). Mas errar para o lado seguro **só é aceitável se existir o botão de desfazer** — senão "seguro" vira "burro", e o cliente é quem paga.

⚠️ **Por que a comparação virou N×N e não 1×1.** A versão anterior comparava só `item.texto` × `correcao.intencao` — e deixava **dois vazamentos abertos pelos lados**:

- **`gatilho` não era conferido.** O redator podia copiar a frase do cliente pro gatilho em vez do texto, e passava. Gatilho vai pro prompt igual ao texto — a distinção é semântica, não de exposição.
- **`porque` e `situacao_cliente` não eram conferidos.** E são justamente os campos onde o cliente **escreve melhor**: quando ele explica *por quê*, sai a frase mais articulada dele. O cliente bom de escrita via seu texto copiado literalmente pro cérebro **sem acionar trava nenhuma** — e o guard existia exatamente pra impedir isso.

Junte tudo antes de comparar; não compare par a par. Trigramas do texto do cliente espalhados entre `texto` e `gatilho` passariam por baixo de 0,60 em cada comparação isolada e estourariam o limiar quando somados. **A trava mede o quanto do cliente entrou no cérebro — então some os dois lados antes de medir.**

### 4.3 · Passo 9 — o portão (a trava mestra)

```ts
// POST /api/caderno { acao: 'publicar', ids: [...] }
const candidato = render(promptFabrica, itensAtivos.concat(novos))

// 1. guard de orçamento — ANTES de gastar um centavo com a suíte
if (contarTokens(candidato) > TETO_TOKENS)            // default 10_000
  return res.status(422).json({ error: 'orcamento_estourado', sugestao: 'aposente um item ou consolide' })

// 2. a suíte inteira + o(s) caso(s) novo(s)
const r = await runEvals(candidato, cenariosExtras)   // ← evals.ts ganha o 2º parâmetro

// 3. a regra dupla
const resolveu   = cenariosExtras.every(c => r.porCenario[c.id].aprovado)
const naoQuebrou = SUITE.every(c => r.porCenario[c.id].aprovado)

// 3b. RETRY ÚNICO — o portão devolve o motivo pro redator, uma vez só
if (!resolveu || !naoQuebrou) {
  if (tentativa >= 2) return abrirTicket(ids, r.porCenario, 'portao_2x')   // 2ª falha = gente
  const quebrou = [...cenariosExtras, ...SUITE].filter(c => !r.porCenario[c.id].aprovado)
  return refletirDeNovo(lote, montarFeedback(quebrou), { tentativa: tentativa + 1 })
}

// 3c. VAZAMENTO DE GOVERNANÇA — o item novo não pode "ajudar" cenário que não é dele
const suspeitos = SUITE.filter(c =>
  r.porCenario[c.id].nota - baseline.porCenario[c.id].nota >= 3 &&   // subiu muito
  !cenariosExtras.some(e => e.bloco === c.bloco))                     // e não é do mesmo assunto
if (suspeitos.length) await sinalizar('governanca_suspeita', { ids, suspeitos })

// 4. publica na MESMA chave que o agente já lê hoje
await publicarPrompt(candidato, { origem: 'caderno', itens: ids, nota: r.media })
```

> 🏛️ **A TRAVA MESTRA, em uma frase:** *toda correção aceita vira caso de eval automaticamente, e o portão roda a suíte inteira + o caso novo. Só publica se resolveu o novo E não quebrou nenhum antigo.*
> Sem a segunda metade, você conserta a Porta 1 e derruba a Porta 3 sem saber — **exatamente o que aconteceu em 12/07** 🩸.

**§4.3-a · O retry existe porque o portão ERRA — e a gente sabe disso**

A versão anterior só suspendia e devolvia o cenário quebrado pro cliente olhar. Mas o portão é `n=10`, `K=1`, com juiz 0-10 — ele **reprova coisa certa com frequência conhecida** (§8, pré-requisitos). Suspender na primeira falha manda o cliente resolver um problema de calibração de eval, que é a última coisa que ele sabe fazer.

- **Tentativa 1 falhou** → o resultado do eval **volta como feedback pro redator**, com o cenário que quebrou e a nota. Muitas falhas são o delta escrito largo demais; o redator estreita e passa.
- **Tentativa 2 falhou** → **para.** Vira ticket pra Metrik, e o cliente lê em português: *"Testei duas vezes e não consegui fazer sua correção passar sem derrubar outra coisa. Não é você — é que essas duas regras estão brigando de um jeito que preciso olhar na mão. Chamado #14, respondo em 1 dia útil."*
- **Teto rígido de 2.** Sem teto, um caso patológico entra em loop e queima Sonnet até alguém perceber na fatura.

⚠️ **Nunca deixe o retry "insistir até passar".** Retry sem teto contra um juiz ruidoso não converge pra qualidade — converge pra **texto que agrada aquele juiz**, que é overfitting no portão. Duas tentativas é o limite entre "tira o ruído do caminho" e "otimiza contra a régua".

**§4.3-b · O detector de vazamento de governança**

Item novo sobre *preço* que faz a nota do cenário de *agendamento* subir 3+ pontos não é boa notícia — é sinal de que o modelo achou **uma frase que agrada o juiz em geral** ("seja atencioso e completo"), não que ele aprendeu sobre preço. Isso é o item novo **capturando o eval inteiro**, e é a forma mais silenciosa de o cérebro apodrecer com nota alta.

O detector não bloqueia — **sinaliza**, e a sinalização vai pra você (`agencia`), não pro cliente. Bloquear seria hostil demais num sinal que também tem causa legítima (regra de tom realmente melhora tudo). Mas três sinalizações no mesmo mês querem dizer que o redator aprendeu a escrever pro juiz, e aí o que precisa de conserto é a **rubrica**, não o item.

> Requer `baseline.porCenario` — as notas do prompt vigente. Já existem: são o resultado da última publicação, guardado em `agente:evals:baseline`.

### 4.4 · O que NÃO muda (a decisão que torna isso barato e reversível)

| Arquivo | O que acontece |
|---|---|
| **`lib/claude.ts`** | 🔒 **INTOCADO.** O caminho quente da conversa não sabe que a escola existe |
| **`getPromptVigente()`** | 🔒 **INTOCADO.** Continua 1 GET no Redis + os 2 blocos (estático cacheado + dinâmico) |
| **`agente:prompt:atual`** | 🔒 **MESMA CHAVE.** O `render()` grava ali; do ponto de vista do agente, é o override de sempre |
| `prompt.md` de fábrica | ganha só **marcadores de slot** — a prosa não muda |

**O teste de aceite do dia 1 — e ele NÃO é só do dia 1:**

```
caderno vazio  ⇒  render() devolve o prompt de hoje BYTE A BYTE (menos os marcadores)
```

🔁 **Isto é um INVARIANTE PERMANENTE, não um teste de aceite que se aposenta depois do deploy.** O guardião diário (que já roda) ganha uma conferência de 6 linhas:

```ts
// lib/guardian.ts — roda todo dia, junto com o resto
const esperado = render(promptFabrica, itensAtivos)
const hash     = sha256(esperado)
if (hash !== await redis.get('agente:caderno:render:hash')) {
  await avisarNoGrupo(`⚠️ ${cliente}: o prompt no ar não bate com o render do caderno.` +
    ` O caderno diz ${itensAtivos.length} itens; o hash divergiu. Alguém publicou por fora?`)
}
```

**Por que ele precisa gritar em vez de só falhar:** as três formas de o render divergir do que está no ar são todas **silenciosas** —

1. alguém (você, perfil `agencia`) publicou pelo editor cru e o caderno não soube;
2. o `prompt.md` de fábrica mudou num deploy e os marcadores de slot saíram de lugar;
3. um item foi aposentado mas o `publicarPrompt` falhou no meio, deixando Redis e caderno fora de sincronia.

Nos três casos, **a Central mostra um cérebro e o agente usa outro.** O cliente aprova mudanças olhando um Caderno que não descreve a IA dele — e é impossível descobrir isso por observação do comportamento. Um `if` de hash por dia fecha os três de uma vez.

> 🩸 Cicatriz emprestada: já perdemos tempo caçando "por que a IA não obedece o que está escrito" quando a resposta era prompt publicado por fora. Alerta muda é como esse tipo de bug vira uma tarde inteira.

Os slots são comentários markdown, um por bloco:

```md
## Regra de ouro
...prosa de fábrica, intocada...
<!-- @caderno:regra_ouro -->
```

> 🩸 **Por que isso importa tanto:** a alternativa (o caderno **substituir** o `prompt.md`) transforma uma feature de Central numa refatoração do cérebro de todos os clientes. **Raio de explosão confinado à Central e ao caminho de publicação.** Se o caderno inteiro morrer, o override publicado continua no ar e o `prompt.md` continua sendo o fallback — a mesma cascata de hoje (`ARQUITETURA.md` §5.11).

### 4.5 · Modelo de dados

> Namespace `agente:` no GHL · `ak:` no Kommo (Upstash free = **1 database** — a doutrina de prefixo do `ARQUITETURA.md` §6 vale igual).

```ts
interface ItemCaderno {
  id: string                    // 'cad_7f3a…'
  v: 1                          // schema versionado — a 1ª mudança de campo vai achar item velho no Redis
  tipo: 'identidade' | 'voz' | 'fato' | 'lei' | 'exemplo' | 'limite'
  bloco: BlocoId                // um dos 12 blocos do prompt.md
  ordem: number                 // score do ZSET — a ordem TEM que ser determinística

  gatilho?: string              // só em 'lei': a CONDIÇÃO ("lead pergunta preço antes de se apresentar")
  texto: string                 // o texto FINAL, escrito pelo REDATOR na voz da marca
  escopo: 'global' | `porta:${string}` | `canal:${'voz'|'texto'}` | `etapa:${string}`

  origem: {
    tipo: 'correcao_cliente' | 'conversa_real' | 'analista' | 'fabrica' | 'engenheiro'
    quem: string                // "Anderson (cliente)" | "analista semanal" | "Metrik"
    quando: string              // ISO
    correcoes: string[]         // ids das correções que geraram — ≥3 pra escopo global
  }

  evidencia: {
    turno_lead: string
    resposta_errada: string
    intencao_cliente: string    // VERBATIM do cliente — NUNCA renderizado no prompt
    porque?: string
    chips?: ChipDiagnostico[]   // ← Tela A: o diagnóstico de 1 clique
    situacao_cliente?: string[] // ← Tela E: "a de março vale quando…" — EVIDÊNCIA, nunca gatilho
  }[]

  eval_case_ids: string[]       // os cenários que provam este item
  tokens: number                // contado com messages.countTokens
  sunset?: string               // ISO — OBRIGATÓRIO em 'fato' (default +90d)
  status: 'proposto' | 'ativo' | 'suspenso' | 'aposentado'
  publicado_em?: string
  util: number                  // vezes que um eval seu passou
  nocivo: number                // vezes que o portão reprovou um cenário que ele governa

  replay?: {                    // ← Tela D: cacheado, NUNCA regenerado ao reabrir
    antes: string
    depois: string
    gatilho_usado: string
    gerado_em: string
  }
}

type ChipDiagnostico =
  | 'seca' | 'faltou_preco' | 'perguntou_antes' | 'entendeu_errado' | 'ordem_errada' | 'longa'

// O caso de eval nasce JÁ em rubrica binária ponderada — nunca em nota 0-10
interface CasoEval {
  id: string
  bloco: BlocoId
  turnos: { role: 'user' | 'assistant'; content: string }[]
  criterios: {
    id: string
    texto: string               // "cita um valor em R$ na primeira resposta"
    peso: number                // 1..3
    bloqueante: boolean         // false em QUALQUER bloqueante = reprova, ignorando o placar
  }[]
  rubrica_versao: number        // rubrica mudou ⇒ notas antigas NÃO são comparáveis
  origem_item: string           // o ItemCaderno que este caso protege
}
```

🎯 **Por que `criterios[]` e não `nota: number` — e por que isto entra no dia 1.** O portão inteiro apoia numa nota 0-10 dada por um juiz-modelo, e juiz-modelo tem **viés de verbosidade** (premia resposta longa) e **auto-preferência** (premia texto que soa como ele escreveria). Isso significa que o portão que protege o cérebro de 10 clientes **erra numa direção conhecida**: aprova prolixidade, reprova concisão — bem o contrário do que vende.

Rubrica binária ponderada troca *"de 0 a 10, quão boa foi essa resposta?"* por *"ela citou um valor em R$? sim/não"*. Três consequências:

1. **O viés some** — não tem escala pra deslizar. Ou citou, ou não citou.
2. **`bloqueante` dá poder de veto.** "Não inventou preço" é bloqueante: falhou, reprova, mesmo com 9 de 10 critérios verdes. Placar médio esconde exatamente o erro que mais custa.
3. **`rubrica_versao` impede a comparação inválida.** Quando a rubrica muda, notas antigas viram incomparáveis — e sem o campo alguém vai comparar mesmo assim e concluir que o cérebro piorou.

**Custo: zero além do meio dia de rubrica que já está nos pré-requisitos (§8).** Mas o schema precisa nascer certo **agora**: todo cenário que o sistema gerar a partir de hoje nasce imune ao juiz enviesado — pra sempre. Nascer em `nota: number` significa migrar centenas de casos depois, por 10 clientes.

**Chaves Redis:**

| Chave | Tipo | Conteúdo |
|---|---|---|
| `agente:caderno:item:{id}` | string (JSON) | o `ItemCaderno` |
| `agente:caderno:bloco:{bloco}` | **ZSET** (score = ordem) | ids ativos do bloco |
| `agente:caderno:gatilho:{bloco}:{gatilho_norm}` | SET | índice **determinístico** de conflito |
| `agente:caderno:hist` | LIST (20) | snapshots `{ts, autor, ids[], render_hash, nota, matriz}` |
| `agente:caderno:render:hash` | string | hash do último render (detecta divergência com `prompt:atual`) |
| `agente:caderno:lock` | string (TTL 300s) | lock de publicação — dois cliques simultâneos corrompem o render |
| `agente:corr:{id}` | string (JSON) | a correção crua |
| `agente:corr:bloco:{bloco}` | LIST | correções roteadas, aguardando o lote de 3 |
| `agente:caderno:ticket:{id}` | string (JSON) | TOOL/CRM ou CÓDIGO pro engenheiro |
| `agente:caderno:evalmatriz:{ts}` | string (JSON) | matriz candidato × cenário daquela publicação |
| `agente:prompt:atual` | string (JSON) | 🔒 **INALTERADA** — recebe o texto renderizado |

> ⚠️ **ZSET, nunca SET.** A ordem dos itens tem que ser determinística: se ela muda entre chamadas, o **prefixo do prompt muda** e o `cache_control` é perdido **em silêncio** — R$0,02 vira R$0,13 e ninguém vê (`comum/PEGADINHAS.md` §30 🩸).

### 4.6 · Endpoints

| Endpoint | Ação | O que faz |
|---|---|---|
| `POST /api/caderno` | `capturar` | grava a correção crua + triagem regex. **Sem modelo.** |
| | `listar` | itens ativos por bloco + orçamento de tokens + tickets |
| | `processar` | dispara roteamento (Haiku) e, se o lote fechou, a reflexão |
| | `resolver-conflito` | aplica a escolha do cliente (aposenta / descarta / escopa as duas) |
| | `publicar` | **o portão** (§4.3) |
| | `aposentar` | tira 1 item, re-renderiza e **roda o portão de novo** |
| | `tickets` | lista TOOL/CRM e CÓDIGO pro engenheiro |
| Central `app/api/caderno/route.ts` | proxy | espelha o `app/api/prompt/route.ts` de hoje — **o secret nunca chega ao browser** |
| `api/cron-daily.ts` | — | +sunset vencido, +poda, e **na segunda** a consolidação junto do analista |

> 🩸 **DIVERGÊNCIA REAL — a Fase 0 nasceu em `/api/escola`, não em `/api/caderno`.** O que está no ar/no código (22/07/2026) é **`POST /api/escola`** (`acao: capturar | marcar | resolver-ticket`) + **`GET /api/escola?acao=conversas`** (as conversas do diário pra Tela B). O `/api/caderno` desta tabela continua sendo o endpoint **da Fase 2** (o caderno, com `listar`/`processar`/`resolver-conflito`/`publicar`/`aposentar`). Procurar `api/caderno.ts` hoje é procurar arquivo que não existe.

### 4.7 · Os três exemplos, do começo ao fim

**① O cliente corrige um PREÇO**
`"o valor agora é R$229"` → regex bate em `R$` → **TOOL/CRM forçado, o modelo nem é chamado** → Tela F ("isso não é cérebro, é dado") → ticket #12 → eu atualizo o campo no CRM / a tool → **o prompt nunca é tocado**. Custo: R$0. Tempo: instantâneo.

**② O cliente reclama do TOM**
`"ficou seco, parece robô"` → sem condição, sem dado → **VOZ** → entra na fila do bloco `tom/formato`. Fica **esperando**: com 1 caso não vira nada. Duas semanas depois chegam mais duas do mesmo defeito → o lote de 3 fecha → reflexão → o redator propõe **uma** regra de voz (`"abra com uma frase de acolhimento antes de responder; nunca comece pela pergunta"`) + o cenário de eval → proposta → portão (11 casos) → publica. Custo: ~R$0,03 de roteamento + R$0,20 de reflexão. **Se depois chegarem mais 3 do mesmo defeito, a consolidação semanal promove a regra a `EXEMPLO`** (um turno modelo, anonimizado) — porque ritmo de WhatsApp é quase impossível de instruir e fácil de demonstrar.

**③ O cliente ensina um CASO RARO**
`"quando o cara falar que é síndico de prédio, ela tem que oferecer o plano B"` → tem condição → **LEI**. Mas é **1 caso só** → o redator é obrigado a propor com **escopo restrito**, e a Tela D já vem com `⦿ Só na Porta 2` marcado, com o aviso:

> ℹ️ Como isso veio de **1 caso só**, vou valer só na Porta 2. Se acontecer de novo em outros contextos, eu volto a te perguntar se vira regra pra todo mundo.

Se em 2 meses chegarem mais 2 casos independentes (leads diferentes, dias diferentes), o sistema **propõe a promoção pra global** — com os 3 casos na mão.

---

## §5 · AS 4 TRAVAS ANTI-QUEBRA (uma por patologia)

### 5.1 · Patologia 1 — **o cliente não é copywriter**

*A "resposta certa" dele é pior em tom que a da marca. Colar aquilo no prompt é trocar a voz que você vendeu pela voz do WhatsApp dele.*

| # | Mecanismo | Onde vive |
|---|---|---|
| 1 | **Separação por SCHEMA.** O texto do cliente mora em `evidencia.intencao_cliente`. O texto que vai pro cérebro mora em `item.texto`. **`render()` só lê `item.texto`.** A frase dele é *fisicamente incapaz* de chegar no prompt | `lib/caderno.ts` |
| 2 | **Tarefa explícita de reflexão** — *"diagnostique a causa NA INSTRUÇÃO; não reescreva a resposta; não copie o texto do cliente"* | `lib/redator.ts` |
| 3 | **Guard de trigramas.** Sobreposição > 60% entre *(texto + gatilho)* e *(intenção + porquê + situação)* do cliente → proposta rejeitada e reflexão refeita com a bronca | `lib/redator.ts` |
| 4 | **Perfil `dono` × `agencia`.** O editor de texto cru **não existe na navegação do cliente**, e o `PUT` devolve 403 — trava de identidade, não de estado (§3.8) | `lib/perfil.ts` + `api/prompt.ts` |
| 5 | **Conflito nunca pede regra ao cliente** — ele descreve a situação em português; o redator escreve o gatilho (§3.5) | Central `/cerebro` |
| 6 | **Chips de diagnóstico** reduzem a superfície: menos prosa crua entrando = menos texto do cliente pra blindar (§3.1) | Central `/cerebro` |

> ✅ **O furo do dia 1 foi fechado.** A versão anterior deste desenho travava o editor cru **por estado** — *"bloqueado quando o caderno tem item ativo"* — e declarava honestamente a janela: com o caderno vazio no dia 1, o editor ficava aberto justamente no dia de maior empolgação do cliente. **O perfil `dono` × `agencia` (§3.8) elimina a janela em vez de documentá-la**, e custa ~1h. A saída de emergência não se perde: ela migra pro perfil `agencia`, que é onde ela sempre deveria ter morado.

### 5.2 · Patologia 2 — **contradição acumulada**

*Ele pede A hoje e pediu ¬A em março. O prompt fica com as duas, e o modelo escolhe no sorteio.*

| # | Mecanismo |
|---|---|
| 1 | **Índice determinístico de gatilho.** `agente:caderno:gatilho:{bloco}:{gatilho_norm}` — mesmo bloco + mesmo gatilho normalizado = colisão detectada **sem modelo, sem custo, sem falha** |
| 2 | **Comparação semântica** — **1** chamada Haiku comparando o item novo contra os (≤40) itens vivos daquele bloco. Uma chamada, não N |
| 3 | **O redator é PROIBIDO de conciliar.** Instrução literal: *"se duas correções se contradizem, NÃO invente meio-termo — sinalize conflito"*. Meio-termo automático é como nasce o prompt ambíguo que ninguém consegue debugar |
| 4 | **A tela mostra os dois lado a lado com data, autor e o caso que originou cada um** — o cliente lembra por que pediu, e decide com informação |
| 5 | **"As duas valem" vira escopo, não ambiguidade.** Cada uma ganha um gatilho escrito pelo redator a partir da descrição em português |

> **Por que a data e o caso são obrigatórios na tela:** sem eles o cliente decide no impulso e aposenta a regra que estava segurando um caso que ele esqueceu. Com eles, ele lê *"nasceu do lead #4471, que sumiu sem se identificar"* e pensa duas vezes.

**§5.2-a · Colisão não é só `contradiz` — são QUATRO ramos**

O detector encontra um item vivo parecido. Tratar isso sempre como contradição faz o sistema **inchar** e **diagnosticar errado**. O que a comparação Haiku devolve:

| Ramo | O que é | O que o sistema faz | O que o cliente vê |
|---|---|---|---|
| `contradiz` | pedem coisas opostas no mesmo gatilho | Tela E, ele decide | os dois lado a lado (§3.5) |
| `refina` | mesma direção, mais específico | o redator **EDITA o item existente** — não cria um segundo | *"ajustei a regra de 12/03 em vez de criar outra"* |
| `duplica` | é a mesma regra, já ativa | **não cria item nenhum** + abre ticket de investigação | ver abaixo 👇 |
| `independente` | assunto diferente | segue o fluxo normal | proposta comum |

**O ramo `duplica` é o mais valioso dos três novos**, e o texto dele é o que o cliente lê:

> 🔍 **Isso já é regra desde 12/03 — e ela não seguiu.**
> Você está pedindo o que já está escrito no cérebro dela. Então o problema **não é o cérebro** — escrever de novo não vai consertar, e ainda deixa a instrução em duplicidade, o que costuma piorar.
> Abri o **chamado #15** pra investigar por que a regra não foi obedecida. Volto em 1 dia útil.
> `[ ok ]`  `[ na verdade é diferente, deixa eu explicar ]`

🩸 **Por que isso importa mais do que parece.** Sem o ramo `duplica`, o comportamento do sistema diante de *"ela continua fazendo X!"* é **escrever a mesma regra pela segunda vez** — e a segunda cópia não conserta nada, porque a causa está em outro lugar: a regra está num bloco de baixa aderência posicional, está brigando com a prosa de fábrica, ou o gatilho não casa com o que o lead realmente escreve. Você acaba com um prompt inchado, o cliente com a impressão de que ensinar não adianta, e a causa real **nunca investigada**. O ramo `duplica` transforma um sintoma de inchaço num **diagnóstico**.

E o `refina` é anti-inchaço puro: *"responde o preço antes de perguntar"* + *"e diz que parcela em 12x"* são **um** item, não dois. Duas linhas separadas competem por atenção do modelo e ocupam o dobro de tokens no orçamento que a barra do topo mostra.

### 5.3 · Patologia 3 — **overfitting a caso raro**

*Corrigir um caso esquisito não pode virar regra global. Um lead maluco na terça não pode reprogramar a IA pra todos.*

| # | Mecanismo |
|---|---|
| 1 | **`escopo` é campo obrigatório do item.** Não existe item sem escopo declarado |
| 2 | **Escopo global exige ≥3 casos INDEPENDENTES** — leads diferentes **e** dias diferentes. 1–2 casos → o escopo nasce restrito (`porta:X`, `etapa:Y`, `canal:voz`) e a UI já vem marcada assim |
| 3 | **Acúmulo antes da reflexão** — o lote só fecha com **≥3 correções no mesmo bloco** (ou 48h, ou "processar agora" explícito). Três casos do mesmo tema é o que separa **princípio** de **acidente**. 📄 (espelha `reflection_minibatch_size=3` do GEPA) |
| 4 | **Consolidação só com ≥3 casos independentes.** Regra "geral" extraída de 2 casos é overfit disfarçado de princípio. 📄 (`InferRules`: regra legível, extraída de demos, **com humano decidindo se fica**) |
| 5 | **Contador `nocivo`.** Quando o portão reprova um cenário, o item que declara governar aquele cenário leva `nocivo++`. `nocivo > util` + sem uso há N rodadas → entra na lista de poda |
| 6 | **Matriz candidato × cenário persistida** — é o que permite a frase *"resolveu o seu caso, mas derrubou a Porta 3 de 10 → 2"* em vez de um "reprovou" seco |

> **O que NÃO fazemos aqui, e por quê:** a literatura resolve isso com **frente de Pareto + merge de candidatos** (guardar todo candidato que é campeão em pelo menos um cenário e combiná-los). É elegante e está **no cemitério** (§7): com 10 cenários, manter fronteira é otimizar variância, não qualidade. O que sobrevive dessa ideia é **persistir a matriz** — o diagnóstico, sem o otimizador.

### 5.4 · Patologia 4 — **inchaço de tokens**

*Cada correção incha o prompt. Acima de 10k a latência medida vai de 4,7s → 9,5s. 200 correções sem faxina = prompt de 40k, contraditório e impossível de auditar.*

| # | Mecanismo |
|---|---|
| 1 | **Guard de orçamento com HTTP 422 ANTES da suíte.** Estourou o teto → nem gasta com eval: *"orçamento estourado — aposente um item ou consolide"* |
| 2 | **Barra de tokens visível ao cliente** (verde <10k · amarelo 10–25k · vermelho >25k) — os limiares **medidos** em 12/07/2026 |
| 3 | **"Escreva o MENOR delta possível"** é instrução literal do redator, e `tokens` é campo da saída estruturada |
| 4 | **Consolidação semanal** — 3+ itens parecidos no mesmo bloco viram **1 regra geral que HERDA os `eval_case_id` dos 3**. Só publica se os 3 casos continuarem passando; aí os 3 originais são aposentados |
| 5 | **`sunset` obrigatório em `fato`** (default 90d) → vence, vira `suspenso`, o cliente é perguntado *"isso ainda vale?"* |
| 6 | **Quarentena + teto de cenários** (§6.3) — suíte que só cresce é dívida, e cada cenário custa tempo em **toda** publicação |
| 7 | **Nunca o mesmo delta em dois lugares.** Um item é LEI **ou** VOZ **ou** EXEMPLO — nunca os três. É a origem clássica do inchaço |

> 🏛️ **A consolidação é o único mecanismo do desenho inteiro em que o prompt pode ENCOLHER com o uso.** Sem ela, todo sistema de correção incremental morre por inchaço em 6 meses. É a peça que parece opcional na Fase 3 e não é.

---

## §6 · A SAÚDE DO CÉREBRO — os números que dizem quando intervir

### 6.1 · O painel (o que a Central mostra pro cliente, e o que só você vê)

| Indicador | Verde | Amarelo | Vermelho | Ação |
|---|---|---|---|---|
| **Tokens do prompt** | < 10k | 10–25k | > 25k | amarelo: consolidar · vermelho: **muda a arquitetura — entra RAG** (`CONTEXT-ENG.md` §2) |
| **Latência medida** | ~4,7s | 6–9s | > 12s | é o mesmo eixo do de cima — a latência é o sintoma, o token é a causa |
| **Itens ativos** | < 25 | 25–40 | > 40 | acima de 40 num bloco, a comparação de conflito começa a ficar cara e o modelo começa a "esquecer" |
| **Cenários de eval** | 10–18 | 18–25 | > 25 | acima de 25 cada publicação vira minutos e dinheiro — aposente cenário redundante |
| **Itens com `nocivo > util`** | 0 | 1–2 | 3+ | 3+ significa que o cliente está ensinando contra o próprio funil: **converse com ele** |
| **`fato` vencido** | 0 | 1–2 | 3+ | número velho no ar é autoridade queimada esperando pra acontecer |
| **Correções paradas na fila > 14d** | 0 | 1–3 | 4+ | ⚠️ é o sinal de churn desta aba: ele ensinou e ninguém respondeu |
| **Regras com entidade nomeada e sem `sunset`** | 0 | 1–2 | 3+ | 🕰️ **só você (`agencia`) vê.** É a única defesa contra a regra que envelhece calada |

> 🕰️ **A última linha merece explicação, porque ela cobre o risco que NENHUMA outra trava pega.** O roteador força `sunset` quando o regex de dado volátil bate — R$, %, data, horário, prazo. Mas *"o Dr. Almeida não atende mais às quintas"*, *"mudamos pro prédio da esquina"* e *"a promoção de inverno acabou"* **não têm cifrão nem número**. Entram como LEI, passam no portão (nenhum dos 10 cenários testa endereço), e ficam lá. Em março o Dr. Almeida volta a atender quinta e a IA continua dizendo que não — **com toda a confiança do mundo, e ninguém percebe até um cliente reclamar**.
>
> Detecção: NER barato em cima de `item.texto` — nome próprio, dia da semana, logradouro, nome de campanha/produto. Não bloqueie; **liste**. Uma vez por mês você olha 3 linhas e pergunta ao cliente *"isso ainda é assim?"*. É uma mitigação parcial e é honesto chamá-la assim: **regra sem número que envelhece é o risco de conteúdo mais silencioso deste sistema inteiro**, e a única forma de fechá-lo de verdade seria exigir `sunset` em tudo — o que ninguém aguenta.

### 6.2 · Custo de operação da escola (por cliente, por mês)

| Item | Custo | Volume realista |
|---|---|---|
| Captura | **R$0** | ilimitada |
| Triagem regex | **R$0** | ilimitada |
| Roteamento (Haiku) | ~R$0,01 / correção | 20–60 correções/mês → **R$0,20–0,60** |
| Reflexão (Sonnet, com cache) | R$0,13–0,30 / lote | 4–10 lotes/mês → **R$0,50–3,00** |
| Portão (suíte + caso novo) | centavos com `cache_control` | 4–10 publicações/mês |
| **Total** | | **~R$1–5/mês por cliente** |

> ✅ **O volume aqui é HUMANO**, não é rollout de otimizador. Dezenas de correções por mês, não milhares. É por isso que a reflexão em Sonnet/Opus cabe: o custo que mata otimizador automático (reflexão custa mais que avaliação) simplesmente não existe nesta escala.
> ⚠️ **Mas cuidado com o fan-out:** se a suíte disparar os N cenários em paralelo com o mesmo prefixo, **todos pagam escrita de cache** (a entrada só fica legível depois que a primeira resposta começa a streamar) ✅. Dispare 1, espere, dispare o resto — vale para o portão de hoje e vale em dobro aqui.

### 6.3 · A faxina (o que roda sozinho, e quando)

| Rotina | Quando | O que faz |
|---|---|---|
| **Sunset** | diário (`cron-daily`) | `fato` vencido → `suspenso` + card *"isso ainda vale?"* |
| **Poda** | diário | `nocivo > util` e sem uso há 5 rodadas → propõe aposentadoria |
| **Consolidação** | segunda (junto do analista) | 3+ itens parecidos no bloco → propõe 1 regra que herda os evals dos 3 |
| **Quarentena de cenário** | a cada publicação | cenário gerado por modelo **não é bloqueante de cara**: é obrigatório só pro item que o criou, e vira permanente **depois de passar 2 publicações seguidas** |
| **Aposentadoria de cenário** | mensal | cenário que nunca reprovou em 20 publicações **e** cujo item já foi consolidado → sai da suíte permanente |

> ⚠️ **Nada disso pendura no `api/cron-daily.ts` se ele já estiver perto do teto.** O dispatcher carrega followup → guardião → (seg) analista → (sex) auditora, com teto de **300s** — e quando estoura **não dá erro vermelho: o rabo simplesmente não roda** 🩸. Sunset e poda são baratos e cabem; **a consolidação (que chama modelo) vai em endpoint próprio com tique QStash**, igual ao canário da `FRONTEIRA.md` §1 proposta #3.

> 🩸 **Por que a quarentena existe:** um critério auto-gerado mal escrito **trava o portão pra sempre** — o cliente não consegue mais publicar nada e ninguém entende por quê. `FRONTEIRA.md` §2.3 já registrou o aviso: *"suíte que só cresce é dívida"*. Cenário nasce em observação, não em lei.

---

## §7 · O QUE NÃO FAZER — o cemitério do design

> Esta seção vale tanto quanto o projeto. Ela existe pra que a ideia não volte daqui a 3 meses e alguém gaste uma semana nela.

| Ideia | Por que morreu | Condição de ressurreição |
|---|---|---|
| **Aplicar a correção automaticamente, sem portão** | É o pedido literal ("correção automática") e é onde o produto se suicida. Correção que entra sem eval é a Porta 3 caindo 10 → 2 **toda semana**, em silêncio 🩸. O "automático" que vendemos é **o trabalho de decidir e escrever**, não o de aprovar | Nunca. Portão humano + portão de eval são o produto |
| **Deixar o cliente escrever no prompt (textarea livre)** | O §1 inteiro. E some o eval como porteiro (`EVALS.md` §6) | Nunca com caderno ativo. Editor cru fica como ferramenta **do engenheiro** |
| **Fine-tuning com os pares corrigidos** | Dezenas de exemplos por mês não treinam nada; o que treinam, você não consegue **reverter, auditar nem explicar** ao cliente. E mata o cache de prompt, o rollback e o diff — as três coisas que sustentam a governança que a gente vende | Milhares de pares limpos **e** um problema que instrução comprovadamente não resolve |
| **Otimizador reflexivo autônomo (GEPA/frente de Pareto/merge de candidatos)** | Já enterrado na `FRONTEIRA.md` §3: *"otimizar ruído. Com 10 cenários, é ajustar variância, não qualidade — e cria a pior dívida do lote: um otimizador que reescreve prompt de produção é algo que você supervisiona pra sempre"*. **O que a ESCOLA usa é UMA reflexão por lote, disparada por gente, com dois portões** | >100 cenários reais estabilizados **+** rubrica binária calibrada **+** alguém dedicado a operá-lo. *(A escola é justamente o que constrói esses 100 cenários ao longo de um ano.)* |
| **Instalar DSPy** | É Python; a stack é TypeScript serverless. **Porte o LOOP, não a biblioteca** — o valor está no contrato de reflexão e na taxonomia de destino, não no framework. E framework contradiz a decisão #2 da `ARQUITETURA.md` (*"~80 linhas transparentes, sem framework"*) | Nunca no runtime. Como laboratório offline seu, tudo bem |
| **Busca bayesiana sobre combinação instrução × demo (MIPROv2 completo)** | Precisa de dezenas de avaliações por rodada. Com 10 cenários e um humano no meio, é cerimônia | Junto com a ressurreição do otimizador |
| **RAG pra guardar as correções** | Base de correção é **pequena e precisa ser vista inteira** na hora de detectar conflito. RAG aqui troca certeza por busca probabilística pra economizar centavos — **engenharia negativa** (`CONTEXT-ENG.md` §4) | Os limiares de sempre: >25k tokens, >150 FAQs, latência >12s |
| **Memory tool nativo (`memory_20250818`)** | Já enterrado na `FRONTEIRA.md` §3 por duplicação. Aqui seria pior: memória que escreve sozinha, **sem portão**, é alucinação virando verdade permanente | Um caso que caderno + prompt editável comprovadamente não resolvam |
| **Meio-termo automático em conflito** | O modelo conciliando A e ¬A produz uma regra ambígua que ninguém consegue debugar — e o cliente **não sabe** que a regra dele foi diluída | Nunca. Conflito é decisão de dono |
| **Deixar o cliente editar os evals ou a rubrica** | É entregar a chave do porteiro pra quem quer entrar. O caso de eval nasce da correção **dele**, mas quem escreve o critério é o sistema | Nunca |
| **Botão "publicar mesmo assim" quando o portão reprova** | O primeiro clique é sempre justificável e o segundo vira hábito. Existindo o botão, o portão é decorativo | Só pra você, via `api/prompt` direto, com registro no diário |
| **Cenário gerado entrando como bloqueante de cara** | Um critério mal escrito trava a publicação pra sempre e ninguém entende por quê (`FRONTEIRA.md` §2.3) | A quarentena de 2 publicações (§6.3) é a versão que vale |
| **Classificar dado volátil pelo modelo, sem regex antes** | Falso negativo aqui **cola preço no bloco cacheado** — a pior falha do catálogo 🩸 | Nunca. Regex primeiro, sempre |
| **Duas filas paralelas (cliente × analista)** | Contradição garantida em 60 dias, sem ninguém pra arbitrar | Nunca. Mesma porta, mesmo portão |

---

## §8 · PLANO DE CONSTRUÇÃO

### ⛔ PRÉ-REQUISITOS DUROS (não comece sem eles)

| # | Pré-requisito | Por quê | Esforço |
|---|---|---|---|
| 1 | **Rubrica binária ponderada com prova literal** (`FRONTEIRA.md` §1 proposta #4) | A trava mestra da ESCOLA é o portão — e o portão de hoje **decide no sorteio**: o juiz inventa um 0–10 com viés de verbosidade e auto-preferência. Construir a escola em cima disso é catedral na areia que a própria casa já documentou como areia | **meio dia** |
| 2 | *(recomendado)* **`pass^k`, k=3** no portão | Hoje o gate roda n=10, K=1. Um candidato que passa 1 vez em 2 sobe | **horas** (é um `for` e um `every`) |
| 3 | 🟧 *(só Kommo)* **Port do `prompt-store.ts` + `evals.ts` + publicar/restaurar/rollback** | No Kommo existe **só o playground**. Sem prompt-store e sem evals server-side, não há o que a escola alimente | **1 dia** |

### FASE 0 · A CAIXA — **o MVP de 1–2 dias (defensável)**

**Entrega:** o cliente é ouvido, a correção vira dado estruturado, e **nada no cérebro pode quebrar** — porque nada é escrito automaticamente.

- [ ] Botão `[ ✏️ errou aqui ]` embaixo de cada resposta do playground (campos a e b **pré-preenchidos**)
- [ ] Card de captura com os 3 campos + a trava do par completo + o texto de confirmação frio
- [ ] **Chips de diagnóstico** de 1 clique ao lado do "por quê" (§3.1) — barato e melhora todo o resto do pipeline
- [ ] Tela B com as **duas portas**: `📂 escolher do diário` (**preferida**, zero parser) + `📋 colar` com regex e anonimização (§3.2)
- [ ] `lib/roteador.ts` **só com a parte determinística** (regex de dado volátil) — zero modelo
- [ ] `agente:corr:{id}` + `agente:corr:bloco:{bloco}` no Redis
- [ ] Tela F (ticket) + lista de tickets pro engenheiro
- [ ] 🔐 **`lib/perfil.ts` + 403 no `PUT /api/prompt`** — o editor cru some pro perfil `dono` (§3.8). ~1h, e é a única peça que cumpre *"o cliente não encosta no prompt"* ao pé da letra
- [ ] 📐 **`CasoEval` já com `criterios[{id,texto,peso,bloqueante}]` + `rubrica_versao`** (§4.5) — o schema tem que nascer certo; migrar depois custa 10 clientes
- [ ] `lib/manifest.ts`: módulo `escola` em `status: 'construção'` + bump do `SISTEMA_VERSAO`

> ✅ **CONSTRUÍDA em 22/07/2026 no agente da Metrik (GHL, dogfood).** Não está em produção — está no código, com tipos limpos e teste passando. O que existe:
>
> **O código virou ASSET replicável** — caminhos da 3ª coluna são relativos a `assets/escola/` (na raiz desta skill), e o passo a passo está no `INSTALAR.md` de lá.
>
> | Arquivo | O que é | Destino no asset |
> |---|---|---|
> | `lib/escola-core.ts` | tipos, os 12 blocos, os 6 chips, `anonimizar()`, `blocoDosChips()` — **puro**, sem `CONFIG`, sem Redis, sem rede | ✅ ASSET → `agente/lib/escola-core.ts` |
> | `lib/escola.ts` | o store: correções, filas por bloco, tickets, saúde | ✅ ASSET → `agente/lib/escola.ts` |
> | `lib/roteador.ts` | a triagem determinística (regex de dado volátil) | ✅ ASSET → `agente/lib/roteador.ts` |
> | `lib/perfil.ts` | `dono` × `agencia` derivado do secret | ✅ ASSET → `agente/lib/perfil.ts` |
> | `api/escola.ts` | capturar · listar · conversas do diário · marcar · resolver ticket | ✅ ASSET → `agente/api/escola.ts` |
> | Central `app/api/escola/route.ts` | o proxy da aba (espelha o `app/api/prompt/route.ts` — **o secret nunca chega ao browser**) | ✅ ASSET → `central/app/api/escola/route.ts` |
> | `components/Playground.tsx` | o laboratório extraído, com `[✏️ errou aqui]` | ✅ ASSET → `central/components/Playground.tsx` |
> | `components/Escola.tsx` | card de captura, as duas portas, fila e chamados | ✅ ASSET → `central/components/Escola.tsx` |
> | `scripts/test-escola.ts` | **49 asserções** sobre triagem, falsos positivos, PII e roteamento por chip | ✅ ASSET → `agente/scripts/test-escola.ts` |
>
> 🩸 **O que NÃO virou asset — são os 7 PATCHES** (carregam config do cliente; **copiar por cima destrói a conta dele**): `lib/config.ts` (a env nova) · `lib/execlog.ts` (passa a gravar `turnoLead`/`respostaIA` anonimizados) · `api/inbound.ts` (chama o execlog novo) · `api/prompt.ts` (**403 pro perfil `dono`**) · `lib/manifest.ts` (módulo `escola` + `SISTEMA_VERSAO`) · `vercel.json` (a rota nova) · `app/cerebro/page.tsx` (a aba **Ensinar a IA** + o perfil). Cada um está descrito como diff no `INSTALAR.md`.
>
> **Provas:** `tsc --noEmit` limpo nos dois projetos · `--noUnusedLocals` sem resíduo novo · `/cerebro` renderiza **HTTP 200** com `Ensinar a IA` presente e `Editar texto` **ausente** (a trava de perfil funcionando no primeiro paint, fail-closed) · **49/49** no teste.
>
> ⚠️ **Por que `escola-core.ts` existe separado:** `CONFIG` faz `required('GHL_TOKEN')` no topo do módulo, então qualquer import da cadeia exige credencial de CRM — e isso tornaria **impossível testar a anonimização**. Foi o teste que forçou a separação, e ela também matou um ciclo (`execlog` → `escola` → `config`, com `escola` precisando de `execlog`). Regra: **o que precisa de prova não pode depender de credencial.**

**Como você opera na Fase 0:** você lê a fila, escreve o delta na mão, roda o portão que já existe, publica. **A escola já está entregando valor** (o cliente parou de te ligar pra reclamar de tom; a correção vem com contexto completo em vez de "a IA tá estranha"), e você ainda não escreveu uma linha de código que possa quebrar o cérebro de alguém.

> 🏛️ **Por que este é o corte certo:** o dia 1 entrega a metade que **não tem risco e tem 80% do valor percebido** — ser ouvido com processo. A metade automática só faz sentido depois que existir volume real de correção pra ler. Construir o alfaiate antes de ter 20 correções na mão é escrever o otimizador antes de ter o defeito.

### FASE 1 · O ALFAIATE — 2 dias

- [ ] Roteamento Haiku (6 rótulos) depois da triagem regex
- [ ] Acúmulo: lote de **≥3** no mesmo bloco (ou 48h, ou "processar agora")
- [ ] `lib/redator.ts` — reflexão com structured output + **guard de trigramas 60% na forma somada** (`texto+gatilho` × `intencao+porque+situacao`, §4.2)
- [ ] Geração do **caso de eval** junto com o delta, já em rubrica binária
- [ ] `lib/evals.ts` ganha `runEvals(texto, cenariosExtras)` + persistência da **matriz candidato × cenário**
- [ ] Tela D (proposta) + os 3 estados (testando / publicado / reprovado com o cenário que quebrou)
- [ ] 🎬 **Replay antes/depois** na proposta via `simulateChat` (§3.4) — cacheado no registro, **nunca** regenerado ao reabrir
- [ ] 🔁 **Retry único com o eval como feedback + teto de 2 + 2ª falha vira ticket em português** (§4.3-a)
- [ ] 🕵️ **Detector de vazamento de governança** (nota de cenário alheio sobe 3+ → sinaliza pra `agencia`, não bloqueia) (§4.3-b)
- [ ] Publicação **por cima do prompt vigente** (ainda texto corrido, sem caderno) usando o portão de hoje
- [ ] Quarentena do cenário gerado

**Ao fim da Fase 1 o pedido do dono está atendido.** Falta a parte que faz isso sobreviver a 200 correções.

### FASE 2 · O CADERNO — 3 dias

- [ ] Marcadores `<!-- @caderno:bloco -->` no `prompt.md` de fábrica (12 slots)
- [ ] `lib/caderno.ts`: tipos, CRUD, `render()`, `messages.countTokens`, snapshot/rollback granular
- [ ] ✅ **Teste de aceite: caderno vazio ⇒ render byte-a-byte idêntico ao prompt de hoje**
- [ ] 🔁 **O mesmo teste promovido a invariante permanente** no `guardian.ts`: hash do render × `prompt:atual`, **alerta no grupo quando divergir** (§4.4)
- [ ] ZSET de ordem determinística + `render:hash` + lock de publicação
- [ ] Guard de orçamento (422 antes da suíte) + barra de tokens na UI
- [ ] Índice determinístico de gatilho + comparação semântica (1 Haiku) + Tela E (conflito)
- [ ] 🌿 **Os 4 ramos do detector**: `contradiz` · `refina` (edita o item existente) · `duplica` (não cria nada + ticket de investigação) · `independente` (§5.2-a)
- [ ] Sub-aba **Caderno** (lista viva por bloco)
- [ ] Analista semanal passa a escrever na mesma fila (Tela C)

> A "trava do editor cru" saiu daqui: virou **perfil `dono` × `agencia`** e subiu pra Fase 0, onde protege desde o primeiro dia (§3.8).

### FASE 3 · A FAXINA — 1 dia

- [ ] Sunset de `fato` + poda por `nocivo > util` no `cron-daily`
- [ ] Consolidação semanal em endpoint próprio + tique QStash (**não** no `cron-daily`)
- [ ] Aposentadoria de cenário + teto de 25
- [ ] Painel de saúde (§6.1) na Central, **incluindo a linha "entidade nomeada sem sunset"** (só perfil `agencia`)

> ⚠️ **Não ligue a poda por `nocivo > util` antes de ~20 rodadas de portão** naquele cliente. Com um cliente mandando 4 correções por mês, a poda decide com `n=2` — e podar cedo demais é pior que não podar: você aposenta a regra que estava certa e o cliente vê a IA regredir sem explicação. Até lá os contadores são **informativos**, exibidos e não acionados.

### Esforço total, honesto

| Item | Esforço |
|---|---|
| Pré-requisito: rubrica binária | meio dia |
| Fase 0 (MVP defensável) | **1–2 dias** *(+1h do perfil, +1 tarde dos chips, +2ª porta da Tela B)* |
| Fases 1–3 | ~6,5 dias *(+replay, +retry, +4 ramos, +invariante)* |
| **Build (GHL)** | **~8,5 dias** |
| Observação em produção antes de confiar | **+1 semana** (só dogfood na Metrik) |
| 🟧 Kommo | **+1 dia** de port antes de tudo |
| 🔁 **4ª perna** (propagação) | ~30min × cliente ativo + evals + verificação no ar |

> 📐 **Leia esta tabela em DIAS DE BUILD, e compare só com dias de build.** O erro clássico ao avaliar este desenho é pôr *"2 a 3 semanas"* (calendário: 8,5 dias de build **+ a semana de observação** + folga) ao lado de um *"7 dias úteis"* de outro desenho que **não inclui observação nenhuma**. São unidades diferentes, e a comparação nessa forma inverte a conclusão: **este desenho é o mais barato do lote em dias de build** — o número que o faz parecer catedral é justamente o único que embute a semana de observação em produção. Qualquer alternativa honesta teria que somar a mesma semana.

> ⚠️ **A 4ª perna não é opcional** (`SKILL.md` §7.3): a ESCOLA é **componente compartilhado do motor**. Ela só existe pra um cliente quando o agente **dele** foi redeployado. Componente que só vive no template é igual conhecimento que só vive no `.md`: **não chegou em quem usa.** E **nada entra no manifesto como `ativo` sem `prova` com data** — manifesto que mente é pior que não ter.

### A ordem de compra, em uma linha

```
rubrica binária (meio dia)  →  FASE 0 (1-2 dias)  →  ── OPERE NA MÃO POR 2 SEMANAS ──
                                                          ↓
                                            leia as 20 primeiras correções reais
                                                          ↓
                              FASE 1 (2,5d) → FASE 2 (3d) → FASE 3 (1d)
```

**Por que a barreira depois da Fase 0:** você não sabe ainda como o **seu** cliente escreve correção. Aquelas 20 primeiras correções reais valem mais pro desenho do roteador e do redator do que qualquer coisa que você adivinhe agora — e são exatamente o material que a reflexão vai precisar ler. **Duas semanas de fila lida na mão compram uma Fase 1 que acerta de primeira.**

---

## §8-B · OS RISCOS QUE FICAM DE PÉ (leia antes de vender isto)

Nenhum dos itens abaixo é resolvido pelas travas deste documento. Todos são **mitigados**; nenhum é **fechado**. Documentar isso aqui é o que impede a próxima pessoa (ou você em novembro) de descobrir na mão.

| # | Risco | Por que não fecha | Mitigação real |
|---|---|---|---|
| 1 | 🚨 **O portão é instável** — `n=10`, `K=1`, juiz-modelo | Suíte pequena com juiz ruidoso reprova certo e aprova errado, e a taxa disso é desconhecida | rubrica binária (pré-req) · `pass^k` k=3 · retry único · **e aceitar que ele erra** |
| 2 | ⏳ **O portão vai reprovar coisa CERTA** | Os 10 cenários carregam o viés da oferta de **hoje**. *"Pare de oferecer call, meu público fecha no chat"* é correção legítima que **derruba** o cenário "Porta 1 oferece call" — quem envelheceu foi o exame | o ticket da 2ª falha existe **por isso**; revise a suíte quando a oferta mudar |
| 3 | 🔇 **Roteamento errado é silencioso, e é o pior risco de conteúdo** | A whitelist pega R$, %, data e horário. **Não pega** *"a promoção acabou"*, *"o Dr. não atende mais às quintas"*, *"mudamos de endereço"*. Entra como LEI, passa no portão (nenhum cenário testa endereço) e apodrece lá | a linha "entidade nomeada sem sunset" do painel (§6.1) — **parcial, e assumidamente parcial** |
| 4 | 👻 **Contradição contra a prosa de FÁBRICA é invisível** | O detector compara item × item. A briga entre um item novo e uma frase da prosa de fábrica — que é **onde moram as regras boas** — passa batida | só fecharia itemizando o `prompt.md` inteiro, o que é outro projeto. Por ora: o portão pega quando vira quebra funcional |
| 5 | ✍️ **Vazamento de AUTORIDADE** (nenhum desenho fecha) | O cliente não escreve, mas **aprova com um clique — e vai aprovar sem ler**, porque todo mundo aprova. O portão pega quebra funcional; não pega *"essa regra é burra mas passa nos 11 cenários"* | o replay antes/depois (§3.4) é o que mais reduz isto, porque força 2 segundos de leitura do resultado real |
| 6 | 🏷️ **A taxonomia vaza, sempre** | *"Ela foi seca e ainda esqueceu de dizer que a mentoria é ao vivo"* é **VOZ + FATO na mesma frase**. O roteador fatia errado ou perde metade — e rótulo errado = bloco errado = **posição errada no render**, e o modelo pesa diferente por posição | chips ajudam (multi-seleção); aceitar o split manual pra correção composta |
| 7 | 📉 **Governança ganha, prosa perde — e a venda mora na prosa** | O prompt que tirou 9,7/10 é **texto corrido com ritmo**. O caderno empurra tudo pra bullet, e VOZ/TOM em bullet fazem a agente soar como checklist. A degradação é lenta o bastante pra ninguém notar (o eval mede acerto, não charme) | promover VOZ recorrente a **`exemplo`** (turno modelo demonstrado) em vez de bullet — §4.7 ② já faz isso, e é a defesa principal |
| 8 | 🔢 **`util`/`nocivo` são decoração no 1º semestre** | 4 correções/mês ⇒ a poda decide com `n=2` | exibir sem acionar; poda só depois de ~20 rodadas |

🩸 **A honestidade que sustenta a venda:** este sistema não promete *"a IA nunca mais erra"*. Ele promete uma coisa muito mais defensável — **"toda mudança no cérebro dela passa por uma prova datada, e se quebrar algo você fica sabendo antes de publicar, não depois de perder a venda"**. Essa promessa a arquitetura cumpre. A outra, ninguém cumpre.

---

## §9 · FONTES

**🩸 Nossas (a prova mais forte):**

| Evidência | Onde |
|---|---|
| Regressão da Porta 3 (**10 → 2**) numa "melhoria" inocente · 8,2 → 9,7/10 em 3 iterações | `comum/EVALS.md` §8 · 12/07/2026 |
| Prompt sabotado **bloqueado com 5,7/10**, produção intacta (o portão funcionando) | `comum/EVALS.md` §6 · `ARQUITETURA.md` §5.11 |
| Custo e latência medidos: cache HIT **R$0,02 / 4,7s** · prompt 10k **R$0,08 / 9,5s** | `comum/CONTEXT-ENG.md` §1 · 12/07/2026 |
| Limiares prompt × RAG × tool · *"dado que muda toda hora = TOOL, nunca prompt"* | `comum/CONTEXT-ENG.md` §2 |
| *"O que é determinístico vira CÓDIGO, não instrução"* — a decisão de voz virou código porque o modelo escorregava | `comum/CONTEXT-ENG.md` §7 · `ARQUITETURA.md` §5.7 |
| Bloco dinâmico no lugar errado **invalida o cache em silêncio** | `comum/PEGADINHAS.md` §30 |
| Teto de 300s do `cron-daily` — **o rabo do dispatcher morre sem erro vermelho** | `FRONTEIRA.md` §1 proposta #3 |
| Cemitério do otimizador reflexivo (GEPA/Pareto) e da memory tool | `FRONTEIRA.md` §3 |
| Rubrica binária: o juiz 0–10 tem viés de verbosidade e auto-preferência | `FRONTEIRA.md` §1 proposta #4 |
| Playground com tools em dry-run — a fundação da captura | `comum/PLAYGROUND.md` · no ar 19/07/2026 |

**📄 Pesquisa (confira antes de gastar o dia):**

| Fonte | O que aproveitamos |
|---|---|
| **GEPA — Reflective Prompt Evolution** (Agrawal et al., arXiv:2507.19457, ICLR 2026 Oral) | O contrato de reflexão: o feedback **textual** do humano entra verbatim no prompt de reflexão como diagnóstico, e quem redige a instrução final é o modelo. `reflection_minibatch_size=3` → nosso lote de 3. **O otimizador em si está no cemitério** |
| **Doc oficial DSPy** — `SIMBA` (`append_a_rule` × `append_a_demo`), `InferRules`, `AvatarOptimizer`, `choosing-an-optimizer` | A taxonomia de destino (regra × demonstração), a extração de regra geral legível com humano no loop, e o contraste positivo/negativo como sinal (→ o par obrigatório da captura) |
| **MIPROv2** (Opsahl-Ong et al., arXiv:2406.11695, EMNLP 2024) | A régua: *"instruction optimization is particularly valuable for tasks with intricate conditional logic"* → condicional = INSTRUÇÃO; tom/forma = DEMONSTRAÇÃO. E o princípio "demo overfita, instrução generaliza" com conjunto pequeno |
| **ProTeGi / Automatic Prompt Optimization** (Pryzant et al., arXiv:2305.03495, EMNLP 2023) | O "gradiente textual": a crítica gerada a partir dos ERROS do minibatch, propagada editando o prompt na direção semântica oposta |
| **HealthBench** (OpenAI, mai/2025) | Rubrica **binária por critério, com peso**, e nota calculada por soma ponderada — o desenho de referência do pré-requisito #1 |
| **Anthropic** — structured outputs (`output_config.format`, GA) · prompt caching (fan-out paralelo paga cache cheio; mínimo por modelo) · *"examples are one of the most reliable ways to steer output format, tone and structure"* | Saída do redator que nunca vem malformada · como não jogar o desconto de 90% fora no portão · por que EXEMPLO existe como destino |

---

> **Última palavra.** A aba se chama **"Ensinar a IA"** e não "Editar o prompt" de propósito: o cliente ensina, o sistema aprende, e o exame decide. O que ele ganha é **ser ouvido com processo** — a correção dele vira regra escrita na voz da marca, com um caso de eval carimbado no nome dela, provada contra tudo que já protegia o cérebro. O que você ganha é **parar de ser o gargalo do tom** sem entregar a chave do porteiro. E o que o produto ganha é o ativo que ninguém copia: ao fim de um ano, o cliente não tem um prompt — **tem um caderno de 60 regras, cada uma com a data, o caso e o teste que a provaram.** Trocar de fornecedor passa a significar jogar isso fora.
