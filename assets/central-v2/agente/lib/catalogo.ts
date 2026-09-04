import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { CONFIG } from './config'
import { catalogoParaContexto, type ItemCatalogo } from './catalogo-core'

/**
 * CATÁLOGO — o armazenamento (CENTRAL.md §4).
 *
 * A tabela viva do que a IA oferece e cota. Fonte única de verdade de preço:
 * a régua §2 manda todo preço pra cá, e a IA lê daqui (contexto dinâmico),
 * nunca do prompt estático — senão editar um preço invalidaria o cache de todos.
 *
 * Núcleo puro (parse, formatação) em `catalogo-core.ts`; re-exportado aqui.
 */

export * from './catalogo-core'

const redis = CONFIG.upstashUrl && CONFIG.upstashToken
  ? new Redis({ url: CONFIG.upstashUrl, token: CONFIG.upstashToken })
  : null

const KEY = 'agente:catalogo'

export const catalogoLigado = () => redis !== null

export async function listarCatalogo(): Promise<ItemCatalogo[]> {
  if (!redis) return []
  const raw = await redis.get<string | ItemCatalogo[]>(KEY)
  if (!raw) return []
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as ItemCatalogo[]
}

async function salvar(itens: ItemCatalogo[]): Promise<void> {
  if (!redis) return
  await redis.set(KEY, JSON.stringify(itens))
}

export function novoId(): string {
  return `cat_${randomUUID().slice(0, 8)}`
}

export async function adicionarItem(item: Omit<ItemCatalogo, 'id'>): Promise<ItemCatalogo> {
  const novo: ItemCatalogo = { ...item, id: novoId() }
  const itens = await listarCatalogo()
  itens.push(novo)
  await salvar(itens)
  return novo
}

export async function editarItem(id: string, patch: Partial<ItemCatalogo>): Promise<ItemCatalogo | null> {
  const itens = await listarCatalogo()
  const i = itens.findIndex(x => x.id === id)
  if (i < 0) return null
  itens[i] = { ...itens[i], ...patch, id }   // id nunca muda
  await salvar(itens)
  return itens[i]
}

export async function removerItem(id: string): Promise<boolean> {
  const itens = await listarCatalogo()
  const rest = itens.filter(x => x.id !== id)
  if (rest.length === itens.length) return false
  await salvar(rest)
  return true
}

/** Substitui o catálogo inteiro (usado no import de planilha, depois do de-para). */
export async function substituirCatalogo(itens: ItemCatalogo[]): Promise<number> {
  await salvar(itens)
  return itens.length
}

/**
 * O catálogo formatado pra injetar no contexto DINÂMICO da IA.
 * É isto que o `lib/claude.ts` chama pra a IA saber o que pode oferecer.
 * Vazio se não há catálogo — aí a IA se comporta como antes (sem catálogo).
 */
export async function catalogoDaIA(): Promise<string> {
  return catalogoParaContexto(await listarCatalogo())
}
