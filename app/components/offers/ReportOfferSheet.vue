<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="report-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-sheet-title"
      data-test="report-sheet"
    >
      <div class="report-sheet__backdrop" aria-hidden="true" @click="onClose" />
      <div class="report-sheet__panel">
        <header class="report-sheet__head">
          <div class="report-sheet__heading">
            <h2 id="report-sheet-title" class="report-sheet__title">
              {{ sent ? 'Obrigado! Vamos conferir.' : 'Reportar um erro' }}
            </h2>
            <p class="report-sheet__sub">{{ productTitle }} · {{ storeName }}</p>
          </div>
          <button ref="closeButton" type="button" class="report-sheet__close" aria-label="Fechar" @click="onClose">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div v-if="sent" class="report-sheet__done" role="status" aria-live="polite" data-test="report-done">
          <span class="report-sheet__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.2 4L19 7" /></svg>
          </span>
          <p id="report-done-message">{{ sentContact ? 'Se precisarmos de algo, falamos com você pelo contato que deixou.' : 'A equipe revisa cada relato.' }}</p>
          <button
            ref="doneButton"
            type="button"
            class="report-sheet__primary"
            aria-describedby="report-done-message"
            @click="onClose"
          >
            Fechar
          </button>
        </div>

        <form v-else class="report-sheet__form" novalidate @submit.prevent="onSubmit">
          <fieldset class="report-sheet__reasons">
            <legend>O que está errado?</legend>
            <label
              v-for="reason in REPORT_REASONS"
              :key="reason.value"
              class="report-reason"
              :class="{ 'report-reason--checked': draft.reason === reason.value }"
            >
              <input
                v-model="draft.reason"
                type="radio"
                name="report-reason"
                :value="reason.value"
                :data-test="`report-reason-${reason.value}`"
              >
              {{ reason.label }}
            </label>
          </fieldset>

          <div class="report-sheet__field">
            <label for="report-comment">
              Comentário <span>{{ commentRequired(draft.reason) ? '(obrigatório)' : '(opcional)' }}</span>
            </label>
            <textarea
              id="report-comment"
              v-model="draft.comment"
              rows="3"
              :maxlength="REPORT_COMMENT_MAX"
              placeholder="Ex.: no encarte está R$ 2,49"
            />
            <small>
              <span class="report-sheet__warn">{{ commentHint }}</span>
              <span>{{ draft.comment.length }}/{{ REPORT_COMMENT_MAX }}</span>
            </small>
          </div>

          <div class="report-sheet__field">
            <label for="report-contact">Seu contato <span>(opcional)</span></label>
            <input
              id="report-contact"
              v-model="draft.contact"
              type="text"
              :maxlength="REPORT_CONTACT_MAX"
              placeholder="E-mail ou WhatsApp"
              autocomplete="email"
            >
            <small>Só se quiser que a gente responda.</small>
          </div>

          <p v-if="error" class="report-sheet__error" role="alert" data-test="report-error">{{ error }}</p>

          <button
            type="submit"
            class="report-sheet__primary"
            data-test="report-submit"
            :disabled="sending || Boolean(blocker)"
          >
            {{ sending ? 'Enviando…' : 'Enviar' }}
          </button>
          <button type="button" class="report-sheet__ghost" @click="onClose">Cancelar</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { jboSend } from '~/utils/jboApi'
import {
  REPORT_COMMENT_MAX,
  REPORT_CONTACT_MAX,
  REPORT_REASONS,
  commentRequired,
  reportBlocker,
  reportErrorMessage,
  reportPayload,
  type ReportDraft,
} from '~/utils/offerReport'

