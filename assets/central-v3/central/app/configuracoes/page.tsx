import Link from 'next/link'
import { ArrowRight, BrainCircuit, Boxes, FileClock, Route, Settings2, Sparkles } from 'lucide-react'
import { PageIntro, SectionTitle } from '@/components/ProductUI'

const ITEMS = [
  { href: '/conteudo', icon: BrainCircuit, title: 'Conteúdo da IA', text: 'Produtos, respostas e mídias que a IA pode usar.', color: '#06b6d4' },
  { href: '/habilidades', icon: Sparkles, title: 'Habilidades', text: 'Ações que a IA consegue executar nos sistemas.', color: '#a78bfa' },
  { href: '/funil', icon: Route, title: 'Funil e agenda', text: 'Alçada, campos e jornada comercial configurada.', color: '#22c55e' },
  { href: '/sistema', icon: Boxes, title: 'Sistema e segurança', text: 'Módulos, provas, integrações e estado técnico.', color: '#3b82f6' },
  { href: '/roadmap', icon: FileClock, title: 'Evolução planejada', text: 'O que já existe, o que está em teste e o que vem depois.', color: '#f59e0b' },
]

export default function Configuracoes() {
  return <div className="space-y-9">
    <PageIntro eyebrow="CONFIGURAÇÕES" title="Ajustes sem poluir" accent="a operação." description="Itens usados com menos frequência ficam organizados aqui. A rotina diária continua simples." />
    <section>
      <SectionTitle eyebrow="CENTRAL E AGENTE" title="Escolha o que deseja configurar." />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {ITEMS.map(({ href, icon: Icon, title, text, color }) => <Link key={href} href={href} className="panel interactive-card p-5 group">
          <span className="metric-icon" style={{ color, background: `${color}12`, borderColor: `${color}30` }}><Icon size={15} /></span>
          <h2 className="font-impact font-bold text-[15px] text-ink mt-5">{title}</h2>
          <p className="text-[12.5px] leading-relaxed text-body-mid mt-2">{text}</p>
          <span className="inline-flex items-center gap-1 text-[11px] text-cyan mt-4">Abrir <ArrowRight size={11} /></span>
        </Link>)}
      </div>
    </section>
    <div className="rounded-[10px] border border-cyan/20 bg-cyan/[0.05] p-5 flex items-start gap-4">
      <Settings2 size={17} className="text-cyan mt-0.5" />
      <div><h3 className="font-impact font-bold text-[14px] text-ink">Estrutura protegida</h3><p className="text-[12px] text-body-mid leading-relaxed mt-1.5">Alterações críticas continuam passando pelas travas da equipe responsável. O objetivo desta área é dar clareza sem expor o cliente a configurações que podem quebrar a operação.</p></div>
    </div>
  </div>
}
