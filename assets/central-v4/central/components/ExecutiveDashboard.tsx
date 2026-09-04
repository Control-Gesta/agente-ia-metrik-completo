'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Bot, CalendarCheck, CircleDollarSign, Clock3, GitBranch,
  GraduationCap, MessageSquareText, MousePointerClick, Sparkles, TrendingUp,
  Wallet, WalletCards,
} from 'lucide-react'
import { useLive } from './LiveStats'
import RefreshButton from './RefreshButton'
import { brl, useExecutions } from '@/lib/execution-data'
import { Metric, PageIntro, SectionTitle } from './ProductUI'
import FocusNav, { type FocusItem } from './FocusNav'
import { buildBriefing, type DecisionCard, type SignalTone } from '@/lib/central-intelligence'

type Focus = 'agir' | 'funil' | 'custos'

const FOCUS: FocusItem<Focus>[] = [
  { id: 'agir', label: 'Próximos passos', description: 'Escolha o que fazer', icon: MousePointerClick },
  { id: 'funil', label: 'Movimento comercial', description: 'Veja onde estão os leads', icon: GitBranch },
  { id: 'custos', label: 'Eficiência', description: 'Acompanhe gastos e erros', icon: WalletCards },
]

export default function ExecutiveDashboard({ agentName }: { agentName: string }) {
  const [focus, setFocus] = useState<Focus>('agir')
  const { live, erro: liveErro, carregando: liveCarregando } = useLive()
  const { data, erro: execErro, carregando: execCarregando } = useExecutions()
  const f = data?.financeiro
  const taxaErro = data?.saude24h.total ? (data.saude24h.erros / data.saude24h.total) * 100 : 0
  const custoConhecido = !!f && f.execucoesComCusto > 0
  const precisaAtencao = (data?.saude24h.erros || 0) > 0 || liveErro || execErro
  const pronto = !liveCarregando && !execCarregando
  const briefing = buildBriefing(live, data, agentName)
  const [primaryDecision, ...secondaryDecisions] = briefing.decisions

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="PAINEL EXECUTIVO · ATUALIZADO AGORA"
        title={`A ${agentName} está`}
        accent={!pronto ? 'sendo verificada.' : precisaAtencao ? 'pedindo atenção.' : 'operando bem.'}
        description="Primeiro, o que pede decisão. Depois, somente o detalhe que você escolher abrir."
        action={<RefreshButton />}
      />

      <section className="panel overflow-hidden">
        <div className="p-5 md:p-6 border-b border-line-soft flex items-start gap-4">
          <div className={`state-orb shrink-0 ${precisaAtencao ? 'text-warning bg-warning/[0.08]' : 'text-cyan bg-cyan/[0.08]'}`}>
            <Sparkles size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan">Briefing da Central · zero tokens</div>
            <h2 className="font-impact font-bold text-[19px] md:text-[22px] text-ink mt-2">{briefing.greeting}</h2>
            <p className="text-[13px] text-body-mid leading-relaxed mt-2">{briefing.summary}</p>
          </div>
        </div>
        {primaryDecision ? (
          <div>
            <div className="grid lg:grid-cols-[1.15fr_.85fr]">
              <Decision decision={primaryDecision} primary />
              <div className="border-t lg:border-t-0 lg:border-l border-line-soft p-5 flex flex-col justify-center">
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-body-muted">
                  {precisaAtencao ? 'ESTADO ATUAL' : 'OPERAÇÃO PROTEGIDA'}
                </div>
                <p className="text-[13px] text-body-mid leading-relaxed mt-2">
                  {!pronto
                    ? 'Conferindo agente, CRM e diário antes de mostrar o veredito.'
                    : liveErro
                    ? 'A Central está online, mas a leitura ao vivo do CRM precisa ser conferida.'
                    : execErro
                    ? 'O diário de execuções não respondeu. Abra a operação para investigar.'
                    : precisaAtencao
                    ? `${data?.saude24h.erros || 0} erro(s) nas últimas 24h merecem conferência.`
                    : `A ${agentName} está respondendo normalmente e sem falha registrada nas últimas 24h.`}
                </p>
                <Link href="/operacao" className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-cyan mt-4">
                  Ver operação <ArrowRight size={12} />
                </Link>
              </div>
            </div>
            {secondaryDecisions.length > 0 && (
              <details className="group border-t border-line-soft">
                <summary className="list-none cursor-pointer px-5 py-3.5 flex items-center gap-3 hover-raise">
                  <span className="text-[12px] font-medium text-ink flex-1">
                    Ver mais {secondaryDecisions.length} sinais do briefing
                  </span>
                  <span className="text-[11px] text-body-faint group-open:rotate-90 transition-transform">▷</span>
                </summary>
                <div className="grid md:grid-cols-2 border-t border-line-soft divide-y md:divide-y-0 md:divide-x divide-line-soft">
                  {secondaryDecisions.map(d => <Decision key={d.id} decision={d} compact />)}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="h-28 animate-pulse surface-alt" />
        )}
      </section>

      <section>
        <SectionTitle eyebrow="O QUE IMPORTA HOJE" title="Resultado, velocidade e investimento." />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Metric icon={MessageSquareText} label="Conversas nas últimas 24h" value={live ? String(live.conversas24h) : '—'} hint="atendimentos que passaram pela operação" color="#06b6d4" />
          <Metric icon={Clock3} label="Tempo mediano de resposta" value={live?.respostaMedianaSegundos ? `${Math.round(live.respostaMedianaSegundos)}s` : '—'} hint="do lead até a resposta da IA" color="#3b82f6" />
          <Metric icon={CalendarCheck} label="Reuniões no radar" value={live ? String(live.agenda.proximos.length) : '—'} hint="próximos compromissos encontrados" color="#a78bfa" featured={(live?.agenda.proximos.length || 0) > 0} />
          <Metric icon={Wallet} label="Custo operacional hoje" value={custoConhecido ? brl(f.hoje) : '—'} hint={custoConhecido ? `${brl(f.medioPorExecucao, 3)} por resposta, em média` : 'ledger ativo; aguardando nova execução'} color="#22c55e" />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle
          eyebrow="APROFUNDE SE PRECISAR"
          title="Uma pergunta por vez."
          description="Escolha um assunto. A Central mostra somente o detalhe relacionado."
        />
        <FocusNav items={FOCUS} value={focus} onChange={setFocus} label="Detalhes da visão geral" />
      </section>

      {focus === 'funil' && (
        <section className="panel p-5 md:p-6">
          <SectionTitle eyebrow="MOVIMENTO COMERCIAL" title="Onde os leads estão agora." description="A largura mostra volume. O destaque cyan indica etapas que a IA opera." action={<Link href="/operacao?aba=funil" className="text-[11px] text-cyan">abrir funil</Link>} />
          <div className="space-y-3">
            {(live?.funil || []).slice(0, 7).map((etapa, i, arr) => {
              const max = Math.max(...arr.map(x => x.n), 1)
              return (
                <div key={etapa.label}>
                  <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                    <span className={etapa.ia ? 'text-ink' : 'text-body-mid'}>{etapa.label}</span>
                    <span className="font-mono text-body-muted">{etapa.n}</span>
                  </div>
                  <div className="h-1.5 rounded-full surface-alt overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.max(3, (etapa.n / max) * 100)}%`,
                      background: etapa.ia ? 'linear-gradient(90deg,#0891b2,#22d3ee)' : 'var(--body-faint)',
                    }} />
                  </div>
                </div>
              )
            })}
            {!live && <div className="h-32 rounded-lg surface-alt animate-pulse" />}
          </div>
        </section>
      )}

      {focus === 'custos' && (
        <section className="panel p-5 md:p-6">
          <SectionTitle eyebrow="EFICIÊNCIA" title="Custo sob controle." />
          <div className="grid sm:grid-cols-3 gap-5">
            <CostLine label="Hoje" value={custoConhecido ? brl(f.hoje) : 'começando agora'} color="#22c55e" />
            <CostLine label="Últimos 7 dias" value={custoConhecido ? brl(f.seteDias) : '—'} color="#06b6d4" />
            <CostLine label="Últimos 30 dias" value={custoConhecido ? brl(f.trintaDias) : '—'} color="#3b82f6" />
            <div className="sm:col-span-3 pt-4 border-t border-line-soft">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11.5px] text-body-muted">Taxa de erro 24h</span>
                <span className={`font-mono text-[11px] ${taxaErro === 0 ? 'text-success' : 'text-warning'}`}>{taxaErro.toFixed(1)}%</span>
              </div>
              <p className="text-[10.5px] text-body-faint leading-relaxed mt-3">Custos são estimativas operacionais por execução. A fatura do provedor continua sendo o fechamento financeiro.</p>
            </div>
          </div>
        </section>
      )}

      {focus === 'agir' && (
        <section>
        <SectionTitle eyebrow="PRÓXIMO PASSO" title="O que você quer fazer agora?" />
        <div className="grid md:grid-cols-3 gap-3">
          <Quick href="/operacao" icon={Bot} title="Acompanhar atendimentos" text="Veja quem a IA está atendendo e cada decisão registrada." color="#06b6d4" />
          <Quick href="/cerebro" icon={GraduationCap} title="Ensinar a IA" text="Teste uma conversa, corrija e deixe o porteiro de qualidade validar." color="#a78bfa" />
          <Quick href="/resultados" icon={TrendingUp} title="Ver o valor produzido" text="Cruze volume, resultado, velocidade e gasto da operação." color="#22c55e" />
        </div>
        </section>
      )}
    </div>
  )
}

