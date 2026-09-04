'use client'

import {
  AlertTriangle, Bot, CheckCircle2, CircleDollarSign, Clock3,
  Cpu, MessageSquareText, Route, Volume2,
} from 'lucide-react'
import { brl, type Execution } from '@/lib/execution-data'

export default function FlightRecorder({ execution: e }: { execution: Execution }) {
  const Icon = e.resultado === 'respondeu' ? CheckCircle2 : e.resultado === 'erro' ? AlertTriangle : Clock3
  const color = e.resultado === 'respondeu' ? 'text-success' : e.resultado === 'erro' ? 'text-danger' : 'text-body-muted'
  const totalTokens = e.custo
    ? e.custo.tokens.input + e.custo.tokens.cacheWrite + e.custo.tokens.cacheRead + e.custo.tokens.output
    : 0

  return (
    <details className="panel group overflow-hidden">
      <summary className="list-none cursor-pointer px-5 py-4 flex items-center gap-4 hover-raise">
        <span className={`w-8 h-8 rounded-lg border border-line bg-[var(--surface-2)] flex items-center justify-center ${color}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-ink">{e.nome}</span>
            <span className="text-[11.5px] text-body-mid">{e.detalhe}</span>
          </div>
          <div className="font-mono text-[9px] text-body-faint mt-1">
            {new Date(e.ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {(e.duracaoMs / 1000).toFixed(1)}s
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1 font-mono text-[10px] text-success">
            <CircleDollarSign size={11} />{e.custo ? brl(e.custo.totalBrl, 3) : 'não medido'}
          </div>
          <div className="text-[9px] text-body-faint mt-1 group-open:hidden">abrir replay</div>
        </div>
      </summary>

      <div className="px-5 pb-6 pt-5 border-t border-line-soft">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="font-mono text-[8.5px] uppercase tracking-[0.15em] text-cyan">Flight Recorder</div>
            <div className="text-[13px] text-ink mt-1">Replay técnico da execução</div>
          </div>
          <span className="font-mono text-[8.5px] text-body-faint">SEM CHAMADA EXTRA DE MODELO</span>
        </div>

        <div className="relative ml-3 border-l border-line pl-6 space-y-6">
          <Step icon={MessageSquareText} color="#06b6d4" label="Entrada do lead" detail={e.turnoLead || 'Turno não armazenado nesta execução antiga.'} />
          <Step
            icon={Cpu}
            color="#3b82f6"
            label="Processamento da IA"
            detail={e.custo
              ? `${e.custo.tokens.chamadas} chamada(s) · ${totalTokens.toLocaleString('pt-BR')} tokens contabilizados · cache ${e.custo.tokens.cacheRead.toLocaleString('pt-BR')}`
              : 'Execução anterior à telemetria detalhada de tokens.'}
          />
          {e.tools.length > 0 ? (
            <Step icon={Route} color="#a78bfa" label="Decisões no CRM" detail={e.tools.join(' → ')} />
          ) : (
            <Step icon={Route} color="#737373" label="Decisões no CRM" detail="Nenhuma tool foi necessária nesta resposta." />
          )}
          <Step
            icon={e.voz ? Volume2 : Bot}
            color="#22c55e"
            label={e.voz ? 'Resposta entregue em voz' : 'Resposta entregue'}
            detail={e.respostaIA || (e.resultado === 'erro' ? e.detalhe : 'Texto não armazenado nesta execução antiga.')}
          />
          <Step
            icon={CircleDollarSign}
            color="#22c55e"
            label="Fechamento da execução"
            detail={e.custo
              ? `${brl(e.custo.totalBrl, 4)} em ${(e.duracaoMs / 1000).toFixed(1)}s. Claude: ${brl(e.custo.claudeUsd * e.custo.usdBrl, 4)}.`
              : `${(e.duracaoMs / 1000).toFixed(1)}s · custo não medido no formato antigo.`}
          />
        </div>
      </div>
    </details>
  )
}

function Step({ icon: Icon, color, label, detail }: {
  icon: typeof Bot
  color: string
  label: string
  detail: string
}) {
  return (
    <div className="relative">
      <span className="absolute -left-[39px] top-0 w-6 h-6 rounded-full border flex items-center justify-center bg-[var(--surface)]" style={{ color, borderColor: `${color}40` }}>
        <Icon size={11} />
      </span>
      <div className="text-[12.5px] font-medium text-ink">{label}</div>
      <p className="text-[11.5px] leading-relaxed text-body-mid mt-1 whitespace-pre-wrap break-words max-w-[820px]">{detail}</p>
    </div>
  )
}
