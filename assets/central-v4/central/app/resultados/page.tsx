'use client'

import { useEffect, useState } from 'react'
import {
  CalendarCheck, CircleDollarSign, Info, LayoutDashboard,
  MessageSquareText, Radar, ReceiptText, SlidersHorizontal, Wallet,
} from 'lucide-react'
import { useLive } from '@/components/LiveStats'
import RefreshButton from '@/components/RefreshButton'
import { brl, useExecutions } from '@/lib/execution-data'
import { Metric, PageIntro, SectionTitle } from '@/components/ProductUI'
import FocusNav, { type FocusItem } from '@/components/FocusNav'
import MoneyRadar from '@/components/MoneyRadar'
import ScenarioLab from '@/components/ScenarioLab'
import ValueReceipt from '@/components/ValueReceipt'

type View = 'resumo' | 'radar' | 'simular' | 'recibo'

const VIEWS: FocusItem<View>[] = [
  { id: 'resumo', label: 'Resumo', description: 'Indicadores e custos', icon: LayoutDashboard },
  { id: 'radar', label: 'Dinheiro parado', description: 'Oportunidades sem movimento', icon: Radar },
  { id: 'simular', label: 'Modo E se?', description: 'Teste cenários', icon: SlidersHorizontal },
  { id: 'recibo', label: 'Recibo de valor', description: 'Prove o mês', icon: ReceiptText },
]

