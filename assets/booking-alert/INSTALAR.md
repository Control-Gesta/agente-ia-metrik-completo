# Cartão de novo agendamento no grupo

Validado por compilação e deploy em 27/07/2026. A prova de entrega deve ser o próximo agendamento real — não crie ruído artificial no grupo do cliente.

## Contrato

- Dispare somente depois de a API do calendário confirmar sucesso.
- A notificação é efeito secundário: falhar nunca pode transformar reunião confirmada em erro para o agente.
- Use o mesmo `ALERT_GROUP_JID` e transporte de `lib/alert.ts`.
- Chave idempotente Redis: contato + epoch do slot, TTL de 30 dias.
- Conteúdo mínimo: cliente, lead, data/hora e fuso, closer operacional, resumo, próximo passo e link direto do CRM. Meet é opcional.
- Não use o throttle genérico de erros: dois agendamentos legítimos próximos devem gerar dois cartões.
- Não faça fallback para mensagem privada se o produto prometido é o grupo; registre falha e libere o lock para retry seguro.

## Prova

1. Typecheck.
2. Agendamento real no celular.
3. Um único evento no calendário.
4. Um único cartão no grupo.
5. Link abre o contato correto e data/closer batem com o calendário.
