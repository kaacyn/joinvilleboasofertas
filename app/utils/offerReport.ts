/** Relato de erro de uma oferta (página do produto): motivos, validação e mensagens. */

export type ReportReason = 'price' | 'product' | 'unavailable' | 'other'

export const REPORT_REASONS: { value: ReportReason, label: string }[] = [
  { value: 'price', label: 'Preço diferente do encarte ou da loja' },
  { value: 'product', label: 'Produto ou foto não confere' },
  { value: 'unavailable', label: 'Oferta vencida ou não existe na loja' },
  { value: 'other', label: 'Outro' },
]

export const REPORT_COMMENT_MAX = 500
export const REPORT_CONTACT_MAX = 120

export type ReportDraft = {
  reason: ReportReason | ''
  comment: string
  contact: string
}

type FetchFailure = {
  statusCode?: number
  status?: number
  data?: { detail?: unknown }
}

/** Comentário é obrigatório só no motivo "Outro". */
export function commentRequired(reason: string): boolean {
  return reason === 'other'
}

/** Motivo que impede o envio ('' quando pode enviar). */
export function reportBlocker(draft: ReportDraft): string {
  if (!draft.reason) return 'Escolha o que está errado.'
  if (commentRequired(draft.reason) && !draft.comment.trim()) return 'Conte o que está errado.'
  if (draft.comment.trim().length > REPORT_COMMENT_MAX) return 'Comentário acima de 500 caracteres.'
  if (draft.contact.trim().length > REPORT_CONTACT_MAX) return 'Contato acima de 120 caracteres.'
  return ''
}

/** Corpo do `POST /offer-reports` com texto aparado. */
export function reportPayload(offerId: string, draft: ReportDraft) {
  return {
    offer_id: offerId,
    reason: draft.reason,
    comment: draft.comment.trim(),
    contact: draft.contact.trim(),
  }
}

/** Mensagem da folha quando o envio falha (limite, oferta fora do ar, validação ou rede). */
export function reportErrorMessage(error: unknown): string {
  const failure = (error || {}) as FetchFailure
  const status = failure.statusCode ?? failure.status
  if (status === 429) return 'Muitos relatos em pouco tempo. Tente de novo mais tarde.'
  if (status === 404) return 'Esta oferta não está mais no ar.'
  const detail = failure.data?.detail
  if (status === 422 && typeof detail === 'string' && detail) return detail
  return 'Não foi possível enviar agora. Tente de novo.'
}
