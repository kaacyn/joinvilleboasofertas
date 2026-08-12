<template>
  <div class="page">
    <AppHeader />
    <main class="page__main prose">
      <h1>Política de Privacidade</h1>
      <p class="muted">Última atualização: 11 de agosto de 2026</p>
      <p>
        Esta Política descreve como o <strong>Joinville Boas Ofertas</strong>
        trata dados pessoais em conformidade com a LGPD (Lei nº 13.709/2018).
      </p>
      <h2>1. Controlador</h2>
      <p>
        O controlador é o projeto Joinville Boas Ofertas. Contato:
        Instagram
        <a href="https://instagram.com/joinvilleboasofertas" rel="noopener" target="_blank">
          @joinvilleboasofertas
        </a>.
      </p>
      <h2>2. Dados e finalidades</h2>
      <p>
        Podemos processar dados de navegação técnicos (logs) e, quando você
        interage com formulários, nome e e-mail para avisos relacionados ao
        serviço. Não vendemos dados pessoais.
      </p>
      <h2>3. Cookies</h2>
      <p>
        Usamos cookies para melhorar a experiência e, em produção, medir
        audiência quando aplicável. Você pode gerenciar cookies no navegador.
      </p>
      <h2>4. Direitos</h2>
      <p>
        Você pode solicitar acesso, correção, eliminação e demais direitos da
        LGPD pelo Instagram informado acima, citando o e-mail e o assunto
        “LGPD — Joinville Boas Ofertas”.
      </p>
      <p>
        <NuxtLink to="/">← Voltar às ofertas</NuxtLink>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Política de Privacidade | Joinville Boas Ofertas',
  description: 'Como o Joinville Boas Ofertas trata dados pessoais (LGPD).',
})
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
}

.muted {
  color: var(--muted);
}

.prose h1 {
  font-size: 1.5rem;
  font-weight: 900;
}

.prose h2 {
  margin-top: 1.25rem;
  font-size: 1.05rem;
  color: var(--yellow);
}

.prose p {
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.88);
}
</style>
