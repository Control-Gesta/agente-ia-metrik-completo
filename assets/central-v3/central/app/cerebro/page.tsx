'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardPaste,
  FlaskConical,
  History,
  Library,
  MessageSquareText,
  PencilRuler,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Playground from '@/components/Playground'
import { PageIntro, SectionTitle } from '@/components/ProductUI'
import {
  BarraEscola,
  ColarConversa,
  ConversasReais,
  CorrecaoInline,
  FilaEnsinada,
  type EscolaData,
  type Par,
} from '@/components/Escola'

interface Versao { ts: string; autor: string; nota?: number; chars: number; preview: string }
interface Eval { cenario: string; nota: number; ok: boolean; problema: string; resposta: string; tools: string[] }
interface Evals { media: number; aprovados: number; total: number; passou: boolean; resultados: Eval[]; duracaoMs: number }

const COR_SECAO: Record<string, string> = {
  'Identidade': '#06b6d4',
  'A empresa em números (USE nas conversas — são reais)': '#22c55e',
  'As 3 portas (descubra qual é a do lead e ROTEIE)': '#3b82f6',
  'Suporte e alunos existentes (REGRA CRÍTICA)': '#f59e0b',
  'Seu objetivo': '#22c55e',
  'Tom e formato (WhatsApp)': '#a78bfa',
  'Limites': '#ef4444',
}

type Modo = 'ler' | 'ensinar' | 'editar'
type Porta = 'testar' | 'real' | 'colar'

const JORNADA = [
  { numero: '1', titulo: 'Escolha um exemplo', texto: 'Simule, use uma conversa real ou cole um trecho.' },
  { numero: '2', titulo: 'Aponte o erro', texto: 'Marque exatamente a resposta que ficou ruim.' },
  { numero: '3', titulo: 'Ensine do seu jeito', texto: 'Escreva em português o que a IA deveria dizer.' },
  { numero: '4', titulo: 'A equipe valida', texto: 'A correção é revisada e testada antes de ir ao ar.' },
]

const FONTES: {
  id: Porta
  titulo: string
  texto: string
  detalhe: string
  icon: typeof FlaskConical
  recomendado?: boolean
}[] = [
  {
    id: 'testar',
    titulo: 'Simular agora',
    texto: 'Converse com a IA como se você fosse um cliente.',
    detalhe: 'Melhor para testar uma dúvida ou objeção específica.',
    icon: FlaskConical,
    recomendado: true,
  },
  {
    id: 'real',
    titulo: 'Usar conversa real',
    texto: 'Escolha um atendimento recente e corrija a resposta.',
    detalhe: 'Melhor para aprender com o que aconteceu no WhatsApp.',
    icon: MessageSquareText,
  },
  {
    id: 'colar',
    titulo: 'Colar uma conversa',
    texto: 'Traga um trecho de outra conversa para analisar.',
    detalhe: 'Melhor para exemplos externos ou atendimentos antigos.',
    icon: ClipboardPaste,
  },
]

