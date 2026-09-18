<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <AppBreadcrumb :items="siteTrail({ label: 'Contato e Sugestões' })" />
      <header class="page__intro">
        <h1>Contato e Sugestões</h1>
        <p>
          Dúvida, sugestão, problema no site ou proposta de parceria: escreva
          para a gente. Toda mensagem é lida.
        </p>
      </header>

      <p
        v-if="done"
        class="success"
        role="status"
      >
        {{ contactSuccessMessage(sentWithEmail) }}
      </p>

      <form
        v-else
        class="form"
        novalidate
        @submit.prevent="onSubmit"
      >
        <label class="field">
          <span>Assunto</span>
          <select v-model="draft.kind">
            <option
              v-for="option in CONTACT_KINDS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>Seu nome (opcional)</span>
          <input
            v-model="draft.name"
            type="text"
            :maxlength="CONTACT_NAME_MAX"
            autocomplete="name"
          >
        </label>
        <label class="field">
          <span>Quer resposta? Deixe seu e-mail</span>
          <input
            v-model="draft.email"
            type="email"
            maxlength="254"
            autocomplete="email"
            placeholder="voce@exemplo.com (opcional)"
          >
        </label>
        <label class="field">
          <span>Mensagem *</span>
          <textarea
            v-model="draft.message"
            rows="6"
            required
            :maxlength="CONTACT_MESSAGE_MAX"
          />
          <small class="field__counter">{{ draft.message.length }}/{{ CONTACT_MESSAGE_MAX }}</small>
        </label>
        <div
          class="hp"
          aria-hidden="true"
        >
          <label>
            Site
            <input
              v-model="draft.website"
              type="text"
              name="website"
              tabindex="-1"
              autocomplete="off"
            >
          </label>
        </div>
        <p class="notice">
          Nome e e-mail são usados só para responder à sua mensagem. Veja a
          <NuxtLink to="/privacidade">Política de privacidade</NuxtLink>.
        </p>
        <p
          v-if="error"
          class="error"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="submit"
          :disabled="sending"
        >
          {{ sending ? 'Enviando…' : 'Enviar mensagem' }}
        </button>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteTrail } from '~/utils/breadcrumb'
import {
  CONTACT_KINDS,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  contactBlocker,
  contactErrorMessage,
  contactPayload,
  contactSuccessMessage,
  emptyContactDraft,
} from '~/utils/contactMessage'
import { jboSend } from '~/utils/jboApi'

useJboSeo({
  title: 'Contato e Sugestões | Joinville Boas Ofertas',
  description: 'Fale com o Joinville Boas Ofertas: dúvidas, sugestões, problemas no site e parcerias.',
  path: '/contato',
})

const router = useRouter()
const draft = reactive(emptyContactDraft())
const sending = ref(false)
const done = ref(false)
const sentWithEmail = ref(false)
const error = ref('')

/** Página de onde a pessoa veio dentro do site (ajuda a entender o contexto); null em acesso direto. */
function previousPath(): string | null {
  const back = router.options.history.state.back
  return typeof back === 'string' ? back : null
}

/**
 * Valida o rascunho e envia para a API pública; em sucesso troca o
 * formulário pela confirmação (que só promete resposta se houve e-mail).
 */
async function onSubmit() {
  error.value = contactBlocker(draft)
  if (error.value) return
  sending.value = true
  try {
    const payload = contactPayload(draft, previousPath())
    await jboSend('POST', '/contact-messages', payload)
    sentWithEmail.value = Boolean(payload.email)
    done.value = true
  } catch (err) {
    error.value = contactErrorMessage(err)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page__main :deep(.crumbs) {
  margin-bottom: 0;
}

.page__intro h1 {
  margin: 0 0 0.4rem;
  font-size: 1.45rem;
  font-weight: 900;
}

.page__intro p {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.45;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
}

.field input,
.field select,
.field textarea {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  color: inherit;
  font: inherit;
}

.field textarea {
  resize: vertical;
  min-height: 8rem;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: 2px solid var(--yellow);
}

.field__counter {
  align-self: flex-end;
  color: var(--muted);
  font-size: 0.75rem;
}

.hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.notice {
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.4;
}

.submit {
  align-self: flex-start;
  min-width: 160px;
  border: 1px solid var(--yellow);
  border-radius: 12px;
  padding: 0.7rem 1rem;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.7;
  cursor: wait;
}

.error {
  margin: 0;
  color: var(--red);
  font-size: 0.85rem;
}

.success {
  margin: 0;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
