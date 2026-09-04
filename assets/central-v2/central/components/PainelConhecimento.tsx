'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Search, Brain, Database } from 'lucide-react'
import { Botao, BotaoGhost, Campo, Area, Liga, Painel, Remover, Selo, Vazio, chamar } from './ui'

interface Faq { id: string; topico: string; pergunta: string; resposta: string; ativo: boolean }
interface Decisao { destino: 'cerebro' | 'rag'; totalFaqs: number; explicacao: string }

export default function PainelConhecimento() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [decisao, setDecisao] = useState<Decisao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [novo, setNovo] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [testeBusca, setTesteBusca] = useState('')
  const [resultado, setResultado] = useState<Faq[] | null>(null)

  const carregar = () => chamar('conhecimento').then(d => { setFaqs(d.faqs || []); setDecisao(d.decisao); setCarregando(false) })
  useEffect(() => { carregar() }, [])

  async function testar() {
    if (!testeBusca.trim()) { setResultado(null); return }
    const d = await chamar('conhecimento', undefined, `&busca=${encodeURIComponent(testeBusca)}`)
    setResultado(d.resultados || [])
  }

  const porTopico = faqs.reduce<Record<string, Faq[]>>((acc, f) => {
    (acc[f.topico] ||= []).push(f); return acc
  }, {})

  return (
    <div className="space-y-8">

      {/* o indicador da régua: cabe no cérebro ou virou RAG */}
      {decisao && faqs.length > 0 && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${decisao.destino === 'rag' ? 'bg-purple-400/[0.07]' : 'bg-cyan/[0.06]'}`}>
          {decisao.destino === 'rag' ? <Database size={16} className="text-purple-300 mt-0.5 shrink-0" /> : <Brain size={16} className="text-cyan mt-0.5 shrink-0" />}
          <div className="text-[13px] text-body-light leading-relaxed">
            <span className="text-ink font-medium">{decisao.destino === 'rag' ? 'Modo busca (base grande)' : 'Cabe no cérebro'}</span>
            {' — '}{decisao.explicacao}
          </div>
        </div>
      )}

      <Painel aberto={novo}>
        <FormFaq onSalvou={() => { setNovo(false); carregar() }} onCancelar={() => setNovo(false)} />
      </Painel>

      {/* testar a busca — o que a IA acharia */}
      {faqs.length > 0 && (
        <div className="tech-card p-4">
          <div className="flex items-center gap-2">
            <Search size={15} className="text-body-muted shrink-0" />
            <input value={testeBusca} onChange={e => setTesteBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && testar()}
              placeholder="Pergunte como um lead perguntaria — veja o que ela acharia…"
              className="flex-1 bg-transparent text-[13.5px] text-ink outline-none" />
            <BotaoGhost onClick={testar}>testar</BotaoGhost>
          </div>
          {resultado !== null && (
            <div className="mt-3 pt-3 border-t border-line-soft">
              {resultado.length ? resultado.map(f => (
                <div key={f.id} className="text-[13px] py-1.5"><span className="text-ink">{f.pergunta}</span> <span className="text-body-faint">→ {f.resposta}</span></div>
              )) : <div className="text-[13px] text-body-muted">Ela não acharia nada — e responderia que vai confirmar. Talvez falte uma pergunta sobre isso.</div>}
            </div>
          )}
        </div>
      )}

      {carregando ? (
        <div className="text-body-faint text-[13.5px] py-10 text-center">carregando…</div>
      ) : !faqs.length && !novo ? (
        <Vazio icone={<BookOpen size={24} />} titulo="Nada aqui ainda"
          texto="Adicione as perguntas que os leads mais fazem — convênios, horários, políticas, o que estiver fora do cérebro dela. Ela busca a resposta certa na hora."
          acao={<Botao onClick={() => setNovo(true)}><Plus size={15} /> primeira pergunta</Botao>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(porTopico).map(([topico, fs]) => (
            <div key={topico}>
              <div className="flex items-baseline gap-2 mb-2.5 px-1">
                <span className="text-[13px] font-medium text-body-mid">{topico}</span>
                <span className="text-[12px] text-body-faint">{fs.length}</span>
              </div>
              <div className="tech-card divide-y divide-line-soft">
                {fs.map(f => editando === f.id ? (
                  <div key={f.id} className="p-4"><FormFaq faq={f} onSalvou={() => { setEditando(null); carregar() }} onCancelar={() => setEditando(null)} /></div>
                ) : (
                  <div key={f.id} className="flex items-start gap-4 px-4 py-3 hover-raise transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className={`text-[14px] ${f.ativo ? 'text-ink' : 'text-body-faint'}`}>{f.pergunta}</div>
                      <div className="text-[12.5px] text-body-muted mt-0.5 leading-relaxed">{f.resposta}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Liga on={f.ativo} onMuda={v => chamar('conhecimento', { acao: 'editar', id: f.id, patch: { ativo: v } }).then(carregar)} />
                      <button onClick={() => setEditando(f.id)} className="p-1.5 rounded-lg text-body-faint hover:text-ink hover-raise transition-colors" title="editar"><Pencil size={15} /></button>
                      <Remover onConfirma={() => chamar('conhecimento', { acao: 'remover', id: f.id }).then(carregar)} />
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

function FormFaq({ faq, onSalvou, onCancelar }: { faq?: Faq; onSalvou: () => void; onCancelar: () => void }) {
  const [pergunta, setPergunta] = useState(faq?.pergunta || '')
  const [resposta, setResposta] = useState(faq?.resposta || '')
  const [topico, setTopico] = useState(faq?.topico || '')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  async function salvar() {
    if (!pergunta.trim() || !resposta.trim()) return
    setSalvando(true)
    const dados = { pergunta, resposta, topico: topico || 'Geral' }
    const d = await (faq
      ? chamar('conhecimento', { acao: 'editar', id: faq.id, patch: dados })
      : chamar('conhecimento', { acao: 'adicionar', faq: dados }))
    setSalvando(false)
    // se acabou de cruzar pro RAG, avisa (a régua §2 em ação)
    if (d.decisao?.destino === 'rag') { setAviso(d.decisao.explicacao); setTimeout(onSalvou, 2200) }
    else onSalvou()
  }

  return (
    <div className={faq ? 'space-y-3' : 'tech-card p-5 space-y-3'}>
      <Campo label="Pergunta (como o lead perguntaria)" valor={pergunta} onMuda={setPergunta} placeholder="Vocês atendem por convênio?" autoFocus />
      <Area label="Resposta" valor={resposta} onMuda={setResposta} placeholder="Sim, atendemos Unimed e Bradesco Saúde." rows={2} />
      <div className="max-w-[220px]"><Campo label="Tópico" valor={topico} onMuda={setTopico} placeholder="Convênios" /></div>
      {aviso && <div className="text-[12.5px] text-purple-300">{aviso}</div>}
      <div className="flex items-center gap-1 -ml-1">
        <Botao onClick={salvar} disabled={salvando || !pergunta.trim() || !resposta.trim()}>{salvando ? 'Salvando…' : faq ? 'Salvar' : 'Adicionar'}</Botao>
        <BotaoGhost onClick={onCancelar}>cancelar</BotaoGhost>
      </div>
    </div>
  )
}
