<script setup lang="ts">
import { withBase } from 'vitepress'
import { next, status, stores } from './data'
</script>

<template>
  <div class="install">
    <div class="stores">
      <a
        v-for="(store, index) in stores"
        :key="store.name"
        class="store-button"
        :class="{ primary: index === 0 }"
        :href="store.url"
        target="_blank"
        rel="noopener"
        >{{ index === 0 ? `Add to ${store.name}` : store.name }}</a
      >
    </div>
    <p class="meta">
      <span class="marker" aria-hidden="true" />
      <span
        ><strong>{{ status.label }}</strong> {{ status.text }}</span
      >
    </p>
    <a class="start" :href="withBase(next.link)"
      >{{ next.text }} <span aria-hidden="true">→</span></a
    >
  </div>
</template>

<style scoped>
.stores {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.store-button {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 18px;
  border: 1px solid var(--cd-ui-kontur);
  border-radius: var(--cd-radius-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-ui-text);
  text-decoration: none;
}
.store-button:hover {
  background: var(--cd-ui-hover);
}
.store-button.primary {
  border-color: var(--vp-button-brand-bg);
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}
.store-button.primary:hover {
  border-color: var(--vp-button-brand-hover-bg);
  background: var(--vp-button-brand-hover-bg);
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  font-size: 13px;
}
.meta strong {
  font: 500 12px/1 var(--vp-font-family-mono);
}
.marker {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--cd-ui-warning);
}
.start {
  display: inline-block;
  margin-top: 16px;
  font-weight: 600;
  color: var(--cd-ui-link);
  text-decoration: none;
}
.start:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
