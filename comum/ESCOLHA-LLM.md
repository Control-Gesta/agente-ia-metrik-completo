# ESCOLHA DE LLM — arquitetura, cache e campeonato

> **Leia quando:** iniciar cliente novo, trocar modelo, discutir custo ou adicionar
> provedor. Preços abaixo são fotografia de **24/07/2026**; confira a tabela
> oficial antes de prometer valor.
>
> **Estado honesto:** GPT-5.4 Mini venceu a final nativa offline e entrou no
> dogfood da Metrik em produção em **24/07/2026**, com guardas determinísticas,
> evals 10/10 e rollback pela versão anterior da Vercel. Ainda precisa acumular
> conversão real antes de virar padrão irrestrito de toda a frota.

> **Final OpenAI Mini de 25/07/2026:** GPT-5 Mini × GPT-5.4 Mini, 30 cenários
> × 3 repetições, API nativa e dois juízes cegos. GPT-5.4 Mini venceu por
> **7,56 × 6,16**, 141 × 39 vitórias, **0 × 12 falhas críticas**, 3,13s ×
> 3,38s e R$0,0099 × R$0,0028 por caso. O GPT-5 Mini foi 71,5% mais barato,
> mas omitiu tools obrigatórias de agenda, qualificação, origem e handoff;
> por isso não entra na conversa principal. Pode ser reavaliado em tarefas
> auxiliares sem efeito comercial irreversível. Evidência:
> `clientes/metriksales/agente-ia/artifacts/model-openai-mini-veredito-2026-07-25.md`.

> **Bake-off Metrik de 24/07/2026:** 12 cenários × 3 repetições no OpenRouter.
> Ranking corrigido: Sonnet 5 = 7,78 e zero falhas críticas; GPT-5.4 Mini = 7,50
> e uma falha crítica; Kimi K2.5 = 7,50 e três; DeepSeek V4 Flash = 7,19 e três.
> **Na eliminatória, Sonnet permaneceu produção; somente GPT-5.4 Mini avançou para final nativa.**
> Kimi e DeepSeek ignoraram `preencher_qualificacao` em 3/3. O GPT duplicou prova
> social em 3/3 e moveu `Agendado` antes da confirmação em 1/3. Evidência:
> `clientes/metriksales/agente-ia/artifacts/model-bakeoff-veredito-2026-07-24.md`.

> **Final nativa de 24/07/2026:** 30 cenários × 3 repetições × 2 prompts, APIs
> nativas e dois juízes cegos. No prompt atual, GPT-5.4 Mini = **7,22**, R$0,0100
> por caso e 2,73s; Sonnet 5 = **5,98**, R$0,0299 e 5,28s. GPT venceu nos dois
> juízes, mas moveu `Agendado` sem reunião em 4/90; Sonnet fez 1/90 e chamou
> muito menos tools. O hardening em bloco não resolveu: GPT 7,04/4 falhas,
> Sonnet 6,56/2. Decisão: **GPT + guardas no código + canário de 10%**, Sonnet
> como fallback. Evidência completa:
> `clientes/metriksales/agente-ia/artifacts/model-final-native-veredito-2026-07-24.md`.

## 1 · A pergunta certa não é “qual é a melhor LLM?”

Pergunte, nesta ordem:

1. O agente só classifica ou **conversa para vender**?
2. Quais tools ele pode chamar e qual erro seria irreversível?
3. O prompt estático tem quantos tokens e quantas chamadas reaproveitam o prefixo?
4. Há imagem/PDF? O mesmo provedor precisa ter visão?
5. Os dados incluem CPF, saúde, financeiro ou outro dado sensível?
6. A prioridade é qualidade, latência, custo ou simplicidade de implantação?
7. Existe eval real do cliente para comparar — ou só opinião?

Sem essas respostas, “escolher modelo” é escolher camiseta.

## 2 · A fotografia econômica

Preços por 1M tokens, em USD:

