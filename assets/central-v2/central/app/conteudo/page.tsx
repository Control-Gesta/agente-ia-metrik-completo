'use client'

import { useState } from 'react'
import { Package, BookOpen, Film, Library } from 'lucide-react'
import { Cabecalho } from '@/components/ui'
import PainelCatalogo from '@/components/PainelCatalogo'
import PainelConhecimento from '@/components/PainelConhecimento'
import PainelMidias from '@/components/PainelMidias'

/**
 * O QUE ELA SABE — uma tela só para catálogo, conhecimento e mídias.
 *
 * 🩸 Antes eram 3 itens de menu. Mas são a mesma pergunta do dono ("o que a
 * minha IA sabe?"), e três entradas separadas fazem ele caçar em qual delas
 * mexer. Uma tela, três abas.
 */
type Aba = 'catalogo' | 'conhecimento' | 'midias'

const ABAS: { id: Aba; label: string; Icon: typeof Package; dica: string }[] = [
  { id: 'catalogo', label: 'O que ela vende', Icon: Package, dica: 'produtos e preços que ela pode oferecer' },
  { id: 'conhecimento', label: 'O que ela responde', Icon: BookOpen, dica: 'perguntas frequentes que ela consulta' },
  { id: 'midias', label: 'O que ela envia', Icon: Film, dica: 'fotos, PDFs e vídeos' },
]

export default function Conteudo() {
  const [aba, setAba] = useState<Aba>('catalogo')
  const atual = ABAS.find(a => a.id === aba)!

  return (
    <div className="space-y-8">
      <Cabecalho
        selo={<><Library size={11} /> O QUE A SUA IA SABE</>}
        titulo="O conteúdo" destaque="da sua IA."
        sub={<>Tudo que ela pode oferecer, responder e mostrar. <strong className="text-ink">Ela nunca inventa o que não está aqui</strong> — se mudar um preço, ela já passa a falar o novo.</>}
      />

      {/* as 3 abas, com a dica do que cada uma é */}
      <div>
        <div className="flex items-center gap-1 border-b border-line">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-[14px] border-b-2 -mb-px transition-colors ${
                aba === a.id ? 'text-ink border-cyan font-medium' : 'text-body-muted border-transparent hover:text-ink'
              }`}>
              <a.Icon size={15} /> {a.label}
            </button>
          ))}
        </div>
        <p className="text-body-muted text-[13px] mt-3">{atual.dica}</p>
      </div>

      {aba === 'catalogo' && <PainelCatalogo />}
      {aba === 'conhecimento' && <PainelConhecimento />}
      {aba === 'midias' && <PainelMidias />}
    </div>
  )
}
