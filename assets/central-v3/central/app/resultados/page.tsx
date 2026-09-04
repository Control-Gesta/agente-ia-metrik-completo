'use client'

import { BarChart3, CalendarCheck, CircleDollarSign, Gauge, MessageSquareText, Wallet } from 'lucide-react'
import { useLive } from '@/components/LiveStats'
import RefreshButton from '@/components/RefreshButton'
import { brl, useExecutions } from '@/lib/execution-data'
import { Metric, PageIntro, SectionTitle } from '@/components/ProductUI'

export default function Resultados() {
  const { live } = useLive()
  const { data } = useExecutions()
  const f = data?.financeiro
  const maxCusto = Math.max(...(f?.porDia || []).map(d => d.custo), 0.01)
  const totalComponentes = f ? Object.values(f.componentes).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-10">
      <PageIntro eyebrow="RESULTADOS E INVESTIMENTO" title="O valor produzido," accent="sem caixa-preta." description="Acompanhe volume, velocidade e gasto. Novas execuções passam a carregar custo real estimado; o histórico antigo permanece identificado como não medido." action={<RefreshButton />} />

      <section>
        <SectionTitle eyebrow="ÚLTIMOS 30 DIAS" title="Resumo executivo." />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Metric icon={Wallet} label="Investimento em 30 dias" value={f?.execucoesComCusto ? brl(f.trintaDias) : '—'} hint={`${f?.execucoesComCusto || 0} execuções com ledger`} color="#22c55e" />
          <Metric icon={CircleDollarSign} label="Média por resposta" value={f?.execucoesComCusto ? brl(f.medioPorExecucao, 3) : '—'} hint="modelo + voz + transcrição + infra" color="#06b6d4" />
          <Metric icon={MessageSquareText} label="Conversas em 24h" value={live ? String(live.conversas24h) : '—'} hint="pulso mais recente da operação" color="#3b82f6" />
          <Metric icon={CalendarCheck} label="Reuniões futuras" value={live ? String(live.agenda.proximos.length) : '—'} hint={`${live?.agenda.realizados7d || 0} realizadas em 7 dias`} color="#a78bfa" />
        </div>
      </section>

      <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-4">
        <section className="panel p-5 md:p-6">
          <SectionTitle eyebrow="TENDÊNCIA DE 14 DIAS" title="Gasto acompanha o volume?" description="Compare custo e número de execuções por dia." />
          <div className="h-[240px] flex items-end gap-2 pt-8">
            {(f?.porDia || Array.from({ length: 14 }, (_, i) => ({ data: String(i), custo: 0, execucoes: 0 }))).map((d, i) => (
              <div key={d.data} className="flex-1 h-full flex flex-col justify-end group relative">
                <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap panel px-2 py-1 font-mono text-[8px] text-ink z-10">
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
      </div>

      <section className="panel p-5 md:p-6">
        <SectionTitle eyebrow="LEITURA HONESTA" title="O que estes números significam." />
        <div className="grid md:grid-cols-3 gap-3">
          <Insight icon={Gauge} title="Eficiência" text="O custo por execução é comparável ao longo do tempo. Uma alta sem aumento de qualidade ou resultado vira alerta." />
          <Insight icon={BarChart3} title="Cobertura" text={`${f?.execucoesSemCusto || 0} registro(s) antigo(s) ainda não têm custo. Não inventamos retroativamente o que não foi medido.`} />
          <Insight icon={CircleDollarSign} title="Fechamento" text="Este painel é estimativa operacional. A fatura dos provedores é a fonte contábil final do mês." />
        </div>
      </section>
    </div>
  )
}

function Breakdown({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? value / total * 100 : 0
  return <div><div className="flex justify-between gap-3 text-[11.5px]"><span className="text-body-mid">{label}</span><span className="font-mono text-ink">{brl(value, 3)}</span></div><div className="h-1.5 surface-alt rounded-full mt-2 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div></div>
}

function Insight({ icon: Icon, title, text }: { icon: typeof Gauge; title: string; text: string }) {
  return <div className="surface-alt rounded-[8px] p-4"><Icon size={15} className="text-cyan" /><h3 className="font-impact font-bold text-[14px] text-ink mt-4">{title}</h3><p className="text-[12px] leading-relaxed text-body-mid mt-2">{text}</p></div>
}
