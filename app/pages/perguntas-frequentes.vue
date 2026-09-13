<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <AppBreadcrumb :items="siteTrail({ label: 'Perguntas frequentes' })" />
      <h1>Perguntas frequentes</h1>
      <p class="lead">
        Respostas rápidas para quem consulta ofertas e para lojas que querem
        aparecer no Joinville Boas Ofertas.
      </p>

      <section
        v-for="section in faqSections"
        :key="section.id"
        :aria-labelledby="section.id"
      >
        <h2 :id="section.id">
          {{ section.title }}
        </h2>

        <details
          v-for="item in section.items"
          :key="item.question"
          class="faq"
        >
          <summary>{{ item.question }}</summary>
          <p>
            <template
              v-for="(part, i) in item.parts"
              :key="i"
            >
              <NuxtLink
                v-if="part.to"
                :to="part.to"
              >
                {{ part.text }}
              </NuxtLink>
              <a
                v-else-if="part.href"
                :href="part.href"
                rel="noopener"
                target="_blank"
              >{{ part.text }}</a>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
        </details>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { siteTrail } from '~/utils/breadcrumb'

type FaqPart = { text: string, to?: string, href?: string }

type FaqItem = {
  question: string
  /** Texto plano para JSON-LD (sem markup). */
  answer: string
  parts: FaqPart[]
}

type FaqSection = {
  id: string
  title: string
  items: FaqItem[]
}

function plain(text: string): FaqPart[] {
  return [{ text }]
}

const faqSections: FaqSection[] = [
  {
    id: 'faq-compradores',
    title: 'Para quem compra',
    items: [
      {
        question: 'O que é o Joinville Boas Ofertas?',
        answer:
          'Um catálogo público de ofertas de lojas de Joinville e região. Você compara preços e vê trechos de encartes — sem comprar pelo site.',
        parts: plain(
          'Um catálogo público de ofertas de lojas de Joinville e região. Você compara preços e vê trechos de encartes — sem comprar pelo site.',
        ),
      },
      {
        question: 'Os preços estão sempre certos?',
        answer:
          'Fazemos o possível para refletir o que está no encarte, mas preço e estoque podem mudar. Confira sempre na loja antes de comprar.',
        parts: plain(
          'Fazemos o possível para refletir o que está no encarte, mas preço e estoque podem mudar. Confira sempre na loja antes de comprar.',
        ),
      },
      {
        question: 'Por que algumas ofertas aparecem como expiradas?',
        answer:
          'A validade do encarte já passou. Elas podem continuar visíveis só para consulta, não como promoção vigente.',
        parts: plain(
          'A validade do encarte já passou. Elas podem continuar visíveis só para consulta, não como promoção vigente.',
        ),
      },
      {
        question: 'O que significa o selo de clube / preço de fidelidade?',
        answer:
          'Em geral é o preço para quem participa do programa da loja. As condições exatas estão no encarte da loja.',
        parts: plain(
          'Em geral é o preço para quem participa do programa da loja. As condições exatas estão no encarte da loja.',
        ),
      },
      {
        question: 'Como encontro encartes completos?',
        answer:
          'Na página de Encartes ou, em cada oferta, use “Ver encarte completo” quando disponível. Vale conferir todas as condições no encarte.',
        parts: plain(
          'Na página de Encartes ou, em cada oferta, use “Ver encarte completo” quando disponível. Vale conferir todas as condições no encarte.',
        ),
      },
      {
        question: 'Posso receber avisos de uma loja?',
        answer:
          'Em algumas lojas você pode ativar avisos de ofertas e encartes no navegador. O pedido de permissão aparece quando você escolhe acompanhar a loja.',
        parts: plain(
          'Em algumas lojas você pode ativar avisos de ofertas e encartes no navegador. O pedido de permissão aparece quando você escolhe acompanhar a loja.',
        ),
      },
      {
        question: 'O site vende ou entrega produtos?',
        answer:
          'Não. Só mostramos informações. A compra é feita diretamente na loja.',
        parts: plain(
          'Não. Só mostramos informações. A compra é feita diretamente na loja.',
        ),
      },
    ],
  },
  {
    id: 'faq-lojas',
    title: 'Para lojas / comerciantes',
    items: [
      {
        question: 'Como minha loja pode aparecer no Joinville Boas Ofertas?',
        answer:
          'Em geral acompanhamos o Instagram da loja para localizar encartes públicos. Use a página Envie um encarte para cadastrar o Instagram ou deixar o pedido na fila.',
        parts: [
          { text: 'Em geral acompanhamos o Instagram da loja para localizar encartes públicos. Use a página ' },
          { text: 'Envie um encarte', to: '/envie-um-encarte' },
          { text: ' para cadastrar o Instagram ou deixar o pedido na fila.' },
        ],
      },
      {
        question:
          'Quais regras para o encarte ser divulgado no Instagram do Joinville Boas Ofertas?',
        answer:
          'O material precisa ser um encarte ou anúncio público da loja, com preço e validade legíveis, de Joinville ou região. Não publicamos conteúdo ofensivo, enganoso ou que não seja da própria loja.',
        parts: plain(
          'O material precisa ser um encarte ou anúncio público da loja, com preço e validade legíveis, de Joinville ou região. Não publicamos conteúdo ofensivo, enganoso ou que não seja da própria loja.',
        ),
      },
      {
        question: 'Preciso pagar para aparecer?',
        answer:
          'Não há cobrança para a loja aparecer no catálogo público neste momento.',
        parts: plain(
          'Não há cobrança para a loja aparecer no catálogo público neste momento.',
        ),
      },
      {
        question: 'Minha loja não tem Instagram. E agora?',
        answer:
          'Deixe o Instagram em branco no formulário Envie um encarte. O envio nativo de encartes pela plataforma está em desenvolvimento; o pedido fica na fila.',
        parts: [
          { text: 'Deixe o Instagram em branco no formulário ' },
          { text: 'Envie um encarte', to: '/envie-um-encarte' },
          { text: '. O envio nativo de encartes pela plataforma está em desenvolvimento; o pedido fica na fila.' },
        ],
      },
      {
        question: 'Posso pedir para corrigir ou remover uma oferta?',
        answer:
          'Sim. Fale conosco no Instagram @joinvilleboasofertas com o nome da loja e o que precisa ajustar.',
        parts: [
          { text: 'Sim. Fale conosco no Instagram ' },
          {
            text: '@joinvilleboasofertas',
            href: 'https://instagram.com/joinvilleboasofertas',
          },
          { text: ' com o nome da loja e o que precisa ajustar.' },
        ],
      },
      {
        question: 'Vocês alteram os preços do meu encarte?',
        answer:
          'Não. Exibimos o que está no material público da loja. Se houver erro de leitura, avise pelo Instagram para corrigirmos.',
        parts: plain(
          'Não. Exibimos o que está no material público da loja. Se houver erro de leitura, avise pelo Instagram para corrigirmos.',
        ),
      },
    ],
  },
]

const faqEntities = faqSections.flatMap(s => s.items)

useJboSeo({
  title: 'Perguntas frequentes | Joinville Boas Ofertas',
  description:
    'Dúvidas frequentes para quem compra e para lojas no Joinville Boas Ofertas.',
  path: '/perguntas-frequentes',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntities.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  },
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

.page__main :deep(.crumbs) {
  margin-bottom: 0;
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
  color: var(--ink);
}

.faq {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
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
  color: var(--ink-2);
  font-size: 0.92rem;
}

.faq a {
  color: var(--blue);
}
</style>
