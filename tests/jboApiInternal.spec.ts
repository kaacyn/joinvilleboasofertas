import { describe, expect, it } from 'vitest'
import { internalHeaders } from '../app/utils/jboApi'

describe('internalHeaders', () => {
  it('sem token não manda header nenhum', () => {
    expect(internalHeaders('')).toEqual({})
    expect(internalHeaders(undefined)).toEqual({})
  })

  it('com token manda X-JBO-Internal para o snap-api isentar o SSR do rate limit', () => {
    expect(internalHeaders('s3cret')).toEqual({ 'X-JBO-Internal': 's3cret' })
  })
})
