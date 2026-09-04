import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'
import { CONFIG } from './config'
import {
  BLOCOS, BLOCO_LABEL, CHIPS, anonimizar, blocoDosChips,
  type BlocoId, type ChipId, type Correcao, type DestinoTriagem, type Ticket,
} from './escola-core'

/**
 * ESCOLA — Fase 0 ("A CAIXA"): o armazenamento.
 *
 * O cliente corrige a IA e a correção vira DADO ESTRUTURADO. Nada é escrito no
 * cérebro automaticamente nesta fase — por isso ela não pode quebrar ninguém.
 * Quem lê a fila e escreve o delta é gente, pelo caminho de publicação que já
 * existe (api/prompt.ts + o portão dos evals).
 *
 * Tipos e funções puras moram em `escola-core.ts`; re-exportados aqui para que
 * quem já importava de `escola` continue funcionando.
 */

export * from './escola-core'

const redis = CONFIG.upstashUrl && CONFIG.upstashToken
  ? new Redis({ url: CONFIG.upstashUrl, token: CONFIG.upstashToken })
  : null

export const escolaLigada = () => redis !== null

// ─────────────────────────── CHAVES ───────────────────────────
const kCorr = (id: string) => `agente:corr:${id}`
const kBloco = (b: string) => `agente:corr:bloco:${b}`
const kTicket = (id: string) => `agente:escola:ticket:${id}`
const K_TICKETS = 'agente:escola:tickets'
const K_TICKET_SEQ = 'agente:escola:ticket:seq'
const MAX_FILA = 200

// ─────────────────────────── CORREÇÕES ───────────────────────────

export interface NovaCorrecao {
  turnoLead: string
  respostaErrada: string
  intencao: string
  porque?: string
  chips?: ChipId[]
  origem?: Correcao['origem']
  contactId?: string
  autor?: string
  perfil: 'dono' | 'agencia'
  destino: DestinoTriagem
  motivoTriagem?: string
}

export async function gravarCorrecao(n: NovaCorrecao): Promise<Correcao> {
  const chips = (n.chips || []).filter(c => CHIPS.some(x => x.id === c))
  const corr: Correcao = {
    id: `corr_${randomUUID().slice(0, 8)}`,
    v: 1,
    ts: new Date().toISOString(),
    autor: n.autor || 'Central',
    perfil: n.perfil,
    turnoLead: anonimizar(n.turnoLead).slice(0, 2000),
    respostaErrada: anonimizar(n.respostaErrada).slice(0, 4000),
    intencao: anonimizar(n.intencao).slice(0, 2000),
    porque: n.porque ? anonimizar(n.porque).slice(0, 2000) : undefined,
    chips,
    origem: n.origem || 'playground',
    contactId: n.contactId,
    bloco: blocoDosChips(chips),
    destino: n.destino,
    motivoTriagem: n.motivoTriagem,
    status: 'nova',
  }
  if (!redis) return corr   // sem Redis a captura não persiste, mas não quebra a tela
  await redis.set(kCorr(corr.id), JSON.stringify(corr))
  const fila = corr.destino === 'TOOL_CRM' ? 'ticket' : corr.bloco
  await redis.lpush(kBloco(fila), corr.id)
  await redis.ltrim(kBloco(fila), 0, MAX_FILA - 1)
  return corr
}

export async function getCorrecao(id: string): Promise<Correcao | null> {
  if (!redis) return null
  const raw = await redis.get<string | Correcao>(kCorr(id))
  if (!raw) return null
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Correcao
}

/** A fila por bloco, mais novas primeiro. */
export async function listarPorBloco(bloco: string, limit = 50): Promise<Correcao[]> {
  if (!redis) return []
  const ids = await redis.lrange<string>(kBloco(bloco), 0, limit - 1)
  if (!ids.length) return []
  const brutos = await Promise.all(ids.map(id => getCorrecao(id)))
  return brutos.filter((c): c is Correcao => c !== null)
}

export async function listarFila(): Promise<Record<string, Correcao[]>> {
  const filas = [...BLOCOS, 'triagem', 'ticket']
  const out: Record<string, Correcao[]> = {}
  for (const f of filas) {
    const itens = await listarPorBloco(f)
    if (itens.length) out[f] = itens
  }
  return out
}

export async function marcarCorrecao(id: string, status: Correcao['status']): Promise<boolean> {
  const c = await getCorrecao(id)
  if (!c || !redis) return false
  await redis.set(kCorr(c.id), JSON.stringify({ ...c, status }))
  return true
}

