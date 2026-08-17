import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sw = readFileSync(resolve(import.meta.dirname, '../app/sw.ts'), 'utf8')

describe('JBO push click no SW', () => {
  it('notificationclick POST click antes de abrir URL', () => {
    expect(sw).toContain('/api/public/jbo/push/click')
    expect(sw).toContain('click_token')
    expect(sw.indexOf('/push/click')).toBeLessThan(sw.indexOf('focusOrOpen'))
  })
})