| Modelo | Entrada | Cache hit | Saída | Leitura |
|---|---:|---:|---:|---|
| DeepSeek V4 Flash | 0,14 | 0,0028 | 0,28 | custo radical; precisa provar qualidade, operação e governança |
| GPT-5 Mini | 0,25 | 0,025 | 2,00 | barato, mas reprovou na conversa principal por omitir tools obrigatórias em 12/90 |
| Kimi K2.5 | 0,60 | 0,10 | 3,00 | desafiante barato, tools e cache automático |
| GPT-5.4 mini | 0,75 | 0,075 | 4,50 | principal desafiante equilibrado |
| Claude Haiku 4.5 | 1,00 | 0,10 | 5,00 | tarefas mecânicas; mesma integração Anthropic |
| GPT-5.6 Luna | 1,00 | 0,10 | 6,00 | a própria OpenAI o aproxima do antigo tier nano |
| Claude Sonnet 5 | 2/3 | 0,20/0,30 | 10/15 | preço introdutório até 31/08/2026; produção comprovada |
| GPT-5.6 Terra | 2,50 | 0,25 | 15,00 | caro para SDR comum |
| Claude Opus 4.6 | 5,00 | 0,50 | 25,00 | overkill |
| GPT-5.6 Sol | 5,00 | 0,50 | 30,00 | overkill |

**Não escolha pelo número da geração.** GPT-5.4 mini pode ser melhor negócio que
GPT-5.6 Luna: é 25% mais barato nas três categorias e pertence ao tier mini,
enquanto Luna é o tier econômico/nano da família 5.6.

Fontes: documentação oficial Anthropic, OpenAI, Kimi, DeepSeek e Google. O ledger
real decide; esta tabela só escolhe quem merece entrar no teste.

## 3 · Cache: o que ele salva e o que não salva

Cache não guarda a resposta. Ele reaproveita o **prefixo processado** e gera uma
resposta nova. O desconto do cache não vale para histórico novo, mensagem atual,
resultado de tool, saída ou reasoning.

Regra estrutural:

```text
[tools estáveis] + [prompt estático] + BREAKPOINT
                                     + [data, lead, tags, turno, resultados]
```

- Prefixo precisa ser idêntico: ordem, whitespace, schema e descrição das tools.
- Conteúdo dinâmico vem **depois** do breakpoint.
- Registre `input`, `cache_read`, `cache_write`, `output`, chamadas e custo.
- Compare custo **com e sem cache** no mesmo workload.

Diferenças:

| Provedor | Mecânica |
|---|---|
| Anthropic | breakpoint explícito; hit a 10%; write de 5 min a 1,25×; 1h custa mais |
| OpenAI 5.4 Mini | automático a partir de 1.024 tokens; trate como 5–10 min de inatividade, até 1h; não presuma 24h |
| OpenAI 5.4 principal | pode usar retenção estendida até 24h; confirme política/ZDR |
| OpenAI 5.6 | write a 1,25×; `prompt_cache_key` + breakpoint; TTL mínimo atual de 30 min |
| Kimi | automático; prefixo anterior acima de 256 tokens; sem administrar TTL |
| DeepSeek | automático; mede hit/miss separadamente |
| Gemini | leitura barata, mas cache explícito cobra armazenamento por token/hora |

O cache pode reduzir cerca de 60% da **conta total** num agente com prompt grande,
embora o trecho cacheado tenha desconto de 90% ou mais. Saída e contexto dinâmico
continuam cobrados.

### OpenRouter: cache real, não simulação

OpenRouter pode ser usado na primeira fase do campeonato com uma única chave.
Ele preserva o **prompt cache do provedor** e devolve `cached_tokens`,
`cache_write_tokens`, custo e desconto. Use `session_id` por conversa para manter
afinidade com o mesmo endpoint.

Não confunda com o **response cache** beta do OpenRouter: esse segundo cache
devolve a mesma resposta para requests idênticos. No bake-off ele fica
explicitamente **desligado**, pois falsificaria as três repetições.

Para uma comparação científica pelo gateway:

- slug exato do modelo, nunca `auto`, `latest` ou roteador;
- endpoint do fabricante preso em `provider.only`;
- `allow_fallbacks:false` e `require_parameters:true`;
- `reasoning.effort:"none"` nos quatro concorrentes;
- quando o modelo não aceitar `none`, use o menor valor oficial disponível e
  registre a assimetria: GPT-5 Mini exigiu `minimal` no ensaio de 25/07/2026;
