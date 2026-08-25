<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <header class="page__intro">
        <h1>Envios de encartes</h1>
        <p>
          Atualmente buscamos informações de encartes no Instagram da loja.
          Se a loja não tiver instagram, deixe o campo em branco — o envio nativo
          de encartes pela plataforma está em desenvolvimento e o pedido fica
          na fila aguardando essa evolução.
        </p>
      </header>

      <p
        v-if="done"
        class="success"
        role="status"
      >
        Recebemos seu pedido. Entraremos em contato se precisarmos de mais informações.
      </p>

      <form
        v-else
        class="form"
        @submit.prevent="onSubmit"
      >
        <label class="field">
          <span>Nome da loja *</span>
          <input
            v-model="storeName"
            type="text"
            required
            maxlength="200"
            autocomplete="organization"
          >
        </label>
        <label class="field">
          <span>Nome do solicitante *</span>
          <input
            v-model="requesterName"
            type="text"
            required
            maxlength="200"
            autocomplete="name"
          >
        </label>
        <label class="field">
          <span>E-mail do solicitante *</span>
          <input
            v-model="requesterEmail"
            type="email"
            required
            maxlength="254"
            autocomplete="email"
          >
        </label>
        <label class="field">
          <span>Instagram da loja</span>
          <input
            v-model="instagram"
            type="text"
            maxlength="100"
            placeholder="@loja (opcional)"
            autocomplete="off"
          >
        </label>
        <fieldset class="field field--role">
          <legend>Sou *</legend>
          <label>
            <input
              v-model="role"
              type="radio"
              value="user"
              required
            >
            Usuário
          </label>
          <label>
            <input
              v-model="role"
              type="radio"
              value="merchant"
            >
            Comerciante
          </label>
        </fieldset>
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
          {{ sending ? 'Enviando…' : 'Enviar' }}
        </button>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboSend } from '~/utils/jboApi'

useJboSeo({
  title: 'Envios de encartes | Joinville Boas Ofertas',
  description: 'Cadastre o Instagram da loja para monitoramento de encartes.',
  path: '/envie-um-encarte',
})

const storeName = ref('')
const requesterName = ref('')
const requesterEmail = ref('')
const instagram = ref('')
const role = ref<'user' | 'merchant' | ''>('')
const sending = ref(false)
const done = ref(false)
const error = ref('')

/**
 * Envia o lead para a API pública; em sucesso oculta o formulário.
 */
async function onSubmit() {
  error.value = ''
  if (!role.value) {
    error.value = 'Selecione se você é usuário ou comerciante.'
    return
  }
  sending.value = true
  try {
    await jboSend('POST', '/encarte-leads', {
      store_name: storeName.value.trim(),
      requester_name: requesterName.value.trim(),
      requester_email: requesterEmail.value.trim(),
      instagram: instagram.value.trim() || null,
      role: role.value,
    })
    done.value = true
  } catch {
    error.value = 'Não foi possível enviar. Tente novamente em instantes.'
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

.field input[type='text'],
.field input[type='email'] {
  border: 1px solid var(--border);
  background: var(--navy-light);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  color: inherit;
  font: inherit;
}

.field input:focus {
  outline: 2px solid var(--yellow);
}

.field--role {
  border: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field--role label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
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
  color: #ffb2b5;
  font-size: 0.85rem;
}

.success {
  margin: 0;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--navy-light);
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
