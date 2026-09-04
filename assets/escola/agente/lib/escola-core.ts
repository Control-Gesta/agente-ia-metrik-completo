/**
 * ESCOLA · NÚCLEO PURO — tipos, taxonomia e as duas funções que precisam ser
 * testáveis sem rede, sem Redis e sem env: `anonimizar` e `blocoDosChips`.
 *
 * Mora separado de `escola.ts` de propósito. Aquele arquivo importa CONFIG, que
 * exige as credenciais do CRM logo no import — o que tornaria impossível provar
 * a anonimização num teste, e criaria um ciclo com `execlog.ts` (que precisa de
 * `anonimizar` mas é importado por quem já carregou config).
 *
 * A LEI: todo texto livre do cliente é EVIDÊNCIA, nunca CONTEÚDO. Nada daqui é
 * renderizado no prompt — nem agora, nem quando o redator entrar na Fase 1.
 */

// ─────────────────────────── OS 12 BLOCOS DO CÉREBRO ───────────────────────────
// Espelham os `# Título` do prompt.md. A correção é arquivada por bloco para que
// a Fase 1 possa acumular lotes de ≥3 do MESMO assunto antes de propor um delta.
export const BLOCOS = [
  'identidade', 'numeros', 'portas', 'suporte', 'objetivo', 'tom',
  'ferramentas', 'funil', 'agendamento', 'followup', 'voz', 'limites',
] as const
export type BlocoId = (typeof BLOCOS)[number]

export const BLOCO_LABEL: Record<BlocoId, string> = {
  identidade: 'Identidade',
  numeros: 'Números da empresa',
  portas: 'As 3 portas (roteamento)',
  suporte: 'Suporte e alunos',
  objetivo: 'Objetivo da conversa',
  tom: 'Tom e formato',
  ferramentas: 'Uso das ferramentas',
  funil: 'Funil e qualificação',
  agendamento: 'Agendamento',
  followup: 'Followup',
  voz: 'Respostas por voz',
  limites: 'Limites',
}

// ─────────────────────────── CHIPS DE DIAGNÓSTICO ───────────────────────────
// O diagnóstico que o cliente daria se tivesse paciência, capturado em 1 clique.
// Existe porque o cliente preguiçoso preenche "o que ela deveria ter dito" e
// pula o "por quê" — e aí o roteamento vira adivinhação.
export const CHIPS = [
  { id: 'seca',            label: 'ficou seca',                 bloco: 'tom' },
  { id: 'faltou_preco',    label: 'faltou o preço',             bloco: 'numeros' },
  { id: 'perguntou_antes', label: 'perguntou antes de responder', bloco: 'objetivo' },
  { id: 'entendeu_errado', label: 'entendeu errado',            bloco: 'portas' },
  { id: 'ordem_errada',    label: 'ordem errada',               bloco: 'objetivo' },
  { id: 'longa',           label: 'longa demais',               bloco: 'tom' },
] as const
export type ChipId = (typeof CHIPS)[number]['id']

const CHIP_BLOCO = Object.fromEntries(CHIPS.map(c => [c.id, c.bloco])) as Record<ChipId, BlocoId>

/**
 * Bloco a partir dos chips — determinístico, sem modelo.
 * Sem chip não há palpite: vai pra 'triagem' e um humano classifica. Chutar
 * bloco é pior que não classificar (rótulo errado = lote errado na Fase 1).
 */
