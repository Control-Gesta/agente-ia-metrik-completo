'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BarChart3, GraduationCap, LayoutDashboard, Settings2 } from 'lucide-react'
import ToggleTema from './ToggleTema'

const NOME_CLIENTE = 'CLIENTE'
const SISTEMA_VERSAO = 'CENTRAL V3'

const NAV = [
  { href: '/', label: 'Visão Geral', hint: 'saúde e decisões', Icon: LayoutDashboard },
  { href: '/operacao', label: 'Operação', hint: 'agora e histórico', Icon: Activity },
  { href: '/cerebro', label: 'Ensinar', hint: 'teste e conteúdo', Icon: GraduationCap },
  { href: '/resultados', label: 'Resultados', hint: 'valor e custos', Icon: BarChart3 },
  { href: '/configuracoes', label: 'Configurações', hint: 'regras e sistema', Icon: Settings2 },
]

function ativo(path: string, href: string) {
  if (href === '/') return path === '/'
  if (href === '/cerebro') return path === '/cerebro' || path === '/conteudo'
  if (href === '/operacao') return ['/operacao', '/ao-vivo', '/execucoes', '/funil'].includes(path)
  if (href === '/configuracoes') return ['/configuracoes', '/sistema', '/habilidades', '/roadmap'].includes(path)
  return path === href
}

export default function Sidebar() {
  const path = usePathname()
  return (
    <>
      <aside className="w-[248px] shrink-0 sticky top-0 h-screen hidden md:flex flex-col border-r border-line-soft sidebar-shell">
        <div className="px-6 py-7 border-b border-line-soft flex items-start justify-between">
          <div>
            <div className="font-mono text-[15px] font-semibold tracking-[0.2em] text-ink">METR<span className="text-cyan">I</span>K</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-body-muted mt-1.5">Central de Inteligência</div>
          </div>
          <ToggleTema />
        </div>

        <div className="px-4 pt-5 pb-2">
          <div className="rounded-[8px] border border-success/20 bg-success/[0.06] px-3.5 py-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_#22c55e] animate-pulse-slow" />
              <span className="font-mono text-[9px] tracking-[0.14em] text-success">CENTRAL ONLINE</span>
            </div>
            <div className="text-[11px] text-body-muted mt-1.5">monitoramento disponível · 24/7</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {NAV.map(({ href, label, hint, Icon }) => {
            const active = ativo(path, href)
            return (
              <Link key={href} href={href}
                className={`group flex items-center gap-3 px-3.5 py-3 rounded-[7px] border transition-all ${
                  active ? 'text-cyan border-cyan/25 bg-cyan/[0.08]' : 'text-body-mid border-transparent hover:text-ink hover:bg-ink/[0.035]'
                }`}>
                <Icon size={16} strokeWidth={2} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">{label}</span>
                  <span className="block font-mono text-[8.5px] uppercase tracking-[0.08em] text-body-faint mt-0.5">{hint}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-5 border-t border-line-soft">
          <div className="font-mono text-[9px] text-body-faint tracking-wide">{NOME_CLIENTE} · {SISTEMA_VERSAO}</div>
          <div className="text-[10.5px] text-body-muted mt-1">Última leitura: agora</div>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-50 border-b border-line-soft sidebar-shell px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[13px] font-semibold tracking-[0.2em] text-ink">METR<span className="text-cyan">I</span>K</div>
          <ToggleTema />
        </div>
        <nav className="flex gap-1 overflow-x-auto scroll-thin pb-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[11px] border ${
              ativo(path, href) ? 'text-cyan border-cyan/25 bg-cyan/[0.08]' : 'text-body-muted border-transparent'
            }`}>
              <Icon size={13} /> {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
