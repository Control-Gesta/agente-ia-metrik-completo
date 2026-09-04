'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ClipboardPaste, FolderOpen, Inbox, Pencil, Ticket, X } from 'lucide-react'

/* ─────────────────────────── tipos ─────────────────────────── */

export interface Chip { id: string; label: string; bloco: string }
export interface Conversa {
  ts: string; contactId: string; nome: string
  turnoLead: string; respostaIA: string; voz?: boolean; tools?: string[]
}
export interface CorrecaoItem {
  id: string; ts: string; autor: string; turnoLead: string; respostaErrada: string
  intencao: string; porque?: string; chips: string[]; bloco: string
  destino: 'CADERNO' | 'TOOL_CRM'; status: string; origem: string
}
export interface TicketItem {
  id: string; numero: number; ts: string; pedido: string; status: 'aberto' | 'resolvido'
}
export interface EscolaData {
  perfil: 'dono' | 'agencia'
  chips: Chip[]
  blocos: Record<string, string>
  fila: Record<string, CorrecaoItem[]>
  tickets: TicketItem[]
  saude: { total: number; novas: number; ticketsAbertos: number; paradaHaDias: number; porBloco: { bloco: string; label: string; qtd: number }[] }
}

/** O par que abre o card de correção — vem TRAVADO da conversa, o cliente não digita. */
export interface Par { turnoLead: string; respostaErrada: string; origem: 'playground' | 'conversa_real' | 'colada'; contactId?: string }

const fmt = (ts: string) => new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/* ─────────────────────── o card de captura ─────────────────────── */

