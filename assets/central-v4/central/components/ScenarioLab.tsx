'use client'

import { useMemo, useState } from 'react'
import { FlaskConical, Gauge, ShieldCheck, TrendingUp } from 'lucide-react'
import type { LiveData } from './LiveStats'
import { brl } from '@/lib/execution-data'
import { buildMoneyRadar } from '@/lib/central-intelligence'
import { SectionTitle } from './ProductUI'

export default function ScenarioLab({ live }: { live: LiveData | null }) {
  const [recuperacao, setRecuperacao] = useState(20)
  const [comparecimento, setComparecimento] = useState(10)
  const radar = useMemo(() => buildMoneyRadar(live), [live])
  const value = radar.reduce((n, s) => n + s.value, 0)
  const meetings = live?.agenda.proximos.length || 0
  const recovered = value * recuperacao / 100
  const protectedMeetings = meetings * comparecimento / 100

  return (
    <section className="panel p-5 md:p-6">
      <SectionTitle
        eyebrow="MODO E SE? · ZERO TOKENS"
        title="Simule antes de mudar a operação."
        description="Este é um modelo de sensibilidade, não uma promessa. Ele deixa premissas explícitas para você julgar o tamanho da oportunidade."
        action={<span className="state-orb text-purple-400 bg-purple-400/[0.07]"><FlaskConical size={17} /></span>}
      />

      <div className="grid lg:grid-cols-[1fr_.8fr] gap-6">
        <div className="space-y-6">
          <Slider
            label="Se recuperarmos oportunidades paradas"
            value={recuperacao}
            onChange={setRecuperacao}
            min={0}
            max={60}
            suffix="%"
          />
          <Slider
            label="Se melhorarmos a proteção de comparecimento"
            value={comparecimento}
            onChange={setComparecimento}
            min={0}
            max={40}
            suffix="%"
          />
          <div className="flex items-start gap-2 text-[10.5px] text-body-faint">
            <ShieldCheck size={13} className="text-success mt-0.5 shrink-0" />
            O simulador não chama modelo, não altera CRM e não publica regra.
          </div>
        </div>

        <div className="rounded-[10px] border border-purple-400/20 bg-purple-400/[0.045] p-5">
          <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-purple-400">CENÁRIO CALCULADO</div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Output icon={TrendingUp} label="Pipeline potencialmente recuperado" value={value ? brl(recovered, 0) : 'sem valor no CRM'} />
            <Output icon={Gauge} label="Reuniões adicionais protegidas" value={protectedMeetings.toFixed(1)} />
          </div>
          <p className="text-[10.5px] leading-relaxed text-body-faint mt-5">
            Fórmula: valor aberto sinalizado × taxa hipotética. Confirme conversão real antes de usar em forecast.
          </p>
        </div>
      </div>
    </section>
  )
}

function Slider({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix: string
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-body-mid">{label}</span>
        <span className="font-mono text-[11px] text-ink">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-cyan-500 mt-3" />
    </label>
  )
}

function Output({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="surface rounded-lg p-3">
      <Icon size={14} className="text-purple-400" />
      <div className="font-impact font-bold text-[17px] text-ink mt-3">{value}</div>
      <div className="text-[9.5px] leading-relaxed text-body-muted mt-1">{label}</div>
    </div>
  )
}
