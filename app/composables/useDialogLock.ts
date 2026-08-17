import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

/**
 * Trava scroll, fecha com Escape e prende Tab no diálogo enquanto `open` for true.
 */
export function useDialogLock(
  open: Ref<boolean>,
  overlay: Ref<HTMLElement | null>,
  initialFocus: Ref<HTMLElement | null>,
  close: () => void,
) {
  let previouslyFocused: HTMLElement | null = null
  let previousOverflow = ''

  function focusableItems(): HTMLElement[] {
    const nodes = overlay.value?.querySelectorAll<HTMLElement>(FOCUSABLE)
    return Array.from(nodes || []).filter(
      el => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1',
    )
  }

  function trapTab(e: KeyboardEvent) {
    const items = focusableItems()
    if (!items.length) {
      e.preventDefault()
      return
    }

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null

    if (!active || !overlay.value?.contains(active)) {
      e.preventDefault()
      first.focus()
    }
    else if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    }
    else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (e.key === 'Tab') trapTab(e)
  }

  function lock() {
    previouslyFocused = document.activeElement as HTMLElement | null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    void nextTick(() => initialFocus.value?.focus())
  }

  function unlock() {
    document.removeEventListener('keydown', onKey)
    document.body.style.overflow = previousOverflow
    previouslyFocused?.focus()
    previouslyFocused = null
  }

  watch(open, (isOpen) => {
    if (isOpen) lock()
    else unlock()
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    if (open.value) unlock()
  })
}
