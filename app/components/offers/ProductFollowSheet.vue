<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="follow-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-sheet-title"
      data-test="product-follow-sheet"
    >
      <div class="follow-sheet__backdrop" aria-hidden="true" @click="emit('close')" />
      <div class="follow-sheet__panel">
        <header class="follow-sheet__product">
          <img v-if="imageUrl" class="follow-sheet__thumb" :src="imageUrl" alt="">
          <div class="follow-sheet__product-text">
            <p class="follow-sheet__product-title">{{ productTitle }}</p>
            <p class="follow-sheet__price">{{ priceLine }}</p>
          </div>
          <button ref="closeButton" type="button" class="follow-sheet__close" aria-label="Fechar" @click="emit('close')">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <p v-if="view.note" class="follow-sheet__note">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
          </svg>
          <span>{{ view.note }}</span>
        </p>
        <h2 id="follow-sheet-title" class="follow-sheet__title">{{ view.title }}</h2>
        <p class="follow-sheet__lead">{{ view.lead }}</p>

        <template v-if="view.mode === 'ios' || view.mode === 'denied'">
          <PushInstructions
            :mode="view.mode === 'ios' ? 'ios-install' : 'permission-denied'"
            goal="ativar os avisos"
          />
          <button
            v-if="view.mode === 'ios'"
            type="button"
            class="follow-sheet__btn follow-sheet__btn--primary"
            @click="emit('install')"
          >
            Como instalar o app
          </button>
          <button type="button" class="follow-sheet__btn" @click="emit('close')">
            {{ view.mode === 'ios' ? 'Agora não' : 'Entendi' }}
          </button>
        </template>

        <template v-else>
          <div class="follow-sheet__options">
            <button
              v-for="option in view.options"
              :key="option.key"
              type="button"
              class="follow-option"
              :class="{
                'follow-option--active': option.active,
                'follow-option--busy': busyKey === option.key,
              }"
              :aria-current="option.active ? 'true' : undefined"
              :aria-busy="busyKey === option.key ? 'true' : undefined"
              :disabled="Boolean(busy) && busyKey !== option.key"
              :data-test="`follow-option-${option.key}`"
              @click="onPick(option)"
            >
              <span class="follow-option__icon" aria-hidden="true">
                <svg v-if="option.key === 'here'" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M4.5 11v9h15v-9" />
                  <path d="M3 10l1.8-5.5h14.4L21 10c0 1.3-1 2.2-2.2 2.2s-2.3-.9-2.3-2.2c0 1.3-1 2.2-2.2 2.2S12 11.3 12 10c0 1.3-1 2.2-2.3 2.2S7.5 11.3 7.5 10c0 1.3-1 2.2-2.2 2.2S3 11.3 3 10z" />
                  <path d="M10 20v-4.5h4V20" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20">
                  <path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2z" />
                  <path d="M9 4.5v13M15 6.5v13" />
                </svg>
              </span>
              <span class="follow-option__text">
                <strong>{{ option.title }}</strong>
                <span>{{ busyKey === option.key ? waitingText : option.description }}</span>
              </span>
              <span class="follow-option__end" aria-hidden="true">
                <span v-if="option.active" class="follow-option__pill">Ativo</span>
                <svg v-else viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" /></svg>
              </span>
            </button>
          </div>

          <div v-if="view.offActions.length" class="follow-sheet__off">
            <button
              v-for="off in view.offActions"
              :key="off.action"
              type="button"
              class="follow-sheet__off-btn"
              :disabled="Boolean(busy)"
              :data-test="`follow-${off.action}`"
              @click="emit('off', off.action)"
            >
              {{ off.label }}
            </button>
          </div>

          <p v-if="view.footnote" class="follow-sheet__foot">{{ view.footnote }}</p>
          <button type="button" class="follow-sheet__btn" @click="emit('close')">
            {{ view.mode === 'manage' ? 'Fechar' : 'Agora não' }}
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type {
  FollowOptionView,
  FollowPick,
  FollowSheetView,
  ProductFollowAction,
} from '~/utils/productFollow'

