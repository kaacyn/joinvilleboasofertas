/**
 * Espelha um `pending` de useAsyncData na barra de carregamento do header.
 * Cobre filtros/busca na mesma página (que não disparam page:loading).
 */
export function useSyncLoadingIndicator(
  pending: Ref<boolean> | ComputedRef<boolean>,
) {
  const { start, finish } = useLoadingIndicator()
  let owned = false

  watch(
    pending,
    (isPending) => {
      if (isPending) {
        start({ force: true })
        owned = true
        return
      }
      if (!owned) return
      finish()
      owned = false
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    if (!owned) return
    finish()
    owned = false
  })
}
