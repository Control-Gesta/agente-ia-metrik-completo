import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const failures = []
const passes = []

async function text(path) {
  return readFile(join(root, path), 'utf8')
}

async function exists(path) {
  try {
    await stat(join(root, path))
    return true
  } catch {
    return false
  }
}

function pass(label) {
  passes.push(label)
}

function fail(label, detail) {
  failures.push(`${label}: ${detail}`)
}

async function requireFile(path) {
  if (await exists(path)) pass(`arquivo ${path}`)
  else fail(`arquivo ${path}`, 'ausente')
}

async function requireMarkers(path, markers) {
  const body = await text(path)
  for (const marker of markers) {
    if (body.includes(marker)) pass(`${path} contém ${JSON.stringify(marker)}`)
    else fail(path, `não contém ${JSON.stringify(marker)}`)
  }
}

async function walk(path) {
  const absolute = join(root, path)
  const entries = await readdir(absolute, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) files.push(...await walk(child))
    else files.push(child)
  }
  return files
}

const requiredFiles = [
  'SKILL.md',
  'NOVO-CLIENTE.md',
  'ONBOARDING.md',
  'CENTRAL.md',
  'RECUPERACAO.md',
  'comum/DIAGNOSTICO.md',
  'comum/OPERACAO-VISUAL.md',
  'assets/central-v4/INSTALAR.md',
  'assets/central-v4/central/components/FocusNav.tsx',
  'assets/central-v4/central/components/ExecutiveDashboard.tsx',
  'assets/central-v4/central/components/MoneyRadar.tsx',
  'assets/central-v4/central/components/FlightRecorder.tsx',
  'assets/central-v4/central/components/KnowledgeMap.tsx',
  'assets/central-v4/central/components/ShadowLab.tsx',
  'assets/central-v4/central/components/ScenarioLab.tsx',
  'assets/central-v4/central/components/ValueReceipt.tsx',
  'assets/central-v4/central/components/RecoveryPanel.tsx',
  'assets/central-v4/central/app/cerebro/page.tsx',
  'assets/central-v4/central/app/resultados/page.tsx',
  'assets/onboarding/schema.json',
  'assets/onboarding/compile.mjs',
  'assets/onboarding/test.mjs',
  'assets/onboarding/examples/cliente-ghl.json',
]

for (const file of requiredFiles) await requireFile(file)

await requireMarkers('SKILL.md', [
  'GoHighLevel ou no Kommo?',
  'NOVO-CLIENTE.md',
  'mentor E executor',
  'Evals antes de deploy de prompt',
  'Central **v4.1 canônica**',
  'UI-ONLY NÃO É HUMAN-ONLY',
])

await requireMarkers('comum/OPERACAO-VISUAL.md', [
  'Manual para a API não significa manual para o mestre',
  'Navegador autenticado',
  'Nunca confiar em “salvo”',
  'E2E real',
])

await requireMarkers('NOVO-CLIENTE.md', [
  'Professor + Executor',
  'GoHighLevel, Kommo ou ainda não escolheu CRM?',
  'A skill tem obrigação de barrar',
  'Máquina de estados do projeto',
  'central-v2 → central-v3 → Escola → central-v4.1',
  '10/10 ou não publica',
  'Nunca use “no ar” como sinônimo de “deploy respondeu 200”',
])

await requireMarkers('ONBOARDING.md', [
  'ONBOARDING COMPILER',
  'readyForBuild: true',
  'segredo nunca entra',
  'crm-map.draft.ts',
])

await requireMarkers('CENTRAL.md', [
  'central-v2 → central-v3 → Escola → central-v4.1',
  'central-v4.1 é SEMPRE a última',
  'uma análise/ferramenta por vez',
])

await requireMarkers('RECUPERACAO.md', [
  'Recuperação de conversa',
  'Recuperação de resultado',
  'Influência assistida',
  'Eficácia por toque',
  'objetivo comercial não configurado',
])

await requireMarkers('assets/central-v4/central/components/RecoveryPanel.tsx', [
  "type View = 'agora' | 'eficacia' | 'resultados' | 'definicao'",
  'Voltaram a conversar',
  'Concretizaram',
  'ainda sem base',
])

await requireMarkers('assets/central-v4/INSTALAR.md', [
  'A v4.1 é sempre aplicada por último',
  'inicio → ler | ensinar | mapa | laboratorio | editar',
  'não está pronta',
])

await requireMarkers('assets/escola/INSTALAR.md', [
  'LEGADO/BASELINE',
  'Não reconverta essa',
  'página para três modos',
])

await requireMarkers('assets/central-v4/central/app/cerebro/page.tsx', [
  "type Modo = 'inicio' | 'ler' | 'ensinar' | 'mapa' | 'laboratorio' | 'editar'",
  'Todas as opções',
])

await requireMarkers('assets/central-v4/central/app/resultados/page.tsx', [
  "type View = 'resumo' | 'radar' | 'simular' | 'recibo'",
  '<FocusNav',
])

await requireMarkers('assets/central-v4/central/components/MoneyRadar.tsx', [
  'signals.slice(0, 2)',
])

const codeFiles = (await walk('assets/central-v4/central'))
  .filter(path => /\.(ts|tsx|css)$/.test(path))
const forbidden = [
  [/\bmetriksales\b/i, 'metriksales'],
  [/\bmetrik\b/i, 'Metrik'],
  [/\bbia\b/i, 'Bia'],
]

for (const path of codeFiles) {
  const body = await text(path)
  for (const [pattern, label] of forbidden) {
    if (pattern.test(body)) fail(relative(root, join(root, path)), `identidade proibida: ${label}`)
  }
}
if (!failures.some(item => item.includes('identidade proibida'))) {
  pass('assets v4.1 sem identidade Metrik/metriksales/Bia')
}

console.log(`\nAUDITORIA agente-ia-metrik-completo`)
console.log(`✅ ${passes.length} verificações passaram`)

if (failures.length) {
  console.error(`❌ ${failures.length} falharam:\n`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('✅ Skill íntegra: protocolo Professor + Executor e Central v4.1 canônica.')
