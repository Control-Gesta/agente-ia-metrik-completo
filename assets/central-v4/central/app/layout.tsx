import type { Metadata } from 'next'
import { JetBrains_Mono, Manrope, Space_Grotesk } from 'next/font/google'
import Sidebar from '@/components/Sidebar'
import CentralCommand from '@/components/CentralCommand'
import './globals.css'

const display = Manrope({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-syne' })
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-grotesk' })
const jet = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-jet' })

export const metadata: Metadata = {
  title: 'Central de IA · CLIENTE',
  description: 'Área do cliente — seus agentes de IA, ao vivo',
}

// Roda ANTES do primeiro paint: aplica o tema salvo (ou o do sistema) no
// <html> antes do React montar. Sem isto, a página pisca escuro→claro no load
// de quem escolheu claro — o "flash of wrong theme", o defeito nº1 de dark mode.
const TEMA_INICIAL = `(function(){try{var t=localStorage.getItem('tema');
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" className={`${display.variable} ${grotesk.variable} ${jet.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} /></head>
      <body className="font-space antialiased">
        <div className="min-h-screen md:flex">
          <Sidebar />
          <main className="flex-1 min-w-0 px-4 py-6 md:px-7 md:py-8 xl:px-10 max-w-[1440px]">{children}</main>
          <CentralCommand />
        </div>
      </body>
    </html>
  )
}
