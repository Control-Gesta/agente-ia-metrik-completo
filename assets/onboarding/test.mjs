#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile, validate } from './compile.mjs'

let passed = 0
const failures = []

function expect(condition, name) {
  if (condition) passed++
  else failures.push(name)
}

const fixturePath = resolve(fileURLToPath(new URL('./examples/cliente-ghl.json', import.meta.url)))
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'))
const temp = await mkdtemp(join(tmpdir(), 'metrik-onboarding-'))

try {
  const valid = validate(fixture)
  expect(valid.errors.length === 0, 'fixture válida não tem erros')
  expect(valid.blockers.length === 0, 'fixture válida libera build')

  const compiled = await compile(fixturePath, join(temp, 'valid'))
  expect(compiled.readyForBuild === true, 'handoff fica readyForBuild')
  expect(compiled.files.length === 9, 'gera nove artefatos')

  const handoff = JSON.parse(await readFile(join(temp, 'valid', 'handoff.json'), 'utf8'))
  expect(handoff.readyForBuild === true, 'handoff persistido libera build')

  const missingPrice = structuredClone(fixture)
  missingPrice.business.prices = []
  const priceResult = validate(missingPrice)
  expect(priceResult.blockers.some(item => item.includes('preço confirmado')), 'preço ausente bloqueia')

  const overreach = structuredClone(fixture)
  overreach.operations.aiLimit = 'Proposta enviada'
  const overreachResult = validate(overreach)
  expect(overreachResult.blockers.some(item => item.includes('Agendado')), 'alçada além de Agendado bloqueia')

  const coexistence = structuredClone(fixture)
  coexistence.channel.sameNumberHasAnotherBot = true
  const coexistenceResult = validate(coexistence)
  expect(coexistenceResult.blockers.some(item => item.includes('coexistência')), 'dois bots bloqueiam')

  const secret = structuredClone(fixture)
  secret.credentials.anthropic = 'sk-ant-segredo-que-nao-pode-entrar'
  const secretResult = validate(secret)
  expect(secretResult.errors.some(item => item.includes('sensível')), 'segredo é recusado')

  const unconfirmedStage = structuredClone(fixture)
  unconfirmedStage.crm.stages[1].source = 'fonte-inexistente'
  const stageResult = validate(unconfirmedStage)
  expect(stageResult.blockers.some(item => item.includes('fonte CRM válida')), 'stage sem fonte válida bloqueia')

  const noRecoveryGoal = structuredClone(fixture)
  noRecoveryGoal.operations.recovery.goalSignal.confirmed = false
  const recoveryResult = validate(noRecoveryGoal)
  expect(recoveryResult.blockers.some(item => item.includes('sinal verificável')), 'objetivo sem sinal CRM bloqueia')

  const recoveryDoc = await readFile(join(temp, 'valid', '04-recuperacao.md'), 'utf8')
  expect(recoveryDoc.includes('Voltou a conversar'), 'artefato separa recuperação de conversa')
  expect(recoveryDoc.includes('Concretizou o objetivo'), 'artefato separa objetivo concretizado')

  const blockedPath = join(temp, 'blocked.json')
  await writeFile(blockedPath, `${JSON.stringify(missingPrice, null, 2)}\n`, 'utf8')
  const blocked = await compile(blockedPath, join(temp, 'blocked'))
  expect(blocked.readyForBuild === false, 'pacote bloqueado ainda é gerado')
  const pending = await readFile(join(temp, 'blocked', '02-pendencias.md'), 'utf8')
  expect(pending.includes('preço confirmado'), 'pendência explica o bloqueio')
} finally {
  await rm(temp, { recursive: true, force: true })
}

console.log(`✅ ${passed} testes passaram`)
if (failures.length) {
  console.error(`❌ ${failures.length} falharam`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('✅ Onboarding Compiler íntegro.')
