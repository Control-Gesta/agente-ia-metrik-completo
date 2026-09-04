/**
 * Prova do catálogo — parse de planilha e formatação pra IA, sem rede nem Redis.
 *
 *   cd scripts && npx tsx test-catalogo.ts
 *
 * O que quebra CALADO se estiver errado:
 *  · delimitador ';' do Excel BR não detectado → planilha vira 1 coluna, de-para acha nada
 *  · vírgula dentro de aspas parte o campo → preço "R$ 1.299,00" vira duas colunas
 *  · catálogo mal formatado → a IA cota errado ou inventa produto
 */
import {
  catalogoParaContexto, detectarDelimitador, linhasParaItens, parseCSV,
  semAcento, sugerirMapa, type ItemCatalogo, type MapaColunas,
} from '../lib/catalogo-core'

let ok = 0, falhou = 0
const eq = (nome: string, real: unknown, esperado: unknown) => {
  const bate = JSON.stringify(real) === JSON.stringify(esperado)
  if (bate) { ok++; console.log(`  ✅ ${nome}`) }
  else { falhou++; console.log(`  ❌ ${nome}\n       esperado: ${JSON.stringify(esperado)}\n       veio:     ${JSON.stringify(real)}`) }
}

console.log('\n── DELIMITADOR: o Excel BR exporta com ; (a pegadinha) ──')
eq('vírgula', detectarDelimitador('produto,preco\nPlano,100'), ',')
eq('ponto-e-vírgula (Excel BR)', detectarDelimitador('produto;preco\nPlano;100'), ';')
eq('tab', detectarDelimitador('produto\tpreco\nPlano\t100'), '\t')

console.log('\n── PARSE: aspas e vírgula dentro do campo ──')
eq('campo simples', parseCSV('a,b\n1,2'), [['a', 'b'], ['1', '2']])
eq('vírgula dentro de aspas', parseCSV('produto,preco\n"Plano Ouro","R$ 1.299,00"'),
   [['produto', 'preco'], ['Plano Ouro', 'R$ 1.299,00']])
eq('aspas escapadas', parseCSV('a\n"diz ""oi"""'), [['a'], ['diz "oi"']])
eq('ignora linha vazia', parseCSV('a,b\n1,2\n\n3,4').length, 3)

console.log('\n── DE-PARA: sugere olhando o cabeçalho (com acento e maiúscula) ──')
eq('acha produto e preço', sugerirMapa(['Produto', 'Preço', 'Categoria']),
   { produto: 'Produto', preco: 'Preço', descricao: undefined, categoria: 'Categoria' })
eq('sinônimos (serviço/valor)', sugerirMapa(['Serviço', 'Valor', 'Descrição']).produto, 'Serviço')
eq('semAcento', semAcento('Preço Válido'), 'Preco Valido')

console.log('\n── IMPORTAR: linhas + de-para viram itens ──')
const csv = 'Produto;Preço;Categoria\nPlano Básico;R$ 99;Planos\n;sem produto;Planos\nPlano Pro;R$ 199;Planos'
const linhas = parseCSV(csv)
const mapa: MapaColunas = { produto: 'Produto', preco: 'Preço', categoria: 'Categoria' }
let seq = 0
const itens = linhasParaItens(linhas, mapa, () => `id${seq++}`)
eq('descarta linha sem produto (3 linhas → 2 itens)', itens.length, 2)
eq('primeiro item', { p: itens[0].produto, v: itens[0].preco, c: itens[0].categoria },
   { p: 'Plano Básico', v: 'R$ 99', c: 'Planos' })
eq('preço vazio vira "sob consulta"',
   linhasParaItens(parseCSV('Produto\nPlano X'), { produto: 'Produto', preco: 'Preço' }, () => 'x')[0].preco,
   'sob consulta')

console.log('\n── CONTEXTO PRA IA: só ativos, agrupado, com a regra dura ──')
const cat: ItemCatalogo[] = [
  { id: '1', produto: 'Plano Básico', preco: 'R$ 99', categoria: 'Mensais', ativo: true },
  { id: '2', produto: 'Plano Pro', preco: 'R$ 199', categoria: 'Mensais', ativo: true },
  { id: '3', produto: 'Item pausado', preco: 'R$ 50', categoria: 'Mensais', ativo: false },
]
const ctx = catalogoParaContexto(cat)
eq('inclui a regra dura', /nunca invente/i.test(ctx), true)
eq('inclui os ativos', ctx.includes('Plano Básico') && ctx.includes('Plano Pro'), true)
eq('exclui o pausado', ctx.includes('Item pausado'), false)
eq('catálogo vazio → string vazia', catalogoParaContexto([]), '')

console.log(`\n${falhou === 0 ? '✅' : '❌'}  ${ok} passaram · ${falhou} falharam\n`)
process.exit(falhou === 0 ? 0 : 1)
