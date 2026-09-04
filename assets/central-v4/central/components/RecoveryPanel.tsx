'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, MessageCircleReply, Target, UserRoundCheck } from 'lucide-react'
import { SectionTitle } from '@/components/ProductUI'

type View = 'agora' | 'eficacia' | 'resultados' | 'definicao'

type Stats = {
  definition: {
    responseLabel: string
    goalLabel: string | null
    goalSignal: { type: string; id: string; value?: string; name?: string } | null
    attributionWindowHours: number
  }
  summary: {
    active: number; sent: number; responded: number; achieved: number
    assisted: number; exhausted: number; cancelled: number; optOut: number
    responseRate: number | null; goalRate: number | null
    costBrl: number | null; costPerResponseBrl: number | null; costPerGoalBrl: number | null
  }
  dueBuckets: { overdue: number; nextHour: number; today: number; tomorrow: number; later: number }
  byStep: Array<{
    step: number; sent: number; responded: number; achieved: number
    responseRate: number | null; goalRate: number | null; medianResponseMinutes: number | null
  }>
  queue: Array<{
    cycleId: string; leadId: string; name?: string; step: number
    lastSentAt?: string; nextDueAt?: string; state: string; owner?: string; crmUrl?: string
  }>
  recovered: Array<{ cycleId: string; leadId: string; name?: string; step: number; at: string; crmUrl?: string }>
  achieved: Array<{ cycleId: string; leadId: string; name?: string; step: number; at: string; assisted: boolean; evidence: string; crmUrl?: string }>
}

export default function RecoveryPanel() {
  const [view, setView] = useState<View>('agora')
  const [data, setData] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const load = () => {
      setLoading(true)
      fetch('/api/followup-stats').then(r => r.json())
        .then(body => {
          if (!active) return
          if (body.error) setError(true)
          else { setData(body); setError(false) }
        })
        .catch(() => active && setError(true))
        .finally(() => active && setLoading(false))
    }
    load()
    window.addEventListener('central:refresh', load)
    return () => { active = false; window.removeEventListener('central:refresh', load) }
  }, [])

  if (loading) return <div className="panel h-52 animate-pulse surface-alt" />
  if (error || !data) return <Empty text="A recuperação ainda não respondeu. Confira o endpoint read-only e tente atualizar." />

  const views: Array<{ id: View; label: string }> = [
    { id: 'agora', label: 'Agora' },
    { id: 'eficacia', label: 'Eficácia' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'definicao', label: 'Definição' },
  ]

  return (
    <section className="space-y-6">
      <SectionTitle eyebrow="RECUPERAÇÃO" title="Quem vai receber, quem voltou e quem concretizou." description="Resposta e objetivo comercial são conversões diferentes — e aparecem separadas." />
      <div className="segmented overflow-x-auto">
        {views.map(item => <button key={item.id} onClick={() => setView(item.id)} className={view === item.id ? 'active' : ''}>{item.label}</button>)}
      </div>

      {view === 'agora' && <Now data={data} />}
      {view === 'eficacia' && <Effectiveness data={data} />}
      {view === 'resultados' && <Results data={data} />}
      {view === 'definicao' && <Definition data={data} />}
    </section>
  )
}

function Now({ data }: { data: Stats }) {
  const buckets = data.dueBuckets
  return <>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Metric label="Em recuperação" value={data.summary.active} icon={Clock3} color="#06b6d4" />
      <Metric label="Vencidos" value={buckets.overdue} icon={Clock3} color="#ef4444" />
      <Metric label="Até 1 hora" value={buckets.nextHour} icon={Clock3} color="#f59e0b" />
      <Metric label="Ainda hoje" value={buckets.today} icon={Clock3} color="#a78bfa" />
      <Metric label="Amanhã" value={buckets.tomorrow} icon={Clock3} color="#737373" />
    </div>
    <div className="panel overflow-hidden">
      {data.queue.slice(0, 20).map((lead, index) => (
        <a key={lead.cycleId} href={lead.crmUrl || undefined} target={lead.crmUrl ? '_blank' : undefined}
          className={`px-5 py-4 grid md:grid-cols-[1fr_90px_150px_120px] gap-2 items-center ${index ? 'border-t border-line-soft' : ''}`}>
          <div><div className="text-[13px] font-medium text-ink">{lead.name || lead.leadId}</div><div className="text-[10px] text-body-faint mt-1">{lead.owner || 'sem responsável informado'}</div></div>
          <span className="font-mono text-[10px] text-cyan-400">{lead.state === 'exhaustion_due' ? 'ENCERRAR' : `FU${lead.step}`}</span>
          <span className="text-[11px] text-body-mid">{lead.nextDueAt ? relativeTime(lead.nextDueAt) : 'sem próximo envio'}</span>
          <span className="font-mono text-[9px] uppercase text-body-faint">{lead.state}</span>
        </a>
      ))}
      {!data.queue.length && <Empty text="Nenhum lead aguardando follow-up agora." />}
    </div>
  </>
}

