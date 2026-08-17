<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="ios-install"
      role="dialog"
      aria-modal="true"
      aria-label="Instalar Joinville Boas Ofertas no iPhone"
    >
      <button
        type="button"
        class="ios-install__backdrop"
        aria-label="Fechar"
        @click="close"
      />
      <div class="ios-install__panel">
        <h2 class="ios-install__title">Instalar no iPhone</h2>

        <p v-if="!isSafari" class="ios-install__warn">
          Para instalar, abra esta página no <strong>Safari</strong> — outros navegadores no iOS não conseguem adicionar à Tela de Início.
        </p>

        <ol class="ios-install__steps">
          <li>
            <span>Toque em</span>
            <span class="ios-install__icon" aria-label="Botão Compartilhar">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 3l4 4-1.4 1.4L13 6.8V15h-2V6.8L9.4 8.4 8 7l4-4z" fill="currentColor" />
                <path d="M5 11h3v2H7v6h10v-6h-1v-2h3v10H5V11z" fill="currentColor" />
              </svg>
            </span>
            <span>(<em>Compartilhar</em>) na barra do Safari.</span>
          </li>
          <li>Role e selecione <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
        </ol>

        <button ref="okButton" type="button" class="ios-install__ok" @click="close">
          Entendi
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  isSafari?: boolean
}>(), {
  isSafari: true,
})

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const overlay = ref<HTMLElement | null>(null)
const okButton = ref<HTMLButtonElement | null>(null)

/**
 * Fecha o modal de instalação iOS.
 */
function close() {
  emit('update:open', false)
}

useDialogLock(toRef(props, 'open'), overlay, okButton, close)
</script>

<style scoped>
.ios-install {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ios-install__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
}

.ios-install__panel {
  position: relative;
  width: min(520px, 100%);
  background: var(--navy-light);
  color: var(--white);
  border-radius: 16px 16px 0 0;
  padding: 1.25rem 1rem 1.5rem;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ios-install__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--white);
}

.ios-install__warn {
  margin: 0;
  padding: 0.75rem;
  background: rgba(255, 200, 0, 0.12);
  border-left: 3px solid var(--yellow);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--white);
}

.ios-install__steps {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.45;
}

.ios-install__steps li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ios-install__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--navy);
  color: var(--yellow);
}

.ios-install__ok {
  min-height: 44px;
  border: none;
  border-radius: 10px;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
</style>
