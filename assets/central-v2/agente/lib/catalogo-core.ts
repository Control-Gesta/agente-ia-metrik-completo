/**
 * CATÁLOGO · NÚCLEO PURO — o parse de planilha e a formatação pra IA.
 *
 * A sacada da Continuare, adotada (CENTRAL.md §4): a IA cota de uma TABELA VIVA,
 * não de texto decorado no prompt. Preço mudou? edita a linha e a IA já cota o
 * novo — sem deploy, sem prompt, sem número apodrecendo no cérebro.
 *
 * Mora separado de `catalogo.ts` (que tem Redis/CONFIG) pra que o parse e a
 * formatação sejam testáveis sem env — a mesma lei da Escola: o que precisa de
 * prova não pode depender de credencial.
 */

export interface ItemCatalogo {
  id: string
  produto: string
  preco: string          // texto: "R$ 179/mês", "sob consulta" — nem tudo é número
  descricao?: string
  categoria?: string
  ativo: boolean         // item pausado não é oferecido, mas não some
}

/** O de-para de colunas: qual coluna da planilha do cliente é o quê. */
export interface MapaColunas {
  produto: string
  preco: string
  descricao?: string
  categoria?: string
}

// ─────────────────────────── PARSE DE PLANILHA (CSV) ───────────────────────────

/**
 * Parser de CSV robusto o suficiente pro que cliente exporta do Excel/Sheets:
 * aspas, vírgula dentro de aspas, ponto-e-vírgula (padrão BR), CRLF.
 *
 * 🩸 Ponto-e-vírgula: o Excel em PT-BR exporta CSV com ';' porque a vírgula é o
 * separador decimal. Detectar o delimitador errado transforma a planilha inteira
 * numa coluna só — e o de-para não acha nada.
 */
export function detectarDelimitador(texto: string): ',' | ';' | '\t' {
  const linha = texto.split(/\r?\n/)[0] || ''
  const c = (linha.match(/,/g) || []).length
  const p = (linha.match(/;/g) || []).length
  const t = (linha.match(/\t/g) || []).length
  if (t >= c && t >= p) return '\t'
  return p > c ? ';' : ','
}

export function parseCSV(texto: string, delim?: ',' | ';' | '\t'): string[][] {
  const d = delim || detectarDelimitador(texto)
  const linhas: string[][] = []
  let campo = '', linha: string[] = [], aspas = false
  const t = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (aspas) {
      if (ch === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++ }
        else aspas = false
      } else campo += ch
    } else if (ch === '"') aspas = true
    else if (ch === d) { linha.push(campo); campo = '' }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
    else campo += ch
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas.filter(l => l.some(c => c.trim() !== ''))
}

/** Tira acento sem depender de range de diacríticos (que confunde editor/encoding). */
export function semAcento(s: string): string {
  return s.normalize('NFD').split('').filter(ch => {
    const c = ch.charCodeAt(0)
    return c < 0x0300 || c > 0x036f   // descarta os diacríticos combinados
  }).join('')
}

/** Sugere o de-para olhando o cabeçalho — o cliente confirma/ajusta. */
export function sugerirMapa(cabecalho: string[]): Partial<MapaColunas> {
  const norm = (s: string) => semAcento(s.toLowerCase()).trim()
  const acha = (...termos: string[]) =>
    cabecalho.find(c => termos.some(t => norm(c).includes(t)))
  return {
    produto: acha('produto', 'servico', 'nome', 'item', 'plano'),
    preco: acha('preco', 'valor', 'r$', 'custo', 'mensalidade'),
    descricao: acha('descri', 'detalhe', 'obs'),
    categoria: acha('categoria', 'grupo', 'tipo', 'linha'),
  }
}

/** Transforma linhas + de-para em itens. Descarta linha sem produto. */
export function linhasParaItens(linhas: string[][], mapa: MapaColunas, gerarId: (i: number) => string): ItemCatalogo[] {
  if (linhas.length < 2) return []
  const cab = linhas[0].map(c => c.trim())
  const idx = (nome?: string) => (nome ? cab.indexOf(nome) : -1)
  const iP = idx(mapa.produto), iV = idx(mapa.preco), iD = idx(mapa.descricao), iC = idx(mapa.categoria)
  const out: ItemCatalogo[] = []
  for (let r = 1; r < linhas.length; r++) {
    const cel = linhas[r]
    const produto = (iP >= 0 ? cel[iP] : '')?.trim()
    if (!produto) continue
    out.push({
      id: gerarId(out.length),
      produto: produto.slice(0, 200),
      preco: (iV >= 0 ? cel[iV] : '')?.trim().slice(0, 80) || 'sob consulta',
      descricao: (iD >= 0 ? cel[iD] : '')?.trim().slice(0, 400) || undefined,
      categoria: (iC >= 0 ? cel[iC] : '')?.trim().slice(0, 80) || undefined,
      ativo: true,
    })
  }
  return out
}

// ─────────────────────────── FORMATAÇÃO PRA IA ───────────────────────────

/**
 * O catálogo vira TEXTO pro contexto DINÂMICO da IA (nunca o bloco estático
 * cacheado — senão editar um preço invalidaria o cache de todo mundo).
 *
 * Só itens ATIVOS. Agrupado por categoria. A regra dura ("ela nunca oferece o
 * que não está aqui") é escrita junto, pra a IA não inventar produto.
 */
export function catalogoParaContexto(itens: ItemCatalogo[]): string {
  const ativos = itens.filter(i => i.ativo)
  if (!ativos.length) return ''
  const porCat = new Map<string, ItemCatalogo[]>()
  for (const it of ativos) {
    const c = it.categoria || 'Geral'
    if (!porCat.has(c)) porCat.set(c, [])
    porCat.get(c)!.push(it)
  }
  const linhas = ['CATÁLOGO OFICIAL (só ofereça e cote o que está aqui — nunca invente produto ou preço):']
  for (const [cat, its] of porCat) {
    linhas.push(`\n[${cat}]`)
    for (const it of its) {
      linhas.push(`• ${it.produto} — ${it.preco}${it.descricao ? ` (${it.descricao})` : ''}`)
    }
  }
  return linhas.join('\n')
}