function Effectiveness({ data }: { data: Stats }) {
  return <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric label="Envios" value={data.summary.sent} icon={Clock3} color="#737373" />
      <Metric label="Voltaram a conversar" value={data.summary.responded} suffix={rate(data.summary.responseRate)} icon={MessageCircleReply} color="#22c55e" />
      <Metric label="Concretizaram" value={data.summary.achieved} suffix={rate(data.summary.goalRate)} icon={Target} color="#06b6d4" />
      <Metric label="Influência assistida" value={data.summary.assisted} icon={UserRoundCheck} color="#a78bfa" />
    </div>
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[680px] text-left">
        <thead><tr className="font-mono text-[9px] uppercase tracking-[0.1em] text-body-faint">
          {['Toque', 'Enviados', 'Responderam', 'Taxa resposta', 'Concretizaram', 'Taxa objetivo', 'Tempo mediano'].map(x => <th key={x} className="px-4 py-3">{x}</th>)}
        </tr></thead>
        <tbody>{data.byStep.map(row => <tr key={row.step} className="border-t border-line-soft text-[12px] text-body-mid">
          <td className="px-4 py-3 font-mono text-cyan-400">FU{row.step}</td><td className="px-4 py-3">{row.sent}</td>
          <td className="px-4 py-3">{row.responded}</td><td className="px-4 py-3">{rate(row.responseRate)}</td>
          <td className="px-4 py-3">{row.achieved}</td><td className="px-4 py-3">{rate(row.goalRate)}</td>
          <td className="px-4 py-3">{row.medianResponseMinutes == null ? 'ainda sem base' : `${Math.round(row.medianResponseMinutes)} min`}</td>
        </tr>)}</tbody>
      </table>
      {!data.byStep.length && <Empty text="A eficácia por toque nasce depois do primeiro follow-up enviado." />}
    </div>
  </>
}

function Results({ data }: { data: Stats }) {
  return <div className="grid lg:grid-cols-2 gap-4">
    <ResultList title="Voltaram a conversar" description={data.definition.responseLabel} rows={data.recovered.map(x => ({ ...x, evidence: `Resposta após FU${x.step}` }))} />
    <ResultList title="Concretizaram o objetivo" description={data.definition.goalLabel || 'Objetivo comercial ainda não configurado'} rows={data.achieved} />
  </div>
}

function Definition({ data }: { data: Stats }) {
  return <div className="panel p-6 md:p-8 max-w-3xl">
    <div className="space-y-5">
      <Rule label="Voltou a conversar" value={data.definition.responseLabel} />
      <Rule label="Concretizou" value={data.definition.goalLabel || 'Objetivo comercial não configurado'} warning={!data.definition.goalLabel} />
      <Rule label="Sinal no CRM" value={data.definition.goalSignal ? `${data.definition.goalSignal.type}: ${data.definition.goalSignal.name || data.definition.goalSignal.id}` : 'Sinal verificável não configurado'} warning={!data.definition.goalSignal} />
      <Rule label="Janela de atribuição" value={`${data.definition.attributionWindowHours} horas após o último follow-up`} />
    </div>
  </div>
}

function ResultList({ title, description, rows }: { title: string; description: string; rows: Array<{ cycleId: string; leadId: string; name?: string; step: number; at: string; evidence: string; assisted?: boolean; crmUrl?: string }> }) {
  return <div className="panel overflow-hidden">
    <div className="p-5"><h3 className="text-[14px] font-medium text-ink">{title}</h3><p className="text-[11px] text-body-muted mt-1">{description}</p></div>
    {rows.slice(0, 12).map(row => <a key={row.cycleId} href={row.crmUrl || undefined} target={row.crmUrl ? '_blank' : undefined} className="px-5 py-3 flex items-center gap-3 border-t border-line-soft">
      <CheckCircle2 size={14} className="text-success shrink-0" /><div className="min-w-0 flex-1"><div className="text-[12px] text-ink truncate">{row.name || row.leadId}</div><div className="text-[10px] text-body-faint mt-1">{row.evidence}{row.assisted ? ' · assistido pelo humano' : ''}</div></div><span className="font-mono text-[9px] text-body-faint">FU{row.step}</span>
    </a>)}
    {!rows.length && <Empty text="Nenhum evento medido neste período." />}
  </div>
}

function Metric({ label, value, suffix, icon: Icon, color }: { label: string; value: number; suffix?: string; icon: typeof Clock3; color: string }) {
  return <div className="panel p-4"><Icon size={14} style={{ color }} /><div className="font-impact text-[24px] font-bold text-ink mt-3">{value}</div><div className="text-[10px] text-body-muted mt-1">{label}</div>{suffix && <div className="font-mono text-[9px] mt-1" style={{ color }}>{suffix}</div>}</div>
}

function Rule({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return <div><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-body-faint">{label}</div><div className={`text-[13px] mt-1.5 ${warning ? 'text-amber-400' : 'text-ink'}`}>{value}</div></div>
}

function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-[12px] text-body-muted">{text}</div>
}

function rate(value: number | null) {
  return value == null ? 'ainda sem base' : `${(value * 100).toFixed(1)}%`
}

function relativeTime(iso: string) {
  const delta = new Date(iso).getTime() - Date.now()
  const minutes = Math.round(Math.abs(delta) / 60000)
  if (delta < 0) return `atrasado ${minutes} min`
  if (minutes < 60) return `em ${minutes} min`
  return `em ${Math.round(minutes / 60)}h`
}
