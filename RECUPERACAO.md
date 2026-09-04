# RECUPERAÇÃO · follow-up que prova conversa e resultado

> **Padrão canônico da Central.** “Recuperado” sozinho é uma métrica ambígua.
> A Central mede separadamente o lead que **voltou a conversar** e o lead que
> **concretizou o objetivo comercial**. A definição do segundo varia por cliente
> e é obrigatória no onboarding.

## 1 · As duas conversões

### Recuperação de conversa

O lead enviou uma mensagem humana válida depois de ao menos um follow-up enviado
no ciclo atual. Não contam: eco do próprio bot, evento técnico, mensagem vazia,
opt-out (`pare`, `sair`) nem resposta anterior ao primeiro envio.

### Recuperação de resultado

O lead atingiu o evento comercial escolhido pelo cliente depois de entrar no ciclo
de follow-up. Exemplos: agendamento confirmado; lead qualificado e transferido ao
closer; proposta solicitada; pagamento/contrato confirmado; chegada à etapa final
sob responsabilidade da IA.

O evento precisa ter **prova determinística no CRM**: `stageId`, status, campo,
tag, appointment, task concluída ou webhook idempotente. “A conversa pareceu boa”
não é evento de conversão.

### Influência assistida

Se a IA recupera a conversa, faz handoff e o humano concretiza depois, o follow-up
não recebe crédito de execução direta, mas recebe **influência assistida** dentro
da janela configurada. Mostre separado; nunca some ao “concretizado pela IA”.

## 2 · As perguntas obrigatórias no onboarding

1. **Quando você dirá que o lead voltou?** Qualquer resposta humana válida ou há
   uma resposta mínima?
2. **Qual evento prova que o objetivo foi concretizado?**
3. **Onde esse evento aparece no CRM, exatamente?** Etapa, campo, tag, agenda ou
   webhook? Descubra o ID ao vivo.
4. **Quanto tempo após o último follow-up ainda recebe crédito?** Padrão recomendado:
   7 dias; aumente apenas se o ciclo comercial justificar.
5. **Se um humano assumir e converter, mostramos como influência assistida?**
6. **Um novo sumiço inicia um novo ciclo?** Padrão: sim, com `cycleId` novo.

Sem resposta para 2 e 3, a Central pode medir retorno de conversa, mas deve exibir
“objetivo comercial não configurado” — nunca zero.

## 3 · Máquina de estados por ciclo

```text
elegível → agendado → devido → enviado N → respondeu
                                  ├→ concretizou
                                  ├→ handoff → concretizou assistido
                                  ├→ cancelado
                                  └→ esgotado
```

Cada ciclo tem `cycleId`, `leadId`, `startedAt`, `currentStep`, `nextDueAt`,
`sent[]`, `responseAt`, `responseStep`, `goalAt`, `goalStep`, `goalKind`,
`assisted`, `cancelReason` e `exhaustedAt`.

Um lead conta uma vez por métrica em cada ciclo. Reenvio/retry usa `eventId`
idempotente. Novo silêncio depois de uma recuperação gera novo ciclo, sem apagar
o anterior.

## 4 · Atribuição

Use duas leituras:

- **Último toque:** credita a resposta/objetivo ao último follow-up enviado antes
  do evento. Responde “qual mensagem trouxe de volta?”.
- **Coorte do ciclo:** mostra se o ciclo inteiro terminou em resposta ou objetivo.
  Responde “a recuperação funcionou?”.

Regras:

- resposta precisa ocorrer depois de `sentAt`;
- objetivo precisa ocorrer dentro de `attributionWindowHours`;
- se o objetivo já existia antes do ciclo, não atribua;
- sem confirmação do provedor, use **enviado**, não entregue;
- opt-out cancela e não é recuperação;
- handoff encerra envios, mas preserva a janela de influência assistida.

## 5 · Métricas da Central

### Linha executiva

- em recuperação agora;
- próximos envios: vencido, até 1h, hoje, amanhã, depois;
- envios no período;
- respostas recuperadas e taxa sobre ciclos com envio;
- objetivos concretizados e taxa sobre ciclos com envio;
- influência assistida;
- esgotados, cancelados e opt-outs;
- custo total e custo por resposta/objetivo, quando medido.

