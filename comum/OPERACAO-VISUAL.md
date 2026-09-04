# OPERAÇÃO VISUAL · o agente também monta a superfície sem API

> **Manual para a API não significa manual para o mestre.** Se GHL ou Kommo só
> permitem configurar um componente na interface, o agente pode operar um navegador
> autenticado disponibilizado pelo usuário. Não é acesso irrestrito ao computador.

## Escada de execução

1. API/CLI para discovery, IDs, escrita determinística, lotes e readback.
2. Navegador autenticado para workflow builder, Digital Pipeline, Salesbot,
   integração e configuração visível sem endpoint de escrita.
3. Humano para login, MFA, CAPTCHA, senha, pagamento, aceite ou decisão ausente.

Pré-requisitos: autorização clara, conta/location conferida, sessão autenticada,
blueprint, gate/kill switch e contato de teste. Nunca leia cookies, storage de
sessão ou senhas salvas.

## GHL · receita visual do agente

1. Criar workflow de atendimento em rascunho.
2. Gatilho `Customer Replied`; canal WhatsApp.
3. Gate: tag da IA presente; tag de humano/handoff ausente.
4. `Custom Webhook` para `/api/inbound` com a autenticação prevista no projeto.
5. Criar o tracker separado, sem gate de atendimento.
6. Configurar templates/workflows de follow-up fora da janela, quando aplicável.
7. Desligar o Conversation AI/Autopilot nativo no mesmo canal.
8. Reabrir e reler gatilho, filtros, ações e status.
9. Testar com contato marcado e número real; confirmar CRM → webhook → IA →
   WhatsApp antes de rampar.

## Kommo · receita visual do agente

No transporte Salesbot:

1. Abrir o Salesbot correto ou criar um rascunho.
2. Montar o `widget-request` para `/api/salesbot?secret=...`.
3. Mapear a resposta do JSON para a mensagem enviada.
4. Salvar, capturar o `bot_id` e atualizar o `crm-map`.
5. Configurar o Digital Pipeline se a entrada depender de etapa/evento.
6. Reabrir o grafo e testar lead → outbox → execução do bot → mensagem.

## Travas

- Nunca publicar antes de evals e `/api/validate`.
- Nunca habilitar alcance retroativo sem aprovação explícita.
- Nunca confiar em “salvo”: releia a configuração.
- Nunca testar em massa; use gate e registro controlado.
- Mudou a interface ou a consequência ficou ambígua: pare antes do clique.

**Pronto =** configuração relida + E2E real + evidência no diário + modo de
desligar documentado.

