'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Bot, Box, CheckCircle2, Database, FileText, Image,
  Network, PackageOpen, ShieldCheck, Sparkles, Wrench,
} from 'lucide-react'
import { SectionTitle } from './ProductUI'

interface NodeInfo {
  id: string
  label: string
  subtitle: string
  count: number
  color: string
  icon: typeof Bot
  detail: string[]
  health: 'ok' | 'attention'
}

export default function KnowledgeMap({ promptText }: { promptText: string }) {
  const [catalog, setCatalog] = useState<Array<{ produto: string; preco: string; ativo: boolean }>>([])
  const [faqs, setFaqs] = useState<Array<{ topico: string; pergunta: string; ativo: boolean }>>([])
  const [media, setMedia] = useState<Array<{ titulo: string; categoria: string; tipo: string; ativo: boolean }>>([])
  const [school, setSchool] = useState<{ saude?: { total: number; novas: number }; chips?: unknown[] } | null>(null)
  const [selected, setSelected] = useState('prompt')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/central?recurso=catalogo').then(r => r.json()),
      fetch('/api/central?recurso=conhecimento').then(r => r.json()),
      fetch('/api/central?recurso=midias').then(r => r.json()),
      fetch('/api/escola').then(r => r.json()),
    ]).then(([c, k, m, e]) => {
      setCatalog(c.itens || [])
      setFaqs(k.faqs || [])
      setMedia(m.midias || [])
      if (!e.error) setSchool(e)
    }).finally(() => setLoading(false))
  }, [])

  const nodes = useMemo<NodeInfo[]>(() => {
    const sections = promptText.split(/^# /m).filter(Boolean).map(p => p.split('\n')[0].trim())
    const activeCatalog = catalog.filter(i => i.ativo !== false)
    const activeFaqs = faqs.filter(i => i.ativo !== false)
    const activeMedia = media.filter(i => i.ativo !== false)
    const duplicateProducts = activeCatalog.filter((x, i, a) => a.findIndex(y => y.produto.toLowerCase() === x.produto.toLowerCase()) !== i)
    return [
      {
        id: 'prompt', label: 'Regras', subtitle: 'identidade e decisão', count: sections.length,
        color: '#06b6d4', icon: FileText, health: sections.length ? 'ok' : 'attention',
        detail: sections.slice(0, 8),
      },
      {
        id: 'catalog', label: 'Catálogo', subtitle: 'ofertas e preços', count: activeCatalog.length,
        color: '#22c55e', icon: PackageOpen, health: duplicateProducts.length ? 'attention' : 'ok',
        detail: activeCatalog.slice(0, 8).map(i => `${i.produto} · ${i.preco}`),
      },
      {
        id: 'knowledge', label: 'Conhecimento', subtitle: 'FAQ e respostas oficiais', count: activeFaqs.length,
        color: '#3b82f6', icon: Database, health: activeFaqs.length ? 'ok' : 'attention',
        detail: activeFaqs.slice(0, 8).map(f => `${f.topico} · ${f.pergunta}`),
      },
      {
        id: 'examples', label: 'Exemplos', subtitle: 'correções ensinadas', count: school?.saude?.total || 0,
        color: '#a78bfa', icon: BookOpen, health: (school?.saude?.novas || 0) > 3 ? 'attention' : 'ok',
        detail: [
          `${school?.saude?.total || 0} ensinamento(s) registrado(s)`,
          `${school?.saude?.novas || 0} aguardando triagem`,
        ],
      },
      {
        id: 'media', label: 'Mídias', subtitle: 'arquivos que a IA envia', count: activeMedia.length,
        color: '#f59e0b', icon: Image, health: activeMedia.length ? 'ok' : 'attention',
        detail: activeMedia.slice(0, 8).map(m => `${m.categoria} · ${m.titulo} (${m.tipo})`),
      },
      {
        id: 'tools', label: 'Tools', subtitle: 'ações no CRM', count: 8,
        color: '#ef4444', icon: Wrench, health: 'ok',
        detail: ['Buscar contato', 'Consultar agenda', 'Agendar reunião', 'Mover etapa', 'Preencher qualificação', 'Atualizar campo', 'Adicionar tag', 'Escalar para humano'],
      },
    ]
  }, [catalog, faqs, media, promptText, school])

  const active = nodes.find(n => n.id === selected) || nodes[0]
  const total = nodes.reduce((n, x) => n + x.count, 0)
  const attention = nodes.filter(n => n.health === 'attention')

  return (
    <section className="space-y-5">
      <SectionTitle
        eyebrow="MAPA VIVO · ZERO TOKENS"
        title="Veja o que a IA realmente sabe."
        description="Cada nó é uma fonte diferente. Clique para inspecionar conteúdo, volume e sinais de atenção."
        action={<span className="state-orb text-purple-400 bg-purple-400/[0.07]"><Network size={17} /></span>}
      />

      <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-4">
        <div className="knowledge-map panel relative overflow-hidden min-h-[520px] p-5">
          <div className="absolute inset-0 bg-dots opacity-50" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" viewBox="0 0 800 520" preserveAspectRatio="none" aria-hidden="true">
            {[[175,135],[400,82],[625,135],[175,390],[400,440],[625,390]].map(([x,y], i) => (
              <line key={i} x1="400" y1="260" x2={x} y2={y} stroke={nodes[i].color} strokeOpacity=".18" strokeWidth="1" strokeDasharray="5 7" />
            ))}
          </svg>

          <div className="relative z-10 hidden md:block h-[480px]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full border border-cyan/30 bg-cyan/[0.06] flex flex-col items-center justify-center text-center shadow-[0_0_70px_rgba(6,182,212,.08)]">
              <Sparkles size={20} className="text-cyan" />
              <div className="font-impact font-bold text-[17px] text-ink mt-3">Cérebro vivo</div>
              <div className="font-mono text-[9px] text-body-muted mt-1">{total} sinais mapeados</div>
            </div>
            {nodes.map((n, i) => {
              const pos = [
                'left-[5%] top-[6%]', 'left-1/2 -translate-x-1/2 top-[1%]', 'right-[5%] top-[6%]',
                'left-[5%] bottom-[6%]', 'left-1/2 -translate-x-1/2 bottom-[1%]', 'right-[5%] bottom-[6%]',
              ][i]
              const Icon = n.icon
              return (
                <button key={n.id} onClick={() => setSelected(n.id)} className={`absolute ${pos} w-[180px] text-left panel interactive-card p-4 ${selected === n.id ? 'ring-1 ring-purple-400/45' : ''}`}>
                  <div className="flex items-start justify-between">
                    <span className="metric-icon" style={{ color: n.color, background: `${n.color}12`, borderColor: `${n.color}30` }}><Icon size={14} /></span>
                    <span className="font-impact font-bold text-[20px]" style={{ color: n.color }}>{loading ? '·' : n.count}</span>
                  </div>
                  <div className="text-[13px] font-medium text-ink mt-3">{n.label}</div>
                  <div className="text-[9.5px] text-body-muted mt-1">{n.subtitle}</div>
                </button>
              )
            })}
          </div>

          <div className="relative z-10 md:hidden grid grid-cols-2 gap-2">
            {nodes.map(n => {
              const Icon = n.icon
              return (
                <button key={n.id} onClick={() => setSelected(n.id)} className={`panel interactive-card text-left p-4 ${selected === n.id ? 'border-purple-400/45' : ''}`}>
                  <Icon size={15} style={{ color: n.color }} />
                  <div className="font-impact font-bold text-[18px] text-ink mt-4">{n.count}</div>
                  <div className="text-[11px] text-body-muted">{n.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="panel p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: active.color }}>{active.label}</div>
              <h3 className="font-impact font-bold text-[18px] text-ink mt-2">{active.count} item(ns) ativos</h3>
            </div>
            {active.health === 'ok'
              ? <CheckCircle2 size={17} className="text-success" />
              : <ShieldCheck size={17} className="text-warning" />}
          </div>
          <p className="text-[11.5px] text-body-mid mt-2">{active.subtitle}</p>
          <div className="mt-5 space-y-2 max-h-[330px] overflow-y-auto scroll-thin">
            {active.detail.length > 0 ? active.detail.map((d, i) => (
              <div key={i} className="surface-alt rounded-lg p-3 text-[11px] leading-relaxed text-body-mid">{d}</div>
            )) : (
              <div className="surface-alt rounded-lg p-4 text-[11px] text-body-muted">Nenhum conteúdo ativo nesta fonte.</div>
            )}
          </div>
          {attention.length > 0 && (
            <div className="mt-5 pt-5 border-t border-line-soft">
              <div className="font-mono text-[8px] text-warning tracking-[0.12em]">SINAIS DE ATENÇÃO</div>
              <p className="text-[10.5px] text-body-muted leading-relaxed mt-2">{attention.map(n => n.label).join(' · ')}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
