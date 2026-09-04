import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AGENT = process.env.AGENT_URL
const SECRET = process.env.AGENT_SECRET

/**
 * Proxy da Escola — espelha o /api/prompt: o secret nunca chega ao browser.
 *
 * O PERFIL vem do secret, decidido no agente (lib/perfil.ts). A Central não
 * escolhe quem é quem: ela só carrega o secret que foi configurado no deploy
 * dela. Central do cliente recebe CENTRAL_SECRET (perfil 'dono'); a sua recebe
 * o WEBHOOK_SECRET de sempre (perfil 'agencia').
 */
/**
 * O agente pode não ter a Escola deployada ainda (a Central às vezes sobe
 * primeiro). Nesse caso a Vercel devolve o HTML do 404 e um `.json()` cru
 * estoura com "Unexpected token" — erro que não diz nada a ninguém. Traduzimos
 * pra um JSON honesto, e a aba mostra estado vazio em vez de quebrar.
 */
async function lerJson(r: Response) {
  const corpo = await r.text()
  try {
    return { dados: JSON.parse(corpo), status: r.status }
  } catch {
    return {
      dados: {
        error: 'escola_indisponivel',
        mensagem: 'A Escola ainda não está publicada neste agente. Faça o deploy do agente (api/escola.ts) antes de usar a aba.',
      },
      status: 503,
    }
  }
}

export async function GET(req: Request) {
  try {
    const acao = new URL(req.url).searchParams.get('acao')
    const qs = `secret=${SECRET}${acao ? `&acao=${encodeURIComponent(acao)}` : ''}`
    const r = await fetch(`${AGENT}/api/escola?${qs}`, { cache: 'no-store' })
    const { dados, status } = await lerJson(r)
    return NextResponse.json(dados, { status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'erro' }, { status: 500 })
  }
}

/** acao: capturar | marcar | resolver-ticket */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const r = await fetch(`${AGENT}/api/escola?secret=${SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const { dados, status } = await lerJson(r)
    return NextResponse.json(dados, { status })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'erro' }, { status: 500 })
  }
}
