<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <h1>Perguntas frequentes</h1>
      <p class="lead">
        Respostas rápidas para quem consulta ofertas e para lojas que querem
        aparecer no Joinville Boas Ofertas.
      </p>

      <section aria-labelledby="faq-compradores">
        <h2 id="faq-compradores">
          Para quem compra
        </h2>

        <details class="faq">
          <summary>O que é o Joinville Boas Ofertas?</summary>
          <p>
            Um catálogo público de ofertas de lojas de Joinville e região.
            Você compara preços e vê trechos de encartes — sem comprar pelo site.
          </p>
        </details>

        <details class="faq">
          <summary>Os preços estão sempre certos?</summary>
          <p>
            Fazemos o possível para refletir o que está no encarte, mas preço e
            estoque podem mudar. Confira sempre na loja antes de comprar.
          </p>
        </details>

        <details class="faq">
          <summary>Por que algumas ofertas aparecem como expiradas?</summary>
          <p>
            A validade do encarte já passou. Elas podem continuar visíveis só
            para consulta, não como promoção vigente.
          </p>
        </details>

        <details class="faq">
          <summary>O que significa o selo de clube / preço de fidelidade?</summary>
          <p>
            Em geral é o preço para quem participa do programa da loja. As
            condições exatas estão no encarte da loja.
          </p>
        </details>

        <details class="faq">
          <summary>Como encontro encartes completos?</summary>
          <p>
            Na página de Encartes ou, em cada oferta, use “Ver encarte completo”
            quando disponível. Vale conferir todas as condições no encarte.
          </p>
        </details>

        <details class="faq">
          <summary>Posso receber avisos de uma loja?</summary>
          <p>
            Em algumas lojas você pode ativar avisos de ofertas e encartes no
            navegador. O pedido de permissão aparece quando você escolhe
            acompanhar a loja.
          </p>
        </details>

        <details class="faq">
          <summary>O site vende ou entrega produtos?</summary>
          <p>
            Não. Só mostramos informações. A compra é feita diretamente na loja.
          </p>
        </details>
      </section>

      <section aria-labelledby="faq-lojas">
        <h2 id="faq-lojas">
          Para lojas / comerciantes
        </h2>

        <details class="faq">
          <summary>Como minha loja pode aparecer no Joinville Boas Ofertas?</summary>
          <p>
            Em geral acompanhamos o Instagram da loja para localizar encartes
            públicos. Use a página
            <NuxtLink to="/envie-um-encarte">Envie um encarte</NuxtLink>
            para cadastrar o Instagram ou deixar o pedido na fila.
          </p>
        </details>

        <details class="faq">
          <summary>
            Quais regras para o encarte ser divulgado no Instagram do Joinville Boas Ofertas?
          </summary>
          <p>
            O material precisa ser um encarte ou anúncio público da loja, com
            preço e validade legíveis, de Joinville ou região. Não publicamos
            conteúdo ofensivo, enganoso ou que não seja da própria loja.
          </p>
        </details>

        <details class="faq">
          <summary>Preciso pagar para aparecer?</summary>
          <p>
            Não há cobrança para a loja aparecer no catálogo público neste momento.
          </p>
        </details>

        <details class="faq">
          <summary>Minha loja não tem Instagram. E agora?</summary>
          <p>
            Deixe o Instagram em branco no formulário. O envio nativo de
            encartes pela plataforma está em desenvolvimento; o pedido fica na fila.
          </p>
        </details>

        <details class="faq">
          <summary>Posso pedir para corrigir ou remover uma oferta?</summary>
          <p>
            Sim. Fale conosco no Instagram
            <a
              href="https://instagram.com/joinvilleboasofertas"
              rel="noopener"
              target="_blank"
            >@joinvilleboasofertas</a>
            com o nome da loja e o que precisa ajustar.
          </p>
        </details>

        <details class="faq">
          <summary>Vocês alteram os preços do meu encarte?</summary>
          <p>
            Não. Exibimos o que está no material público da loja. Se houver
            erro de leitura, avise pelo Instagram para corrigirmos.
          </p>
        </details>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Perguntas frequentes | Joinville Boas Ofertas',
  description: 'Dúvidas frequentes para quem compra e para lojas no Joinville Boas Ofertas.',
})
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 900;
}

.lead {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

h2 {
  margin: 0 0 0.65rem;
  font-size: 1.05rem;
  color: var(--yellow);
}

.faq {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--navy-light);
  padding: 0.55rem 0.85rem;
  margin: 0 0 0.5rem;
}

.faq summary {
  cursor: pointer;
  font-weight: 700;
  list-style: none;
}

.faq summary::-webkit-details-marker {
  display: none;
}

.faq p {
  margin: 0.55rem 0 0.25rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.92rem;
}

.faq a {
  color: var(--yellow);
}
</style>
