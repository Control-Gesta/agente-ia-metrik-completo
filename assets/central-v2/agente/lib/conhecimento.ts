import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { CONFIG } from './config'
import { buscarFaqs, contextoDaBusca, decidirDestino, type FaqConhecimento } from './conhecimento-core'

/**
 * BASE DE CONHECIMENTO — o armazenamento (CENTRAL.md §5). ✨ o destino que faltava.
 *
 * Núcleo puro (a régua cérebro×RAG, a busca, a estimativa) em `conhecimento-core.ts`.
 * Aqui: guardar/listar/editar as FAQs no Redis + os wrappers que a IA chama.
 */

export * from './conhecimento-core'

const redis = CONFIG.upstashUrl && CONFIG.upstashToken
  ? new Redis({ url: CONFIG.upstashUrl, token: CONFIG.upstashToken })
  : null

const KEY = 'agente:conhecimento'

export const conhecimentoLigado = () => redis !== null

export async function listarFaqs(): Promise<FaqConhecimento[]> {
  if (!redis) return []
  const raw = await redis.get<string | FaqConhecimento[]>(KEY)
  if (!raw) return []
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as FaqConhecimento[]
}

async function salvar(faqs: FaqConhecimento[]): Promise<void> {
  if (!redis) return
  await redis.set(KEY, JSON.stringify(faqs))
}

export async function adicionarFaq(f: Omit<FaqConhecimento, 'id'>): Promise<FaqConhecimento> {
  const nova: FaqConhecimento = { ...f, id: `faq_${randomUUID().slice(0, 8)}` }
  const faqs = await listarFaqs()
  faqs.push(nova)
  await salvar(faqs)
  return nova
}

export async function editarFaq(id: string, patch: Partial<FaqConhecimento>): Promise<FaqConhecimento | null> {
  const faqs = await listarFaqs()
  const i = faqs.findIndex(x => x.id === id)
  if (i < 0) return null
  faqs[i] = { ...faqs[i], ...patch, id }
  await salvar(faqs)
  return faqs[i]
}

export async function removerFaq(id: string): Promise<boolean> {
  const faqs = await listarFaqs()
  const rest = faqs.filter(x => x.id !== id)
  if (rest.length === faqs.length) return false
  await salvar(rest)
  return true
}

/** A saúde da base: quantas FAQs, quanto ocupam, e se já deviam virar RAG puro. */
export async function saudeConhecimento(tokensBaseCerebro = 0) {
  const faqs = await listarFaqs()
  return { faqs, decisao: decidirDestino(faqs, tokensBaseCerebro) }
}

/**
 * O que a IA consulta quando o lead pergunta algo. Busca por palavra-chave (Fase 0).
 * Vazio → a IA não achou e diz que vai confirmar, nunca inventa.
 */
export async function consultarConhecimento(pergunta: string): Promise<string> {
  return contextoDaBusca(await listarFaqs(), pergunta)
}

export async function buscarNaBase(pergunta: string, limite = 3): Promise<FaqConhecimento[]> {
  return buscarFaqs(await listarFaqs(), pergunta, limite)
}