### Eficácia por toque

| Toque | Enviados | Responderam | Taxa resposta | Concretizaram | Taxa objetivo | Tempo mediano |
|---|---:|---:|---:|---:|---:|---:|
| FU1 | | | | | | |
| FU2 | | | | | | |

O denominador de cada toque é quem **recebeu aquele toque**, não todos os leads.

### Fila acionável

Mostre nome, etapa, toque atual, último envio, próximo envio com contagem regressiva,
status da janela do WhatsApp, owner e motivo de pausa. Filtros: atrasados, hoje,
por toque, por owner e por estado.

### Quem voltou e quem concretizou

Listas separadas, com toque atribuído, tempo até resposta/objetivo, evento-prova,
se foi direto ou assistido e link para o CRM.

## 6 · Contrato do endpoint

`GET /api/followup-stats` continua read-only, mas passa a devolver:

```ts
type FollowupStats = {
  definition: {
    responseLabel: string
    goalLabel: string | null
    goalSignal: { type: 'stage'|'field'|'tag'|'appointment'|'webhook'; id: string; value?: string } | null
    attributionWindowHours: number
  }
  summary: {
    active: number; sent: number; responded: number; achieved: number
    assisted: number; exhausted: number; cancelled: number; optOut: number
    responseRate: number | null; goalRate: number | null
    costBrl: number | null; costPerResponseBrl: number | null; costPerGoalBrl: number | null
  }
  dueBuckets: { overdue: number; nextHour: number; today: number; tomorrow: number; later: number }
  byStep: Array<{
    step: number; sent: number; responded: number; achieved: number
    responseRate: number | null; goalRate: number | null; medianResponseMinutes: number | null
  }>
  queue: Array<{
    cycleId: string; leadId: string; name?: string; step: number
    lastSentAt?: string; nextDueAt?: string; state: string; owner?: string; crmUrl?: string
  }>
  recovered: Array<{ cycleId: string; leadId: string; step: number; at: string; crmUrl?: string }>
  achieved: Array<{ cycleId: string; leadId: string; step: number; at: string; assisted: boolean; evidence: string; crmUrl?: string }>
}
```

Taxa sem denominador é `null` e a interface escreve “ainda sem base”. Histórico
sem instrumentação aparece como “não medido”; nunca é convertido em zero.

## 7 · Instrumentação mínima

- `scheduleFollowup`: abre/atualiza ciclo e `nextDueAt`;
- `markSent`: grava toque, canal, template, custo e `sentAt`;
- `markRecovered`: antes de resetar cadência, grava resposta e toque atribuído;
- `markGoalAchieved`: observa o sinal do CRM e grava evidência;
- `markHandoff`: cancela novos envios sem apagar a janela assistida;
- `markCancelled`: gate removido, opt-out ou intervenção;
- `markEsgotado`: encerra o ciclo sem resposta/objetivo.

O CRM é fonte da verdade do objetivo; Redis é ledger da atribuição. O endpoint
reconcilia ambos e filtra leads que já saíram do gate.

## 8 · Hierarquia visual

Recuperação vive em **Operação**, como subaba própria. Para evitar excesso:

1. **Agora:** fila + próximos envios.
2. **Eficácia:** resposta × objetivo e tabela por toque.
3. **Resultados:** quem voltou × quem concretizou.
4. **Definição:** regra configurada, sinal no CRM e janela de atribuição.

Uma subaba por vez. O vazio explica qual evento inaugurará a métrica.

## 9 · Definição de pronto

- definição de resposta e objetivo assinada;
- sinal do objetivo descoberto ao vivo;
- ciclo e eventos idempotentes persistidos;
- FU de teste enviado;
- resposta real atribuída ao toque correto;
- objetivo de teste reconhecido pelo CRM;
- handoff interrompe envios e preserva atribuição assistida;
- Central diferencia “sem dados” de zero;
- desktop, mobile e temas validados.