const props = defineProps<{
  open: boolean
  offerId: string
  productTitle: string
  storeName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const draft = reactive<ReportDraft>({ reason: '', comment: '', contact: '' })
const sending = ref(false)
const sent = ref(false)
const sentContact = ref(false)
const error = ref('')
const overlay = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const doneButton = ref<HTMLButtonElement | null>(null)

/** Motivo (se houver) que impede o envio agora. */
const blocker = computed(() => reportBlocker(draft))
/** Aviso sob o comentário quando o motivo exige comentário e ele está vazio. */
const commentHint = computed(() =>
  commentRequired(draft.reason) && !draft.comment.trim() ? 'Conte o que está errado.' : '',
)

/** Limpa o formulário (nova abertura depois de um envio ou outra oferta). */
function reset() {
  draft.reason = ''
  draft.comment = ''
  draft.contact = ''
  sent.value = false
  sentContact.value = false
  error.value = ''
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  if (sent.value) reset()
  else error.value = ''
})
watch(() => props.offerId, reset)

/** Fecha a folha (Escape, fundo, X, Cancelar ou Fechar). */
function onClose() {
  emit('close')
}

/** Envia o relato; em sucesso move o foco para o agradecimento (leitor de tela);
 *  em erro mantém o que foi digitado e mostra o motivo. */
async function onSubmit() {
  if (sending.value || blocker.value) return
  sending.value = true
  error.value = ''
  try {
    await jboSend('POST', '/offer-reports', reportPayload(props.offerId, draft))
    sentContact.value = Boolean(draft.contact.trim())
    sent.value = true
    await nextTick()
    doneButton.value?.focus()
  }
  catch (e) {
    error.value = reportErrorMessage(e)
  }
  finally {
    sending.value = false
  }
}

useDialogLock(toRef(props, 'open'), overlay, closeButton, onClose)
</script>

<style scoped>
.report-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.report-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.report-sheet__panel {
  position: relative;
  width: 100%;
  max-height: min(90dvh, 720px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  box-shadow: var(--shadow);
  animation: report-sheet-in 0.18s ease-out;
}

@media (min-width: 560px) {
  .report-sheet {
    align-items: center;
    padding: 1rem;
  }

  .report-sheet__panel {
    width: min(480px, 100%);
    border-bottom: 1px solid var(--line);
    border-radius: 18px;
  }
}

@keyframes report-sheet-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .report-sheet__panel {
    animation: none;
  }
}

.report-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.report-sheet__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.2;
}

.report-sheet__sub {
  margin: 0.25rem 0 0;
  color: var(--ink-3);
  font-size: 0.85rem;
}

.report-sheet__close {
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

.report-sheet__close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.report-sheet__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.report-sheet__reasons {
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.report-sheet__reasons legend {
  margin-bottom: 0.45rem;
  padding: 0;
  font-family: var(--head);
  font-size: 0.9rem;
  font-weight: 800;
}

.report-reason {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 44px;
  padding: 0.55rem 0.8rem;
  border: 1.5px solid var(--line);
  border-radius: 11px;
  font-size: 0.92rem;
  cursor: pointer;
}

.report-reason--checked {
  border-color: var(--yellow);
  background: var(--yellow-soft);
}

.report-reason input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--ink);
}

.report-sheet__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.report-sheet__field label {
  font-size: 0.88rem;
  font-weight: 700;
}

.report-sheet__field label span {
  color: var(--ink-3);
  font-weight: 400;
}

.report-sheet__field textarea,
.report-sheet__field input {
  width: 100%;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.95rem;
  resize: vertical;
}

.report-sheet__field small {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--ink-3);
  font-size: 0.78rem;
}

.report-sheet__warn,
.report-sheet__error {
  color: var(--red);
}

.report-sheet__error {
  margin: 0;
  font-size: 0.85rem;
}

.report-sheet__primary,
.report-sheet__ghost {
  min-height: 46px;
  border-radius: 11px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.report-sheet__primary {
  border: none;
  background: var(--yellow);
  color: var(--ink);
}

.report-sheet__primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.report-sheet__ghost {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
}

.report-sheet__done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  color: var(--ink-2);
}

.report-sheet__done p {
  margin: 0;
}

.report-sheet__done .report-sheet__primary {
  align-self: stretch;
}

.report-sheet__check {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green);
}

.report-sheet__check svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.report-sheet__close:focus-visible,
.report-sheet__primary:focus-visible,
.report-sheet__ghost:focus-visible,
.report-reason:focus-within {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
