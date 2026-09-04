#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SECRET_KEY = /(token|secret|api[_-]?key|password|senha|authorization)/i
const SECRET_VALUE = /(?:sk-ant-|gsk_|pit-|Bearer\s+|https?:\/\/[^/\s]+\.upstash\.io)/i
const REQUIRED_CREDENTIALS = {
  ghl: ['crm', 'anthropic', 'upstash', 'vercel'],
  kommo: ['crm', 'anthropic', 'upstash', 'vercel'],
}

const safe = value => String(value ?? '').replaceAll('|', '\\|')
const factValue = fact => fact?.value ?? ''
const isConfirmed = fact => Boolean(fact?.confirmed && fact?.source)
const statusIcon = state =>
  ({ validated: '✅', available: '🟡', missing: '🔴', 'not-applicable': '—' }[state] ?? '❔')

function scanSecrets(value, path = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSecrets(item, `${path}[${index}]`, findings))
    return findings
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) findings.push(`${path}.${key}`)
      scanSecrets(child, `${path}.${key}`, findings)
    }
    return findings
  }
  if (typeof value === 'string' && SECRET_VALUE.test(value)) findings.push(path)
  return findings
}

function validate(input) {
  const errors = []
  const blockers = []
  const warnings = []
  const sourceIds = new Set((input.sources ?? []).map(source => source.id))

  if (input.schemaVersion !== '1.0') errors.push('schemaVersion precisa ser 1.0')
  if (!input.client?.name || !input.client?.slug || !input.client?.agentName) {
    errors.push('cliente precisa de name, slug e agentName')
  }
  if (!['ghl', 'kommo', 'unknown'].includes(input.crm?.type)) {
    errors.push('crm.type precisa ser ghl, kommo ou unknown')
  }

  const secrets = scanSecrets(input)
  if (secrets.length) {
    errors.push(`segredo ou campo sensível encontrado em: ${secrets.join(', ')}`)
  }

  if (!input.crm?.confirmed || input.crm?.type === 'unknown') {
    blockers.push('Confirmar se o CRM é GoHighLevel ou Kommo.')
  }

  for (const [label, fact] of [
    ['oferta', input.business?.offer],
    ['público', input.business?.audience],
    ['objetivo', input.business?.objective],
    ['tom', input.business?.tone],
    ['definição de qualificação', input.operations?.qualificationWhen],
    ['definição de recuperação por resposta', input.operations?.recovery?.responseDefinition],
    ['definição de objetivo concretizado após follow-up', input.operations?.recovery?.goalDefinition],
  ]) {
    if (!isConfirmed(fact)) blockers.push(`Confirmar ${label} e registrar a fonte.`)
  }

  if (input.business?.pricePolicy === 'unknown' || !input.business?.pricePolicy) {
    blockers.push('Definir se a IA pode informar preço.')
  }
  if (input.business?.pricePolicy === 'inform') {
    const confirmedPrices = (input.business.prices ?? []).filter(item => item.confirmed && item.source)
    if (!confirmedPrices.length) blockers.push('Adicionar ao menos um preço confirmado e sua fonte.')
  }

  if (String(input.operations?.aiLimit ?? '').toLowerCase() !== 'agendado') {
    blockers.push('Fixar a alçada da IA em Agendado.')
  }
  if (!input.operations?.gateTag) blockers.push('Definir a tag de gate.')
  if (!input.operations?.humanTag) blockers.push('Definir a tag de atendimento humano.')
  const recovery = input.operations?.recovery
  if (!recovery?.goalSignal?.confirmed || !recovery.goalSignal.id ||
      !recovery.goalSignal.source || !sourceIds.has(recovery.goalSignal.source)) {
    blockers.push('Confirmar no CRM o sinal verificável do objetivo da recuperação.')
  }
  if (!Number.isFinite(recovery?.attributionWindowHours) ||
      recovery.attributionWindowHours < 1) {
    blockers.push('Definir a janela de atribuição da recuperação em horas.')
  }
  if (input.channel?.sameNumberHasAnotherBot) {
    blockers.push('Eliminar coexistência: o mesmo número já possui outro bot.')
  }
  if (input.channel?.voiceOut && input.channel?.whatsapp !== 'uazapi') {
    blockers.push('Voz outbound exige transporte uazapi comprovado.')
  }

  const stages = [...(input.crm?.stages ?? [])].sort((a, b) => a.position - b.position)
  if (!stages.length) blockers.push('Descobrir stages ao vivo no CRM.')
  for (const stage of stages) {
    if (!stage.when?.trim()) blockers.push(`Definir quando da etapa "${stage.name || 'sem nome'}".`)
    if (stage.confirmed && (!stage.id || !stage.source || !sourceIds.has(stage.source))) {
      blockers.push(`Etapa "${stage.name}" está confirmada sem ID/fonte CRM válida.`)
    }
  }
  if (input.crm?.pipeline?.confirmed &&
      (!input.crm.pipeline.id || !sourceIds.has(input.crm.pipeline.source))) {
    blockers.push('Pipeline confirmado sem ID/fonte CRM válida.')
  }
  if (!input.crm?.pipeline?.confirmed) blockers.push('Confirmar pipeline pela API do CRM.')

  for (const source of input.sources ?? []) {
    if (!source.id || !source.type || !source.reference || !source.date) {
      errors.push('Toda fonte precisa de id, type, reference e date.')
    }
  }

  for (const credential of REQUIRED_CREDENTIALS[input.crm?.type] ?? []) {
    const state = input.credentials?.[credential]
    if (!['available', 'validated'].includes(state)) {
      blockers.push(`Obter credencial/acesso obrigatório: ${credential}.`)
    }
  }
  if (input.channel?.audioIn &&
      !['available', 'validated'].includes(input.credentials?.groq)) {
    blockers.push('Obter Groq para transcrição de áudio.')
  }
  if (!(input.evalCases ?? []).length) blockers.push('Criar os cenários mínimos de eval.')
  if ((input.business?.faq ?? []).length < 5) {
    warnings.push('FAQ tem menos de 5 perguntas; peça conversas reais antes do prompt final.')
  }

  return {
    errors: [...new Set(errors)],
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
  }
}

