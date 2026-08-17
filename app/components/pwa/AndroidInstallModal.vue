<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="android-install"
      role="dialog"
      aria-modal="true"
      aria-label="Instalar Joinville Boas Ofertas no Android"
    >
      <button
        type="button"
        class="android-install__backdrop"
        aria-label="Fechar"
        @click="close"
      />
      <div class="android-install__panel">
        <h2 class="android-install__title">Instalar no Android</h2>

        <ol class="android-install__steps">
          <li>Toque no menu do Chrome (<strong>⋮</strong>) no canto superior direito.</li>
          <li>Selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
          <li>Confirme em <strong>Instalar</strong>.</li>
        </ol>

        <button type="button" class="android-install__ok" @click="close">
          Entendi
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

/**
 * Fecha o modal de instalação Android.
 */
function close() {
  emit('update:open', false)
}
</script>

<style scoped>
.android-install {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.android-install__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  cursor: pointer;
}

.android-install__panel {
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

.android-install__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--white);
}

.android-install__steps {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.45;
}

.android-install__ok {
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
