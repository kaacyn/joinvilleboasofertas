<template>
  <ol class="push-steps" data-test="push-instructions">
    <template v-if="mode === 'ios-install'">
      <li>Instale o app na <strong>tela inicial</strong> do celular (menu Instalar app).</li>
      <li>Abra o app instalado e toque no sino novamente.</li>
      <li>Permita as notificações quando o iPhone pedir.</li>
    </template>
    <template v-else>
      <li>As notificações estão <strong>bloqueadas</strong> neste navegador.</li>
      <li>Abra as configurações do site (ícone de cadeado na barra de endereço).</li>
      <li>Ative <strong>Notificações</strong> e volte aqui para {{ goal }}.</li>
    </template>
  </ol>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  mode: 'ios-install' | 'permission-denied'
  goal?: string
}>(), {
  goal: 'seguir a loja',
})
</script>

<style scoped>
.push-steps {
  margin: 0;
  padding-left: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.push-steps strong {
  color: var(--ink);
  font-weight: 700;
}
</style>
