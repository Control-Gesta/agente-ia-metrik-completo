import type Anthropic from '@anthropic-ai/sdk'
import { CONFIG } from './config'

/** Ledger financeiro histórico por execução. */
export interface TokenUsage {
  input: number
  cacheWrite: number
  cacheRead: number
  output: number
  chamadas: number
}

export interface ExecutionCost {
  moeda: 'BRL'
  usdBrl: number
  modelo: string
  tabela: string
  tokens: TokenUsage
  vozCaracteres: number
  sttSegundos: number
  claudeUsd: number
  vozUsd: number
  sttUsd: number
  infraBrl: number
  totalUsd: number
  totalBrl: number
}

export function emptyUsage(): TokenUsage {
  return { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, chamadas: 0 }
}

export function mergeUsage(a: TokenUsage, b?: TokenUsage): TokenUsage {
  if (!b) return a
  return {
    input: a.input + b.input,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    cacheRead: a.cacheRead + b.cacheRead,
    output: a.output + b.output,
    chamadas: a.chamadas + b.chamadas,
  }
}

export function usageFromMessage(message: Anthropic.Message): TokenUsage {
  const u = message.usage as Anthropic.Message['usage'] & {
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  return {
    input: Number(u.input_tokens || 0),
    cacheWrite: Number(u.cache_creation_input_tokens || 0),
    cacheRead: Number(u.cache_read_input_tokens || 0),
    output: Number(u.output_tokens || 0),
    chamadas: 1,
  }
}

function round(n: number, casas = 6): number {
  return Number(n.toFixed(casas))
}

function claudeRates(now = new Date()) {
  const sonnet5 = CONFIG.claudeModel.includes('sonnet-5')
  const intro = sonnet5 && now.getTime() < Date.parse('2026-09-01T00:00:00Z')
  const input = sonnet5 ? (intro ? 2 : 3) : CONFIG.claudeInputUsdMtok
  const output = sonnet5 ? (intro ? 10 : 15) : CONFIG.claudeOutputUsdMtok
  return {
    input,
    output,
    cacheWrite: input * 1.25,
    cacheRead: input * 0.10,
    tabela: sonnet5 ? `sonnet-5-${intro ? 'intro' : 'standard'}` : 'env-config',
  }
}

export function calculateExecutionCost(args: {
  usage?: TokenUsage
  voiceChars?: number
  sttSeconds?: number
  now?: Date
}): ExecutionCost {
  const tokens = args.usage || emptyUsage()
  const rates = claudeRates(args.now)
  const claudeUsd = (
    tokens.input * rates.input +
    tokens.cacheWrite * rates.cacheWrite +
    tokens.cacheRead * rates.cacheRead +
    tokens.output * rates.output
  ) / 1_000_000
  const vozCaracteres = Math.max(0, args.voiceChars || 0)
  const sttSegundos = Math.max(0, args.sttSeconds || 0)
  const vozUsd = (vozCaracteres / 1000) * CONFIG.elevenUsdKchars
  const sttUsd = (sttSegundos / 3600) * CONFIG.groqWhisperUsdHour
  const totalUsd = claudeUsd + vozUsd + sttUsd
  const totalBrl = totalUsd * CONFIG.usdBrl + CONFIG.infraPerExecutionBrl

  return {
    moeda: 'BRL',
    usdBrl: CONFIG.usdBrl,
    modelo: CONFIG.claudeModel,
    tabela: rates.tabela,
    tokens,
    vozCaracteres,
    sttSegundos: round(sttSegundos, 2),
    claudeUsd: round(claudeUsd),
    vozUsd: round(vozUsd),
    sttUsd: round(sttUsd),
    infraBrl: round(CONFIG.infraPerExecutionBrl),
    totalUsd: round(totalUsd),
    totalBrl: round(totalBrl, 4),
  }
}