function diagnostic(input, result) {
  const ready = result.errors.length === 0 && result.blockers.length === 0
  return `# Diagnóstico — ${safe(input.client.name)}

**Agente:** ${safe(input.client.agentName)}  
**CRM:** ${safe(input.crm.type)} · ${input.crm.confirmed ? 'confirmado' : 'não confirmado'}  
**Responsável do cliente:** ${safe(input.client.owner)}  
**Gate de construção:** ${ready ? '✅ LIBERADO' : '🔴 BLOQUEADO'}  

## Negócio

- **Oferta:** ${safe(factValue(input.business.offer)) || 'NÃO INFORMADA'}
- **Público:** ${safe(factValue(input.business.audience)) || 'NÃO INFORMADO'}
- **Objetivo:** ${safe(factValue(input.business.objective)) || 'NÃO INFORMADO'}
- **Tom:** ${safe(factValue(input.business.tone)) || 'NÃO INFORMADO'}
- **Política de preço:** ${safe(input.business.pricePolicy)}
- **Alçada da IA:** ${safe(input.operations.aiLimit)}

## Canal

- WhatsApp: ${safe(input.channel.whatsapp)}
- Áudio de entrada: ${input.channel.audioIn ? 'sim' : 'não'}
- Voz de saída: ${input.channel.voiceOut ? 'sim' : 'não'}
- Imagem/PDF: ${input.channel.imagesAndPdf ? 'sim' : 'não'}
- Outro bot no mesmo número: ${input.channel.sameNumberHasAnotherBot ? 'SIM — BLOQUEADOR' : 'não'}

## Gate

${ready
    ? 'Todos os requisitos de entrada estão confirmados. Pode iniciar o build.'
    : result.blockers.map(item => `- [ ] ${item}`).join('\n')}

## Alertas

${result.warnings.length ? result.warnings.map(item => `- ${item}`).join('\n') : '- Nenhum.'}
`
}

function decisions(input) {
  const crmTradeoff = input.crm.type === 'kommo'
    ? 'O histórico mora no Redis e o envio é indireto; ganha-se controle e assume-se a memória.'
    : 'O CRM fornece o transcript e envia direto; ganha-se simplicidade e depende-se do canal do GHL.'
  return `# Decisões e trade-offs — ${safe(input.client.name)}

| Decisão | Escolha | Por quê / preço |
|---|---|---|
| CRM | ${safe(input.crm.type)} | ${crmTradeoff} |
| Canal | ${safe(input.channel.whatsapp)} | Voz outbound só existe com uazapi validada. |
| Alçada | ${safe(input.operations.aiLimit)} | Depois de Agendado o closer humano assume. |
| Gate | ${safe(input.operations.gateTag)} | Rampagem segura: contato próprio → amostra → todos. |
| Handoff | ${safe(input.operations.humanTag)} | Quando humano assume, IA e follow-up param na mesma volta. |
| Recuperação de conversa | ${safe(factValue(input.operations.recovery?.responseDefinition))} | Mede retorno humano válido após envio. |
| Objetivo recuperado | ${safe(factValue(input.operations.recovery?.goalDefinition))} | Só conta com sinal verificável no CRM. |
| Janela de atribuição | ${safe(input.operations.recovery?.attributionWindowHours)}h | Fora da janela não recebe crédito do follow-up. |
| Conversão assistida | ${input.operations.recovery?.assistedAttribution ? 'sim' : 'não'} | Handoff para humano é separado de conversão direta. |
| Preço | ${safe(input.business.pricePolicy)} | Número volátil não pode ser inventado nem ficar sem dono. |
`
}