export function CardCorrecao({ par, chips, onFechar, onGravou }: {
  par: Par; chips: Chip[]; onFechar: () => void; onGravou: () => void
}) {
  const [intencao, setIntencao] = useState('')
  const [porque, setPorque] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState<{ titulo: string; mensagem: string; rodape?: string; ticket?: boolean; id?: string } | null>(null)
  const [contestando, setContestando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  async function enviar() {
    if (!intencao.trim()) {
      // A trava do par completo, dita do jeito do produto — não é erro técnico.
      setErro('Preciso do par completo. Sem "o que ela deveria ter dito", isso é uma reclamação — e reclamação eu não sei consertar. Não precisa ser a frase perfeita: escreva a ideia, que eu escrevo o texto.')
      return
    }
    setEnviando(true); setErro('')
    try {
      const r = await fetch('/api/escola', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'capturar', turnoLead: par.turnoLead, respostaErrada: par.respostaErrada,
          intencao, porque: porque.trim() || undefined, chips: sel, origem: par.origem, contactId: par.contactId,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErro(d.mensagem || d.error || 'não consegui gravar'); return }
      setOk({ titulo: d.titulo, mensagem: d.mensagem, rodape: d.rodape, ticket: d.destino === 'TOOL_CRM', id: d.id })
      onGravou()
    } catch (e) {
      setErro('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'))
    } finally { setEnviando(false) }
  }

  /* Confirmação — fria de propósito quando vai pro caderno, explicativa quando vira ticket */
  if (ok) return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="tech-card p-5" style={{ borderColor: ok.ticket ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)' }}>
      <div className="flex items-start gap-3">
        {ok.ticket ? <Ticket size={18} className="text-warning mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <div className="font-impact font-bold text-[15px] text-white mb-1.5">{ok.titulo}</div>
          <p className="text-body-light text-[13px] leading-relaxed">{ok.mensagem}</p>
          {ok.rodape && <p className="text-warning/90 text-[12.5px] leading-relaxed mt-2 font-mono">{ok.rodape}</p>}

          {/* A VÁLVULA. A triagem erra pro lado do chamado de propósito — e mediu-se
              em produção que "valor", "prazo" e correção datada caem aqui sem ser
              dado. Sem esta saída, o cliente lê "isso é dado que muda" pra um
              pedido que não era, e aprende que a aba não entende o que ele escreve. */}
          {ok.ticket && !contestando && (
            <div className="flex items-center gap-2 mt-4">
              <button onClick={onFechar} className="font-mono text-[10px] uppercase tracking-[0.1em] px-3.5 py-2 rounded-[3px] border border-[#1f1f1f] text-body-muted hover:text-white">
                ok, entendi
              </button>
              <button onClick={() => setContestando(true)} className="font-mono text-[10px] uppercase tracking-[0.1em] px-3.5 py-2 rounded-[3px] border border-cyan/30 text-cyan hover:bg-cyan/[0.08]">
                não é bem isso
              </button>
            </div>
          )}

          {ok.ticket && contestando && (
            <div className="mt-4 space-y-2">
              <p className="text-[12.5px] text-white/90">Me conta rapidinho o que era, então:</p>
              <input value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Ex.: não é sobre preço, é sobre ela dar mais atenção ao que o lead falou"
                className="w-full bg-transparent border border-[#1f1f1f] rounded-[4px] px-3 py-2.5 text-[12.5px] text-body-light outline-none focus:border-cyan/40" />
              <div className="flex items-center gap-2">
                <button disabled={!motivo.trim()}
                  onClick={async () => {
                    const r = await fetch('/api/escola', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ acao: 'reclassificar', id: ok.id, motivo }),
                    })
                    const d = await r.json()
                    if (r.ok) { setOk({ titulo: d.titulo, mensagem: d.mensagem, ticket: false }); setContestando(false); onGravou() }
                  }}
                  className="font-mono text-[10px] uppercase tracking-[0.1em] px-3.5 py-2 rounded-[3px] border border-cyan/30 bg-cyan/[0.06] text-cyan hover:bg-cyan/[0.12] disabled:opacity-40">
                  enviar
                </button>
                <button onClick={() => setContestando(false)} className="font-mono text-[10px] uppercase tracking-[0.1em] px-3 py-2 rounded-[3px] border border-[#1f1f1f] text-body-muted hover:text-white">
                  deixa pra lá
                </button>
              </div>
            </div>
          )}

          {!ok.ticket && (
            <button onClick={onFechar} className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] px-3.5 py-2 rounded-[3px] border border-[#1f1f1f] text-body-muted hover:text-white">
              ok, entendi
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="tech-card p-5 space-y-4" style={{ borderColor: 'rgba(139,92,246,0.28)' }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-purple-300 inline-flex items-center gap-1.5">
          <Pencil size={11} /> Corrigir esta resposta
        </span>
        <button onClick={onFechar} className="text-body-faint hover:text-white"><X size={14} /></button>
      </div>

      {/* (a) e (b) — TRAVADOS. Vêm da conversa; o cliente não reescreve o passado. */}
      <div className="space-y-2">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-body-faint mb-1">O lead disse · travado</div>
          <div className="text-[12.5px] text-body-light bg-white/[0.02] border border-[#1a1a1a] rounded-[4px] px-3 py-2 whitespace-pre-wrap">{par.turnoLead}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-body-faint mb-1">A IA respondeu · travado</div>
          <div className="text-[12.5px] text-body-light bg-white/[0.02] border border-[#1a1a1a] rounded-[4px] px-3 py-2 whitespace-pre-wrap">{par.respostaErrada}</div>
        </div>
      </div>

      {/* (c) obrigatório */}
      <div>
        <label className="block text-[12.5px] text-white/90 mb-1.5">
          O que ela deveria ter dito? <span className="text-danger">⭑ obrigatório</span>
        </label>
        <textarea value={intencao} onChange={e => { setIntencao(e.target.value); setErro('') }}
          placeholder="Escreva do seu jeito — não precisa ficar bonito. A gente cuida do texto."
          className="w-full h-[86px] bg-transparent border border-[#1f1f1f] rounded-[4px] px-3 py-2.5 text-[13px] text-body-light outline-none focus:border-purple-400/40 resize-y" />
      </div>

      {/* chips — o diagnóstico de 1 clique, antes do campo livre */}
      <div>
        <div className="text-[12.5px] text-white/90 mb-2">O que ela errou? <span className="text-body-faint text-[11px]">(clique no que se aplica)</span></div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => {
            const on = sel.includes(c.id)
            return (
              <button key={c.id} onClick={() => toggle(c.id)}
                className={`font-mono text-[10.5px] px-2.5 py-1.5 rounded-[3px] border transition-all ${
                  on ? 'text-purple-200 border-purple-400/40 bg-purple-400/[0.14]' : 'text-body-muted border-[#1f1f1f] hover:text-white hover:border-[#2f2f2f]'
                }`}>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* (d) opcional */}
      <div>
        <label className="block text-[12.5px] text-white/90 mb-1.5">
          Por que isso importa? <span className="text-body-faint text-[11px]">(opcional, mas ajuda muito)</span>
        </label>
        <textarea value={porque} onChange={e => setPorque(e.target.value)}
          placeholder="Ex.: quem vem do Instagram sempre pergunta preço primeiro. Se ela enrola, o cara some."
          className="w-full h-[64px] bg-transparent border border-[#1f1f1f] rounded-[4px] px-3 py-2.5 text-[13px] text-body-light outline-none focus:border-purple-400/40 resize-y" />
      </div>

      {erro && (
        <div className="flex items-start gap-2 text-[12.5px] text-warning bg-warning/[0.06] border border-warning/25 rounded-[4px] px-3 py-2.5 leading-relaxed">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{erro}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={enviar} disabled={enviando}
          className="font-mono text-[10.5px] uppercase tracking-[0.1em] px-4 py-2.5 rounded-[3px] border border-purple-400/35 bg-purple-400/[0.1] text-purple-200 hover:bg-purple-400/[0.18] disabled:opacity-40">
          {enviando ? 'Enviando…' : 'Enviar correção'}
        </button>
        <button onClick={onFechar} className="font-mono text-[10.5px] uppercase tracking-[0.1em] px-3.5 py-2.5 rounded-[3px] border border-[#1f1f1f] text-body-muted hover:text-white">
          Cancelar
        </button>
      </div>
    </motion.div>
  )
}

/* ────────────── Tela B · porta preferida: escolher do diário ────────────── */

export function ConversasReais({ onEscolher }: { onEscolher: (p: Par) => void }) {
  const [convs, setConvs] = useState<Conversa[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/escola?acao=conversas').then(r => r.json())
      .then(d => setConvs(d.conversas || []))
      .catch(() => setConvs([]))
      .finally(() => setCarregando(false))
  }, [])

  return (
    <div className="tech-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <FolderOpen size={13} className="text-cyan" />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-cyan">Escolher uma conversa de verdade</span>
      </div>
      <p className="text-body-muted text-[11.5px] mb-4 leading-relaxed">
        Conversas que a IA <strong className="text-white/80">realmente teve</strong>. Telefone, e-mail e CPF já foram apagados.
      </p>

      {carregando && <div className="text-body-faint text-[12px] font-mono py-6 text-center">carregando…</div>}

      {!carregando && convs.length === 0 && (
        <div className="text-[12.5px] text-body-muted bg-white/[0.02] border border-[#1a1a1a] rounded-[4px] px-4 py-4 leading-relaxed">
          Ainda não tenho conversa guardada com o texto completo. Elas começam a aparecer aqui conforme a IA
          for atendendo. Enquanto isso, use o <strong className="text-white/80">laboratório</strong> acima ou
          cole uma conversa abaixo.
        </div>
      )}

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto scroll-thin pr-1">
        {convs.map((c, i) => (
          <button key={i} onClick={() => onEscolher({ turnoLead: c.turnoLead, respostaErrada: c.respostaIA, origem: 'conversa_real', contactId: c.contactId })}
            className="w-full text-left px-3 py-2.5 rounded-[4px] bg-white/[0.02] border border-[#1a1a1a] hover:border-cyan/30 hover:bg-cyan/[0.04] transition-all group">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-[12px] text-white/90 truncate">{c.nome || 'lead'}</span>
              <span className="font-mono text-[9.5px] text-body-faint shrink-0">
                {fmt(c.ts)}{c.voz ? ' · 🔊' : ''}
              </span>
            </div>
            <div className="text-[11.5px] text-body-muted truncate">“{c.turnoLead}”</div>
            <div className="text-[11.5px] text-body-faint truncate group-hover:text-body-muted">↳ {c.respostaIA}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ────────────── Tela B · segunda porta: colar ────────────── */

/** Parser em CÓDIGO (regex `Nome:` no início da linha) — nunca modelo. */
export function separarTurnos(texto: string): { quem: string; fala: string }[] {
  return texto.split('\n').map(l => l.trim()).filter(Boolean).map(linha => {
    const m = linha.match(/^([\wÀ-ÿ .'-]{1,28}):\s*(.+)$/)
    return m ? { quem: m[1].trim(), fala: m[2].trim() } : { quem: '', fala: linha }
  })
}

export function ColarConversa({ onEscolher }: { onEscolher: (p: Par) => void }) {
  const [texto, setTexto] = useState('')
  const [turnos, setTurnos] = useState<{ quem: string; fala: string }[] | null>(null)

  const semNome = turnos?.some(t => !t.quem)

  return (
    <div className="tech-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardPaste size={13} className="text-body-muted" />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-body-muted">Ou colar de outro lugar</span>
      </div>
      <p className="text-body-muted text-[11.5px] mb-3 leading-relaxed">
        WhatsApp, print, outro sistema. Eu separo quem falou o quê e você marca a mensagem que saiu errada.
      </p>

      {!turnos && (
        <>
          <textarea value={texto} onChange={e => setTexto(e.target.value)}
            placeholder={'Lead: oi, vi o anúncio\n{NOME_AGENTE}: Oi! Que bom que você chegou 🙌 Me conta seu nome?\nLead: joão. quanto é?'}
            className="w-full h-[130px] bg-transparent border border-[#1f1f1f] rounded-[4px] px-3 py-2.5 text-[12.5px] font-mono text-body-light outline-none focus:border-cyan/40 resize-y" />
          <div className="flex items-center justify-between gap-3 mt-2.5">
            <button onClick={() => setTurnos(separarTurnos(texto))} disabled={texto.trim().length < 10}
              className="font-mono text-[10.5px] uppercase tracking-[0.1em] px-3.5 py-2.5 rounded-[3px] border border-cyan/30 bg-cyan/[0.06] text-cyan hover:bg-cyan/[0.12] disabled:opacity-40">
              Separar a conversa
            </button>
            <span className="text-[10.5px] text-body-faint">🔒 telefone, e-mail e CPF são apagados antes de guardar</span>
          </div>
        </>
      )}

      {turnos && (
        <div className="space-y-2">
          {semNome && (
            <div className="text-[11.5px] text-warning bg-warning/[0.06] border border-warning/25 rounded-[4px] px-3 py-2">
              O formato veio estranho em algumas linhas — confira se separei certo antes de continuar.
            </div>
          )}
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto scroll-thin pr-1">
            {turnos.map((t, i) => {
              // Só faz sentido corrigir fala da IA que tem uma fala do lead antes.
              const anterior = turnos[i - 1]
              return (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-[4px] bg-white/[0.02] border border-[#1a1a1a]">
                  <span className="font-mono text-[10px] text-body-faint shrink-0 w-16 truncate">{t.quem || '?'}</span>
                  <span className="text-[12px] text-body-light flex-1 min-w-0">{t.fala}</span>
                  {anterior && (
                    <button onClick={() => onEscolher({ turnoLead: anterior.fala, respostaErrada: t.fala, origem: 'colada' })}
                      className="font-mono text-[9.5px] uppercase tracking-[0.08em] px-2 py-1 rounded-[3px] border border-purple-400/30 text-purple-300 hover:bg-purple-400/[0.12] shrink-0">
                      ✏️ foi aqui
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={() => { setTurnos(null); setTexto('') }}
            className="font-mono text-[10px] uppercase tracking-[0.1em] px-3 py-2 rounded-[3px] border border-[#1f1f1f] text-body-muted hover:text-white">
            colar outra
          </button>
        </div>
      )}
    </div>
  )
}

/* ────────────── o que já foi ensinado + os chamados ────────────── */

export function FilaEnsinada({ data }: { data: EscolaData }) {
  // Descartada não aparece: "o que você já ensinou" é a lista do que está VIVO.
  // Item que a agência descartou continua no Redis pra auditoria, mas mostrá-lo
  // aqui faria o cliente achar que ensinou algo que não vai a lugar nenhum.
  const itens = Object.entries(data.fila)
    .flatMap(([bloco, cs]) => cs.map(c => ({ ...c, blocoId: bloco })))
    .filter(c => c.status !== 'descartada')
    .sort((a, b) => b.ts.localeCompare(a.ts))
  const abertos = data.tickets.filter(t => t.status === 'aberto')

  if (!itens.length && !abertos.length) return null

  return (
    <div className="space-y-3">
      {abertos.length > 0 && (
        <div className="tech-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Ticket size={12} className="text-warning" />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-warning">
              Chamados abertos com a {'{NOME_AGENCIA}'} ({abertos.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {abertos.map(t => (
              <div key={t.id} className="flex items-start gap-3 text-[12px] px-3 py-2 rounded-[3px] bg-warning/[0.04] border border-warning/15">
                <span className="font-mono text-[11px] text-warning shrink-0">#{t.numero}</span>
                <span className="text-body-light flex-1 min-w-0">“{t.pedido}”</span>
                <span className="font-mono text-[9.5px] text-body-faint shrink-0">{fmt(t.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {itens.length > 0 && (
        <div className="tech-card p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Inbox size={12} className="text-body-muted" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-body-muted">
                O que você já ensinou ({itens.length})
              </span>
            </div>
            {data.saude.paradaHaDias >= 14 && (
              <span className="font-mono text-[9.5px] text-warning">⚠️ a mais antiga está parada há {data.saude.paradaHaDias} dias</span>
            )}
          </div>
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto scroll-thin pr-1">
            {itens.map(c => (
              <div key={c.id} className="px-3 py-2.5 rounded-[4px] bg-white/[0.02] border border-[#1a1a1a]">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]"
                    style={{ color: c.destino === 'TOOL_CRM' ? '#f59e0b' : '#a78bfa' }}>
                    {c.destino === 'TOOL_CRM' ? 'chamado' : (data.blocos[c.blocoId] || 'precisa de triagem')}
                  </span>
                  <span className="font-mono text-[9.5px] text-body-faint">{fmt(c.ts)}</span>
                </div>
                <div className="text-[12px] text-body-light">“{c.intencao}”</div>
                {c.chips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.chips.map(id => (
                      <span key={id} className="font-mono text-[9px] px-1.5 py-0.5 rounded-[2px] bg-white/[0.04] text-body-faint">
                        {data.chips.find(x => x.id === id)?.label || id}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────────── a barra de estado, no topo da aba ────────────── */

export function BarraEscola({ saude }: { saude: EscolaData['saude'] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11.5px] font-mono text-body-muted">
      <span>📥 {saude.novas} correç{saude.novas === 1 ? 'ão' : 'ões'} na fila</span>
      {saude.ticketsAbertos > 0 && <span className="text-warning">🎫 {saude.ticketsAbertos} chamado(s) aberto(s)</span>}
      {saude.paradaHaDias >= 14 && <span className="text-danger">⏳ parada há {saude.paradaHaDias}d</span>}
    </div>
  )
}

export { AnimatePresence }
