'use client'

import Link from 'next/link'
import {
  AlertTriangle, ArrowRight, Bot, CalendarCheck, CircleDollarSign, Clock3,
  GraduationCap, MessageSquareText, ShieldCheck, Sparkles, TrendingUp, Wallet,
} from 'lucide-react'
import { useLive } from './LiveStats'
import RefreshButton from './RefreshButton'
import { brl, useExecutions } from '@/lib/execution-data'
import { Metric, PageIntro, SectionTitle } from './ProductUI'

export default function ExecutiveDashboard({ agentName }: { agentName: string }) {
  const { live, erro: liveErro, carregando: liveCarregando } = useLive()
  const { data, erro: execErro, carregando: execCarregando } = useExecutions()
  const f = data?.financeiro
  const taxaErro = data?.saude24h.total ? (data.saude24h.erros / data.saude24h.total) * 100 : 0
  const custoConhecido = !!f && f.execucoesComCusto > 0
  const precisaAtencao = (data?.saude24h.erros || 0) > 0 || liveErro || execErro
  const pronto = !liveCarregando && !execCarregando

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="PAINEL EXECUTIVO · ATUALIZADO AGORA"
        title={`A ${agentName} está`}
        accent={!pronto ? 'sendo verificada.' : precisaAtencao ? 'pedindo atenção.' : 'operando bem.'}
        description="Saúde, resultado e custo da sua operação de IA em uma leitura. O detalhe técnico fica disponível apenas quando você precisar."
        action={<RefreshButton />}
      />

      <section>
        <div className={`rounded-[10px] border px-5 py-4 flex items-center justify-between gap-4 flex-wrap ${
          !pronto ? 'border-cyan/20 bg-cyan/[0.05]' : precisaAtencao ? 'border-warning/30 bg-warning/[0.07]' : 'border-success/25 bg-success/[0.06]'
        }`}>
          <div className="flex items-start gap-3">
            {!pronto ? <Bot className="text-cyan mt-0.5 animate-pulse" size={18} /> : precisaAtencao ? <AlertTriangle className="text-warning mt-0.5" size={18} /> : <ShieldCheck className="text-success mt-0.5" size={18} />}
            <div>
              <div className="font-impact font-bold text-[15px] text-ink">
                {!pronto ? 'Conferindo agente, CRM e diário' : precisaAtencao ? 'Há algo que merece uma conferida' : 'Nenhuma ação urgente agora'}
              </div>
              <div className="text-[12.5px] text-body-mid mt-1">
                {!pronto
                  ? 'Só mostramos o veredito depois que todas as fontes responderem.'
                  : liveErro
                  ? 'Não consegui ler o CRM ao vivo. A Central continua online, mas a conexão do CRM precisa ser conferida.'
                  : execErro
                  ? 'Não consegui ler o diário de execuções. Abra a operação para tentar novamente.'
                  : precisaAtencao
                  ? `${data?.saude24h.erros || 0} erro(s) nas últimas 24h. Abra a operação para ver o motivo e o lead afetado.`
                  : `A ${agentName} está respondendo normalmente e o diário não registrou falhas nas últimas 24h.`}
              </div>
            </div>
          </div>
          <Link href="/operacao" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan">
            Ver operação <ArrowRight size={13} />
          </Link>
        </div>
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

      <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-4">
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

        <section className="panel p-5 md:p-6">
          <SectionTitle eyebrow="EFICIÊNCIA" title="Custo sob controle." />
          <div className="space-y-5">
            <CostLine label="Hoje" value={custoConhecido ? brl(f.hoje) : 'começando agora'} color="#22c55e" />
            <CostLine label="Últimos 7 dias" value={custoConhecido ? brl(f.seteDias) : '—'} color="#06b6d4" />
            <CostLine label="Últimos 30 dias" value={custoConhecido ? brl(f.trintaDias) : '—'} color="#3b82f6" />
            <div className="pt-4 border-t border-line-soft">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11.5px] text-body-muted">Taxa de erro 24h</span>
                <span className={`font-mono text-[11px] ${taxaErro === 0 ? 'text-success' : 'text-warning'}`}>{taxaErro.toFixed(1)}%</span>
              </div>
              <p className="text-[10.5px] text-body-faint leading-relaxed mt-3">Custos são estimativas operacionais por execução. A fatura do provedor continua sendo o fechamento financeiro.</p>
            </div>
          </div>
        </section>
      </div>

      <section>
        <SectionTitle eyebrow="PRÓXIMO PASSO" title="O que você quer fazer agora?" />
        <div className="grid md:grid-cols-3 gap-3">
          <Quick href="/operacao" icon={Bot} title="Acompanhar atendimentos" text="Veja quem a IA está atendendo e cada decisão registrada." color="#06b6d4" />
          <Quick href="/cerebro" icon={GraduationCap} title="Ensinar a IA" text="Teste uma conversa, corrija e deixe o porteiro de qualidade validar." color="#a78bfa" />
          <Quick href="/resultados" icon={TrendingUp} title="Ver o valor produzido" text="Cruze volume, resultado, velocidade e gasto da operação." color="#22c55e" />
        </div>
      </section>
    </div>
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
