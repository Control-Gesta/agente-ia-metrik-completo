# Sala de Comando no grupo de alertas

## Handoff automático

- Dispare apenas depois de a tag humana ser confirmada no CRM.
- Cartão mínimo: lead, responsável, motivo, última mensagem, SLA iniciado agora e link direto.
- Idempotência por contato + ID da última inbound; TTL de sete dias.
- Falha do grupo é efeito secundário e nunca desfaz o handoff.

## Copiloto read-only

- Endpoint separado para mensagens UAZAPI.
- Antes de configurar, faça `GET /webhook` e preserve todos os destinos existentes.
- UAZAPI v2 aceita webhook adicional com `action: add`; após o POST, faça novo GET e prove que o anterior permaneceu.
- A UAZAPI aceita múltiplos webhooks por instância, mas em 27/07/2026 não publicava um limite máximo numérico. Nunca presuma capacidade ilimitada. Em instância crítica, use poucos destinos diretos; ao crescer, um relay recebe uma vez e distribui internamente.
- Nunca use `replace` só para instalar uma feature. Faça inventário com `GET /webhook`, guarde ID/URL/eventos/status do que já existe, use `action: add` e audite novamente. `globalwebhook` e `admintoken` ficam fora do trabalho de cliente.
- Filtros obrigatórios: JID exato, `fromMe:false`, grupo, remetentes da equipe em allowlist e ativação somente por `/comando`, `@menção` ou reply ao bot.
- Defesas: excluir `wasSentByApi`, `fromMeYes` e não-grupos no provedor; repetir os gates no código; dedup Redis por messageId; rate limit por remetente.
- Fase 1 é somente leitura: nenhum comando altera CRM, agenda, prompt, tags, proprietário ou conversa de lead.
- Números e métricas são calculados em código; LLM apenas interpreta JSON fornecido e admite quando o conector ainda não cobre a pergunta.

## Prova sem ruído

1. Typecheck e deploy.
2. `dryRun=1` com payload sintético: validar parsing sem enviar.
3. Payload de grupo errado e remetente não autorizado: silêncio.
4. Adicionar webhook, nunca substituir; GET deve mostrar original + copiloto.
5. Só então, em horário combinado, um administrador envia `/ajuda`; deve chegar exatamente uma resposta.
6. Mensagem comum, mensagem da própria API e membro não autorizado devem produzir zero respostas.
