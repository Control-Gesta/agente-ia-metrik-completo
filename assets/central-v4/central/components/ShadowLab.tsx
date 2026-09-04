'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, FlaskConical, ShieldCheck, Wallet, X } from 'lucide-react'
import { brl } from '@/lib/execution-data'
import { SectionTitle } from './ProductUI'

interface RealCase {
  ts: string
  turnoLead: string
  respostaIA: string
  tools?: string[]
  nome?: string
}

interface ShadowOutput {
  id: string
  lead: string
  atual: string
  candidata: string
  toolsAtuais: string[]
  toolsCandidatas: string[]
  custoBrl: number
  sinais: Record<string, boolean>
}

export default function ShadowLab({ promptText }: { promptText: string }) {
  const [cases, setCases] = useState<RealCase[]>([])
  const [rule, setRule] = useState('')
  const [limit, setLimit] = useState(3)
  const [confirmed, setConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ resultados: ShadowOutput[]; custoTotalBrl: number; aviso: string; interrompidoPorBudget: boolean } | null>(null)
  const reservePerCase = 0.20
  const budget = Number((limit * reservePerCase).toFixed(2))

  useEffect(() => {
    fetch('/api/escola?acao=conversas').then(r => r.json()).then(d => setCases(d.conversas || [])).catch(() => setCases([]))
  }, [])

  const selected = useMemo(() => cases.filter(c => c.turnoLead && c.respostaIA).slice(0, limit), [cases, limit])

  const run = async () => {
    if (!confirmed || !rule.trim() || !selected.length) return
    setRunning(true)
    setResult(null)
    try {
      const candidate = `${promptText}\n\n# Regra candidata — Shadow Lab\n${rule.trim()}`
      const r = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'shadow',
          texto: candidate,
          budgetBrl: budget,
          casos: selected.map((c, i) => ({
            id: `${c.ts}-${i}`,
            lead: c.turnoLead,
            atual: c.respostaIA,
            toolsAtuais: c.tools || [],
          })),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.mensagem || d.error || 'não consegui rodar')
      setResult(d)
    } catch (e) {
      setResult({ resultados: [], custoTotalBrl: 0, interrompidoPorBudget: false, aviso: e instanceof Error ? e.message : 'erro' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="SHADOW LAB · SOMENTE SOB DEMANDA"
        title="Teste uma regra contra conversas reais."
        description="A resposta atual não é gerada outra vez. Só a candidata consome modelo; tools são simuladas e nenhuma mensagem vai ao cliente."
        action={<span className="state-orb text-purple-400 bg-purple-400/[0.07]"><FlaskConical size={17} /></span>}
      />

      <div className="grid xl:grid-cols-[.8fr_1.2fr] gap-4">
        <div className="panel p-5">
          <label className="block text-[11px] text-body-mid mb-2">Qual hipótese você quer testar?</label>
          <textarea
            value={rule}
            onChange={e => { setRule(e.target.value); setResult(null); setConfirmed(false) }}
            placeholder="Ex.: quando perguntarem preço, responda primeiro com a faixa de investimento e depois faça uma pergunta de contexto."
            className="campo w-full h-[130px] rounded-xl p-4 text-[13px] leading-relaxed resize-none"
          />

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-body-mid">Conversas do lote</span>
              <span className="font-mono text-[10px] text-ink">{limit}</span>
            </div>
            <input type="range" min="1" max={Math.min(5, Math.max(cases.length, 1))} value={limit} onChange={e => { setLimit(Number(e.target.value)); setConfirmed(false) }} className="w-full accent-purple-500 mt-3" />
          </div>

          <div className="mt-5 rounded-lg border border-success/20 bg-success/[0.05] p-4">
            <div className="flex items-center gap-2 text-[11px] text-success"><Wallet size={13} /> Proteção de custo</div>
            <ul className="text-[10px] leading-relaxed text-body-muted mt-2 space-y-1">
              <li>• máximo de 5 candidatas por lote</li>
              <li>• reserva autorizada do lote: {brl(budget)}</li>
              <li>• reserva conservadora: {brl(reservePerCase)} por caso</li>
              <li>• servidor não inicia caso sem reserva disponível</li>
              <li>• sem juiz LLM e sem rerodar a versão atual</li>
            </ul>
          </div>

          <label className="mt-4 flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 accent-cyan-500" />
            <span className="text-[10.5px] leading-relaxed text-body-mid">Entendo que este lote faz chamadas reais. O custo exato só existe depois da resposta; a reserva é conservadora, não uma garantia contábil do provedor.</span>
          </label>

          <button
            onClick={run}
            disabled={!confirmed || !rule.trim() || !selected.length || running}
            className="w-full mt-4 px-4 py-3 rounded-xl border border-purple-400/30 bg-purple-400/[0.11] text-purple-300 text-[12px] font-medium disabled:opacity-30"
          >
            {running ? `Rodando ${selected.length} candidata(s)…` : `Rodar lote protegido (${selected.length})`}
          </button>
          {!cases.length && <p className="text-[10.5px] text-warning mt-3">Ainda não há conversas reais anonimizadas disponíveis.</p>}
        </div>

        <div className="space-y-3">
          {!result && (
            <div className="panel min-h-[420px] flex items-center justify-center p-8 text-center">
              <div>
                <ShieldCheck size={25} className="text-body-faint mx-auto" />
                <h3 className="text-[14px] text-ink mt-4">Nada roda sozinho</h3>
                <p className="text-[11px] text-body-muted max-w-[360px] mt-2">Escreva a hipótese, escolha o lote e confirme o orçamento. A publicação continua bloqueada.</p>
              </div>
            </div>
          )}
          {result && (
            <>
              <div className="panel px-4 py-3 flex items-center justify-between gap-3">
                <div className="text-[11px] text-body-mid">{result.aviso}</div>
                <span className="font-mono text-[10px] text-success shrink-0">{brl(result.custoTotalBrl, 4)}</span>
              </div>
              {result.resultados.map((r, i) => (
                <details key={r.id} className="panel group" open={i === 0}>
                  <summary className="list-none cursor-pointer p-4 flex items-center justify-between gap-3">
                    <span className="text-[12px] text-ink">Caso {i + 1}: {r.lead.slice(0, 70)}{r.lead.length > 70 ? '…' : ''}</span>
                    <SignalCount sinais={r.sinais} />
                  </summary>
                  <div className="border-t border-line-soft grid md:grid-cols-2">
                    <Answer label="Resposta atual" text={r.atual} />
                    <Answer label="Resposta candidata" text={r.candidata} candidate />
                  </div>
                </details>
              ))}
              {!result.resultados.length && <div className="panel p-6 text-[12px] text-warning">{result.aviso}</div>}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function SignalCount({ sinais }: { sinais: Record<string, boolean> }) {
  const ok = Object.values(sinais).filter(Boolean).length
  const total = Object.keys(sinais).length
  return <span className={`font-mono text-[9px] ${ok === total ? 'text-success' : 'text-warning'}`}>{ok}/{total} sinais</span>
}

function Answer({ label, text, candidate = false }: { label: string; text: string; candidate?: boolean }) {
  return (
    <div className={`p-4 ${candidate ? 'md:border-l border-line-soft bg-purple-400/[0.025]' : ''}`}>
      <div className="font-mono text-[8px] uppercase tracking-[0.13em] text-body-faint mb-3">{label}</div>
      <p className="text-[11.5px] leading-relaxed text-body-mid whitespace-pre-wrap">{text || 'Sem resposta'}</p>
    </div>
  )
}
