# Briefing executivo diário

Componente validado em produção em 27/07/2026: o primeiro envio consolidou 39 execuções de 11 leads e foi aceito no grupo de alertas.

## Contrato

- `lib/daily-report.ts`: lê o ledger do dia anterior e calcula métricas deterministicamente em código. A LLM recebe apenas uma amostra sanitizada e produz interpretação, destaques e exatamente três ações.
- `api/daily-report.ts`: aceita somente GET autenticado por `CRON_SECRET`; `?dryRun=1` gera sem enviar e `?force=1` ignora a trava diária.
- `lib/alert.ts`: deve expor `sendDailyReport(texto)` usando o mesmo transporte de `sendAlert`.
- `vercel.json`: agendar `0 10 * * *` para 07h no fuso de Brasília. Se o projeto já consome o único cron Hobby, chame o módulo pelo dispatcher diário existente.
- Redis: grave `agente:daily-report:AAAA-MM-DD` somente após entrega aceita e expire em três dias.

## Indicadores mínimos

Execuções, leads únicos, respostas, erros, ignoradas, agendamentos, qualificações, handoffs, taxa de agenda, custo total/médio, mediana de latência e cache. Compare com o dia anterior sempre que houver base.

## Prova antes de declarar pronto

1. Rodar typecheck.
2. Chamar `GET /api/daily-report?dryRun=1` com Bearer e conferir data, métricas, placar e ações.
3. Fazer um único envio real ao grupo.
4. Repetir sem `force` e provar `duplicate: true`.

Nunca permita que a leitura qualitativa altere prompt, automação ou funil automaticamente.
