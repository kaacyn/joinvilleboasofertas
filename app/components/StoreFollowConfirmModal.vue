<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="follow-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Seguir ${storeName}`"
    >
      <button
        type="button"
        class="follow-modal__backdrop"
        aria-label="Fechar"
        @click="onCancel"
      />
      <div class="follow-modal__panel">
        <div class="follow-modal__icon-wrap" aria-hidden="true">
          <svg class="follow-modal__icon" viewBox="0 0 24 24" width="28" height="28">
            <path d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
          </svg>
        </div>

        <h2 class="follow-modal__title">Seguir esta loja?</h2>
        <p class="follow-modal__lead">
          Deseja receber avisos de ofertas e encartes do mercado
          <strong>{{ storeName }}</strong>?
        </p>

        <section class="follow-modal__steps" aria-label="Como ativar os avisos">
          <p class="follow-modal__steps-title">Como funciona</p>

          <ol v-if="instructionMode === 'ios-install'" class="follow-modal__list">
            <li>Instale o app na <strong>tela inicial</strong> do celular (menu Instalar app).</li>
            <li>Abra o app instalado e toque no sino novamente.</li>
            <li>Permita as notificações quando o iPhone pedir.</li>
          </ol>

          <ol v-else-if="instructionMode === 'permission-denied'" class="follow-modal__list">
            <li>As notificações estão <strong>bloqueadas</strong> neste navegador.</li>
            <li>Abra as configurações do site (ícone de cadeado na barra de endereço).</li>
            <li>Ative <strong>Notificações</strong> e volte aqui para seguir a loja.</li>
          </ol>

          <ol v-else-if="instructionMode === 'request-permission'" class="follow-modal__list">
            <li>Ao confirmar, o navegador vai pedir permissão para enviar avisos.</li>
            <li>Toque em <strong>Permitir</strong> para ativar os alertas desta loja.</li>
            <li>Você pode parar de seguir a qualquer momento tocando no sino de novo.</li>
          </ol>

          <ol v-else class="follow-modal__list">
            <li>Você receberá avisos quando esta loja publicar ofertas ou encartes.</li>
            <li>Os alertas chegam mesmo com o app fechado, no celular ou computador.</li>
            <li>Para cancelar, toque no sino novamente.</li>
          </ol>
        </section>

        <div class="follow-modal__actions">
          <button
            type="button"
            class="follow-modal__btn follow-modal__btn--ghost"
            @click="onCancel"
          >
            Agora não
          </button>
          <button
            ref="confirmButton"
            type="button"
            class="follow-modal__btn follow-modal__btn--primary"
            @click="onConfirm"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  storeName: string
  instructionMode: 'ios-install' | 'request-permission' | 'permission-denied' | 'ready'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmLabel = computed(() => {
  if (props.instructionMode === 'ios-install') return 'Como instalar o app'
  if (props.instructionMode === 'permission-denied') return 'Entendi'
  return 'Sim, seguir loja'
})

const overlay = ref<HTMLElement | null>(null)
const confirmButton = ref<HTMLButtonElement | null>(null)

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}

useDialogLock(toRef(props, 'open'), overlay, confirmButton, onCancel)
</script>

<style scoped>
.follow-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
}

@media (min-width: 560px) {
  .follow-modal {
    align-items: center;
  }
}

.follow-modal__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.follow-modal__panel {
  position: relative;
  width: min(440px, 100%);
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 18px 18px 14px 14px;
  padding: 1.35rem 1.15rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  box-shadow: var(--shadow);
}

@media (min-width: 560px) {
  .follow-modal__panel {
    border-radius: 18px;
    padding: 1.5rem 1.35rem 1.25rem;
  }
}

.follow-modal__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--yellow-soft);
  border: 1px solid var(--yellow);
  color: var(--yellow-ink);
}

.follow-modal__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}

.follow-modal__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  line-height: 1.2;
}

.follow-modal__lead {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.45;
}

.follow-modal__lead strong {
  color: var(--ink);
  font-weight: 800;
}

.follow-modal__steps {
  padding: 0.85rem 0.95rem;
  border-radius: 12px;
  background: var(--bg);
  border: 1px solid var(--line);
}

.follow-modal__steps-title {
  margin: 0 0 0.55rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--yellow-ink);
}

.follow-modal__list {
  margin: 0;
  padding-left: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.follow-modal__list strong {
  color: var(--ink);
  font-weight: 700;
}

.follow-modal__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.55rem;
  margin-top: 0.15rem;
}

.follow-modal__btn {
  min-height: 46px;
  border-radius: 11px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.follow-modal__btn--ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
}

.follow-modal__btn--ghost:hover {
  border-color: var(--ink-3);
}

.follow-modal__btn--primary {
  border: none;
  background: var(--yellow);
  color: var(--navy);
}

.follow-modal__btn--primary:hover {
  filter: brightness(1.05);
}

.follow-modal__btn:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
