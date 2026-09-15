<template>
  <div class="product-actions">
    <p class="product-actions__status" aria-live="polite">
      <button
        v-if="showCaption"
        type="button"
        class="product-actions__caption"
        :class="{ 'product-actions__caption--on': caption.on }"
        data-test="product-follow-caption"
        @click="openFollow"
      >
        {{ caption.text }}
      </button>
      <template v-else>{{ transientText }}</template>
    </p>
    <div class="product-actions__bar" role="group" aria-label="Ações da oferta">
      <button
        type="button"
        class="product-actions__btn"
        aria-label="Reportar um erro"
        title="Reportar um erro"
        aria-haspopup="dialog"
        data-test="product-report"
        @click="reportOpen = true"
      >
        <svg class="product-actions__icon" viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <path d="M5.5 21V4.5" />
          <path d="M5.5 4.5h11.2l-2.3 4 2.3 4H5.5" />
        </svg>
      </button>
      <button
        type="button"
        class="product-actions__btn"
        aria-label="Compartilhar oferta"
        title="Compartilhar"
        data-test="product-share"
        @click="onShare"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="18" cy="5" r="2.5" fill="currentColor" />
          <circle cx="6" cy="12" r="2.5" fill="currentColor" />
          <circle cx="18" cy="19" r="2.5" fill="currentColor" />
          <path
            d="M8.4 10.8 15.6 6.7M8.4 13.2l7.2 4.1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button
        ref="bellButton"
        type="button"
        class="product-actions__btn product-actions__bell"
        :aria-label="bellLabel"
        :title="bellLabel"
        :aria-pressed="followsHere(state, pageStoreId) ? 'true' : 'false'"
        aria-haspopup="dialog"
        data-test="product-follow"
        @click="openFollow"
      >
        <svg class="product-actions__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path class="product-actions__bell-body" d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
        </svg>
      </button>
    </div>

    <ReportOfferSheet
      :open="reportOpen"
      :offer-id="offer.id"
      :product-title="productTitle"
      :store-name="offer.establishment_name"
      @close="reportOpen = false"
    />
    <ProductFollowSheet
      :open="followOpen"
      :view="sheetView"
      :product-title="productTitle"
      :price-line="followPriceLine(offer)"
      :image-url="offer.image_url"
      :busy="busy"
      :waiting-text="followBusyText(instruction)"
      @pick="onPick"
      @off="onOff"
      @install="onInstall"
      @close="followOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'
import {
  followBellLabel,
  followBusyText,
  followCaption,
  followPriceLine,
  followSheetView,
  followsHere,
  pickAction,
  type FollowPick,
  type ProductFollowAction,
} from '~/utils/productFollow'
import { followInstructionMode, type FollowInstructionMode } from '~/utils/webPush'

const props = defineProps<{
  offer: JboOffer
  offers: JboOffer[]
  productTitle: string
  sharePath: string
}>()

/** Produto da oferta em foco (o sino segue por produto). */
const productId = computed(() => props.offer.product_id)
/** Mercado da página: é o escopo de "Só neste mercado". */
const pageStoreId = computed(() => props.offer.establishment_id)
/** Nome do mercado da página, para textos da folha e do sino. */
const pageStoreName = computed(() => props.offer.establishment_name)
const { state, busy, flash, apply } = useJboProductFollow(productId, pageStoreId, pageStoreName)
const { isIos, isStandalone, promptInstall } = usePwaInstall()
const { status: shareStatus, share } = useShareLink()

const reportOpen = ref(false)
const followOpen = ref(false)
const instruction = ref<FollowInstructionMode>('request-permission')
/** Botão do sino: recebe o foco de volta ao fechar a folha (a legenda que a abriu pode ter sumido). */
const bellButton = ref<HTMLButtonElement | null>(null)

/** Legenda persistente ao lado do sino. */
const caption = computed(() => followCaption(state.value, pageStoreId.value))
/** Rótulo acessível do botão do sino. */
const bellLabel = computed(() => followBellLabel(state.value, pageStoreId.value))

/** Aviso passageiro: compartilhar tem prioridade, depois o resultado do sino. */
const transientText = computed(() => {
  if (shareStatus.value === 'copied') return 'Link copiado'
  if (shareStatus.value === 'failed') return 'Não foi possível compartilhar agora.'
  return flash.value
})
/** Mostra a legenda só quando não há aviso passageiro. */
const showCaption = computed(() => !transientText.value && Boolean(caption.value.text))

/** Textos da folha do sino para o estado atual. */
const sheetView = computed(() => followSheetView({
  state: state.value,
  pageStoreId: pageStoreId.value,
  pageStoreName: pageStoreName.value,
  offers: props.offers,
  instructionMode: instruction.value,
}))

/** Abre a folha do sino lendo a permissão do navegador agora (não fica em cache). */
function openFollow() {
  instruction.value = followInstructionMode(isIos.value, isStandalone.value)
  followOpen.value = true
}

/**
 * Fecha a folha do sino e devolve o foco ao botão do sino: quando a folha foi
 * aberta pela legenda, esta já foi substituída pelo aviso passageiro e não
 * pode mais receber o foco de volta (o `useDialogLock` cairia no BODY).
 */
async function closeFollowAndFocusBell() {
  followOpen.value = false
  await nextTick()
  bellButton.value?.focus()
}

/** Opção escolhida: aplica e fecha a folha quando der certo. */
async function onPick(pick: FollowPick) {
  if (await apply(pickAction(pick))) await closeFollowAndFocusBell()
}

/** Desligar aqui ou em todos. */
async function onOff(action: ProductFollowAction) {
  if (await apply(action)) await closeFollowAndFocusBell()
}

/** iPhone fora do app: fecha a folha e mostra como instalar. */
async function onInstall() {
  followOpen.value = false
  await promptInstall()
}

/** Folha nativa ou copiar a URL do produto neste mercado. */
async function onShare() {
  const origin = import.meta.client ? window.location.origin : ''
  await share({
    title: props.productTitle,
    text: `Oferta em ${props.offer.establishment_name}`,
    url: `${origin}${props.sharePath}`,
  })
}
</script>

<style scoped>
/* Aviso à esquerda dos botões, no espaço livre da linha: não empurra o título. */
.product-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  min-height: 44px;
}

.product-actions__status {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--ink-3);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: right;
}

.product-actions__caption {
  padding: 0.25rem 0;
  border: 0;
  background: none;
  color: var(--ink-3);
  font: inherit;
  text-align: right;
  cursor: pointer;
}

.product-actions__caption--on {
  color: var(--yellow-ink);
}

.product-actions__bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.product-actions__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.product-actions__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.product-actions__bell[aria-pressed="true"] {
  background: var(--yellow-soft);
  border-color: var(--yellow);
  color: var(--yellow-ink);
}

.product-actions__bell[aria-pressed="true"] .product-actions__bell-body {
  fill: currentColor;
}

.product-actions__btn:hover {
  border-color: var(--ink-3);
}

.product-actions__btn:focus-visible,
.product-actions__caption:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
