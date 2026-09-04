'use client'

import { useState, type ReactNode } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { BotaoDiscreto, CorrecaoInline, type Chip, type Par } from './Escola'

export interface ChatTool { name: string; input: Record<string, unknown>; resultado: string }
export interface ChatMsg { role: 'user' | 'assistant'; text: string; tools?: ChatTool[]; voice?: boolean }

function resumoInput(input: Record<string, unknown>): string {
  return Object.entries(input || {})
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ')
}

/** Perguntas de partida — tirar a pessoa do "não sei o que escrever". */
const SUGESTOES = ['quanto custa?', 'como funciona?', 'quero agendar uma conversa']

/**
 * Laboratório — conversa de teste com tools SIMULADAS (não tocam o CRM).
 *
 * 🩸 A versão anterior era um texto solto no meio do nada: sem contorno, sem
 * dizer o que fazer, e no tema claro as caixas sumiam. Agora a conversa vive
 * DENTRO de um card com contorno, o estado vazio EXPLICA o que fazer e oferece
 * perguntas prontas pra clicar.
 */
export default function Playground({ prompt, subtitulo, chips, onGravou }: {
  prompt: string
  subtitulo?: ReactNode
  /** Presentes = modo Escola (com "errou aqui"). Ausentes = só testar. */
  chips?: Chip[]
  onGravou?: () => void
}) {
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [corrigindo, setCorrigindo] = useState<number | null>(null)

  async function enviar(texto?: string) {
    const q = (texto ?? input).trim()
    if (!q || busy) return
    const novo: ChatMsg[] = [...chat, { role: 'user', text: q }]
    setChat(novo); setInput(''); setBusy(true); setCorrigindo(null)
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
    <div>
      {subtitulo && <p className="text-body-mid text-[13.5px] leading-relaxed mb-4 max-w-[620px]">{subtitulo}</p>}

      {/* a conversa vive num card com contorno — não flutua na página */}
      <div className="tech-card overflow-hidden">
        <div className="px-5 py-3 border-b border-line-soft flex items-center gap-2">
          <MessageSquare size={14} className="text-cyan" />
          <span className="text-[13px] text-body-mid">Conversa de teste</span>
          <span className="text-[12px] text-body-faint">· nada é salvo</span>
          {chat.length > 0 && (
            <button onClick={() => { setChat([]); setCorrigindo(null) }}
              className="ml-auto text-[12.5px] text-body-muted hover:text-ink transition-colors">recomeçar</button>
          )}
        </div>

        <div className="px-5 py-5 space-y-3 min-h-[240px] max-h-[440px] overflow-y-auto scroll-thin">
          {chat.length === 0 ? (
            <div className="py-6 text-center">
              <div className="text-[14.5px] text-ink mb-1.5">Escreva como se fosse um cliente</div>
              <p className="text-[13px] text-body-muted max-w-[380px] mx-auto leading-relaxed mb-5">
                Ela responde igualzinho responderia no WhatsApp. Se sair algo torto,
                aparece um <span className="text-purple-400">errou aqui</span> embaixo da resposta.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {SUGESTOES.map(s => (
                  <button key={s} onClick={() => enviar(s)}
                    className="px-3.5 py-2 rounded-full text-[13px] text-body-mid surface-alt hover:text-ink transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : chat.map((m, i) => {
            const anterior = i > 0 && chat[i - 1].role === 'user' ? chat[i - 1].text : ''
            const podeCorrigir = !!chips && m.role === 'assistant' && !!anterior && !!m.text
            const par: Par = { turnoLead: anterior, respostaErrada: m.text, origem: 'playground' }
            return (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  m.role === 'user' ? 'bg-cyan/[0.16] text-ink' : 'surface-alt text-ink'
                }`}>
                  {m.tools && m.tools.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {m.tools.map((t, j) => (
                        <div key={j} className="text-[12px] text-purple-400">
                          fez no CRM: {t.name}({resumoInput(t.input)}) <span className="text-body-faint">· simulado</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.voice && <div className="text-[12px] text-cyan mb-1">responderia em áudio</div>}
                  {m.text
                    ? <span className="whitespace-pre-wrap">{m.text}</span>
                    : (m.tools?.length ? <span className="text-body-muted italic text-[13px]">(só ações, sem texto)</span> : null)}
                </div>

                {podeCorrigir && corrigindo !== i && (
                  <button onClick={() => setCorrigindo(i)}
                    className="mt-1.5 ml-1 text-[12.5px] text-purple-400 hover:text-purple-300 transition-colors">
                    errou aqui
                  </button>
                )}
                {podeCorrigir && corrigindo === i && (
                  <div className="w-full max-w-[580px] mt-1">
                    <CorrecaoInline par={par} chips={chips!}
                      onCancelar={() => setCorrigindo(null)} onGravou={() => onGravou?.()} />
                  </div>
                )}
              </div>
            )
          })}
          {busy && <div className="text-body-muted text-[13.5px] px-1">digitando…</div>}
        </div>

        <div className="px-5 py-4 border-t border-line-soft flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escreva a mensagem do cliente…"
            className="campo flex-1 rounded-xl px-4 py-3 text-[14px]" />
          <button onClick={() => enviar()} disabled={busy || !input.trim()}
            className="p-3 rounded-xl bg-cyan/[0.16] text-cyan border border-cyan/35
                       hover:bg-cyan/[0.24] disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="enviar">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
