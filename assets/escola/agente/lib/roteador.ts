import type { DestinoTriagem } from './escola-core'

/**
 * TRIAGEM DETERMINÍSTICA — Passo 2 do pipeline, e a trava mais barata da Escola.
 *
 * Roda ANTES de qualquer modelo opinar. Custo zero, resultado idêntico sempre.
 *
 * A pior falha possível deste produto é escrever um DADO VIVO dentro do cérebro:
 * "o valor agora é R$229" vira texto fixo no prompt e, no dia em que o preço
 * mudar, a IA continua vendendo o valor velho COM TODA A CONFIANÇA DO MUNDO —
 * e ninguém percebe até um cliente reclamar. Dado vivo mora no CRM ou numa tool;
 * nunca no prompt (CONTEXT-ENG.md §2).
 *
 * Por isso o regex é FORÇADO: quando bate, o modelo nem é chamado.
 */

/**
 * 🩸 CICATRIZ (22/07/2026, medida em produção no 1º dia): a primeira versão
 * jogava TODA palavra da família "preço/prazo/valor/data" direto pro ticket, e
 * 3 de 6 correções legítimas viravam chamado:
 *
 *   "ela precisa dar mais VALOR ao que o lead falou"   → 🎫 (só por "valor")
 *   "ela tem que ter paciência, sem PRAZO pra fechar"  → 🎫 (só por "prazo")
 *   "outro dia, 15/07, ela respondeu muito seca"       → 🎫 (só pela data)
 *
 * A última é a pior: **o cliente data as correções dele naturalmente** — "dia
 * 15 ela…", "ontem, 20/07, ela…". Data solta é REFERÊNCIA TEMPORAL, não dado a
 * ensinar. Tratar como volátil transforma o hábito mais natural do cliente num
 * chamado inútil, e ele para de escrever o contexto que é o valor da correção.
 *
 * O conserto tem duas classes:
 *
 *   FORTE  — sozinha já é dado vivo. "R$", "%", "reais", "desconto", "estoque",
 *            "parcela", "preço": nenhuma delas aparece em correção de tom.
 *   FRACA  — polissêmica em português. "valor", "prazo", "vaga", "horário" só
 *            contam PERTO DE UM NÚMERO ou de "R$" — que é o que separa
 *            "o valor é R$229" de "dar valor ao lead".
 *
 * Datas e horas: só contam junto de palavra de OFERTA (turma começa, promoção
 * válida até, vaga até, inscrição, lote). Data solta passa pro caderno.
 *
 * A trava continua fail-safe na direção certa: na dúvida ela erra mandando pro
 * ticket, nunca escrevendo número no cérebro. E o que ela erra o cliente
 * desfaz com um clique (`reclassificar`), que é a válvula da Tela F.
 */
const FORTE = /R\$|\breais\b|\d+\s*%|\bpre[çc]os?\b|\bparcel\w*|\bdescontos?\b|\bestoque\b|\bmensalidades?\b/i

/** Polissêmicas: valem só com número (ou R$) a até ~20 caracteres de distância. */
const FRACA = /\b(valor(es)?|prazos?|vagas?|hor[áa]rios?)\b/i
const NUMERO_PERTO = /(\d|R\$)/

/**
 * Data/hora só é volátil quando PRESCRITA, nunca quando NARRADA.
 *
 *   "outro dia, 15/07, ela respondeu seca"  → narrativa. É contexto da correção.
 *   "marca sempre 09:30"                    → prescrição. Vira horário fixo no
 *                                             cérebro e desmente a agenda real.
 *
 * O sinal que separa os dois é o vocabulário em volta: palavra de OFERTA
 * (turma começa, promoção até) ou verbo de AGENDA (marca, agenda, oferece).
 */
const DATA_HORA = /\d{1,2}\/\d{1,2}|\b\d{1,2}h\b|\b\d{1,2}:\d{2}\b/
const OFERTA = /\b(turma|come[çc]a|in[íi]cio|inicia|promo[çc][ãa]o|v[áa]lid|inscri|lote|vence|expira|at[ée]\b|abre|fecha|matr[íi]cula|marc[ae]|marque|agend[ae]|agendar|ofere[çc]|sempre\s+[àa]?s?\s*\d)/i

export interface ResultadoTriagem {
  destino: DestinoTriagem
  forcado: boolean
  motivo?: string
  /** O que a Tela F explica pro cliente. Português de dono, sem jargão. */
  explicacao?: string
}

/** Há número (ou R$) numa janela de ±20 chars ao redor do índice? */
function numeroPerto(texto: string, idx: number, len: number): boolean {
  return NUMERO_PERTO.test(texto.slice(Math.max(0, idx - 20), idx + len + 20))
}

function detectar(texto: string): string | null {
  const forte = texto.match(FORTE)
  if (forte) return forte[0].toLowerCase().trim()

  const fraca = texto.match(FRACA)
  if (fraca && fraca.index !== undefined && numeroPerto(texto, fraca.index, fraca[0].length)) {
    return fraca[0].toLowerCase().trim()
  }

  const dh = texto.match(DATA_HORA)
  if (dh && OFERTA.test(texto)) return dh[0].toLowerCase().trim()

  return null
}

export function triar(intencao: string): ResultadoTriagem {
  const texto = String(intencao || '')
  const achado = detectar(texto)
  if (achado) {
    return {
      destino: 'TOOL_CRM',
      forcado: true,
      motivo: `dado_volatil:${achado}`,
      explicacao:
        'Isso é um dado que muda com o tempo — preço, prazo, horário ou vaga. ' +
        'Se eu escrever esse número dentro do cérebro dela, no dia em que você mudar ' +
        'a IA vai continuar falando o valor antigo com toda a confiança do mundo, e ' +
        'ninguém percebe até um cliente reclamar. Dado assim vem do CRM, não do cérebro. ' +
        'Abri um chamado pra {NOME_AGENCIA} ajustar na fonte.',
    }
  }
  return { destino: 'CADERNO', forcado: false }
}

/** Exportados só para os testes — mantenha em sincronia com os regex acima. */
export const _PADROES = { FORTE, FRACA, DATA_HORA, OFERTA }