export default function Resultados() {
  const [view, setView] = useState<View>('resumo')
  const { live } = useLive()
  const { data } = useExecutions()
  const f = data?.financeiro
  const maxCusto = Math.max(...(f?.porDia || []).map(d => d.custo), 0.01)
  const totalComponentes = f ? Object.values(f.componentes).reduce((a, b) => a + b, 0) : 0

  useEffect(() => {
    const requested = window.location.hash.replace('#', '')
    if (VIEWS.some(item => item.id === requested)) setView(requested as View)
  }, [])

  const changeView = (next: View) => {
    setView(next)
    window.history.replaceState(null, '', next === 'resumo' ? '/resultados' : `/resultados#${next}`)
  }

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="RESULTADOS E INVESTIMENTO"
        title="O valor produzido,"
        accent="sem caixa-preta."
        description="Comece pelo resumo e aprofunde somente a pergunta que deseja responder."
        action={<RefreshButton />}
      />

      <FocusNav items={VIEWS} value={view} onChange={changeView} label="Áreas de resultados" />

      {view === 'resumo' && (
        <div className="space-y-7">
          <section>
            <SectionTitle
              eyebrow="ÚLTIMOS 30 DIAS"
              title="Resumo executivo."
              description="A leitura essencial fica aqui. Análises específicas estão nas subabas acima."
            />
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <Metric icon={Wallet} label="Investimento em 30 dias" value={f?.execucoesComCusto ? brl(f.trintaDias) : '—'} hint={`${f?.execucoesComCusto || 0} execuções com ledger`} color="#22c55e" />
              <Metric icon={CircleDollarSign} label="Média por resposta" value={f?.execucoesComCusto ? brl(f.medioPorExecucao, 3) : '—'} hint="modelo + voz + transcrição + infra" color="#06b6d4" />
              <Metric icon={MessageSquareText} label="Conversas em 24h" value={live ? String(live.conversas24h) : '—'} hint="pulso mais recente da operação" color="#3b82f6" />
              <Metric icon={CalendarCheck} label="Reuniões futuras" value={live ? String(live.agenda.proximos.length) : '—'} hint={`${live?.agenda.realizados7d || 0} realizadas em 7 dias`} color="#a78bfa" />
            </div>
          </section>

          {f?.execucoesComCusto ? <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-4">
            <section className="panel p-5 md:p-6">
              <SectionTitle eyebrow="TENDÊNCIA DE 14 DIAS" title="Gasto acompanha o volume?" description="Compare custo e número de execuções por dia." />
              <div className="h-[240px] flex items-end gap-2 pt-8">
                {(f?.porDia || Array.from({ length: 14 }, (_, i) => ({ data: String(i), custo: 0, execucoes: 0 }))).map((d, i) => (
                  <div key={d.data} className="flex-1 h-full flex flex-col justify-end group relative">
                    <div className={`opacity-0 group-hover:opacity-100 absolute -top-7 whitespace-nowrap panel px-2 py-1 font-mono text-[8px] text-ink z-10 ${
                      i < 2 ? 'left-0' : i > 11 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    }`}>
                      {brl(d.custo, 3)} · {d.execucoes} exec.
                    </div>
                    <div className="w-full rounded-t-[4px] min-h-[3px] transition-all" style={{ height: `${Math.max(2, d.custo / maxCusto * 100)}%`, background: 'linear-gradient(180deg,#22d3ee,#2563eb)' }} />
                    <div className="font-mono text-[7px] text-body-faint text-center mt-2">{i % 2 === 0 ? d.data.slice(5).replace('-', '/') : ''}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-5 md:p-6">
              <SectionTitle eyebrow="COMPOSIÇÃO" title="Para onde vai o dinheiro." />
              <div className="space-y-5">
                <Breakdown label="Inteligência (Claude)" value={f?.componentes.claude || 0} total={totalComponentes} color="#3b82f6" />
                <Breakdown label="Respostas em voz" value={f?.componentes.voz || 0} total={totalComponentes} color="#a78bfa" />
                <Breakdown label="Transcrição de áudio" value={f?.componentes.transcricao || 0} total={totalComponentes} color="#06b6d4" />
                <Breakdown label="Infraestrutura rateada" value={f?.componentes.infraestrutura || 0} total={totalComponentes} color="#22c55e" />
              </div>
            </section>
          </div> : (
            <section className="panel p-5 md:p-6 flex items-start gap-4">
              <span className="metric-icon text-cyan bg-cyan/[0.07] border-cyan/20"><Info size={15} /></span>
              <div>
                <h3 className="font-impact font-bold text-[15px] text-ink">Medição financeira pronta</h3>
                <p className="text-[12.5px] leading-relaxed text-body-mid mt-1.5">
                  A próxima execução real inaugura a tendência e a composição de custos. Até lá, a Central esconde gráficos vazios em vez de ocupar a tela com zeros.
                </p>
              </div>
            </section>
          )}

          <details className="panel group overflow-hidden">
            <summary className="list-none cursor-pointer px-5 py-4 flex items-center gap-3 hover-raise">
              <Info size={15} className="text-cyan" />
              <span className="text-[13px] font-medium text-ink flex-1">Como interpretar estes números</span>
              <span className="text-[11px] text-body-faint group-open:rotate-90 transition-transform">▷</span>
            </summary>
            <div className="px-5 pb-5 pt-1 grid md:grid-cols-3 gap-4 text-[12px] leading-relaxed text-body-mid">
              <p><strong className="text-ink">Eficiência:</strong> acompanhe se o custo sobe sem ganho de qualidade ou resultado.</p>
              <p><strong className="text-ink">Cobertura:</strong> {f?.execucoesSemCusto || 0} registro(s) antigo(s) seguem honestamente como não medidos.</p>
              <p><strong className="text-ink">Fechamento:</strong> a fatura dos provedores continua sendo a fonte contábil final.</p>
            </div>
          </details>
        </div>
      )}

      {view === 'radar' && <MoneyRadar live={live} />}
      {view === 'simular' && <ScenarioLab live={live} />}
      {view === 'recibo' && <ValueReceipt live={live} data={data} />}
    </div>
  )
}

function Breakdown({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? value / total * 100 : 0
  return <div><div className="flex justify-between gap-3 text-[11.5px]"><span className="text-body-mid">{label}</span><span className="font-mono text-ink">{brl(value, 3)}</span></div><div className="h-1.5 surface-alt rounded-full mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div></div>
}
