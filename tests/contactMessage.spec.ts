import { describe, expect, it } from 'vitest'

import {
  CONTACT_KINDS,
  contactBlocker,
  contactErrorMessage,
  contactPayload,
  contactSuccessMessage,
  emptyContactDraft,
} from '../app/utils/contactMessage'

/** Rascunho válido com os campos informados por cima. */
function draft(overrides = {}) {
  return { ...emptyContactDraft(), message: 'Mostrem o preço por quilo.', ...overrides }
}

describe('contactMessage', () => {
  it('tipos batem com a API e o rascunho nasce como Sugestão', () => {
    expect(CONTACT_KINDS.map(k => k.value)).toEqual([
      'suggestion', 'question', 'problem', 'partnership', 'other',
    ])
    expect(emptyContactDraft().kind).toBe('suggestion')
  })

  it('bloqueia mensagem curta, longa, nome longo e e-mail inválido', () => {
    expect(contactBlocker(draft({ message: '  curta ' }))).toBe('Escreva pelo menos 10 caracteres.')
    expect(contactBlocker(draft({ message: 'x'.repeat(2001) }))).toBe('Mensagem acima de 2000 caracteres.')
    expect(contactBlocker(draft({ name: 'n'.repeat(81) }))).toBe('Nome acima de 80 caracteres.')
    expect(contactBlocker(draft({ email: 'nao-e-email' }))).toBe('Confira o e-mail informado.')
  })

  it('e-mail e nome vazios são aceitos', () => {
    expect(contactBlocker(draft())).toBe('')
    expect(contactBlocker(draft({ email: ' maria@exemplo.com ' }))).toBe('')
  })

  it('payload apara os textos e leva a página de origem e o honeypot', () => {
    expect(contactPayload(draft({ name: ' Maria ', email: ' m@x.com ', message: '  Mostrem o preço por quilo.  ' }), '/lojas')).toEqual({
      kind: 'suggestion',
      name: 'Maria',
      email: 'm@x.com',
      message: 'Mostrem o preço por quilo.',
      page_path: '/lojas',
      website: '',
    })
    expect(contactPayload(draft(), null).page_path).toBe('')
  })

  it('mensagem de sucesso promete resposta só quando há e-mail', () => {
    expect(contactSuccessMessage(true)).toContain('Respondemos por e-mail em breve')
    expect(contactSuccessMessage(false)).not.toContain('e-mail')
  })

  it('traduz 429, 422 com detail e falha genérica', () => {
    expect(contactErrorMessage({ statusCode: 429 })).toBe('Muitas mensagens em pouco tempo. Tente de novo mais tarde.')
    expect(contactErrorMessage({ status: 422, data: { detail: 'E-mail inválido' } })).toBe('E-mail inválido')
    expect(contactErrorMessage(new Error('rede'))).toBe('Não foi possível enviar agora. Tente de novo.')
  })
})