/**
 * "NÃO É BEM ISSO" — a válvula da Tela F, e ela NÃO é opcional.
 *
 * 🩸 A triagem erra para o lado do ticket de propósito (melhor um chamado a mais
 * que um número fixo no cérebro), e no 1º dia em produção mediu-se: correções
 * legítimas de TOM podem cair no ticket porque o cliente usou "valor", "prazo"
 * ou datou a correção. Sem esta saída, ele recebe "isso é dado que muda com o
 * tempo" para um pedido que não era, não tem o que fazer, e aprende que a aba
 * não entende o que ele escreve.
 *
 * Move da fila de ticket para a fila do bloco, encerra o chamado como
 * improcedente e guarda o motivo — porque o padrão dos falsos positivos é o que
 * conserta o regex na próxima rodada.
 */
export async function reclassificar(id: string, motivo: string): Promise<Correcao | null> {
  const c = await getCorrecao(id)
  if (!c || !redis) return null
  if (c.destino !== 'TOOL_CRM') return c   // idempotente: já está no caderno

  const bloco = c.bloco === 'triagem' ? blocoDosChips(c.chips) : c.bloco
  const novo: Correcao = {
    ...c,
    destino: 'CADERNO',
    bloco,
    motivoTriagem: `reclassificado_pelo_cliente:${anonimizar(motivo).slice(0, 200)}`,
    ticketId: undefined,
  }
  await redis.set(kCorr(id), JSON.stringify(novo))
  await redis.lrem(kBloco('ticket'), 0, id)
  await redis.lpush(kBloco(bloco), id)
  await redis.ltrim(kBloco(bloco), 0, MAX_FILA - 1)

  if (c.ticketId) {
    const raw = await redis.get<string | Ticket>(kTicket(c.ticketId))
    if (raw) {
      const t = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Ticket
      await redis.set(kTicket(c.ticketId), JSON.stringify({
        ...t, status: 'resolvido', resolvidoEm: new Date().toISOString(),
        resolucao: 'improcedente — o cliente disse que não era dado, e sim conhecimento',
      }))
    }
  }
  return novo
}

// ─────────────────────────── TICKETS ───────────────────────────

export async function abrirTicket(corr: Correcao, pedido: string): Promise<Ticket> {
  const numero = redis ? Number(await redis.incr(K_TICKET_SEQ)) : 0
  const t: Ticket = {
    id: `tkt_${randomUUID().slice(0, 8)}`,
    v: 1,
    ts: new Date().toISOString(),
    numero,
    tipo: 'TOOL_CRM',
    correcaoId: corr.id,
    pedido: anonimizar(pedido).slice(0, 2000),
    status: 'aberto',
  }
  if (!redis) return t
  await redis.set(kTicket(t.id), JSON.stringify(t))
  await redis.lpush(K_TICKETS, t.id)
  await redis.ltrim(K_TICKETS, 0, MAX_FILA - 1)
  await redis.set(kCorr(corr.id), JSON.stringify({ ...corr, ticketId: t.id }))
  return t
}

export async function listarTickets(limit = 50): Promise<Ticket[]> {
  if (!redis) return []
  const ids = await redis.lrange<string>(K_TICKETS, 0, limit - 1)
  const brutos = await Promise.all(ids.map(async id => {
    const raw = await redis!.get<string | Ticket>(kTicket(id))
    return raw ? ((typeof raw === 'string' ? JSON.parse(raw) : raw) as Ticket) : null
  }))
  return brutos.filter((t): t is Ticket => t !== null)
}

export async function resolverTicket(id: string, resolucao: string): Promise<Ticket | null> {
  if (!redis) return null
  const raw = await redis.get<string | Ticket>(kTicket(id))
  if (!raw) return null
  const t = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Ticket
  const novo: Ticket = { ...t, status: 'resolvido', resolvidoEm: new Date().toISOString(), resolucao: resolucao.slice(0, 500) }
  await redis.set(kTicket(id), JSON.stringify(novo))
  return novo
}

// ─────────────────────────── SAÚDE DA FILA ───────────────────────────

export interface SaudeEscola {
  total: number
  novas: number
  ticketsAbertos: number
  paradaHaDias: number      // a correção nova mais VELHA — o sinal de churn da aba
  porBloco: { bloco: string; label: string; qtd: number }[]
}

export async function saudeEscola(): Promise<SaudeEscola> {
  const fila = await listarFila()
  const todas = Object.values(fila).flat()
  const novas = todas.filter(c => c.status === 'nova')
  const maisVelha = novas.reduce<string | null>((a, c) => (!a || c.ts < a ? c.ts : a), null)
  const tickets = await listarTickets()
  return {
    total: todas.length,
    novas: novas.length,
    ticketsAbertos: tickets.filter(t => t.status === 'aberto').length,
    paradaHaDias: maisVelha ? Math.floor((Date.now() - new Date(maisVelha).getTime()) / 86400000) : 0,
    porBloco: Object.entries(fila)
      .map(([bloco, itens]) => ({
        bloco,
        label: BLOCO_LABEL[bloco as BlocoId] || (bloco === 'ticket' ? 'Tickets (dado, não cérebro)' : 'Precisa de triagem'),
        qtd: itens.length,
      }))
      .sort((a, b) => b.qtd - a.qtd),
  }
}
