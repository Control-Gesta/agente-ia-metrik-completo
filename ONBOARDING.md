# ONBOARDING COMPILER — da reunião ao projeto executável

> O onboarding não é um formulário. É um compilador: recebe fatos, decisões e
> fontes; acusa contradições; separa o que pode ser descoberto do que precisa ser
> perguntado; e gera os artefatos iniciais sem inventar dado.

## 1 · O problema que resolve

Em implantação manual, a mesma informação é reescrita no diagnóstico, prompt,
mapa do CRM, checklist de credenciais, evals e handoff. Cada cópia abre espaço
para contradição. O Compiler mantém uma entrada canônica e produz todas essas
visões.

Ele não substitui discovery ao vivo nem E2E. Ele elimina transcrição, montagem
de esqueleto e caça a pendências.

## 2 · Regra central: fato tem fonte e estado

Todo dado crítico precisa declarar:

- valor;
- `confirmed: true|false`;
- `source`: cliente, reunião, documento, CRM/API ou inferência;
- quando aplicável, referência em `sources`.

Inferência nunca vira verdade silenciosamente. Dado não confirmado aparece como
pendência; segredo nunca entra no arquivo de onboarding.

## 3 · Entrada

O contrato está em `assets/onboarding/schema.json`. Um exemplo fictício está em
`assets/onboarding/examples/cliente-ghl.json`.

Blocos:

1. cliente;
2. CRM e descoberta ao vivo;
3. negócio e oferta;
4. canal e mídia;
5. operação e alçada;
6. credenciais por estado — nunca valor;
7. cenários de eval;
8. fontes.

### Entrada humana canônica

Antes de montar o JSON, aplique `QUESTIONARIO-CLIENTE.md`. A entrada humana não é uma caixa única de briefing: combina os cinco documentos de negócio (Perfil, Processo Comercial, Produtos e Serviços, Qualificação e Objeções), o documento/formulário **Decisões da IA e Resultado** e a reunião de validação. O Compiler recebe a síntese confirmada desse pacote e preserva cada documento como fonte.

Não repetir perguntas bem respondidas: os documentos guardam profundidade; o formulário fecha decisões críticas; a Metrik descobre a parte técnica no CRM/API.

## 4 · Saídas

`node assets/onboarding/compile.mjs entrada.json pasta-saida`

Gera:

| Arquivo | Uso |
|---|---|
| `00-diagnostico.md` | resumo executivo e status do gate |
| `01-decisoes.md` | decisões, porquês e trade-offs |
| `02-pendencias.md` | o que falta, responsável e ação |
| `03-credenciais.md` | presença/validação sem expor segredo |
| `prompt.draft.md` | cérebro inicial, com bloqueios visíveis |
| `crm-map.draft.ts` | mapa tipado; IDs ausentes ficam `TODO`, nunca inventados |
| `evals.draft.json` | cenários mínimos do negócio |
| `handoff.json` | estado legível por máquina para continuar a implantação |

## 5 · Gates

O pacote pode ser gerado em qualquer estado, mas só recebe
`readyForBuild: true` quando:

- CRM confirmado;
- oferta, público e objetivo confirmados;
- recuperação definida em duas camadas: **respondeu** e **concretizou**, com sinal
  verificável no CRM e janela de atribuição;
- preço ou política explícita de não informar preço;
- definição comportamental de qualificação;
- alçada termina em Agendado;
- gate e handoff definidos;
- pipeline e stages vieram de CRM/API ao vivo;
- credenciais obrigatórias estão ao menos disponíveis;
- existem cenários de eval.

IDs ainda não descobertos geram um pacote útil, mas bloqueado. Isso é melhor que
adiar o diagnóstico e infinitamente melhor que preencher com ID de outro
cliente.

## 6 · O que o Compiler barra

- segredo dentro do JSON;
- CRM “a definir” tratado como pronto;
- preço ausente sem política de resposta;
- etapa da IA depois de Agendado;
- stage sem condição `quando`;
- ID declarado confirmado sem fonte CRM/API;
- dois sistemas respondendo o mesmo número;
- voz sem transporte compatível;
- projeto sem gate;
- “deployado” tratado como prova.

## 7 · Fluxo de uso

1. conduzir `comum/DIAGNOSTICO.md`;
2. preencher a entrada durante/depois da reunião;
3. rodar o Compiler;
4. resolver bloqueios que pertencem ao cliente;
5. consultar CRM/API para completar IDs;
6. recompilar até `readyForBuild: true`;
7. usar os drafts como ponto de partida;
8. seguir `NOVO-CLIENTE.md` para build, evals, E2E, Central e rampagem.

O Compiler economiza montagem. Os gates continuam sendo a prova.
