import type { VercelRequest, VercelResponse } from '@vercel/node'
import { perfilDoSecret } from '../lib/perfil'
import { triar } from '../lib/roteador'
import {
  BLOCO_LABEL, CHIPS, abrirTicket, escolaLigada, gravarCorrecao, listarFila,
  listarTickets, marcarCorrecao, reclassificar, resolverTicket, saudeEscola, type ChipId,
} from '../lib/escola'
import { getExecLog } from '../lib/execlog'

/**
 * ESCOLA — a aba "Ensinar a IA" (Fase 0: A CAIXA).
 *
 *  GET  /api/escola?secret=X                    → fila, tickets, saúde, chips
 *  GET  /api/escola?secret=X&acao=conversas     → conversas reais do diário (porta preferida)
 *  POST /api/escola?secret=X {acao:'capturar', ...}   → grava a correção (triagem regex, SEM modelo)
 *  POST /api/escola?secret=X {acao:'reclassificar', id, motivo}  → o "não é bem isso" da Tela F
 *  POST /api/escola?secret=X {acao:'marcar', id, status}
 *  POST /api/escola?secret=X {acao:'resolver-ticket', id, resolucao}   [agencia]
 *
 * Nesta fase NADA é escrito no cérebro automaticamente. A correção vira dado
 * estruturado; quem escreve o delta é gente, pelo /api/prompt de sempre — que
 * continua com o portão dos evals na frente.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const perfil = perfilDoSecret(req.query.secret)
  if (!perfil) return res.status(401).json({ error: 'unauthorized' })

  if (!escolaLigada()) {
    return res.status(503).json({ error: 'escola indisponível — Redis não configurado neste ambiente' })
  }

  try {
    if (req.method === 'GET') {
      if (req.query.acao === 'conversas') {
        // PORTA PREFERIDA da Tela B: conversas que a IA REALMENTE teve, já
        // anonimizadas na gravação e já estruturadas em turnos — sem parser.
        // Só aparecem execuções gravadas DEPOIS do deploy que passou a guardar
        // os turnos; o histórico antigo não tem texto (ver lib/execlog.ts).
        const log = await getExecLog(60)
        const conversas = log
          .filter(e => e.turnoLead && e.respostaIA)
          .map(e => ({
            ts: e.ts,
            contactId: e.contactId,
            nome: e.nome,
            turnoLead: e.turnoLead,
            respostaIA: e.respostaIA,
            voz: e.voz,
            tools: e.tools,
          }))
        return res.status(200).json({ conversas, total: conversas.length })
      }

      const [fila, tickets, saude] = await Promise.all([listarFila(), listarTickets(), saudeEscola()])
      return res.status(200).json({
        perfil,
        chips: CHIPS,
        blocos: BLOCO_LABEL,
        fila,
        // O cliente vê os próprios tickets (é a promessa da Tela F: "abri o
        // chamado #N"). O que ele não vê é o texto cru do cérebro.
        tickets,
        saude,
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

    const body = (req.body || {}) as Record<string, unknown>

    switch (body.acao) {
      case 'capturar': {
        const turnoLead = String(body.turnoLead || '').trim()
        const respostaErrada = String(body.respostaErrada || '').trim()
        const intencao = String(body.intencao || '').trim()

        // A TRAVA DO PAR COMPLETO. Sem "o que ela deveria ter dito" isto é uma
        // reclamação — e reclamação não se conserta. A mensagem é a do produto,
        // não um erro de validação técnico.
        if (!intencao) {
          return res.status(422).json({
            error: 'par_incompleto',
            mensagem:
              'Preciso do par completo. Sem "o que ela deveria ter dito", isso é uma reclamação — ' +
              'e reclamação eu não sei consertar. Não precisa ser a frase perfeita: escreva a ideia, ' +
              'que eu escrevo o texto.',
          })
        }
        if (!turnoLead || !respostaErrada) {
          return res.status(422).json({
            error: 'contexto_ausente',
            mensagem: 'Perdi o contexto da conversa. Abra a correção de novo a partir da resposta que saiu errada.',
          })
        }

        const t = triar(intencao)
        const corr = await gravarCorrecao({
          turnoLead,
          respostaErrada,
          intencao,
          porque: body.porque ? String(body.porque).trim() : undefined,
          chips: (Array.isArray(body.chips) ? body.chips : []) as ChipId[],
          origem: (body.origem as 'playground' | 'conversa_real' | 'colada') || 'playground',
          contactId: body.contactId ? String(body.contactId) : undefined,
          autor: body.autor ? String(body.autor) : undefined,
          perfil,
          destino: t.destino,
          motivoTriagem: t.motivo,
        })

        if (t.destino === 'TOOL_CRM') {
          const ticket = await abrirTicket(corr, intencao)
          return res.status(200).json({
            ok: true, id: corr.id, destino: 'TOOL_CRM', ticket: { id: ticket.id, numero: ticket.numero },
            titulo: 'Isso não vai pro cérebro — e eu te explico por quê',
            mensagem: t.explicacao,
            rodape: `Virou o chamado #${ticket.numero} pra {NOME_AGENCIA}, com prazo de resposta em 1 dia útil.`,
          })
        }

        // Confirmação DELIBERADAMENTE FRIA: cliente que vê a IA mudar na hora
        // aprende que o sistema é um textarea com passos a mais, e volta a pedir
        // ajuste de tom toda tarde. Cliente que lê "vou juntar com as outras"
        // aprende que existe processo.
        return res.status(200).json({
          ok: true, id: corr.id, destino: 'CADERNO', bloco: corr.bloco,
          titulo: 'Anotado.',
          mensagem:
            'Nada muda agora, de propósito. Vou ler esta correção junto com as outras do mesmo assunto ' +
            'e te trazer uma proposta antes de mexer no cérebro. Você aprova, eu testo, e só então publico.',
        })
      }

      case 'reclassificar': {
        // O "não é bem isso" da Tela F. É do CLIENTE, não da agência: quem sabe
        // se aquilo era dado ou conhecimento é quem escreveu a correção.
        const c = await reclassificar(String(body.id || ''), String(body.motivo || ''))
        if (!c) return res.status(404).json({ ok: false })
        return res.status(200).json({
          ok: true, bloco: c.bloco,
          titulo: 'Corrigi o rumo — obrigado.',
          mensagem:
            'Tirei do chamado e mandei pra fila de conhecimento. Vai entrar no lote do mesmo assunto, ' +
            'como qualquer outra correção sua. Anotei o motivo pra eu errar menos da próxima vez.',
        })
      }

      case 'marcar': {
        if (perfil !== 'agencia') return res.status(403).json({ error: 'forbidden' })
        const ok = await marcarCorrecao(String(body.id || ''), body.status as 'nova' | 'processada' | 'descartada')
        return res.status(ok ? 200 : 404).json({ ok })
      }

      case 'resolver-ticket': {
        if (perfil !== 'agencia') return res.status(403).json({ error: 'forbidden' })
        const t = await resolverTicket(String(body.id || ''), String(body.resolucao || ''))
        return res.status(t ? 200 : 404).json({ ok: !!t, ticket: t })
      }

      default:
        return res.status(400).json({ error: 'ação inválida (capturar | reclassificar | marcar | resolver-ticket)' })
    }
  } catch (e) {
    console.error('[api/escola] erro:', e)
    return res.status(500).json({ error: e instanceof Error ? e.message : 'erro' })
  }
}
