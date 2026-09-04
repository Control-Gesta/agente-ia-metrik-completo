import { CONFIG } from './config'

/**
 * PERFIL — quem está falando com a API do cérebro.
 *
 * A trava que sustenta a promessa "o cliente NÃO encosta no prompt" é de
 * IDENTIDADE, não de estado. Esconder o botão na UI não é trava: o servidor
 * decide.
 *
 *   'agencia' → {NOME_AGENCIA}. Edita o texto cru, vê nota do juiz, publica contornando.
 *   'dono'    → o cliente. Ensina pela aba "Ensinar a IA"; o editor cru NÃO EXISTE.
 *
 * Como o perfil é derivado (o terreno não tem login — a Central guarda o
 * secret server-side e o browser nunca o vê):
 *
 *   WEBHOOK_SECRET  → 'agencia'   (o secret de sempre; nada muda pra você)
 *   CENTRAL_SECRET  → 'dono'      (opcional; crie quando entregar a Central ao cliente)
 *
 * Enquanto CENTRAL_SECRET não existir, só há o secret de sempre e o
 * comportamento é idêntico ao de hoje. No dia em que o cliente ganhar acesso,
 * gere um CENTRAL_SECRET e ponha ELE no AGENT_SECRET da Central dele.
 */
export type Perfil = 'dono' | 'agencia'

/** Não confunda ausência de secret com perfil: quem não autenticou não tem perfil. */
export function perfilDoSecret(secret: unknown): Perfil | null {
  const s = String(secret ?? '')
  if (!s) return null
  if (s === CONFIG.webhookSecret) return 'agencia'
  if (CONFIG.centralSecret && s === CONFIG.centralSecret) return 'dono'
  return null
}

export const podeEditarPromptCru = (p: Perfil) => p === 'agencia'

/** Texto que o cliente lê quando esbarra na trava — nunca um 403 seco. */
export const RECADO_SEM_PERMISSAO =
  'O texto do cérebro é montado pela {NOME_AGENCIA}. Pra ensinar algo à sua IA, use a aba "Ensinar a IA" — ' +
  'você corrige em português e eu cuido do texto, com teste antes de publicar.'
