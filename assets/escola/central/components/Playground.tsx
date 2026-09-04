'use client'

import { useState, type ReactNode } from 'react'
import { MessageSquare, Send, Wrench } from 'lucide-react'

export interface ChatTool { name: string; input: Record<string, unknown>; resultado: string }
export interface ChatMsg { role: 'user' | 'assistant'; text: string; tools?: ChatTool[]; voice?: boolean }

function resumoInput(input: Record<string, unknown>): string {
  return Object.entries(input || {})
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ')
}

/**
 * Laboratório — conversa de teste com tools SIMULADAS (não tocam o CRM).
 *
 * É a fundação da Escola: cada resposta da IA ganha um "errou aqui", e o par
 * (o que o lead disse × o que ela respondeu) sai daqui TRAVADO para o card de
 * correção. Por isso ele vive fora do editor de prompt: o perfil 'dono' não vê
 * o editor, mas precisa do laboratório.
 */
export default function Playground({ prompt, titulo, subtitulo, onErrouAqui }: {
  prompt: string
  titulo?: string
  subtitulo?: ReactNode
  /** Ausente = sem botão de correção (ex.: a agência testando um candidato). */
  onErrouAqui?: (par: { turnoLead: string; respostaErrada: string }) => void
}) {
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  async function enviar() {
    const q = input.trim()
    if (!q || busy) return
    const novo: ChatMsg[] = [...chat, { role: 'user', text: q }]
    setChat(novo); setInput(''); setBusy(true)
    try {
      const r = await fetch('/api/prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'chat', texto: prompt, mensagens: novo.map(m => ({ role: m.role, text: m.text })) }),
      })
      const d = await r.json()
      if (d.error) setChat([...novo, { role: 'assistant', text: `⚠️ ${d.mensagem || d.error}` }])
      else setChat([...novo, { role: 'assistant', text: d.reply || '', tools: d.toolCalls || [], voice: !!d.voice }])
    } catch (e) {
      setChat([...novo, { role: 'assistant', text: 'Erro: ' + (e instanceof Error ? e.message : 'desconhecido') }])
    } finally { setBusy(false) }
  }

  return (
    <div className="tech-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare size={13} className="text-cyan" />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-cyan">{titulo || 'Testar ao vivo — sandbox'}</span>
      </div>
      <p className="text-body-muted text-[11.5px] mb-4 leading-relaxed">
        {subtitulo || <>Converse com a IA. As ações no CRM são <strong className="text-white/80">simuladas</strong> — nada muda de verdade; você só vê o que ela <em>faria</em> por trás.</>}
      </p>

      <div className="space-y-2.5 max-h-[360px] overflow-y-auto scroll-thin pr-1 mb-3">
        {chat.length === 0 && (
          <div className="text-body-faint text-[12px] font-mono py-8 text-center">Manda uma mensagem como se fosse o lead…</div>
        )}
        {chat.map((m, i) => {
          // O par só existe se houver uma fala do lead antes desta resposta.
          const anterior = i > 0 && chat[i - 1].role === 'user' ? chat[i - 1].text : ''
          const podeCorrigir = !!onErrouAqui && m.role === 'assistant' && !!anterior && !!m.text
          return (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[82%] rounded-[8px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-cyan/[0.1] border border-cyan/20 text-white/95'
                  : 'bg-white/[0.03] border border-[#1f1f1f] text-body-light'
              }`}>
                {m.tools && m.tools.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {m.tools.map((t, j) => (
                      <div key={j} className="flex items-start gap-1.5 text-[10.5px] font-mono rounded-[3px] px-2 py-1"
                        style={{ color: '#c4b5fd', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Wrench size={10} className="mt-[2px] shrink-0" />
                        <span className="break-all">{t.name}({resumoInput(t.input)}) <span className="text-body-faint">· simulado</span></span>
                      </div>
                    ))}
                  </div>
                )}
                {m.voice && <div className="text-[10px] font-mono text-cyan/70 mb-1">🔊 responderia em áudio</div>}
                {m.text
                  ? <span className="whitespace-pre-wrap">{m.text}</span>
                  : (m.tools && m.tools.length > 0 ? <span className="text-body-faint italic text-[11.5px]">(só ações, sem texto)</span> : null)}
              </div>
              {podeCorrigir && (
                <button onClick={() => onErrouAqui!({ turnoLead: anterior, respostaErrada: m.text })}
                  className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.08em] px-2 py-1 rounded-[3px] border border-purple-400/30 text-purple-300 hover:bg-purple-400/[0.12]">
                  ✏️ errou aqui
                </button>
              )}
            </div>
          )
        })}
        {busy && <div className="text-body-faint text-[12px] font-mono px-1">IA digitando…</div>}
      </div>

      <div className="flex items-center gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Escreve como se fosse o lead…"
          className="flex-1 bg-transparent border border-[#1f1f1f] rounded-[4px] px-3.5 py-2.5 text-[13px] text-body-light outline-none focus:border-cyan/40" />
        <button onClick={enviar} disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] px-3.5 py-2.5 rounded-[3px] border border-cyan/30 bg-cyan/[0.06] text-cyan hover:bg-cyan/[0.12] disabled:opacity-40">
          <Send size={12} /> Enviar
        </button>
        {chat.length > 0 && (
          <button onClick={() => setChat([])}
            className="font-mono text-[10.5px] uppercase tracking-[0.1em] px-3 py-2.5 rounded-[3px] border border-[#1f1f1f] text-body-muted hover:text-white">
            Limpar
          </button>
        )}
      </div>
    </div>
  )
}
