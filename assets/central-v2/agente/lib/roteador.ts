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
const NUMERO_PERTO = /(\d|R\$)/

// ── MONETÁRIO → CATÁLOGO ────────────────────────────────────────────────────
// R$, %, "N reais" são inequívocos. As palavras de oferta (preço, mensalidade…)
// só contam DADO se houver número perto — senão "responda o preço antes de
// perguntar o nome" (uma REGRA de comportamento) viraria item de catálogo.
const MOEDA = /R\$\s?\d|\d+\s*%|\b\d+\s*reais\b/i
const OFERTA_PALAVRA = /\b(pre[çc]os?|mensalidades?|parcel\w*|descontos?|planos?|pacotes?|combos?|valor(es)?)\b/i

// ── TEMPORAL / AGENDA → TOOL_CRM ────────────────────────────────────────────
// Data/hora só é volátil quando PRESCRITA, nunca NARRADA:
//   "outro dia, 15/07, ela respondeu seca"  → narrativa (contexto da correção)
//   "marca sempre 09:30" / "o horário é 14h" → prescrição (vira agenda fixa errada)
const DATA_HORA = /\d{1,2}\/\d{1,2}|\b\d{1,2}h\b|\b\d{1,2}:\d{2}\b/
const AGENDA = /\b(hor[áa]rios?|agenda|atend|funciona|abre|fecha|marc[ae]|marque|agend[ae]|agendar|expediente)\b/i
const OFERTA_TEMPO = /\b(turma|come[çc]a|in[íi]cio|inicia|promo[çc][ãa]o|v[áa]lid|inscri|lote|vence|expira|matr[íi]cula)\b/i
const DISPONIBILIDADE = /\b(vagas?|estoque|dispon[íi]vel|restam?|lugares?)\b/i

// ── MÍDIA → biblioteca de mídia ─────────────────────────────────────────────
// "manda a foto do espaço", "envia o cardápio em PDF", "mostra o vídeo".
const MIDIA = /\b(mand[ae]r?|envi[ae]r?|mostr[ae]r?|compartilh)\w*\b[^.!?]{0,40}\b(foto|fotos|imagem|imagens|v[íi]deos?|card[áa]pio|pdf|arquivo|tabela|cat[áa]logo)\b|\b(foto|v[íi]deo|card[áa]pio em pdf|pdf do)\b/i

/** CONHECIMENTO — texto longo colado (documento / FAQ extenso) → candidato a RAG. */
const LIMIAR_CONHECIMENTO = 600   // chars; acima disso não é "uma regra", é um documento

export interface ResultadoTriagem {
  destino: DestinoTriagem
  forcado: boolean
  motivo?: string
  /** O que a tela explica pro cliente. Português de dono, sem jargão. */
  explicacao?: string
}

function numeroPerto(texto: string, idx: number, len: number): boolean {
  return NUMERO_PERTO.test(texto.slice(Math.max(0, idx - 20), idx + len + 20))
}

/** Preço/oferta concreta → CATÁLOGO. Não pega a palavra "preço" solta numa regra. */
function ehOferta(texto: string): string | null {
  const m = texto.match(MOEDA)
  if (m) return m[0].toLowerCase().trim()
  const o = texto.match(OFERTA_PALAVRA)
  if (o && o.index !== undefined && numeroPerto(texto, o.index, o[0].length)) {
    return o[0].toLowerCase().trim()
  }
  return null
}

/** Agenda/horário/disponibilidade PRESCRITO (dado vivo) → TOOL_CRM. */
function ehDadoVivo(texto: string): string | null {
  const dh = texto.match(DATA_HORA)
  if (dh && (AGENDA.test(texto) || OFERTA_TEMPO.test(texto))) return dh[0].toLowerCase().trim()
  const disp = texto.match(DISPONIBILIDADE)
  if (disp && disp.index !== undefined && numeroPerto(texto, disp.index, disp[0].length)) {
    return disp[0].toLowerCase().trim()
  }
  return null
}

/**
 * A RÉGUA (CENTRAL.md §2) — decide em ORDEM, para no primeiro que casar.
 * Determinística onde dá; o que sobra vai pro CADERNO (default seguro) e os
 * chips/modelo refinam depois. Na dúvida, SEMPRE erra pra fora do cérebro.
 */
export function triar(intencao: string): ResultadoTriagem {
  const texto = String(intencao || '')

  // 1. DADO QUE MUDA TODA HORA — agenda/horário/disponibilidade → TOOL/CRM
  const vivo = ehDadoVivo(texto)
  if (vivo) return {
    destino: 'TOOL_CRM', forcado: true, motivo: `dado_vivo:${vivo}`,
    explicacao:
      'Isso é um dado que muda toda hora — agenda, horário ou disponibilidade. Se eu fixar isso no ' +
      'cérebro dela, no dia em que mudar ela vai responder o valor velho com toda a confiança do mundo. ' +
      'Dado assim vem do sistema, não do texto. Abri um chamado pra {NOME_AGENCIA} ligar isso na fonte.',
  }

  // 2. PRODUTO / PREÇO / OFERTA → CATÁLOGO (a tabela viva)
  const oferta = ehOferta(texto)
  if (oferta) return {
    destino: 'CATALOGO', forcado: true, motivo: `oferta:${oferta}`,
    explicacao:
      'Isso é preço ou produto — e preço não mora no cérebro dela (vira valor velho no dia em que ' +
      'você mudar). O lugar certo é o Catálogo: uma tabela onde você edita o preço e a IA já passa a ' +
      'cotar o novo, sem mexer no cérebro. Quer que eu registre no Catálogo?',
  }

  // 3. MÍDIA — foto/PDF/vídeo que ela envia → biblioteca de mídia
  if (MIDIA.test(texto)) return {
    destino: 'MIDIA', forcado: false, motivo: 'midia',
    explicacao:
      'Isso é um arquivo pra ela enviar (foto, PDF ou vídeo). Isso vai na aba de Mídias — você sobe o ' +
      'arquivo e ela passa a mandar quando fizer sentido. Não é texto de cérebro.',
  }

  // 4. CONHECIMENTO EXTENSO — documento/FAQ colado → candidato a RAG
  if (texto.length > LIMIAR_CONHECIMENTO) return {
    destino: 'CONHECIMENTO', forcado: false, motivo: `extenso:${texto.length}chars`,
    explicacao:
      'Isso é bastante conteúdo — mais do que cabe bem no cérebro dela (ela ficaria lenta). ' +
      'O lugar certo é a Base de Conhecimento: ela guarda isso e consulta o trecho certo quando ' +
      'alguém perguntar. Quer que eu registre lá?',
  }

  // 5. resto → CADERNO (regra de comportamento; os chips refinam pra EXEMPLO)
  return { destino: 'CADERNO', forcado: false }
}

/** Exportados só para os testes — mantenha em sincronia com os regex acima. */
export const _PADROES = { MOEDA, OFERTA_PALAVRA, DATA_HORA, AGENDA, OFERTA_TEMPO, DISPONIBILIDADE, MIDIA }
