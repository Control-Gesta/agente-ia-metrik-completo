# Central v4.1 — Autonomia em camadas

> Origem: dogfood Metrik, 23/07/2026. Publicada e validada com dados reais:
> typecheck do agente, 74 testes, build da Central, desktop, 390px, APIs e
> Shadow E2E controlado.

## O salto de produto

A v4 não cria novas áreas principais. Ela adiciona uma camada de decisão às
cinco áreas da v3:

- **Briefing Executivo:** interpreta CRM + diário em código, zero tokens.
- **Pergunte à Central:** perguntas determinísticas sobre custo, erros, agenda,
  funil e ensino, zero tokens.
- **Flight Recorder:** replay por execução usando turnos e ledger já gravados.
- **Recuperação em duas conversões:** fila e próximos envios, eficácia por toque,
  quem voltou a conversar e quem concretizou o objetivo configurado no CRM.
- **Radar de Dinheiro:** valor e quantidade parados por etapa.
- **Mapa Vivo:** regras × catálogo × FAQ × exemplos × mídias × tools.
- **Shadow Lab:** somente candidata, lote pequeno, tools simuladas e reserva de
  custo antes de cada caso.
- **Modo E se?:** sensibilidade matemática, sem modelo.
- **Recibo de Valor:** impressão/PDF com premissas explícitas.

## A regra v4.1 — uma pergunta por vez

As capacidades da v4 continuam iguais, mas não podem aparecer todas juntas.
Use divulgação progressiva:

- **Visão Geral:** um sinal prioritário; os demais ficam em “ver mais”. Depois,
  Funil, Custos e Próximos Passos são focos mutuamente exclusivos.
- **Resultados:** Resumo, Dinheiro parado, Modo E se? e Recibo são subabas. Só
  uma renderiza por vez.
- **Ensinar:** começa numa tela de escolha. Depois que a pessoa abre uma
  ferramenta, as demais somem e aparece “Todas as opções”.
- **Radar:** abre somente as duas etapas prioritárias; as demais ficam
  recolhidas.
- **Estado vazio:** não desenhe gráfico com quatorze zeros. Mostre uma frase que
  explica qual evento inaugurará a medição.
- **Operação/Recuperação:** Agora, Eficácia, Resultados e Definição são subabas;
  resposta recuperada nunca é confundida com objetivo concretizado.

`FocusNav.tsx` é o componente canônico dessas subabas. No mobile ele vira faixa
horizontal com scroll próprio, sem aumentar a largura do documento.

🩸 **Dor que forçou a v4.1:** as features eram fortes, mas briefing, métricas,
radar, simulador, recibo e ferramentas disputavam atenção na mesma tela. O
cliente gostava do produto e ainda assim sentia excesso de informação. A cura
foi hierarquia e revelação sob demanda — não remover capacidade.

## Pré-requisitos

1. Central v3 instalada (`assets/central-v3/`).
2. Escola instalada (`assets/escola/`).
3. `ExecRecord` com `turnoLead`, `respostaIA` e `custo?`.
4. Perfil agência separado do dono.

## Ordem canônica — este pacote é o último

Para cliente novo, a ordem completa é:

```
area-cliente base → central-v2 → central-v3 → Escola → central-v4.1
```

**A v4.1 é sempre aplicada por último e vence qualquer sobreposição visual.**
Em especial, o `central/app/cerebro/page.tsx` deste pacote é a autoridade final
da página Ensinar. Ele substitui o esqueleto legado de três modos documentado no
Patch 7 da Escola e entrega:

```
inicio → ler | ensinar | mapa | laboratorio | editar
```

Adapte marca, textos e o mapa literal das seções do prompt, mas preserve a
hierarquia, os modos, os perfis e a divulgação progressiva. Se a página final
ficar apenas em `ler/ensinar/editar`, a instalação terminou numa versão antiga e
**não está pronta**.

## Assets copiáveis

Copie `central/components/*`, `central/lib/*` e as páginas desta pasta. O
`layout.tsx` já monta `CentralCommand`. O `globals.css` inclui estados, comando,
Mapa e impressão do recibo.

Antes de copiar, preserve customizações de marca. Substitua `CLIENTE`, nome do
agente e textos da agência.

Depois da cópia, rode `node scripts/audit-skill.mjs` na raiz da skill para
confirmar que o pacote canônico continua completo e sem identidade de cliente.

## Patches no agente

### 1. Uso e custo do sandbox

Faça `simulateChat()` devolver:

```ts
{
  reply, toolCalls, voice,
  usage: TokenUsage,
  costBrl: calculateExecutionCost({ usage }).totalBrl
}
```

Some **todas** as chamadas, inclusive tool loop, retry e resposta final.

### 2. Shadow econômico

Não rerode a versão atual: ela já está no `ExecRecord`. Gere apenas a candidata.
Não use um terceiro modelo como juiz. Compare em código:

- respondeu
- tamanho saudável
- ausência de vazamento técnico
- preservação das tools atuais

Limites canônicos:

```ts
maxCases = 5
maxStepsPerCase = 2
maxTokensPerCall = 700
reservaPorCasoBrl = 0.20
```

🩸 A reserva **não é promessa de hard cap**. O provedor só revela o custo
depois de responder. O servidor impede começar o próximo caso sem R$0,20 de
reserva; a Central exibe o custo real após o lote.

### 3. `api/prompt.ts`

Adicione `acao:'shadow'`, exclusiva de agência:

```ts
POST /api/prompt {
  acao: 'shadow',
  texto: promptCandidato,
  budgetBrl,
  casos: [{ id, lead, atual, toolsAtuais }]
}
```

Tools continuam simuladas. Shadow nunca publica e nunca toca CRM.

## Patch no GHL ao vivo

Amplie `getFunnelStages()` para agregar por etapa:

```ts
{
  label, n, ia,
  valor,       // soma monetaryValue
  parados,     // updatedAt/lastStatusChangeAt >= 7 dias
  amostras: [{ id, nome, valor, diasParado }]
}
```

Use somente oportunidades `status=open`. Valor aberto não é receita realizada;
essa ressalva precisa aparecer na interface e no Recibo.

## Prova obrigatória

1. `npm run typecheck` no agente.
2. Escola 44/44, catálogo 17/17, conhecimento 13/13.
3. `npm run build` na Central.
4. Smoke `200` nas cinco áreas e APIs.
5. Mapa Vivo precisa refletir os dados reais.
6. Flight Recorder precisa abrir um turno real sem chamada de modelo.
7. Shadow com **um** caso real, sem publicação e sem CRM:
   - custo retornado;
   - quatro sinais;
   - custo dentro da reserva de R$0,20.
8. Desktop, tema claro/escuro e 390px sem overflow.
9. Recuperação: FU real → resposta atribuída ao toque → objetivo reconhecido pelo
   sinal do CRM; ausência de denominador aparece “ainda sem base”, não `0%`.

Só depois da prova faça o bump:

```ts
SISTEMA_VERSAO = '2026.07.23-central-v4.1-camadas'
```