const props = defineProps<{
  open: boolean
  view: FollowSheetView
  productTitle: string
  priceLine: string
  imageUrl?: string | null
  busy: ProductFollowAction | ''
  waitingText: string
}>()

const emit = defineEmits<{
  pick: [pick: FollowPick]
  off: [action: ProductFollowAction]
  install: []
  close: []
}>()

const overlay = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

/** Opção que mostra o texto de espera enquanto a ação roda. */
const busyKey = computed<FollowPick | ''>(() => {
  if (props.busy === 'follow_all') return 'all'
  if (props.busy === 'follow_store') return 'here'
  return ''
})

/** Tocar numa opção já ativa o aviso; a opção ativa não responde. */
function onPick(option: FollowOptionView) {
  if (option.active || props.busy) return
  emit('pick', option.key)
}

useDialogLock(toRef(props, 'open'), overlay, closeButton, () => emit('close'))
</script>

<style scoped>
.follow-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.follow-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.follow-sheet__panel {
  position: relative;
  width: 100%;
  max-height: min(90dvh, 720px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  box-shadow: var(--shadow);
  animation: follow-sheet-in 0.18s ease-out;
}

@media (min-width: 560px) {
  .follow-sheet {
    align-items: center;
    padding: 1rem;
  }

  .follow-sheet__panel {
    width: min(480px, 100%);
    border-bottom: 1px solid var(--line);
    border-radius: 18px;
  }
}

@keyframes follow-sheet-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .follow-sheet__panel {
    animation: none;
  }
}

.follow-sheet__product {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--line);
}

.follow-sheet__thumb {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
  background: var(--bg);
}

.follow-sheet__product-text {
  flex: 1;
  min-width: 0;
}

.follow-sheet__product-title {
  margin: 0;
  font-family: var(--head);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
}

.follow-sheet__price {
  margin: 0.15rem 0 0;
  color: var(--ink-3);
  font-size: 0.82rem;
}

.follow-sheet__close {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.follow-sheet__close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.follow-sheet__note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink-2);
  font-size: 0.85rem;
}

.follow-sheet__note svg {
  flex: 0 0 auto;
  margin-top: 1px;
  fill: var(--yellow-ink);
}

.follow-sheet__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.2;
}

.follow-sheet__lead {
  margin: -0.35rem 0 0;
  color: var(--ink-2);
  font-size: 0.9rem;
}

.follow-sheet__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.follow-option {
  width: 100%;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.follow-option:hover {
  border-color: var(--ink-3);
}

.follow-option:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.follow-option__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink-2);
}

.follow-option__icon svg,
.follow-option__end svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.follow-option__text strong {
  display: block;
  font-family: var(--head);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.25;
}

.follow-option__text span {
  display: block;
  margin-top: 0.15rem;
  color: var(--ink-2);
  font-size: 0.82rem;
  line-height: 1.35;
}

.follow-option__end {
  color: var(--ink-3);
  display: grid;
  place-items: center;
}

.follow-option--active,
.follow-option--active:hover {
  border-color: var(--yellow);
  background: var(--yellow-soft);
  cursor: default;
}

.follow-option--active .follow-option__icon {
  background: var(--surface);
  color: var(--yellow-ink);
}

.follow-option--active .follow-option__text span {
  color: var(--yellow-ink);
}

.follow-option--busy {
  cursor: progress;
}

.follow-option--busy .follow-option__text span {
  color: var(--ink-2);
  font-weight: 600;
}

.follow-option__pill {
  padding: 0.3rem 0.45rem;
  border-radius: 999px;
  background: var(--yellow);
  color: var(--ink);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.follow-sheet__off {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
}

.follow-sheet__off-btn {
  min-height: 44px;
  padding: 0 0.8rem;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--red);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.follow-sheet__off-btn:hover {
  background: var(--red-soft);
}

.follow-sheet__foot {
  margin: 0;
  color: var(--ink-2);
  font-size: 0.78rem;
  text-align: center;
}

.follow-sheet__btn {
  min-height: 46px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.follow-sheet__btn--primary {
  border: none;
  background: var(--yellow);
}

.follow-option:focus-visible,
.follow-sheet__btn:focus-visible,
.follow-sheet__off-btn:focus-visible,
.follow-sheet__close:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