function pending(input, result) {
  const rows = result.blockers.map((item, index) =>
    `| ${index + 1} | ${safe(item)} | ${/credencial|acesso|confirmar|definir|adicionar/i.test(item) ? 'Cliente + Metrik' : 'Metrik'} | aberto |`)
  return `# Pendências — ${safe(input.client.name)}

| # | Pendência | Responsável | Estado |
|---:|---|---|---|
${rows.length ? rows.join('\n') : '| — | Nenhuma pendência bloqueante | — | concluído |'}

> Fechar uma pendência exige evidência ou fonte; resposta verbal sem registro não
> transforma dado crítico em confirmado.
`
}

function credentials(input) {
  const rows = Object.entries(input.credentials ?? {})
    .map(([name, state]) => `| ${safe(name)} | ${statusIcon(state)} ${safe(state)} |`)
  return `# Acessos e credenciais — ${safe(input.client.name)}

> Este arquivo registra somente estado. Nunca cole valores, tokens ou secrets no
> onboarding.

| Acesso | Estado |
|---|---|
${rows.join('\n')}
`
}

function recoveryDefinition(input) {
  const recovery = input.operations.recovery ?? {}
  const signal = recovery.goalSignal ?? {}
  return `# Definição de recuperação — ${safe(input.client.name)}

## Duas conversões

- **Voltou a conversar:** ${safe(factValue(recovery.responseDefinition)) || 'NÃO DEFINIDO'}
- **Concretizou o objetivo:** ${safe(factValue(recovery.goalDefinition)) || 'NÃO DEFINIDO'}

## Prova no CRM

- Tipo: ${safe(signal.type) || 'NÃO DEFINIDO'}
- Nome: ${safe(signal.name) || 'NÃO DEFINIDO'}
- ID descoberto ao vivo: ${safe(signal.id) || 'NÃO DEFINIDO'}
- Valor esperado: ${safe(signal.value) || 'não se aplica'}
- Fonte: ${safe(signal.source) || 'NÃO DEFINIDA'}

## Atribuição

- Janela: ${safe(recovery.attributionWindowHours)} horas
- Após handoff humano: ${recovery.assistedAttribution ? 'medir como influência assistida' : 'não atribuir'}
- Modelo operacional: último follow-up antes do evento
- Modelo executivo: coorte do ciclo

> Resposta e objetivo são métricas diferentes. Sem sinal confirmado no CRM,
> objetivo aparece como “não configurado”, nunca como zero.
`
}

function promptDraft(input, result) {
  const prices = input.business.pricePolicy === 'inform'
    ? (input.business.prices ?? []).map(item =>
        `- ${safe(item.product)}: ${item.confirmed ? `${safe(item.currency)} ${safe(item.value)}` : '[PREÇO NÃO CONFIRMADO]'}`).join('\n')
    : '- Não informar preço; dizer que a equipe confirma.'
  const faq = (input.business.faq ?? []).map(item =>
    `- **${safe(item.question)}** ${item.confirmed ? safe(item.answer) : '[RESPOSTA NÃO CONFIRMADA]'}`).join('\n')
  return `# RASCUNHO — NÃO PUBLICAR SEM EVALS

Você é **${safe(input.client.agentName)}**, assistente comercial da
**${safe(input.client.name)}**.

## Objetivo

${safe(factValue(input.business.objective)) || '[OBJETIVO PENDENTE]'}

## Oferta e público

Oferta: ${safe(factValue(input.business.offer)) || '[OFERTA PENDENTE]'}  
Público ideal: ${safe(factValue(input.business.audience)) || '[PÚBLICO PENDENTE]'}  
Não atender como venda: ${safe(factValue(input.business.excludedAudience)) || '[FORA DO ESCOPO PENDENTE]'}

## Tom

${safe(factValue(input.business.tone)) || '[TOM PENDENTE]'}

## Regra de conversa

Responda a dúvida completa antes de perguntar. Faça uma pergunta por resposta.
Nunca invente preço, prazo, vaga, garantia ou diagnóstico.

## Preços

${prices || '- [PREÇO/POLÍTICA PENDENTE]'}

## Qualificação

Considere qualificado somente quando:
${safe(factValue(input.operations.qualificationWhen)) || '[DEFINIÇÃO PENDENTE]'}

## FAQ

${faq || '- [FAQ PENDENTE]'}

## Promessas proibidas

${(input.business.forbiddenPromises ?? []).map(item => `- ${safe(item)}`).join('\n') || '- [LIMITES PENDENTES]'}

## Handoff

Escale para humano em suporte, financeiro, reclamação ou quando o lead pedir.
Não faça pitch depois de escalar.

---
Gate atual: ${result.blockers.length ? 'BLOQUEADO — resolva 02-pendencias.md' : 'LIBERADO PARA EVAL, AINDA NÃO PARA PRODUÇÃO'}.
`
}

