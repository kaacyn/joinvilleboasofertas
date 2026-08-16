<template>
  <div class="page">
    <AppHeader />
    <main class="page__main prose">
      <h1>Termos de uso</h1>
      <p class="muted">Última atualização: 13 de agosto de 2026</p>
      <p>
        Estes Termos regulam o uso do site
        <strong>Joinville Boas Ofertas</strong>, um catálogo público de ofertas
        de supermercados de Joinville e região.
      </p>

      <h2>1. Natureza do serviço</h2>
      <p>
        O site apenas exibe informações de preços e promoções coletadas de
        encartes e anúncios públicos. Não vendemos produtos, não intermediamos
        compras e não garantimos estoque, preço ou disponibilidade no
        estabelecimento.
      </p>

      <h2>2. Uso permitido</h2>
      <p>
        Você pode consultar ofertas para uso pessoal. É vedado copiar o
        conteúdo em massa, burlar limites técnicos ou usar o serviço para
        fins ilícitos.
      </p>

      <h2>3. Precisão das informações</h2>
      <p>
        Preços, prazos de validade e disponibilidade podem mudar sem aviso.
        Confira sempre no supermercado antes de comprar. Ofertas expiradas
        podem aparecer sinalizadas para consulta histórica.
      </p>

      <h2>4. Propriedade intelectual</h2>
      <p>
        Marca, layout e textos do Joinville Boas Ofertas pertencem ao projeto.
        Nomes e marcas de supermercados e produtos pertencem aos respectivos
        titulares.
      </p>

      <h2>5. Privacidade</h2>
      <p>
        O tratamento de dados pessoais está descrito na
        <NuxtLink to="/privacidade">Política de privacidade</NuxtLink>.
      </p>

      <h2>6. Contato</h2>
      <p>
        Dúvidas:
        <a href="https://instagram.com/joinvilleboasofertas" rel="noopener" target="_blank">
          @joinvilleboasofertas
        </a>.
      </p>
      <p>
        <NuxtLink to="/">← Voltar às ofertas</NuxtLink>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Termos de uso | Joinville Boas Ofertas',
  description: 'Condições de uso do catálogo público Joinville Boas Ofertas.',
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

.prose a {
  color: var(--yellow);
}
</style>
