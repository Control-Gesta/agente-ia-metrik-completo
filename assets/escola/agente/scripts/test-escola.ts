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

console.log('\n── TRIAGEM: dado volátil NUNCA entra no cérebro ──')
const VOLATEIS = [
  'o valor agora é R$229',
  'fala que parcela em 12x',                  // "parcel"
  'diz que tem 20% de desconto',
  'o preço subiu',
  'avisa que só restam 3 vagas',
  'o horário mudou pra 14h',
  'a turma começa 05/09',
  'marca sempre 09:30',
]
for (const t of VOLATEIS) eq(`força ticket: "${t}"`, triar(t).destino, 'TOOL_CRM')

console.log('\n── TRIAGEM: conhecimento de verdade PASSA (sem falso positivo) ──')
const CADERNO = [
  'ela tem que ser mais calorosa na abertura',
  'nunca pergunte o nome antes de responder a dúvida',
  'quando o lead falar que é síndico, ofereça o plano B',
  'não repita pergunta que o lead já respondeu',
  'seja mais objetiva, resposta curta de WhatsApp',
]
for (const t of CADERNO) eq(`vai pro caderno: "${t}"`, triar(t).destino, 'CADERNO')

// 🩸 Os 3 falsos positivos MEDIDOS no 1º dia em produção (22/07/2026). São
// palavras que o cliente usa o tempo todo em correção de TOM — e a última é a
// pior, porque datar a correção é o hábito mais natural que ele tem.
console.log('\n── TRIAGEM: os falsos positivos medidos em produção ──')
const FALSOS_POSITIVOS = [
  ['ela precisa dar mais valor ao que o lead falou', '"valor" sem número'],
  ['ela tem que ter mais paciência, sem prazo pra fechar', '"prazo" sem número'],
  ['outro dia, 15/07, ela respondeu muito seca', 'data como referência temporal'],
  ['ontem, 20/07, ela ignorou a pergunta do cara', 'idem — o cliente DATA a correção'],
  ['ela precisa valorizar a dúvida do lead', '"valorizar" não é "valor"'],
  ['responde às 9h da manhã com mais energia', 'hora sem contexto de oferta'],
]
for (const [t, nota] of FALSOS_POSITIVOS) eq(`NÃO vira chamado (${nota})`, triar(t).destino, 'CADERNO')

// E a proteção não pode ter afrouxado: com número perto, volta a ser ticket.
console.log('\n── TRIAGEM: a proteção continua de pé (polissêmica + número) ──')
const AINDA_TICKET = [
  ['o valor é R$229 agora', 'valor + R$'],
  ['fala que o valor subiu pra 249', 'valor + número'],
  ['o prazo de entrega é 15 dias', 'prazo + número'],
  ['restam 3 vagas na turma', 'vaga + número'],
  ['o horário de atendimento é 9h às 18h', 'horário + número'],
  ['a turma começa 05/09', 'data + palavra de oferta'],
  ['a promoção vale até 30/08', 'data + oferta'],
  ['diz que a mensalidade mudou', 'palavra forte, sem número'],
]
for (const [t, nota] of AINDA_TICKET) eq(`continua chamado (${nota})`, triar(t).destino, 'TOOL_CRM')

// Hora PRESCRITA é dado (vira horário fixo no cérebro e desmente a agenda real);
// hora NARRADA é só o contexto da correção. O verbo em volta é o que separa.
console.log('\n── TRIAGEM: hora prescrita × hora narrada ──')
eq('"marca sempre 09:30" = prescrição → chamado', triar('marca sempre 09:30').destino, 'TOOL_CRM')
eq('"agenda as 14h" = prescrição → chamado',      triar('agenda sempre as 14h').destino, 'TOOL_CRM')
eq('"responde às 9h com mais energia" = narrado', triar('responde às 9h da manhã com mais energia').destino, 'CADERNO')

// 🩸 Caso deliberadamente NÃO testado como ticket: "ela tem que informar o prazo
// de entrega". É AMBÍGUO — a correção não diz QUAL é o prazo, diz que ela deve
// mencioná-lo, o que é regra de comportamento e o número viria da tool. Na
// dúvida a Fase 0 é segura dos dois lados: nada é escrito no cérebro
// automaticamente, então cair no caderno só significa que um humano vai ler.
eq('ambíguo cai no caderno (humano decide)', triar('ela tem que informar o prazo de entrega').destino, 'CADERNO')

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
