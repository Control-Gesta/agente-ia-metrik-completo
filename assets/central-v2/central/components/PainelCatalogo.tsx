'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Pencil, Upload, Sparkles } from 'lucide-react'
import { Botao, BotaoGhost, Campo, Liga, Painel, Remover, Selo, Vazio, chamar } from './ui'

interface Item { id: string; produto: string; preco: string; descricao?: string; categoria?: string; ativo: boolean }

export default function PainelCatalogo() {
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modo, setModo] = useState<'lista' | 'novo' | 'importar'>('lista')
  const [editando, setEditando] = useState<string | null>(null)

  const carregar = () => chamar('catalogo').then(d => { setItens(d.itens || []); setCarregando(false) })
  useEffect(() => { carregar() }, [])

  const porCategoria = itens.reduce<Record<string, Item[]>>((acc, it) => {
    const c = it.categoria || 'Geral'; (acc[c] ||= []).push(it); return acc
  }, {})

  return (
    <div className="space-y-8">

      <Painel aberto={modo === 'novo'}>
        <FormItem onSalvou={() => { setModo('lista'); carregar() }} onCancelar={() => setModo('lista')} />
      </Painel>
      <Painel aberto={modo === 'importar'}>
        <ImportarPlanilha onImportou={() => { setModo('lista'); carregar() }} onCancelar={() => setModo('lista')} />
      </Painel>

      {carregando ? (
        <div className="text-body-faint text-[13.5px] py-10 text-center">carregando…</div>
      ) : !itens.length && modo === 'lista' ? (
        <Vazio icone={<Package size={24} />} titulo="Seu catálogo está vazio"
          texto="Adicione o que a IA vende — produtos, planos, serviços com preço. Ou importe de uma planilha que você já tem."
          acao={<div className="flex items-center justify-center gap-2"><Botao onClick={() => setModo('novo')}><Plus size={15} /> primeiro item</Botao><BotaoGhost onClick={() => setModo('importar')}><Upload size={14} /> importar planilha</BotaoGhost></div>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(porCategoria).map(([cat, its]) => (
            <div key={cat}>
              <div className="flex items-baseline gap-2 mb-2.5 px-1">
                <span className="text-[13px] font-medium text-body-mid">{cat}</span>
                <span className="text-[12px] text-body-faint">{its.length}</span>
              </div>
              <div className="tech-card divide-y divide-line-soft">
                {its.map(it => editando === it.id ? (
                  <div key={it.id} className="p-4">
                    <FormItem item={it} onSalvou={() => { setEditando(null); carregar() }} onCancelar={() => setEditando(null)} />
                  </div>
                ) : (
                  <div key={it.id} className="flex items-center gap-4 px-4 py-3 hover-raise transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] ${it.ativo ? 'text-ink' : 'text-body-faint line-through'}`}>{it.produto}</span>
                        {!it.ativo && <Selo>pausado</Selo>}
                      </div>
                      {it.descricao && <div className="text-[12.5px] text-body-muted truncate mt-0.5">{it.descricao}</div>}
                    </div>
                    <span className="text-[14px] font-medium text-cyan shrink-0 tabular-nums">{it.preco}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Liga on={it.ativo} onMuda={v => chamar('catalogo', { acao: 'editar', id: it.id, patch: { ativo: v } }).then(carregar)} />
                      <button onClick={() => setEditando(it.id)} className="p-1.5 rounded-lg text-body-faint hover:text-ink hover-raise transition-colors" title="editar"><Pencil size={15} /></button>
                      <Remover onConfirma={() => chamar('catalogo', { acao: 'remover', id: it.id }).then(carregar)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── formulário de item (novo ou edição) ── */
function FormItem({ item, onSalvou, onCancelar }: { item?: Item; onSalvou: () => void; onCancelar: () => void }) {
  const [produto, setProduto] = useState(item?.produto || '')
  const [preco, setPreco] = useState(item?.preco || '')
  const [categoria, setCategoria] = useState(item?.categoria || '')
  const [descricao, setDescricao] = useState(item?.descricao || '')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!produto.trim()) return
    setSalvando(true)
    const patch = { produto, preco: preco || 'sob consulta', categoria: categoria || undefined, descricao: descricao || undefined }
    await (item
      ? chamar('catalogo', { acao: 'editar', id: item.id, patch })
      : chamar('catalogo', { acao: 'adicionar', item: patch }))
    setSalvando(false); onSalvou()
  }

  return (
    <div className={item ? 'space-y-3' : 'tech-card p-5 space-y-3'}>
      <div className="grid md:grid-cols-[1fr_180px] gap-3">
        <Campo label="Produto ou serviço" valor={produto} onMuda={setProduto} placeholder="Ex.: Plano Premium" autoFocus />
        <Campo label="Preço" valor={preco} onMuda={setPreco} placeholder="R$ 179/mês" />
      </div>
      <div className="grid md:grid-cols-[180px_1fr] gap-3">
        <Campo label="Categoria" valor={categoria} onMuda={setCategoria} placeholder="Planos" />
        <Campo label="Descrição (opcional)" valor={descricao} onMuda={setDescricao} placeholder="o que está incluso" />
      </div>
      <div className="flex items-center gap-1 -ml-1">
        <Botao onClick={salvar} disabled={salvando || !produto.trim()}>{salvando ? 'Salvando…' : item ? 'Salvar' : 'Adicionar'}</Botao>
        <BotaoGhost onClick={onCancelar}>cancelar</BotaoGhost>
      </div>
    </div>
  )
}

/* ── import de planilha: cola CSV → analisa → confirma de-para → importa ── */
function ImportarPlanilha({ onImportou, onCancelar }: { onImportou: () => void; onCancelar: () => void }) {
  const [csv, setCsv] = useState('')
  const [analise, setAnalise] = useState<any>(null)
  const [mapa, setMapa] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function ler(arquivo: File) {
    setCsv(await arquivo.text())
  }

  async function analisar() {
    setOcupado(true); setErro('')
    const d = await chamar('catalogo', { acao: 'analisar-planilha', csv })
    setOcupado(false)
    if (d.error) { setErro(d.mensagem || d.error); return }
    setAnalise(d); setMapa(d.mapaSugerido || {})
  }

  async function importar() {
    setOcupado(true); setErro('')
    const d = await chamar('catalogo', { acao: 'importar', csv, mapa })
    setOcupado(false)
    if (d.error) { setErro(d.mensagem || d.error); return }
    onImportou()
  }

  return (
    <div className="tech-card p-5 space-y-4">
      {!analise ? (
        <>
          <div>
            <div className="text-[14px] text-ink mb-1">Importar de uma planilha</div>
            <p className="text-[12.5px] text-body-muted leading-relaxed">Cole o conteúdo da planilha (ou solte um arquivo <span className="font-mono">.csv</span>). Eu leio, mostro o que entendi de cada coluna, e você confirma antes de importar.</p>
          </div>
          <textarea value={csv} onChange={e => setCsv(e.target.value)}
            placeholder={'produto;preço;categoria\nPlano Básico;R$ 99;Planos\nPlano Pro;R$ 199;Planos'}
            rows={7} className="w-full campo rounded-xl px-4 py-3 text-[13px] font-mono text-ink resize-y" />
          <div className="flex items-center gap-2">
            <Botao onClick={analisar} disabled={ocupado || csv.trim().length < 10}><Sparkles size={15} /> {ocupado ? 'lendo…' : 'ler a planilha'}</Botao>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-[13px] text-body-muted hover:text-ink hover-raise cursor-pointer transition-all">
              <Upload size={14} /> soltar arquivo
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => e.target.files?.[0] && ler(e.target.files[0])} />
            </label>
            <BotaoGhost onClick={onCancelar}>cancelar</BotaoGhost>
          </div>
        </>
      ) : (
        <>
          <div className="text-[14px] text-ink">Confira o que entendi <span className="text-body-muted">— {analise.totalLinhas} linhas</span></div>
          <div className="grid md:grid-cols-2 gap-3">
            {[['produto', 'Produto'], ['preco', 'Preço'], ['categoria', 'Categoria'], ['descricao', 'Descrição']].map(([campo, rot]) => (
              <label key={campo} className="block">
                <span className="block text-[12.5px] text-body-mid mb-1.5">{rot}{(campo === 'produto' || campo === 'preco') && <span className="text-danger"> *</span>}</span>
                <select value={mapa[campo] || ''} onChange={e => setMapa({ ...mapa, [campo]: e.target.value })}
                  className="w-full campo rounded-xl px-3.5 py-2.5 text-[13.5px] text-ink">
                  <option value="">— nenhuma —</option>
                  {(analise.cabecalho as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            ))}
          </div>
          {analise.amostra?.length > 0 && (
            <div className="surface rounded-xl p-3 text-[12px] text-body-muted overflow-x-auto">
              <div className="font-mono whitespace-nowrap">{(analise.cabecalho as string[]).join('  ·  ')}</div>
              {(analise.amostra as string[][]).slice(0, 2).map((l, i) => (
                <div key={i} className="font-mono whitespace-nowrap text-body-faint mt-0.5">{l.join('  ·  ')}</div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 -ml-1">
            <Botao onClick={importar} disabled={ocupado || !mapa.produto || !mapa.preco}>{ocupado ? 'importando…' : `importar ${analise.totalLinhas} itens`}</Botao>
            <BotaoGhost onClick={() => setAnalise(null)}>voltar</BotaoGhost>
          </div>
          <p className="text-[11.5px] text-warning/80">⚠️ importar substitui o catálogo inteiro pelo conteúdo da planilha.</p>
        </>
      )}
      {erro && <div className="text-[13px] text-warning">{erro}</div>}
    </div>
  )
}
