<script setup lang="ts">
import { jboGet, productOfferPath, type JboOffer } from '~/utils/jboApi'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { data: offer, error } = await useAsyncData(
  () => `offer-${id.value}`,
  () => jboGet<JboOffer>(`/offers/${id.value}`),
  { watch: [id] },
)

if (error.value || !offer.value) {
  throw createError({ statusCode: 404, statusMessage: 'Oferta não encontrada' })
}

await navigateTo(productOfferPath(offer.value), { redirectCode: 301, replace: true })
</script>
