'use client'

import { useMemo, useState } from 'react'
import { Check, Clock3, Copy, FileDown, MessagesSquare, Target, Wallet } from 'lucide-react'
import type { LiveData } from './LiveStats'
import type { ExecutionData } from '@/lib/execution-data'
import { brl } from '@/lib/execution-data'
import { SectionTitle } from './ProductUI'

export default function ValueReceipt({ live, data }: { live: LiveData | null; data: ExecutionData | null }) {
  const [minutes, setMinutes] = useState(4)
  const [copied, setCopied] = useState(false)
  const monthStart = useMemo(() => Date.now() - 30 * 86_400_000, [])
  const handled = (data?.execucoes || []).filter(e => new Date(e.ts).getTime() >= monthStart && e.resultado === 'respondeu').length
  const savedHours = handled * minutes / 60
  const pipeline = (live?.funil || []).reduce((n, s) => n + (s.valor || 0), 0)
  const f = data?.financeiro

  const summary = `Recibo de Valor · últimos 30 dias
${handled} respostas concluídas pela operação
${savedHours.toFixed(1)} horas operacionais estimadas (${minutes} min por atendimento)
${live?.agenda.realizados7d || 0} reuniões registradas nos últimos 7 dias
${pipeline ? `${brl(pipeline, 0)} em pipeline aberto visível` : 'Pipeline sem valor monetário preenchido'}
${f?.execucoesComCusto ? `${brl(f.trintaDias)} de custo operacional medido` : 'Ledger aguardando primeira execução nova'}
Fonte: Central de IA`

  const copy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="panel p-5 md:p-6 value-receipt">
      <SectionTitle
        eyebrow="RECIBO DE VALOR · ÚLTIMOS 30 DIAS"
        title="O que a operação entregou."
        description="Pronto para reunião de resultado, impressão ou PDF. Premissas ficam visíveis."
        action={
          <div className="flex gap-2 no-print">
            <button onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-[10.5px] text-body-mid hover:text-ink">
              {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}{copied ? 'Copiado' : 'Copiar'}
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan/30 bg-cyan/[0.08] text-[10.5px] text-cyan">
              <FileDown size={12} /> Salvar PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReceiptMetric icon={MessagesSquare} label="Respostas concluídas" value={String(handled)} />
        <ReceiptMetric icon={Clock3} label="Horas operacionais estimadas" value={`${savedHours.toFixed(1)}h`} />
        <ReceiptMetric icon={Target} label="Pipeline aberto visível" value={pipeline ? brl(pipeline, 0) : '—'} />
        <ReceiptMetric icon={Wallet} label="Custo operacional medido" value={f?.execucoesComCusto ? brl(f.trintaDias) : '—'} />
      </div>

      <div className="mt-5 pt-5 border-t border-line-soft grid md:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <div className="text-[11px] text-body-mid">Premissa de economia por resposta</div>
          <p className="text-[9.5px] text-body-faint mt-1">Tempo que uma pessoa levaria para ler contexto, responder e registrar a interação.</p>
        </div>
        <label className="no-print flex items-center gap-3">
          <input type="range" min="2" max="12" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="accent-cyan-500" />
          <span className="font-mono text-[10px] text-ink w-12">{minutes} min</span>
        </label>
      </div>
      <p className="text-[9px] text-body-faint mt-4">Pipeline aberto não é receita realizada. Horas são estimativa operacional ajustável; custo vem do ledger gravado por execução.</p>
    </section>
  )
}

function ReceiptMetric({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="surface-alt rounded-lg p-4">
      <Icon size={15} className="text-cyan" />
      <div className="font-impact font-bold text-[20px] text-ink mt-4">{value}</div>
      <div className="text-[10px] text-body-muted mt-1">{label}</div>
    </div>
  )
}
