/**
 * BASE DE CONHECIMENTO · NÚCLEO PURO — a régua de quando algo cruza pro RAG,
 * a estimativa de tamanho e a busca. Sem Redis, sem embeddings, testável.
 *
 * ✨ O destino que faltava (CENTRAL.md §5). Onde mora o conhecimento EXTENSO que
 * a IA consulta sob demanda: manual, 200 FAQs, políticas. Coisa que NÃO cabe no
 * cérebro (estouraria o orçamento de tokens) mas que ela precisa saber quando
 * perguntam.
 *
 * 🩸 A peça-mãe é a RÉGUA (decidirDestino): quando um conhecimento é pequeno, vai
 * pro cérebro (mais rápido, cache de graça); quando é grande, vira RAG. Ligar RAG
 * cedo demais é engenharia negativa. Os limiares são MEDIDOS (CONTEXT-ENG.md §1).
 */

export interface FaqConhecimento {
  id: string
  topico: string          // agrupa: "Cancelamento", "Convênios", "Horários"
  pergunta: string
  resposta: string
  ativo: boolean
}

// ─────────────────────── ESTIMATIVA DE TAMANHO ───────────────────────
// Regra prática de tokens em português: ~4 chars por token. Não é exato (o
// countTokens real é no server), mas é o suficiente pra DECIDIR destino — e a
// decisão só precisa saber "isto é pequeno ou grande?", não o número na vírgula.
export const CHARS_POR_TOKEN = 4

export function estimarTokens(texto: string): number {
  return Math.ceil((texto || '').length / CHARS_POR_TOKEN)
}

export function tokensDoFaq(f: Pick<FaqConhecimento, 'pergunta' | 'resposta'>): number {
  return estimarTokens(f.pergunta + ' ' + f.resposta)
}

// ─────────────────────── A RÉGUA: cérebro × RAG ───────────────────────
// Limiares medidos (CENTRAL.md §2): o prompt aguenta até ~10k tokens com cache
// (resposta ~4,7s); acima disso a latência sobe. E acima de ~150 FAQs o volume
// pede busca em vez de "tudo no contexto".
export const TETO_TOKENS_CEREBRO = 10_000
export const TETO_FAQS_CEREBRO = 150

export type DestinoConhecimento = 'cerebro' | 'rag'

export interface DecisaoConhecimento {
  destino: DestinoConhecimento
  totalTokens: number
  totalFaqs: number
  motivo: string
  /** o que a Central diz ao dono, em português */
  explicacao: string
}

/**
 * Dado o conjunto de FAQs ativas (+ o tamanho do resto do cérebro), decide se
 * elas cabem no cérebro ou precisam virar RAG.
 *
 * `tokensBaseCerebro` é quanto o cérebro já ocupa SEM as FAQs — porque o que
 * importa é o TOTAL não estourar o teto, não as FAQs isoladas.
 */
export function decidirDestino(faqs: FaqConhecimento[], tokensBaseCerebro = 0): DecisaoConhecimento {
  const ativas = faqs.filter(f => f.ativo)
  const tokensFaqs = ativas.reduce((s, f) => s + tokensDoFaq(f), 0)
  const total = tokensBaseCerebro + tokensFaqs

  if (ativas.length > TETO_FAQS_CEREBRO) {
    return {
      destino: 'rag', totalTokens: total, totalFaqs: ativas.length,
      motivo: `faqs:${ativas.length}>${TETO_FAQS_CEREBRO}`,
      explicacao:
        `São ${ativas.length} perguntas — muita coisa pra caber no cérebro dela sem deixá-la lenta. ` +
        'Vou guardar na Base de Conhecimento: ela consulta a resposta certa quando alguém perguntar.',
    }
  }
  if (total > TETO_TOKENS_CEREBRO) {
    return {
      destino: 'rag', totalTokens: total, totalFaqs: ativas.length,
      motivo: `tokens:${total}>${TETO_TOKENS_CEREBRO}`,
      explicacao:
        'Esse conteúdo é grande demais pro cérebro (ela ficaria lenta e mais cara). ' +
        'Vou guardar na Base de Conhecimento — ela busca o trecho certo na hora de responder.',
    }
  }
  return {
    destino: 'cerebro', totalTokens: total, totalFaqs: ativas.length,
    motivo: 'cabe',
    explicacao:
      'Cabe no cérebro dela — é pouca coisa e ela responde na hora, sem precisar buscar. ' +
      'Se um dia crescer muito, eu movo pra Base de Conhecimento automaticamente.',
  }
}

// ─────────────────────── BUSCA ───────────────────────
// Fase 0 do RAG: busca por PALAVRA-CHAVE (BM25-lite). Recupera as FAQs mais
// relevantes pra pergunta. É determinística, sem custo, sem embeddings — e
// resolve o caso comum (o lead pergunta "vocês atendem por convênio?" → acha a
// FAQ de convênio). A busca VETORIAL (embeddings) é a evolução natural quando a
// base fica grande e as perguntas, mais indiretas — está documentada no §5.
const STOPWORDS = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'e', 'que', 'em', 'um', 'uma',
  'para', 'pra', 'com', 'por', 'no', 'na', 'se', 'ou', 'meu', 'minha', 'voce', 'voces', 'vcs', 'ai'])

/**
 * Radical de 4 chars — stemming pobre que casa variação morfológica do PT sem
 * biblioteca: "horas"/"horário" → "hora"; "abre"/"abrem"/"abertura" → "abr…";
 * "convênio"/"convênios" → "conv". Resolve o caso comum da busca por keyword.
 * O limite dele (sinônimo sem raiz comum: "médico"×"doutor") é o que motiva
 * evoluir pra busca vetorial quando a base cresce (CENTRAL.md §5).
 */
function radical(w: string): string {
  return w.length <= 4 ? w : w.slice(0, 4)
}

function tokenizar(s: string): string[] {
  return (s || '').toLowerCase().normalize('NFD')
    .split('').filter(ch => { const c = ch.charCodeAt(0); return c < 0x0300 || c > 0x036f }).join('')
    .split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOPWORDS.has(w))
}

const radicais = (s: string) => tokenizar(s).map(radical)

export function buscarFaqs(faqs: FaqConhecimento[], consulta: string, limite = 3): FaqConhecimento[] {
  const termos = new Set(radicais(consulta))
  if (!termos.size) return []
  const pont = faqs.filter(f => f.ativo).map(f => {
    const palavras = radicais(f.pergunta + ' ' + f.pergunta + ' ' + f.resposta) // pergunta pesa 2×
    let s = 0
    for (const w of palavras) if (termos.has(w)) s++
    return { f, s }
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s)
  return pont.slice(0, limite).map(x => x.f)
}

/**
 * O trecho que entra no contexto DINÂMICO da IA quando o lead pergunta algo que
 * a base cobre. Vazio → a IA não tem o que consultar (e diz que vai confirmar,
 * nunca inventa).
 */
export function contextoDaBusca(faqs: FaqConhecimento[], consulta: string): string {
  const achadas = buscarFaqs(faqs, consulta)
  if (!achadas.length) return ''
  const linhas = ['CONSULTEI A BASE DE CONHECIMENTO (use só se responder à pergunta; não invente o resto):']
  for (const f of achadas) linhas.push(`P: ${f.pergunta}\nR: ${f.resposta}`)
  return linhas.join('\n\n')
}
