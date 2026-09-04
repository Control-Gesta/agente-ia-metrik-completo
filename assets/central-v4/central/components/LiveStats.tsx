'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, CalendarCheck, MessagesSquare, Timer, UserCheck, Users } from 'lucide-react'

export interface LiveData {
  conversas: Array<{
    id: string; nome: string; ultimaMsg: string; minutosAtras: number
    naoLidas: number; estado: 'ia' | 'humano' | 'fora'; ativa: boolean
  }>
  grupos: { iaAtendendo: number; comHumano: number; foraDoGate: number }
  conversas24h: number
  leads: { total: number; comIA: number }
  funil: Array<{
    label: string; n: number; ia: boolean; valor: number; parados: number
    amostras: Array<{ id: string; nome: string; valor: number; diasParado: number }>
  }>
  agenda: { proximos: Array<{ id: string; titulo: string; inicio: string; status: string; nome?: string }>; realizados7d: number }
  respostaMedianaSegundos: number | null
}

/**
 * Carrega os dados UMA vez ao abrir a página. Refresh SOMENTE manual — o
 * botão global dispara o evento 'central:refresh' (decisão do cliente:
 * nada de polling automático marretando a API do CRM).
 */
export function useLive(): { live: LiveData | null; erro: boolean; carregando: boolean } {
  const [live, setLive] = useState<LiveData | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    let on = true
    const load = () => {
      setCarregando(true)
      fetch('/api/live').then(r => r.json())
        .then(d => { if (on) { if (d.error) setErro(true); else { setLive(d); setErro(false) } } })
        .catch(() => on && setErro(true))
        .finally(() => on && setCarregando(false))
    }
    load()
    window.addEventListener('central:refresh', load)
    return () => { on = false; window.removeEventListener('central:refresh', load) }
  }, [])
  return { live, erro, carregando }
}

const fade = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.07 },
})

export default function LiveStats() {
  const { live } = useLive()
  const l = live

  const stats = [
    { Icon: Bot, label: 'IA atendendo agora', value: l ? String(l.grupos.iaAtendendo) : '·', cor: '#22c55e', hot: !!l && l.grupos.iaAtendendo > 0 },
    { Icon: MessagesSquare, label: 'Conversas 24h', value: l ? String(l.conversas24h) : '·', cor: '#06b6d4' },
    { Icon: Timer, label: 'Resposta mediana', value: l?.respostaMedianaSegundos ? `${Math.round(l.respostaMedianaSegundos)}s` : '·', cor: '#3b82f6' },
    { Icon: CalendarCheck, label: 'Calls agendadas', value: l ? String(l.agenda.proximos.length) : '·', cor: '#a78bfa' },
    { Icon: UserCheck, label: 'Leads com IA', value: l ? String(l.leads.comIA) : '·', cor: '#06b6d4' },
    { Icon: Users, label: 'Base total', value: l ? String(l.leads.total) : '·', cor: '#737373' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {stats.map((s, i) => (
        <motion.div key={s.label} {...fade(i)} className="tech-card px-4 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-6 h-6 rounded-[3px] flex items-center justify-center border"
              style={{ background: `${s.cor}12`, borderColor: `${s.cor}30`, color: s.cor }}>
              <s.Icon size={12} strokeWidth={2.2} />
            </span>
            {s.hot && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow" />}
          </div>
          <div className="font-impact font-bold text-[26px] leading-none tabular-nums text-ink">{s.value}</div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-body-muted mt-1.5">{s.label}</div>
        </motion.div>
      ))}
    </div>
  )
}