export function blocoDosChips(chips: ChipId[]): BlocoId | 'triagem' {
  if (!chips?.length) return 'triagem'
  const votos = new Map<BlocoId, number>()
  for (const c of chips) {
    const b = CHIP_BLOCO[c]
    if (b) votos.set(b, (votos.get(b) || 0) + 1)
  }
  if (votos.size === 0) return 'triagem'
  const ordenado = [...votos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  // Empate entre blocos diferentes = correção composta ("foi seca E esqueceu o
  // preço"). Isso é VOZ + FATO na mesma frase: fatiar por conta própria perde
  // metade. Vai pra triagem humana.
  if (ordenado.length > 1 && ordenado[0][1] === ordenado[1][1]) return 'triagem'
  return ordenado[0][0]
}

// ─────────────────────────── TIPOS ───────────────────────────

export type DestinoTriagem = 'CADERNO' | 'TOOL_CRM'

export interface Correcao {
  id: string
  v: 1
  ts: string
  autor: string
  perfil: 'dono' | 'agencia'

  /** (a) e (b) vêm TRAVADOS da tela — o cliente não digita, não edita. */
  turnoLead: string
  respostaErrada: string
  /** (c) obrigatório. Sem ele é reclamação, e reclamação não se conserta. */
  intencao: string
  /** (d) opcional. */
  porque?: string
  chips: ChipId[]

  origem: 'playground' | 'conversa_real' | 'colada'
  contactId?: string        // só em conversa_real, pra rastrear de volta
  bloco: BlocoId | 'triagem'
  destino: DestinoTriagem
  motivoTriagem?: string
  status: 'nova' | 'processada' | 'descartada'
  ticketId?: string
}

export interface Ticket {
  id: string
  v: 1
  ts: string
  numero: number
  tipo: 'TOOL_CRM'
  correcaoId: string
  /** O que o cliente pediu, verbatim — pra VOCÊ ler, não pra ir no prompt. */
  pedido: string
  status: 'aberto' | 'resolvido'
  resolvidoEm?: string
  resolucao?: string
}

// ─────────────────────────── ANONIMIZAÇÃO ───────────────────────────
// Roda ANTES de gravar. O que ensina é o padrão da conversa, não quem era o lead.
/**
 * A ORDEM É PARTE DA CORREÇÃO — não reordene sem rodar scripts/test-escola.ts.
 *
 * 🩸 Dois bugs que o teste pegou antes de irem pro ar (22/07/2026):
 *
 *  1. `\b` NÃO casa antes de `(`. Em "(11) 98765-4321" a fronteira de palavra
 *     não existe entre o espaço e o parêntese, então o casamento começava no
 *     "1" e sobrava um "(" órfão: "([telefone]".
 *
 *  2. CELULAR COM DDD TEM 11 DÍGITOS — exatamente como CPF. Com o padrão de CPF
 *     antes, "11987654321" virava "[cpf]". Rótulo errado em dado sensível é
 *     como se descobre, meses depois, que a régua de privacidade nunca foi
 *     testada. Desempate: celular brasileiro tem 9 na 3ª posição; CPF cru só é
 *     tentado DEPOIS que o telefone já saiu do caminho.
 *
 * Usamos (?<!\d) / (?!\d) em vez de \b: fronteira de DÍGITO é o que importa
 * aqui, e ela funciona com parêntese, "+" e espaço em volta.
 */
const PADROES: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, '[email]'],
  // CPF pontuado é inequívoco — sai primeiro.
  [/(?<!\d)\d{3}\.\d{3}\.\d{3}-?\d{2}(?!\d)/g, '[cpf]'],
  // Celular: DDD + 9 + 8 dígitos, com ou sem parênteses/separadores.
  [/(?<!\d)(?:\+?55[\s-]?)?\(?\d{2}\)?[\s.-]?9[\s.-]?\d{4}[\s.-]?\d{4}(?!\d)/g, '[telefone]'],
  // Fixo: DDD + 8 dígitos começando em 2–5 (não colide com CPF, que tem 11).
  [/(?<!\d)(?:\+?55[\s-]?)?\(?\d{2}\)?[\s.-]?[2-5]\d{3}[\s.-]?\d{4}(?!\d)/g, '[telefone]'],
  // CPF cru só agora: o que sobrou de 11 dígitos não era telefone.
  [/(?<!\d)\d{11}(?!\d)/g, '[cpf]'],
  [/(?<!\d)\d{5}-\d{3}(?!\d)/g, '[cep]'],
  // Cartão: 13–19 dígitos. Por último, quando fone e CPF já viraram marcador.
  [/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g, '[cartao]'],
]

export function anonimizar(texto: string): string {
  let t = String(texto ?? '')
  for (const [re, marca] of PADROES) t = t.replace(re, marca)
  return t
}
