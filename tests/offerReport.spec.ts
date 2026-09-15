import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  REPORT_REASONS,
  commentRequired,
  reportBlocker,
  reportErrorMessage,
  reportPayload,
} from '../app/utils/offerReport'

const root = resolve(import.meta.dirname, '..')
/** Lê um arquivo do projeto como texto (asserções de código-fonte). */
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('relato de erro da oferta', () => {
  it('tem os quatro motivos na ordem aprovada', () => {
    expect(REPORT_REASONS.map(r => r.value)).toEqual(['price', 'product', 'unavailable', 'other'])
    expect(REPORT_REASONS[0].label).toBe('Preço diferente do encarte ou da loja')
    expect(REPORT_REASONS[3].label).toBe('Outro')
  })

  it('bloqueia envio sem motivo e sem comentário em "Outro"', () => {
    expect(reportBlocker({ reason: '', comment: '', contact: '' })).toBe('Escolha o que está errado.')
    expect(reportBlocker({ reason: 'other', comment: '   ', contact: '' })).toBe('Conte o que está errado.')
    expect(reportBlocker({ reason: 'other', comment: 'foto errada', contact: '' })).toBe('')
    expect(reportBlocker({ reason: 'price', comment: '', contact: '' })).toBe('')
    expect(reportBlocker({ reason: 'price', comment: 'x'.repeat(501), contact: '' })).toBe('Comentário acima de 500 caracteres.')
    expect(reportBlocker({ reason: 'price', comment: '', contact: 'x'.repeat(121) })).toBe('Contato acima de 120 caracteres.')
    expect(commentRequired('other')).toBe(true)
    expect(commentRequired('price')).toBe(false)
  })

  it('monta o corpo do POST com texto aparado', () => {
    expect(reportPayload('o1', { reason: 'price', comment: '  está 2,49 ', contact: ' (47) 99999-0000 ' })).toEqual({
      offer_id: 'o1', reason: 'price', comment: 'está 2,49', contact: '(47) 99999-0000',
    })
  })

  it('traduz falhas do envio', () => {
    expect(reportErrorMessage({ statusCode: 429 })).toBe('Muitos relatos em pouco tempo. Tente de novo mais tarde.')
    expect(reportErrorMessage({ statusCode: 404 })).toBe('Esta oferta não está mais no ar.')
    expect(reportErrorMessage({ statusCode: 422, data: { detail: 'Conte o que está errado.' } })).toBe('Conte o que está errado.')
    expect(reportErrorMessage(new Error('rede'))).toBe('Não foi possível enviar agora. Tente de novo.')
  })

  it('folha envia pelo jboSend, trava o foco e mostra o agradecimento', () => {
    const sheet = source('app/components/offers/ReportOfferSheet.vue')
    expect(sheet).toContain("jboSend('POST', '/offer-reports'")
    expect(sheet).toContain('useDialogLock')
    expect(sheet).toContain('Reportar um erro')
    expect(sheet).toContain('Obrigado! Vamos conferir.')
    expect(sheet).toContain('O que está errado?')
    expect(sheet).toContain('Só se quiser que a gente responda.')
    expect(sheet).toContain('placeholder="E-mail ou WhatsApp"')
    expect(sheet).toContain('data-test="report-submit"')
    expect(sheet).toContain('@media (min-width: 560px)')
    expect(sheet).toContain('role="status"')
    expect(sheet).toContain('doneButton.value?.focus()')
  })
})
