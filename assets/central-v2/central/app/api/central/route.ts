import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AGENT = process.env.AGENT_URL
const SECRET = process.env.AGENT_SECRET

/**
 * Proxy do hub de dados da Central (catálogo, conhecimento, mídias, diário).
 * O secret nunca chega ao browser. Repassa o ?recurso= e o corpo.
 *
 * O agente pode não ter o hub deployado ainda → traduz HTML de 404 pra 503
 * em português (a mesma cicatriz do proxy da Escola).
 */
async function lerJson(r: Response) {
  const corpo = await r.text()
  try {
    return { dados: JSON.parse(corpo), status: r.status }
  } catch {
    return {
      dados: { error: 'central_indisponivel', mensagem: 'Faça o deploy do agente (api/central.ts) antes de usar esta aba.' },
      status: 503,
    }
  }
}

function qs(req: Request): string {
  const u = new URL(req.url)
  const p = new URLSearchParams()
  for (const k of ['recurso', 'busca', 'limit']) {
    const v = u.searchParams.get(k)
    if (v) p.set(k, v)
  }
  p.set('secret', SECRET || '')
  return p.toString()
}

export async function GET(req: Request) {
  try {
    const r = await fetch(`${AGENT}/api/central?${qs(req)}`, { cache: 'no-store' })
    const { dados, status } = await lerJson(r)
    return NextResponse.json(dados, { status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'erro' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const r = await fetch(`${AGENT}/api/central?${qs(req)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store',
    })
    const { dados, status } = await lerJson(r)
    return NextResponse.json(dados, { status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'erro' }, { status: 500 })
  }
}
