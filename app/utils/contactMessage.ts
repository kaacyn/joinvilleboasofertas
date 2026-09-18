/** Contato e Sugestões: tipos, validação de conforto e mensagens. A regra que vale é a do snap-api. */

export type ContactKind = 'suggestion' | 'question' | 'problem' | 'partnership' | 'other'

export const CONTACT_KINDS: { value: ContactKind, label: string }[] = [
  { value: 'suggestion', label: 'Sugestão' },
  { value: 'question', label: 'Dúvida' },
  { value: 'problem', label: 'Problema no site' },
  { value: 'partnership', label: 'Parceria ou anúncio' },
  { value: 'other', label: 'Outro' },
]

export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 2000
export const CONTACT_NAME_MAX = 80

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export type ContactDraft = {
  kind: ContactKind
  name: string
  email: string
  message: string
  /** Honeypot: fica fora da tela; humano nunca preenche. */
  website: string
}

type FetchFailure = {
  statusCode?: number
  status?: number
  data?: { detail?: unknown }
}

/** Rascunho inicial do formulário (tipo Sugestão). */
export function emptyContactDraft(): ContactDraft {
  return { kind: 'suggestion', name: '', email: '', message: '', website: '' }
}

/** Motivo que impede o envio ('' quando pode enviar). */
export function contactBlocker(draft: ContactDraft): string {
  const message = draft.message.trim()
  const email = draft.email.trim()
  if (message.length < CONTACT_MESSAGE_MIN) return 'Escreva pelo menos 10 caracteres.'
  if (message.length > CONTACT_MESSAGE_MAX) return 'Mensagem acima de 2000 caracteres.'
  if (draft.name.trim().length > CONTACT_NAME_MAX) return 'Nome acima de 80 caracteres.'
  if (email && !EMAIL_RE.test(email)) return 'Confira o e-mail informado.'
  return ''
}

/** Corpo do `POST /contact-messages` com texto aparado e a página de onde a pessoa veio. */
export function contactPayload(draft: ContactDraft, pagePath: string | null | undefined) {
  return {
    kind: draft.kind,
    name: draft.name.trim(),
    email: draft.email.trim(),
    message: draft.message.trim(),
    page_path: pagePath || '',
    website: draft.website,
  }
}

/** Confirmação após o envio; só promete resposta quando a pessoa deixou e-mail. */
export function contactSuccessMessage(hasEmail: boolean): string {
  return hasEmail
    ? 'Recebemos sua mensagem. Respondemos por e-mail em breve.'
    : 'Recebemos sua mensagem. Obrigado por ajudar a melhorar o site!'
}

/** Mensagem do formulário quando o envio falha (limite, validação ou rede). */
export function contactErrorMessage(error: unknown): string {
  const failure = (error || {}) as FetchFailure
  const status = failure.statusCode ?? failure.status
  if (status === 429) return 'Muitas mensagens em pouco tempo. Tente de novo mais tarde.'
  const detail = failure.data?.detail
  if (status === 422 && typeof detail === 'string' && detail) return detail
  return 'Não foi possível enviar agora. Tente de novo.'
}
