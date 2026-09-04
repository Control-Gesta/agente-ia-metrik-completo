'use client'

import { useEffect, useState } from 'react'
import { Image as ImageIcon, Plus, Pencil, FileText, Video, Film } from 'lucide-react'
import { Botao, BotaoGhost, Campo, Liga, Painel, Remover, Selo, Vazio, chamar } from './ui'

interface Midia { id: string; titulo: string; url: string; tipo: 'imagem' | 'pdf' | 'video'; categoria: string; quando: string; ativo: boolean }

const ICONE = { imagem: ImageIcon, pdf: FileText, video: Video } as const

export default function PainelMidias() {
  const [midias, setMidias] = useState<Midia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [novo, setNovo] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)

  const carregar = () => chamar('midias').then(d => { setMidias(d.midias || []); setCarregando(false) })
  useEffect(() => { carregar() }, [])

  const porCategoria = midias.reduce<Record<string, Midia[]>>((acc, m) => {
    (acc[m.categoria] ||= []).push(m); return acc
  }, {})

  return (
    <div className="space-y-8">

      <Painel aberto={novo}>
        <FormMidia onSalvou={() => { setNovo(false); carregar() }} onCancelar={() => setNovo(false)} />
      </Painel>

      {carregando ? (
        <div className="text-body-faint text-[13.5px] py-10 text-center">carregando…</div>
      ) : !midias.length && !novo ? (
        <Vazio icone={<ImageIcon size={24} />} titulo="Nenhuma mídia ainda"
          texto="Suba os arquivos que a IA deve enviar — foto, PDF ou vídeo — e diga quando ela manda cada um."
          acao={<Botao onClick={() => setNovo(true)}><Plus size={15} /> primeira mídia</Botao>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(porCategoria).map(([cat, ms]) => (
            <div key={cat}>
              <div className="flex items-baseline gap-2 mb-2.5 px-1">
                <span className="text-[13px] font-medium text-body-mid">{cat}</span>
                <span className="text-[12px] text-body-faint">{ms.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ms.map(m => {
                  const Icone = ICONE[m.tipo]
                  return editando === m.id ? (
                    <div key={m.id} className="sm:col-span-2 lg:col-span-3"><FormMidia midia={m} onSalvou={() => { setEditando(null); carregar() }} onCancelar={() => setEditando(null)} /></div>
                  ) : (
                    <div key={m.id} className="tech-card p-4 flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg surface-alt text-body-muted shrink-0"><Icone size={17} /></div>
                        <div className="flex items-center gap-1">
                          <Liga on={m.ativo} onMuda={v => chamar('midias', { acao: 'editar', id: m.id, patch: { ativo: v } }).then(carregar)} />
                          <button onClick={() => setEditando(m.id)} className="p-1.5 rounded-lg text-body-faint hover:text-ink hover-raise transition-colors" title="editar"><Pencil size={14} /></button>
                          <Remover onConfirma={() => chamar('midias', { acao: 'remover', id: m.id }).then(carregar)} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-[14px] ${m.ativo ? 'text-ink' : 'text-body-faint'}`}>{m.titulo}</div>
                        <a href={m.url} target="_blank" rel="noreferrer" className="text-[12px] text-cyan/80 hover:text-cyan truncate block">{m.url}</a>
                      </div>
                      <div className="text-[12.5px] text-body-muted leading-relaxed">
                        <span className="text-body-faint">envia </span>{m.quando}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FormMidia({ midia, onSalvou, onCancelar }: { midia?: Midia; onSalvou: () => void; onCancelar: () => void }) {
  const [titulo, setTitulo] = useState(midia?.titulo || '')
  const [url, setUrl] = useState(midia?.url || '')
  const [tipo, setTipo] = useState<Midia['tipo']>(midia?.tipo || 'imagem')
  const [categoria, setCategoria] = useState(midia?.categoria || '')
  const [quando, setQuando] = useState(midia?.quando || '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!titulo.trim() || !url.trim()) return
    setSalvando(true)
    const dados = { titulo, url, tipo, categoria: categoria || 'Geral', quando: quando || 'quando fizer sentido' }
    await (midia
      ? chamar('midias', { acao: 'editar', id: midia.id, patch: dados })
      : chamar('midias', { acao: 'adicionar', midia: dados }))
    setSalvando(false); onSalvou()
  }

  return (
    <div className="tech-card p-5 space-y-3">
      <div className="grid md:grid-cols-[1fr_160px] gap-3">
        <Campo label="Título" valor={titulo} onMuda={setTitulo} placeholder="Cardápio de novembro" autoFocus />
        <label className="block">
          <span className="block text-[12.5px] text-body-mid mb-1.5">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value as Midia['tipo'])}
            className="w-full campo rounded-xl px-3.5 py-2.5 text-[13.5px] text-ink">
            <option value="imagem">Imagem</option><option value="pdf">PDF</option><option value="video">Vídeo</option>
          </select>
        </label>
      </div>
      <Campo label="Link do arquivo" valor={url} onMuda={setUrl} placeholder="https://…" />
      <div className="grid md:grid-cols-[200px_1fr] gap-3">
        <Campo label="Categoria" valor={categoria} onMuda={setCategoria} placeholder="Cardápio" />
        <Campo label="Quando enviar" valor={quando} onMuda={setQuando} placeholder="quando perguntarem o cardápio" />
      </div>
      <div className="flex items-center gap-1 -ml-1">
        <Botao onClick={salvar} disabled={salvando || !titulo.trim() || !url.trim()}>{salvando ? 'Salvando…' : midia ? 'Salvar' : 'Adicionar'}</Botao>
        <BotaoGhost onClick={onCancelar}>cancelar</BotaoGhost>
      </div>
    </div>
  )
}