- prompt cache ligado/automático e response cache desligado;
- custo lido do `usage` retornado, não reconstruído por tabela.

O OpenRouter serve para a eliminatória de qualidade/tools e para medir cache
operacional. O finalista ainda passa por uma rodada curta na API nativa antes de
produção, porque gateway, endpoint, política de dados e faturamento também fazem
parte da arquitetura. **Cache não é simulado para aprovar modelo:** sem hit
observado, o relatório diz “não medido”.

## 4 · SDK não é arquitetura

Não espalhe `anthropic.messages.create()` pelo motor. O contrato interno é:

```ts
interface LlmProvider {
  generate(input: {
    systemStatic: string
    systemDynamic: string
    messages: Message[]
    tools: ToolDefinition[]
    maxSteps: number
  }): Promise<{
    text: string
    toolCalls: ToolCall[]
    usage: TokenUsage
    latencyMs: number
  }>
}
```

- Anthropic usa o SDK oficial.
- OpenAI pode usar SDK/Responses.
- Kimi e DeepSeek expõem formato compatível com OpenAI; REST direto evita
  dependência desnecessária.
- O loop, os guards e a alçada ficam fora do adapter. Trocar provedor não pode
  trocar as regras do CRM.
- `LLM_PROVIDER`, `LLM_MODEL` e a chave escolhem o adapter.

**Mídia é contrato separado:** um modelo barato de texto não ganha visão ou
áudio por decreto. O padrão novo de simplicidade é usar a mesma conta OpenAI com
modelos especializados; Groq/ElevenLabs só entram quando custo, qualidade ou
clonagem pagarem outra integração. Leia `comum/MIDIA-PROVEDORES.md`.

## 5 · O campeonato obrigatório

Nunca faça “troquei a env e gostei da resposta”. O bake-off da casa:

1. mesmo prompt e mesmo catálogo de tools;
2. tools em dry-run, sem CRM;
3. no mínimo 10 cenários reais: portas, preço, suporte, injection, agenda,
   qualificação e fora de escopo;
4. três repetições por modelo;
5. identidade dos modelos escondida do juiz;
6. falha determinística de tool limita nota a 6;
7. mede nota, vitória, naturalidade, tool correctness, latência, cache e custo;
8. modelo fixo por conversa — nunca troca no meio;
9. vencedor offline entra em 10% dos leads por tag;
10. só vira padrão se conversão/qualidade não piorarem materialmente;
11. regras irreversíveis ficam também no código: a LLM nunca é a única trava.

No dogfood:

```bash
cd clientes/metriksales/agente-ia
BAKEOFF_REPEATS=3 npm run bakeoff:models
```

Harness: `scripts/model-bakeoff.mjs`. Pode usar uma única `OPENROUTER_API_KEY`
para a eliminatória ou as chaves nativas `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`MOONSHOT_API_KEY` e `DEEPSEEK_API_KEY`.

No projeto Metrik, rode primeiro `npm run bakeoff:keys`: o terminal coleta as
chaves mascaradas e salva em `.env.bakeoff.local`, isolado da produção e ignorado
pelo Git. **Nunca peça para o mestre colar chave no chat.** Sem uma chave, marque
o modelo como **não testado**; nunca invente placar.

## 6 · Roteamento permitido e proibido

- ❌ Haiku/nano “decide” antes do modelo principal: chamada e latência extras.
- ❌ trocar de modelo no meio da conversa: personalidade e tool behavior mudam.
- ✅ modelo fixo por lead para A/B.
- ✅ tarefas fora da conversa podem usar modelo barato: resumo, classificação,
  follow-up mecânico e relatórios.
- ✅ fallback por indisponibilidade, com circuito e telemetria, nunca silencioso.

## 7 · Gate de produção

Um desafiante só entra se:

- evals 10/10;
- zero falha crítica de tool em três repetições;
- custo real menor no ledger, não apenas tabela;
- política de dados/DPA revisada para o conteúdo do cliente;
- E2E no celular e CRM;
- rampagem `contato próprio → 10% → todos`;
- rollback por env e versão anterior disponível.