export default function Cerebro() {
  const [texto, setTexto] = useState('')
  const [original, setOriginal] = useState('')
  const [origem, setOrigem] = useState<'central' | 'arquivo'>('arquivo')
  const [historico, setHistorico] = useState<Versao[]>([])
  const [perfil, setPerfil] = useState<'dono' | 'agencia'>('dono')
  const [pronto, setPronto] = useState(false)
  const [modo, setModo] = useState<Modo>('ensinar')
  const [rodando, setRodando] = useState<'' | 'testar' | 'publicar'>('')
  const [evals, setEvals] = useState<Evals | null>(null)
  const [msg, setMsg] = useState('')
  const [escola, setEscola] = useState<EscolaData | null>(null)
  const [par, setPar] = useState<Par | null>(null)
  const [porta, setPorta] = useState<Porta>('testar')

  const carregar = () =>
    fetch('/api/prompt').then(r => r.json()).then(d => {
      if (d.error) { setMsg(d.error); return }
      setTexto(d.texto)
      setOriginal(d.texto)
      setOrigem(d.origem)
      setHistorico(d.historico || [])
      setPerfil(d.perfil || 'dono')
    }).catch(() => setMsg('Não consegui carregar as regras da IA.'))
      .finally(() => setPronto(true))

  const carregarEscola = () =>
    fetch('/api/escola').then(r => r.json()).then(d => { if (!d.error) setEscola(d) }).catch(() => {})

  useEffect(() => { carregar(); carregarEscola() }, [])

  const admin = perfil === 'agencia'
  const mudou = texto !== original
  const aprovado = !!evals?.passou

  async function acao(acaoNome: 'testar' | 'publicar' | 'restaurar') {
    setRodando(acaoNome === 'restaurar' ? 'publicar' : acaoNome)
    setMsg('')
    if (acaoNome !== 'restaurar') setEvals(null)
    try {
      const r = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: acaoNome, texto, autor: 'Central de IA' }),
      })
      const d = await r.json()
      if (acaoNome === 'restaurar') {
        setMsg('Regras de fábrica restauradas.')
        await carregar()
      } else if (acaoNome === 'testar') {
        setEvals(d)
        setMsg(d.passou ? 'Aprovado. Esta versão pode ser publicada.' : 'Reprovado. Corrija antes de publicar.')
      } else if (r.ok) {
        setEvals(d.evals)
        setMsg(`Publicado. Nota ${d.evals?.media}/10 — a nova versão já está no ar.`)
        await carregar()
      } else {
        setEvals(d.evals || null)
        setMsg(d.mensagem || d.error || 'A versão não foi publicada.')
      }
    } catch (e) {
      setMsg('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'))
    } finally {
      setRodando('')
    }
  }

  const secoes = texto.split(/^# /m).filter(Boolean).map(p => {
    const nl = p.indexOf('\n')
    return { titulo: p.slice(0, nl).trim(), corpo: p.slice(nl + 1).trim() }
  })

  const abrirCorrecao = (p: Par) => {
    setPar(p)
    if (typeof window !== 'undefined') {
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 80)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <PageIntro
        eyebrow="Escola da IA"
        title="Ensine pelo exemplo."
        accent="Sem mexer em prompt."
        description="Mostre uma conversa, aponte o que ficou errado e escreva a resposta ideal do seu jeito. A equipe transforma isso em melhoria segura para a IA."
        action={
          pronto && escola ? (
            <div className="panel px-4 py-3 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-success" />
              <div>
                <div className="text-[12.5px] text-ink">Escola ativa</div>
                <BarraEscola saude={escola.saude} />
              </div>
            </div>
          ) : undefined
        }
      />

      <section aria-label="Como ensinar a IA">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-px overflow-hidden rounded-[10px] border border-line-soft bg-[var(--line-soft)]">
          {JORNADA.map(item => (
            <div key={item.numero} className="bg-[var(--surface)] px-4 py-4 min-h-[112px]">
              <div className="w-6 h-6 rounded-full border border-cyan/30 bg-cyan/[0.08] text-cyan text-[11px] font-mono flex items-center justify-center mb-3">
                {item.numero}
              </div>
              <div className="text-[13.5px] font-medium text-ink">{item.titulo}</div>
              <p className="text-[12.5px] leading-relaxed text-body-muted mt-1">{item.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {!pronto ? (
        <div className="grid md:grid-cols-3 gap-3 animate-pulse">
          {[0, 1, 2].map(i => <div key={i} className="panel h-[126px]" />)}
        </div>
      ) : (
        <>
          <section>
            <SectionTitle
              eyebrow="O que você quer fazer?"
              title="Escolha uma ação"
              description="A área técnica só aparece para a equipe responsável."
            />
            <div className={`grid gap-3 ${admin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <button
                type="button"
                onClick={() => { setModo('ensinar'); setEvals(null) }}
                aria-pressed={modo === 'ensinar'}
                className={`panel interactive-card text-left p-4 min-h-[132px] ${modo === 'ensinar' ? 'border-cyan/45 bg-cyan/[0.045]' : ''}`}
              >
                <Sparkles size={17} className="text-cyan mb-4" />
                <div className="text-[14px] font-medium text-ink">Testar e corrigir</div>
                <p className="text-[12.5px] text-body-muted leading-relaxed mt-1">Ensine usando uma conversa como exemplo.</p>
              </button>

              <button
                type="button"
                onClick={() => { setModo('ler'); setEvals(null) }}
                aria-pressed={modo === 'ler'}
                className={`panel interactive-card text-left p-4 min-h-[132px] ${modo === 'ler' ? 'border-cyan/45 bg-cyan/[0.045]' : ''}`}
              >
                <BookOpen size={17} className="text-blue-400 mb-4" />
                <div className="text-[14px] font-medium text-ink">Entender as regras</div>
                <p className="text-[12.5px] text-body-muted leading-relaxed mt-1">Veja o que orienta o jeito de falar e decidir.</p>
              </button>

              <Link href="/conteudo" className="panel interactive-card p-4 min-h-[132px] group">
                <Library size={17} className="text-purple-400 mb-4" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-medium text-ink">Atualizar conteúdo</span>
                  <ArrowRight size={14} className="text-body-faint group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-[12.5px] text-body-muted leading-relaxed mt-1">Produtos, informações, materiais e respostas oficiais.</p>
              </Link>

              {admin && (
                <button
                  type="button"
                  onClick={() => { setModo('editar'); setEvals(null) }}
                  aria-pressed={modo === 'editar'}
                  className={`panel interactive-card text-left p-4 min-h-[132px] ${modo === 'editar' ? 'border-cyan/45 bg-cyan/[0.045]' : ''}`}
                >
                  <PencilRuler size={17} className="text-warning mb-4" />
                  <div className="text-[14px] font-medium text-ink">Editor técnico</div>
                  <p className="text-[12.5px] text-body-muted leading-relaxed mt-1">Editar, examinar e publicar uma versão completa.</p>
                </button>
              )}
            </div>
          </section>

          {modo === 'ensinar' && (
            <section className="space-y-6">
              <SectionTitle
                eyebrow="Passo 1"
                title="De onde vem o exemplo?"
                description="Escolha somente uma fonte. Você poderá trocar a qualquer momento."
              />

              <div className="grid md:grid-cols-3 gap-3" role="radiogroup" aria-label="Fonte do exemplo">
                {FONTES.map(fonte => {
                  const Icon = fonte.icon
                  const ativa = porta === fonte.id
                  return (
                    <button
                      key={fonte.id}
                      type="button"
                      role="radio"
                      aria-checked={ativa}
                      onClick={() => { setPorta(fonte.id); setPar(null) }}
                      className={`panel interactive-card text-left p-4 min-h-[150px] relative ${
                        ativa ? 'border-purple-400/45 bg-purple-400/[0.05]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <span className="w-8 h-8 rounded-lg border border-line bg-[var(--surface-2)] flex items-center justify-center">
                          <Icon size={16} className={ativa ? 'text-purple-400' : 'text-body-muted'} />
                        </span>
                        {fonte.recomendado && (
                          <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-success">Recomendado</span>
                        )}
                      </div>
                      <div className="text-[14px] font-medium text-ink">{fonte.titulo}</div>
                      <p className="text-[12.5px] text-body-mid leading-relaxed mt-1">{fonte.texto}</p>
                      <p className="text-[11.5px] text-body-faint leading-relaxed mt-2">{fonte.detalhe}</p>
                    </button>
                  )
                })}
              </div>

              <div className="panel p-4 md:p-6">
                <div className="flex items-start gap-3 pb-5 mb-5 border-b border-line-soft">
                  <div className="w-8 h-8 rounded-lg border border-cyan/25 bg-cyan/[0.08] text-cyan flex items-center justify-center shrink-0">
                    <span className="font-mono text-[11px]">2</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-ink">
                      {porta === 'testar' ? 'Converse e marque o erro' : porta === 'real' ? 'Escolha a resposta que precisa melhorar' : 'Cole e separe a conversa'}
                    </div>
                    <p className="text-[12.5px] text-body-muted leading-relaxed mt-1">
                      Quando encontrar a resposta ruim, clique em <span className="text-purple-400">errou aqui</span> e escreva a resposta ideal.
                    </p>
                  </div>
                </div>

                {porta === 'testar' && (
                  <Playground
                    prompt={original}
                    chips={escola?.chips}
                    onGravou={carregarEscola}
                    subtitulo="A IA responde como responderia a um lead. As ações no CRM são simuladas e nada muda no atendimento real."
                  />
                )}
                {porta === 'real' && <ConversasReais onEscolher={abrirCorrecao} />}
                {porta === 'colar' && <ColarConversa onEscolher={abrirCorrecao} />}

                <AnimatePresence>
                  {par && escola && porta !== 'testar' && (
                    <div className="max-w-[640px] mt-5 pt-5 border-t border-line-soft">
                      <CorrecaoInline
                        par={par}
                        chips={escola.chips}
                        onCancelar={() => setPar(null)}
                        onGravou={carregarEscola}
                      />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {escola && <FilaEnsinada data={escola} />}
            </section>
          )}

          {modo === 'ler' && (
            <section>
              <SectionTitle
                eyebrow="Leitura guiada"
                title="O que orienta a sua IA"
                description="Abra somente o assunto que você quer entender. Aqui nada é alterado."
              />
              <div className="grid gap-2.5">
                {secoes.map((s, i) => {
                  const cor = COR_SECAO[s.titulo] || '#3b82f6'
                  return (
                    <details key={i} className="panel group overflow-hidden" open={i === 0}>
                      <summary className="px-5 py-4 cursor-pointer flex items-center gap-4 select-none list-none [&::-webkit-details-marker]:hidden hover-raise">
                        <span className="w-1 h-8 rounded-full shrink-0" style={{ background: cor }} />
                        <span className="font-impact font-bold text-[14px] text-ink flex-1">{s.titulo}</span>
                        <span className="text-[11px] text-body-faint group-open:rotate-90 transition-transform">▷</span>
                      </summary>
                      <div className="px-5 pb-5 pt-3 ml-5 border-l border-line">
                        <pre className="whitespace-pre-wrap font-space text-[13px] leading-[1.75] text-body-light">{s.corpo}</pre>
                      </div>
                    </details>
                  )
                })}
              </div>
            </section>
          )}

          {modo === 'editar' && admin && (
            <section className="space-y-5">
              <SectionTitle
                eyebrow="Área protegida"
                title="Editor técnico"
                description="Nenhuma versão vai ao ar sem passar pelo exame automático."
                action={
                  <div className="inline-flex items-center gap-2 text-[12px] text-body-muted">
                    <ShieldCheck size={15} className="text-success" />
                    Publicação protegida
                  </div>
                }
              />

              <div className="panel p-1">
                <textarea
                  value={texto}
                  onChange={e => { setTexto(e.target.value); setEvals(null) }}
                  spellCheck={false}
                  className="w-full h-[460px] bg-transparent text-body-light font-mono text-[12.5px] leading-[1.65] p-5 outline-none resize-y scroll-thin"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => acao('testar')}
                  disabled={!!rodando || texto.length < 200}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-medium border border-cyan/30 bg-cyan/[0.12] text-cyan hover:bg-cyan/[0.18] hover:border-cyan/45 active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none transition-colors"
                >
                  <FlaskConical size={13} className={rodando === 'testar' ? 'animate-pulse' : ''} />
                  {rodando === 'testar' ? 'Examinando 10 cenários…' : 'Rodar exame'}
                </button>

                <button
                  onClick={() => acao('publicar')}
                  disabled={!!rodando || !aprovado || !mudou}
                  title={!aprovado ? 'Rode o exame e seja aprovado para liberar' : ''}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-medium border active:scale-[0.98] disabled:opacity-35 disabled:pointer-events-none transition-colors"
                  style={aprovado && mudou
                    ? { color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)' }
                    : { color: '#737373', borderColor: 'var(--line)' }}
                >
                  <Save size={13} className={rodando === 'publicar' ? 'animate-pulse' : ''} />
                  {rodando === 'publicar' ? 'Publicando…' : aprovado ? 'Publicar versão aprovada' : 'Publicação bloqueada'}
                </button>

                <button
                  onClick={() => { setTexto(original); setEvals(null); setMsg('') }}
                  disabled={!mudou || !!rodando}
                  className="px-3.5 py-2.5 rounded-lg text-[13px] text-body-muted hover:text-ink hover-raise disabled:opacity-35 disabled:pointer-events-none transition-colors"
                >
                  Descartar alterações
                </button>

                {origem === 'central' && (
                  <button
                    onClick={() => acao('restaurar')}
                    disabled={!!rodando}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] border border-warning/30 text-warning hover:bg-warning/[0.08] disabled:opacity-35 transition-colors ml-auto"
                  >
                    <RotateCcw size={12} /> Restaurar versão de fábrica
                  </button>
                )}
              </div>

              {msg && <div className="panel px-4 py-3 text-[13px] text-body-light">{msg}</div>}

              <Playground prompt={texto} subtitulo="Converse com a versão que está no editor. Nada é publicado durante este teste." />

              <AnimatePresence>
                {evals && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <div className="panel p-5" style={{ borderColor: evals.passou ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {evals.passou
                            ? <CheckCircle2 size={18} className="text-success" />
                            : <AlertTriangle size={18} className="text-danger" />}
                          <span className="font-impact font-bold text-[15px] text-ink">
                            {evals.aprovados}/{evals.total} aprovados · média {evals.media}/10
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-body-faint">{(evals.duracaoMs / 1000).toFixed(0)}s de exame</span>
                      </div>
                      <div className="space-y-1.5">
                        {evals.resultados.map((r, i) => (
                          <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-md" style={{ background: r.ok ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.06)' }}>
                            <span className="font-impact font-bold text-[13px] tabular-nums shrink-0 w-9" style={{ color: r.ok ? '#22c55e' : '#ef4444' }}>{r.nota}/10</span>
                            <div className="min-w-0">
                              <div className="text-[12.5px] text-ink/90">{r.cenario}</div>
                              {!r.ok && r.problema && <div className="text-[11.5px] text-danger/80 mt-0.5">↳ {r.problema}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {historico.length > 0 && (
                <div className="panel p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={13} className="text-body-muted" />
                    <span className="text-[13px] text-body-muted">Versões publicadas</span>
                  </div>
                  <div className="space-y-1.5">
                    {historico.map((v, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-[12px] px-3 py-2 rounded-md surface">
                        <span className="text-body-light">{new Date(v.ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                        <span className="text-body-muted font-mono text-[10px]">{v.autor} · {v.chars} chars{v.nota ? ` · nota ${v.nota}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
