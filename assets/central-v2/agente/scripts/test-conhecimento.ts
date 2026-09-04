/**
 * Prova da Base de Conhecimento — a régua cérebro×RAG e a busca, sem rede.
 *
 *   cd scripts && npx tsx test-conhecimento.ts
 *
 * A peça-mãe é a RÉGUA: conhecimento pequeno vai pro cérebro (rápido, cache de
 * graça); grande vira RAG. Ligar RAG cedo demais é engenharia negativa; tarde
 * demais deixa a IA lenta. O limiar é medido (CONTEXT-ENG.md).
 */
import {
  buscarFaqs, contextoDaBusca, decidirDestino, estimarTokens,
  TETO_FAQS_CEREBRO, type FaqConhecimento,
} from '../lib/conhecimento-core'

let ok = 0, falhou = 0
const eq = (nome: string, real: unknown, esperado: unknown) => {
  const bate = JSON.stringify(real) === JSON.stringify(esperado)
  if (bate) { ok++; console.log(`  ✅ ${nome}`) }
  else { falhou++; console.log(`  ❌ ${nome}\n       esperado: ${JSON.stringify(esperado)}\n       veio:     ${JSON.stringify(real)}`) }
}

const faq = (id: string, topico: string, pergunta: string, resposta: string, ativo = true): FaqConhecimento =>
  ({ id, topico, pergunta, resposta, ativo })

console.log('\n── A RÉGUA: pouco → cérebro · muito → RAG ──')
const poucas = [
  faq('1', 'Convênios', 'Vocês atendem por convênio?', 'Sim, atendemos Unimed e Bradesco Saúde.'),
  faq('2', 'Horários', 'Qual o horário?', 'Segunda a sexta, 8h às 18h.'),
]
eq('2 FAQs curtas → cérebro', decidirDestino(poucas).destino, 'cerebro')

// muitas FAQs → RAG (passa do teto de contagem)
const muitas = Array.from({ length: TETO_FAQS_CEREBRO + 1 }, (_, i) =>
  faq(`m${i}`, 'FAQ', `Pergunta ${i}?`, `Resposta ${i}.`))
eq(`${TETO_FAQS_CEREBRO + 1} FAQs → RAG`, decidirDestino(muitas).destino, 'rag')

// cérebro já quase cheio + FAQs estoura o teto de tokens → RAG
eq('cérebro em 9.99k + FAQs → RAG', decidirDestino(poucas, 9_990).destino, 'rag')

// FAQ gigante sozinha estoura → RAG
const gigante = [faq('g', 'Manual', 'Como funciona?', 'x'.repeat(45_000))]
eq('1 FAQ gigante (>10k tokens) → RAG', decidirDestino(gigante).destino, 'rag')

console.log('\n── ESTIMATIVA de tokens (~4 chars/token) ──')
eq('400 chars ≈ 100 tokens', estimarTokens('x'.repeat(400)), 100)
eq('vazio = 0', estimarTokens(''), 0)

console.log('\n── BUSCA por palavra-chave (o caso comum) ──')
const base = [
  faq('1', 'Convênios', 'Vocês atendem por convênio?', 'Sim, Unimed e Bradesco.'),
  faq('2', 'Horários', 'Qual o horário de funcionamento?', 'Segunda a sexta 8h-18h.'),
  faq('3', 'Estacionamento', 'Tem estacionamento?', 'Sim, gratuito para pacientes.'),
]
eq('"atendem convênio?" acha a FAQ de convênio', buscarFaqs(base, 'vocês atendem por convênio mesmo?')[0]?.id, '1')
// o radical de 4 chars casa variação: "horário" → "hora", "horas" → "hora"
eq('"que horas abre" acha a de horário (via radical)', buscarFaqs(base, 'que horas vocês abrem?')[0]?.id, '2')
eq('"tem onde estacionar" acha estacionamento', buscarFaqs(base, 'tem onde estacionar o carro?')[0]?.id, '3')
eq('pergunta sem match → vazio', buscarFaqs(base, 'vocês fazem transplante de medula?').length, 0)
eq('só palavras irrelevantes → vazio', buscarFaqs(base, 'e aí, tudo bem?').length, 0)

console.log('\n── CONTEXTO PRA IA: traz a FAQ achada, vazio se não achou ──')
eq('acha → contexto com a resposta', /Unimed/.test(contextoDaBusca(base, 'atendem convênio?')), true)
eq('não acha → vazio (a IA não inventa)', contextoDaBusca(base, 'fazem transplante?'), '')

console.log(`\n${falhou === 0 ? '✅' : '❌'}  ${ok} passaram · ${falhou} falharam\n`)
process.exit(falhou === 0 ? 0 : 1)
