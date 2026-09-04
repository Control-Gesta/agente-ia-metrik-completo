# Central v3 — instalar o cockpit

> Origem: dogfood da Metrik, 23/07/2026. Antes de propagar, o agente e a
> Central passaram em typecheck/build, 74 asserções, dark/light, desktop/mobile
> e smoke HTTP nas cinco áreas.

## O que esta versão muda

A navegação deixa de expor features técnicas no mesmo nível e passa a responder
cinco perguntas do dono:

1. **Visão Geral** — está saudável e quanto está produzindo?
2. **Operação** — o que está acontecendo agora e o que aconteceu?
3. **Ensinar** — como testar, corrigir e atualizar o que a IA sabe?
4. **Resultados** — quanto custou e qual valor produziu?
5. **Configurações** — onde ficam regras, integrações e sistema?

## Assets — podem ser copiados inteiros

### Agente

- `agente/lib/cost.ts` → `lib/cost.ts`

### Central

- `central/lib/execution-data.ts` → `lib/execution-data.ts`
- `central/components/ProductUI.tsx` → `components/ProductUI.tsx`
- `central/components/ExecutiveDashboard.tsx` → `components/ExecutiveDashboard.tsx`
- `central/components/Sidebar.tsx` → `components/Sidebar.tsx`
- `central/app/layout.tsx` → `app/layout.tsx`
- `central/app/globals.css` → `app/globals.css`
- `central/app/page.tsx` → `app/page.tsx`
- `central/app/cerebro/page.tsx` → `app/cerebro/page.tsx`
- `central/app/operacao/page.tsx` → `app/operacao/page.tsx`
- `central/app/resultados/page.tsx` → `app/resultados/page.tsx`
- `central/app/configuracoes/page.tsx` → `app/configuracoes/page.tsx`

No `Sidebar.tsx`, ajuste as constantes `NOME_CLIENTE` e `SISTEMA_VERSAO` ou
alimente-as pela configuração do cliente.

## Patches — nunca copie por cima

### 1. `lib/config.ts`

Acrescente ao objeto de configuração:

```ts
usdBrl: Number(process.env.COST_USD_BRL || 5.50),
claudeInputUsdMtok: Number(process.env.CLAUDE_INPUT_USD_MTOK || 3),
claudeOutputUsdMtok: Number(process.env.CLAUDE_OUTPUT_USD_MTOK || 15),
elevenUsdKchars: Number(process.env.ELEVEN_USD_KCHARS || 0.05),
groqWhisperUsdHour: Number(process.env.GROQ_WHISPER_USD_HOUR || 0.04),
infraPerExecutionBrl: Number(process.env.INFRA_PER_EXECUTION_BRL || 0),
```

Preço de modelo muda. Confirme a tabela oficial ao instalar e use env para
contratos diferentes. O registro congela câmbio e tabela por execução.

### 2. `lib/claude.ts`

- importe `emptyUsage`, `mergeUsage`, `usageFromMessage` e `TokenUsage`
- acrescente `usage: TokenUsage` ao retorno do agente
- crie um acumulador antes do loop
- some `response.usage` **de toda chamada**, inclusive tool loop, retry por
  `max_tokens` e chamada final sem tools
- devolva o acumulado em todos os returns de sucesso

Não conte apenas a resposta final. Isso subestima exatamente as conversas mais
caras.

### 3. `lib/stt.ts`

- use `response_format=verbose_json`
- leia `duration`
- faça `enrichAudioTranscripts()` devolver `{ secondsBilled }`
- cache hit custa zero; só some duração quando houve chamada nova ao Groq

### 4. `lib/execlog.ts`

Acrescente `custo?: ExecutionCost` ao registro. Registros antigos ficam sem
custo: **nunca invente retroativamente**.

### 5. `api/inbound.ts`

- acumule usage mesmo quando uma geração for descartada porque chegou mensagem
  nova
- acumule os segundos novos de STT
- só some caracteres de voz quando o áudio foi realmente enviado
- grave `calculateExecutionCost(...)` junto da execução

### 6. `api/central.ts`

No recurso `execucoes`, devolva:

- hoje, 7 dias, 30 dias e total registrado
- média por resposta
- execuções com/sem custo
- composição Claude × voz × transcrição × infraestrutura
- série diária dos últimos 14 dias

### 7. `lib/manifest.ts`

Bump:

```ts
SISTEMA_VERSAO = '2026.07.23-central-v3-cockpit'
```

Registre o ledger e a Central v3 com prova datada. Não marque como propagado
antes de redeployar aquele cliente.

### 8. Tipografia e `app/layout.tsx`

O display da v3 usa **Manrope 500/600/700**. A Syne pesada do dogfood anterior
foi removida em 23/07/2026 depois de inspeção visual. Mantenha `font-impact`
como alias interno para evitar um rewrite mecânico, mas aponte a variável para
Manrope. Use `md:flex`, largura máxima `1440px` e padding móvel menor:

```tsx
<div className="min-h-screen md:flex">
  <Sidebar />
  <main className="flex-1 min-w-0 px-4 py-6 md:px-7 md:py-8 xl:px-10 max-w-[1440px]">
    {children}
  </main>
</div>
```

### 9. `app/globals.css` e interações

Copie o asset inteiro. Ele traz `.sidebar-shell`, `.metric-card`,
`.metric-icon`, `.panel`, `.segmented` e `.interactive-card`. Hover não desloca
conteúdo e não acende todo card indiscriminadamente: só elementos realmente
clicáveis recebem borda/superfície discretas. Foco por teclado continua
explícito. No tema claro, superfícies continuam sólidas; não volte a usar alpha
quase invisível.

### 10. Ensinar

Copie `central/app/cerebro/page.tsx` depois de instalar `assets/escola/`. A tela
ensina antes de abrir o laboratório:

1. escolha um exemplo
2. aponte o erro
3. escreva a resposta ideal
4. a equipe valida

As três fontes ficam explícitas — simulação, conversa real e conversa colada —,
Conteúdo ganha atalho próprio, e o editor técnico continua exclusivo do perfil
agência. O modo inicial é `ensinar`.

## Prova obrigatória

```bash
# agente
npm run typecheck
npx tsx scripts/test-escola.ts
npx tsx scripts/test-catalogo.ts
npx tsx scripts/test-conhecimento.ts

# Central
npm run build
```

Depois:

1. deploy do agente
2. confirme que `/api/central?recurso=execucoes` possui `financeiro`
3. deploy da Central
4. smoke HTTP 200 em `/`, `/operacao`, `/cerebro`, `/resultados`,
   `/configuracoes` e `/api/exec`
5. teste dark, light e 390px
6. gere uma conversa real e confirme que a nova execução possui `custo`

> A etapa 6 é a prova do ledger. Antes dela, o recurso está construído e no ar,
> mas ainda não foi provado numa conversa nova.