const TONE: Record<SignalTone, { color: string; label: string }> = {
  calm: { color: '#22c55e', label: 'PROTEÇÃO' },
  attention: { color: '#f59e0b', label: 'ATENÇÃO' },
  critical: { color: '#ef4444', label: 'URGENTE' },
  opportunity: { color: '#22c55e', label: 'OPORTUNIDADE' },
  learning: { color: '#a78bfa', label: 'APRENDIZADO' },
}

function Decision({
  decision: d,
  primary = false,
  compact = false,
}: {
  decision: DecisionCard
  primary?: boolean
  compact?: boolean
}) {
  const tone = TONE[d.tone]
  return (
    <Link href={d.href} className={`p-5 interactive-card group ${primary ? 'min-h-[185px]' : compact ? 'min-h-[145px]' : ''}`}>
      <div className="font-mono text-[8.5px] tracking-[0.13em]" style={{ color: tone.color }}>{tone.label}</div>
      <h3 className={`font-impact font-bold text-ink mt-3 ${primary ? 'text-[17px]' : 'text-[15px]'}`}>{d.title}</h3>
      <p className="text-[11.5px] text-body-mid leading-relaxed mt-2">{d.evidence}</p>
      {!compact && <p className="text-[10.5px] text-body-faint leading-relaxed mt-2">{d.impact}</p>}
      <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan mt-4">{d.action} <ArrowRight size={11} /></span>
    </Link>
  )
}

function CostLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-[7px] border flex items-center justify-center" style={{ color, borderColor: `${color}30`, background: `${color}12` }}>
        <CircleDollarSign size={14} />
      </span>
      <div className="flex-1">
        <div className="text-[11px] text-body-muted">{label}</div>
        <div className="font-impact font-bold text-[17px] text-ink mt-0.5">{value}</div>
      </div>
    </div>
  )
}

function Quick({ href, icon: Icon, title, text, color }: { href: string; icon: typeof Sparkles; title: string; text: string; color: string }) {
  return (
    <Link href={href} className="panel interactive-card p-5 group">
      <span className="metric-icon" style={{ color, background: `${color}12`, borderColor: `${color}30` }}><Icon size={15} /></span>
      <h3 className="font-impact font-bold text-[15px] text-ink mt-5">{title}</h3>
      <p className="text-[12.5px] leading-relaxed text-body-mid mt-2">{text}</p>
      <span className="inline-flex items-center gap-1 text-[11px] text-cyan mt-4">Abrir <ArrowRight size={11} /></span>
    </Link>
  )
}
