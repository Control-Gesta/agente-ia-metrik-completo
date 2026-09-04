'use client'

import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trash2, X } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   PRIMITIVOS DA CENTRAL — um lugar só define como as coisas parecem, pra toda
   aba nova nascer consistente. Tudo em tokens de tema (globals.css): funciona
   em claro e escuro sem uma linha a mais.
   ═══════════════════════════════════════════════════════════════════════════ */

export function Botao({ children, tom = 'cyan', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tom?: 'cyan' | 'purple' | 'danger' }) {
  const cor = {
    cyan: 'bg-cyan/[0.14] text-cyan border-cyan/30 hover:bg-cyan/[0.22] hover:border-cyan/50',
    purple: 'bg-purple-400/[0.14] text-purple-300 border-purple-400/35 hover:bg-purple-400/[0.22]',
    danger: 'bg-danger/[0.1] text-danger border-danger/30 hover:bg-danger/[0.18]',
  }[tom]
  return (
    <button {...p}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-medium border
                  active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none transition-all ${cor}`}>
      {children}
    </button>
  )
}

export function BotaoGhost({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p}
      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-[13px]
                 text-body-muted hover:text-ink hover-raise
                 disabled:opacity-35 disabled:pointer-events-none transition-all">
      {children}
    </button>
  )
}

export function Campo({ label, valor, onMuda, placeholder, autoFocus, tipo = 'text' }: {
  label?: string; valor: string; onMuda: (v: string) => void
  placeholder?: string; autoFocus?: boolean; tipo?: string
}) {
  return (
    <label className="block">
      {label && <span className="block text-[12.5px] text-body-mid mb-1.5">{label}</span>}
      <input type={tipo} value={valor} onChange={e => onMuda(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        className="w-full campo rounded-xl px-4 py-2.5 text-[14px] text-ink transition-colors" />
    </label>
  )
}

export function Area({ label, valor, onMuda, placeholder, rows = 3 }: {
  label?: string; valor: string; onMuda: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <label className="block">
      {label && <span className="block text-[12.5px] text-body-mid mb-1.5">{label}</span>}
      <textarea value={valor} onChange={e => onMuda(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full campo rounded-xl px-4 py-3 text-[14px] leading-relaxed text-ink resize-y transition-colors" />
    </label>
  )
}

/* cabeçalho de página — o padrão das abas */
export function Cabecalho({ selo, titulo, destaque, sub, acao }: {
  selo: ReactNode; titulo: string; destaque?: string; sub: ReactNode; acao?: ReactNode
}) {
  return (
    <header className="relative -mx-6 lg:-mx-10 -mt-8 px-6 lg:px-10 pt-12 pb-8 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 60%)' }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <span className="badge-cyan inline-flex items-center gap-2">{selo}</span>
          {acao}
        </div>
        <h1 className="font-impact font-extrabold text-[32px] md:text-[42px] leading-[1.03] tracking-[-0.03em] text-ink">
          {titulo} {destaque && <span className="hero-gradient-text">{destaque}</span>}
        </h1>
        <p className="text-body-light text-[14.5px] mt-3 max-w-[640px] leading-relaxed">{sub}</p>
      </div>
    </header>
  )
}

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="tech-card px-8 py-14 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl surface-alt text-body-muted mb-4">{icone}</div>
      <div className="font-impact font-bold text-[18px] text-ink mb-1.5">{titulo}</div>
      <p className="text-body-muted text-[13.5px] max-w-[420px] mx-auto leading-relaxed mb-5">{texto}</p>
      {acao}
    </div>
  )
}

export function Selo({ children, tom = 'muted' }: { children: ReactNode; tom?: 'muted' | 'cyan' | 'purple' | 'warning' | 'success' }) {
  const cor = {
    muted: 'text-body-muted surface-alt', cyan: 'text-cyan bg-cyan/[0.1]',
    purple: 'text-purple-300 bg-purple-400/[0.12]', warning: 'text-warning bg-warning/[0.1]',
    success: 'text-success bg-success/[0.1]',
  }[tom]
  return <span className={`text-[11.5px] px-2.5 py-1 rounded-full ${cor}`}>{children}</span>
}

export function Liga({ on, onMuda }: { on: boolean; onMuda: (v: boolean) => void }) {
  return (
    <button onClick={() => onMuda(!on)} aria-pressed={on}
      className={`relative inline-flex h-5 w-9 rounded-full p-0.5 transition-colors ${on ? 'bg-cyan/40' : 'surface-alt'}`}>
      <span className={`h-4 w-4 rounded-full bg-ink/90 transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  )
}

/* confirmar remoção inline — sem window.confirm feio */
export function Remover({ onConfirma }: { onConfirma: () => void }) {
  const [armado, setArmado] = useState(false)
  if (armado) return (
    <span className="inline-flex items-center gap-1">
      <button onClick={onConfirma} className="p-1.5 rounded-lg text-danger hover:bg-danger/[0.1] transition-colors" title="confirmar"><Check size={15} /></button>
      <button onClick={() => setArmado(false)} className="p-1.5 rounded-lg text-body-muted hover:text-ink transition-colors" title="cancelar"><X size={15} /></button>
    </span>
  )
  return <button onClick={() => setArmado(true)} className="p-1.5 rounded-lg text-body-faint hover:text-danger hover:bg-danger/[0.08] transition-colors" title="remover"><Trash2 size={15} /></button>
}

export function Painel({ aberto, children }: { aberto: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* chamada ao hub /api/central?recurso=… (o proxy resolve o secret) */
export async function chamar(recurso: string, body?: Record<string, unknown>, query = ''): Promise<any> {
  const url = `/api/central?recurso=${recurso}${query}`
  const r = body
    ? await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    : await fetch(url)
  return r.json()
}
