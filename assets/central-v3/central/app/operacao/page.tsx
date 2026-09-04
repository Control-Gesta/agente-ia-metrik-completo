'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Radio, Route, ScrollText } from 'lucide-react'
import { useLive } from '@/components/LiveStats'
import RefreshButton from '@/components/RefreshButton'
import { brl, useExecutions, type Execution } from '@/lib/execution-data'
import { PageIntro, SectionTitle } from '@/components/ProductUI'

type Tab = 'agora' | 'historico' | 'funil' | 'agenda'

export default function Operacao() {
  const [tab, setTab] = useState<Tab>('agora')
  const { live, carregando } = useLive()
  const { data } = useExecutions()

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('aba')
    if (requested && ['agora', 'historico', 'funil', 'agenda'].includes(requested)) setTab(requested as Tab)
  }, [])

  const tabs: Array<{ id: Tab; label: string; icon: typeof Radio }> = [
    { id: 'agora', label: 'Agora', icon: Radio },
    { id: 'historico', label: 'Histórico', icon: ScrollText },
    { id: 'funil', label: 'Funil', icon: Route },
    { id: 'agenda', label: 'Agenda', icon: CalendarClock },
  ]

  return (
    <div className="space-y-8">
      <PageIntro eyebrow="OPERAÇÃO" title="Tudo que a IA está" accent="fazendo." description="Atendimentos, decisões, erros, movimento no funil e compromissos em um só lugar." action={<RefreshButton />} />
      <div className="segmented overflow-x-auto">
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'active' : ''}><t.icon size={13} className="inline mr-1.5" />{t.label}</button>)}
      </div>

      {tab === 'agora' && (
        <section>
          <SectionTitle eyebrow="EM TEMPO REAL" title="Conversas que merecem seu olhar." description="A IA atende sozinha. Você entra apenas quando o contexto pede uma pessoa." />
          <div className="grid md:grid-cols-3 gap-3 mb-5">
            <Mini label="IA atendendo" value={live?.grupos.iaAtendendo ?? 0} color="#22c55e" />
            <Mini label="Com humano" value={live?.grupos.comHumano ?? 0} color="#a78bfa" />
            <Mini label="Fora da IA" value={live?.grupos.foraDoGate ?? 0} color="#737373" />
          </div>
          <div className="panel overflow-hidden">
            {(live?.conversas || []).map((c, i) => (
              <div key={c.id} className={`px-5 py-4 flex items-center gap-4 ${i ? 'border-t border-line-soft' : ''}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.estado === 'bia' ? 'bg-success' : c.estado === 'humano' ? 'bg-purple-400' : 'bg-body-faint'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13px] text-ink">{c.nome}</span>
                    <span className="font-mono text-[8.5px] text-body-faint">{c.estado === 'bia' ? 'IA ATENDE' : c.estado === 'humano' ? 'COM HUMANO' : 'FORA DA IA'}</span>
                  </div>
                  <p className="text-[12px] text-body-mid truncate mt-1">{c.ultimaMsg}</p>
                </div>
                <span className="font-mono text-[9.5px] text-body-faint">{c.minutosAtras}min</span>
              </div>
            ))}
            {!carregando && !live?.conversas.length && <Empty text="Nenhuma conversa em andamento agora. Isso é normal: a IA continua monitorando." />}
            {carregando && <div className="h-40 animate-pulse surface-alt" />}
          </div>
        </section>
      )}

      {tab === 'historico' && (
        <section>
          <SectionTitle eyebrow="DIÁRIO AUDITÁVEL" title="Cada execução, com tempo e custo." description="Abra o detalhe técnico só quando precisar investigar. O resumo continua legível para o negócio." />
          <div className="space-y-2">
            {(data?.execucoes || []).map((e, i) => <ExecutionRow key={`${e.ts}-${i}`} execution={e} />)}
            {data && !data.execucoes.length && <Empty text="A próxima mensagem processada aparecerá aqui." />}
          </div>
        </section>
      )}

      {tab === 'funil' && (
        <section>
          <SectionTitle eyebrow="JORNADA COMERCIAL" title="Onde a IA está empurrando o negócio." description="Cyan são etapas sob alçada da IA. As demais dependem do time." />
          <div className="panel p-5 md:p-7 space-y-4">
            {(live?.funil || []).map((e, i, arr) => {
              const max = Math.max(...arr.map(x => x.n), 1)
              return <div key={e.label} className="grid grid-cols-[150px_1fr_35px] items-center gap-3">
                <span className={`text-[12px] ${e.ia ? 'text-ink' : 'text-body-mid'}`}>{e.label}</span>
                <div className="h-2 surface-alt rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(2, e.n / max * 100)}%`, background: e.ia ? '#06b6d4' : 'var(--body-faint)' }} /></div>
                <span className="font-mono text-[10px] text-body-muted text-right">{e.n}</span>
              </div>
            })}
          </div>
        </section>
      )}

      {tab === 'agenda' && (
        <section>
          <SectionTitle eyebrow="AGENDA PRODUZIDA" title="Próximos compromissos." description={`${live?.agenda.realizados7d || 0} reunião(ões) realizada(s) nos últimos 7 dias.`} />
          <div className="grid md:grid-cols-2 gap-3">
            {(live?.agenda.proximos || []).map(a => (
              <div key={a.id} className="panel p-5 flex items-start gap-4">
                <span className="metric-icon text-purple-400 bg-purple-500/[0.08] border-purple-500/20"><CalendarClock size={15} /></span>
                <div><h3 className="text-[13px] font-medium text-ink">{a.nome || a.titulo}</h3><p className="text-[11px] text-body-mid mt-1">{new Date(a.inicio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p></div>
              </div>
            ))}
            {!live?.agenda.proximos.length && <Empty text="Nenhum compromisso futuro encontrado neste momento." />}
          </div>
        </section>
      )}
    </div>
  )
}

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="panel px-5 py-4"><div className="font-impact font-bold text-[24px]" style={{ color }}>{value}</div><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-body-muted mt-1">{label}</div></div>
}

