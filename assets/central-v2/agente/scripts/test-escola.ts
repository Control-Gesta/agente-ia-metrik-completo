/**
 * Prova das travas da Escola — funções puras, sem rede, sem Redis, sem modelo.
 *
 *   npx tsx scripts/test-escola.ts
 *
 * Cobre o que quebra CALADO se estiver errado: a triagem de dado volátil (que
 * impede número fixo de entrar no cérebro), a anonimização (que impede telefone
 * de virar dado guardado) e o roteamento por chip (que decide o lote da Fase 1).
 */
import { anonimizar, blocoDosChips, type ChipId } from '../lib/escola-core'
import { triar } from '../lib/roteador'

let ok = 0, falhou = 0
const eq = (nome: string, real: unknown, esperado: unknown) => {
  const bate = JSON.stringify(real) === JSON.stringify(esperado)
  if (bate) { ok++; console.log(`  ✅ ${nome}`) }
  else { falhou++; console.log(`  ❌ ${nome}\n       esperado: ${JSON.stringify(esperado)}\n       veio:     ${JSON.stringify(real)}`) }
}

// A RÉGUA DE DESTINO (CENTRAL.md §2) — cada correção vai pro lugar certo.
// A lei de segurança não muda: preço/agenda NUNCA viram texto no cérebro.
// O que mudou: preço agora vai pro CATÁLOGO (tabela viva), não pro chamado genérico.

console.log('\n── RÉGUA: preço / oferta → CATÁLOGO (não vira texto no cérebro) ──')
const CATALOGO = [
  'o valor agora é R$229',
  'fala que parcela em 12x',
  'diz que tem 20% de desconto',
  'o plano premium custa R$500',
  'a mensalidade é 179 por mês',
  'o pacote família sai por 349',
]
for (const t of CATALOGO) eq(`→ catálogo: "${t}"`, triar(t).destino, 'CATALOGO')

console.log('\n── RÉGUA: agenda / disponibilidade → TOOL_CRM (dado vivo) ──')
const TOOL = [
  'avisa que só restam 3 vagas',
  'o horário de atendimento é 9h às 18h',
  'a turma começa 05/09',
  'marca sempre 09:30',
  'agenda sempre as 14h',
]
for (const t of TOOL) eq(`→ CRM: "${t}"`, triar(t).destino, 'TOOL_CRM')

console.log('\n── RÉGUA: mídia → MÍDIA · texto longo → CONHECIMENTO ──')
eq('"manda a foto do espaço" → mídia', triar('quando perguntarem, manda a foto do espaço').destino, 'MIDIA')
eq('"envia o cardápio em PDF" → mídia', triar('envia o cardápio em pdf pra quem pedir').destino, 'MIDIA')
eq('documento colado (>600 chars) → conhecimento',
   triar('nossa política de cancelamento é a seguinte: '.repeat(20)).destino, 'CONHECIMENTO')

console.log('\n── RÉGUA: regra de comportamento → CÉREBRO (CADERNO) ──')
const CADERNO = [
  'ela tem que ser mais calorosa na abertura',
  'nunca pergunte o nome antes de responder a dúvida',
  'quando o lead falar que é síndico, ofereça o plano B',
  'não repita pergunta que o lead já respondeu',
  'seja mais objetiva, resposta curta de WhatsApp',
]
for (const t of CADERNO) eq(`→ cérebro: "${t}"`, triar(t).destino, 'CADERNO')

// 🩸 Os falsos positivos MEDIDOS no 1º dia em produção (22/07/2026): palavras que
// o cliente usa o tempo todo em correção de TOM. Continuam indo pro cérebro.
console.log('\n── RÉGUA: os falsos positivos medidos NÃO viram preço/agenda ──')
const FALSOS_POSITIVOS = [
  'ela precisa dar mais valor ao que o lead falou',        // "valor" sem número
  'ela tem que ter mais paciência, sem prazo pra fechar',  // "prazo" sem número
  'outro dia, 15/07, ela respondeu muito seca',            // data narrada
  'ontem, 20/07, ela ignorou a pergunta do cara',          // o cliente DATA a correção
  'ela precisa valorizar a dúvida do lead',                // "valorizar" ≠ "valor"
  'responde às 9h da manhã com mais energia',              // hora narrada, sem agenda
  'responda o preço antes de perguntar o nome',            // REGRA sobre preço, sem número
]
for (const t of FALSOS_POSITIVOS) eq(`→ cérebro (não é dado): "${t.slice(0, 42)}…"`, triar(t).destino, 'CADERNO')

console.log('\n── ANONIMIZAÇÃO: o que ensina fica, quem era o lead some ──')
eq('celular (11) 9…',         anonimizar('me chama no (11) 98765-4321'), 'me chama no [telefone]')
eq('celular cru 11 dígitos',  anonimizar('meu zap 11987654321'), 'meu zap [telefone]')
eq('celular com +55',         anonimizar('zap +55 11 98765-4321'), 'zap [telefone]')
eq('fixo 10 dígitos',         anonimizar('liga (11) 3255-4321'), 'liga [telefone]')
eq('e-mail',                  anonimizar('manda pra joao.silva@empresa.com.br'), 'manda pra [email]')
eq('CPF pontuado',            anonimizar('CPF 123.456.789-00'), 'CPF [cpf]')
eq('CPF cru (não é celular)', anonimizar('CPF 12345678900'), 'CPF [cpf]')
eq('CEP',                     anonimizar('CEP 01310-100'), 'CEP [cep]')
eq('preserva o que ensina',   anonimizar('ela foi seca demais'), 'ela foi seca demais')
eq('preço NÃO é PII',         anonimizar('custa R$179 por mês'), 'custa R$179 por mês')
eq('12x não vira telefone',   anonimizar('parcela em 12x sem juros'), 'parcela em 12x sem juros')
eq('ano não vira dado',       anonimizar('desde 2019 no mercado'), 'desde 2019 no mercado')

console.log('\n── CHIPS → BLOCO: determinístico, e sem chute ──')
eq('chip único',            blocoDosChips(['seca']), 'tom')
eq('dois chips, mesmo bloco', blocoDosChips(['seca', 'longa']), 'tom')
eq('maioria vence',         blocoDosChips(['seca', 'longa', 'faltou_preco']), 'tom')
eq('sem chip = triagem',    blocoDosChips([]), 'triagem')
// "foi seca E esqueceu o preço" é VOZ + FATO na mesma frase: fatiar sozinho
// perde metade, e rótulo errado = lote errado lá na Fase 1.
eq('empate = triagem humana', blocoDosChips(['seca', 'faltou_preco']), 'triagem')
eq('chip inválido ignorado', blocoDosChips(['inexistente' as ChipId]), 'triagem')

console.log(`\n${falhou === 0 ? '✅' : '❌'}  ${ok} passaram · ${falhou} falharam\n`)
process.exit(falhou === 0 ? 0 : 1)