function crmMapDraft(input) {
  const stages = [...(input.crm.stages ?? [])].sort((a, b) => a.position - b.position)
  const stageLines = stages.map(stage => `    {
      id: ${JSON.stringify(stage.id ?? 'TODO_ID_AO_VIVO')},
      name: ${JSON.stringify(stage.name)},
      quando: ${JSON.stringify(stage.when || 'TODO_DEFINIR_QUANDO')},
      aiCanMove: ${Boolean(stage.aiCanMove)},
    },`).join('\n')
  const order = stages.map(stage => JSON.stringify(stage.id ?? `TODO_${stage.name}`)).join(', ')
  return `// RASCUNHO GERADO — IDs precisam vir do CRM ao vivo.
export const CRM_MAP_DRAFT = {
  crm: ${JSON.stringify(input.crm.type)},
  pipelineId: ${JSON.stringify(input.crm.pipeline?.id ?? 'TODO_PIPELINE_ID_AO_VIVO')},
  pipelineName: ${JSON.stringify(input.crm.pipeline?.name ?? 'TODO_PIPELINE_NAME')},
  stages: [
${stageLines}
  ],
  stageOrder: [${order}],
  gateTag: ${JSON.stringify(input.operations.gateTag || 'TODO_GATE_TAG')},
  humanTag: ${JSON.stringify(input.operations.humanTag || 'atendimento-humano')},
  aiLimit: ${JSON.stringify(input.operations.aiLimit || 'Agendado')},
  recovery: {
    responseLabel: ${JSON.stringify(factValue(input.operations.recovery?.responseDefinition) || 'Resposta humana válida após follow-up')},
    goalLabel: ${JSON.stringify(factValue(input.operations.recovery?.goalDefinition) || 'TODO_DEFINIR_OBJETIVO')},
    goalSignal: ${JSON.stringify(input.operations.recovery?.goalSignal ?? null, null, 4)},
    attributionWindowHours: ${JSON.stringify(input.operations.recovery?.attributionWindowHours ?? 168)},
    assistedAttribution: ${Boolean(input.operations.recovery?.assistedAttribution)},
  },
} as const
`
}

async function compile(inputPath, outputPath) {
  const input = JSON.parse(await readFile(resolve(inputPath), 'utf8'))
  const result = validate(input)
  if (result.errors.length) {
    throw new Error(`Entrada recusada:\n- ${result.errors.join('\n- ')}`)
  }

  const output = resolve(outputPath)
  await mkdir(output, { recursive: true })
  const readyForBuild = result.blockers.length === 0
  const files = {
    '00-diagnostico.md': diagnostic(input, result),
    '01-decisoes.md': decisions(input),
    '02-pendencias.md': pending(input, result),
    '03-credenciais.md': credentials(input),
    '04-recuperacao.md': recoveryDefinition(input),
    'prompt.draft.md': promptDraft(input, result),
    'crm-map.draft.ts': crmMapDraft(input),
    'evals.draft.json': `${JSON.stringify(input.evalCases ?? [], null, 2)}\n`,
    'handoff.json': `${JSON.stringify({
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      client: input.client,
      crm: input.crm.type,
      readyForBuild,
      blockers: result.blockers,
      warnings: result.warnings,
      artifacts: [
        '00-diagnostico.md', '01-decisoes.md', '02-pendencias.md',
        '03-credenciais.md', '04-recuperacao.md', 'prompt.draft.md', 'crm-map.draft.ts',
        'evals.draft.json',
      ],
    }, null, 2)}\n`,
  }

  await Promise.all(Object.entries(files).map(([name, content]) =>
    writeFile(resolve(output, name), content, 'utf8')))

  return { output, readyForBuild, ...result, files: Object.keys(files) }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const [, , inputPath, outputPath] = process.argv
  if (!inputPath || !outputPath) {
    console.error('Uso: node compile.mjs <entrada.json> <pasta-saida>')
    process.exit(2)
  }
  try {
    const result = await compile(inputPath, outputPath)
    console.log(`✅ ${result.files.length} artefatos gerados em ${result.output}`)
    console.log(result.readyForBuild
      ? '✅ Gate: LIBERADO PARA BUILD'
      : `🔴 Gate: BLOQUEADO (${result.blockers.length} pendência(s))`)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

export { compile, validate }