function ExecutionRow({ execution: e }: { execution: Execution }) {
  const Icon = e.resultado === 'respondeu' ? CheckCircle2 : e.resultado === 'erro' ? AlertTriangle : ScrollText
  const color = e.resultado === 'respondeu' ? 'text-success' : e.resultado === 'erro' ? 'text-danger' : 'text-body-muted'
  return (
    <details className="panel group">
      <summary className="list-none cursor-pointer px-5 py-4 flex items-center gap-4">
        <Icon size={16} className={`${color} shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap"><span className="text-[13px] font-medium text-ink">{e.nome}</span><span className="text-[11.5px] text-body-mid">{e.detalhe}</span></div>
          <div className="font-mono text-[9px] text-body-faint mt-1">{new Date(e.ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {(e.duracaoMs / 1000).toFixed(1)}s</div>
        </div>
        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1 font-mono text-[10px] text-success"><CircleDollarSign size={11} />{e.custo ? brl(e.custo.totalBrl, 3) : 'não medido'}</div>
          <div className="text-[9px] text-body-faint mt-1 group-open:hidden">ver detalhe</div>
        </div>
      </summary>
      <div className="px-5 pb-5 pt-1 ml-9 border-t border-line-soft">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Detail label="Chamadas ao modelo" value={String(e.custo?.tokens.chamadas || '—')} />
          <Detail label="Tokens de entrada" value={String(e.custo?.tokens.input || '—')} />
          <Detail label="Cache lido" value={String(e.custo?.tokens.cacheRead || '—')} />
          <Detail label="Tokens de saída" value={String(e.custo?.tokens.output || '—')} />
        </div>
        {!!e.tools.length && <p className="text-[10px] text-body-muted mt-4">Ações no CRM: {e.tools.join(', ')}</p>}
      </div>
    </details>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="surface-alt rounded-[6px] p-3"><div className="font-mono text-[8px] uppercase tracking-[0.1em] text-body-faint">{label}</div><div className="text-[12px] text-ink mt-1">{value}</div></div>
}

function Empty({ text }: { text: string }) {
  return <div className="panel p-8 text-center text-[12.5px] text-body-muted">{text}</div>
}
