import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { CONFIG } from './config'

/**
 * BIBLIOTECA DE MÍDIAS — o que a IA ENVIA no atendimento (CENTRAL.md §7).
 *
 * Adotado da Continuare: foto, PDF, vídeo organizados por categoria. Distinto do
 * `lib/media.ts`, que LÊ mídia que o lead manda; aqui é a mídia que a IA MOSTRA
 * (cardápio em PDF, foto do espaço, tabela de preço em imagem).
 *
 * 🩸 O tipo é validado por CONTENT-TYPE, nunca pela extensão (ghl/PEGADINHAS §GHL-14:
 * link de mídia costuma vir sem extensão, e um HEAD leva 405). Guardamos o tipo
 * que a Central resolveu no upload; aqui só armazenamos o registro.
 */

export type TipoMidia = 'imagem' | 'pdf' | 'video'

export interface Midia {
  id: string
  titulo: string
  url: string
  tipo: TipoMidia
  categoria: string      // "Cardápio", "Espaço", "Tabela de preços"
  quando: string         // instrução: quando a IA deve enviar ("quando pedirem o cardápio")
  ativo: boolean
}

const redis = CONFIG.upstashUrl && CONFIG.upstashToken
  ? new Redis({ url: CONFIG.upstashUrl, token: CONFIG.upstashToken })
  : null

const KEY = 'agente:midias'

export const midiasLigadas = () => redis !== null

export async function listarMidias(): Promise<Midia[]> {
  if (!redis) return []
  const raw = await redis.get<string | Midia[]>(KEY)
  if (!raw) return []
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Midia[]
}

async function salvar(m: Midia[]): Promise<void> {
  if (!redis) return
  await redis.set(KEY, JSON.stringify(m))
}

export async function adicionarMidia(m: Omit<Midia, 'id'>): Promise<Midia> {
  const nova: Midia = { ...m, id: `mid_${randomUUID().slice(0, 8)}` }
  const todas = await listarMidias()
  todas.push(nova)
  await salvar(todas)
  return nova
}

export async function editarMidia(id: string, patch: Partial<Midia>): Promise<Midia | null> {
  const todas = await listarMidias()
  const i = todas.findIndex(x => x.id === id)
  if (i < 0) return null
  todas[i] = { ...todas[i], ...patch, id }
  await salvar(todas)
  return todas[i]
}

export async function removerMidia(id: string): Promise<boolean> {
  const todas = await listarMidias()
  const rest = todas.filter(x => x.id !== id)
  if (rest.length === todas.length) return false
  await salvar(rest)
  return true
}

/**
 * O catálogo de mídias que a IA sabe que pode enviar — vai no contexto dinâmico.
 * A IA não recebe os arquivos; recebe a LISTA e a instrução de quando enviar
 * cada um (o envio real é uma tool, como sendWhatsAppMedia).
 */
export async function midiasDaIA(): Promise<string> {
  const ativas = (await listarMidias()).filter(m => m.ativo)
  if (!ativas.length) return ''
  const linhas = ['MÍDIAS DISPONÍVEIS (envie quando fizer sentido; nunca invente link):']
  for (const m of ativas) linhas.push(`• [${m.categoria}] ${m.titulo} — ${m.quando}`)
  return linhas.join('\n')
}
