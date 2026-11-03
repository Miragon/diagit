<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FilePage from './FilePage.vue'
import { models } from './data'

defineProps<{ sourceLines?: number }>()
const selected = defineModel<number>({ default: 0 })
const chosen = ref(false)
const held = ref(false)
const reducedMotion = ref(true)
onMounted(() => {
  reducedMotion.value = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion.value) frame.value = 1
})
const frame = ref(0)
const cycling = computed(() => !reducedMotion.value && !chosen.value && !held.value)
let tick: ReturnType<typeof setInterval> | undefined
watch(cycling, (on) => {
  clearInterval(tick)
  if (on) tick = setInterval(advance, 3000)
})
onBeforeUnmount(() => clearInterval(tick))

function advance() {
  if (frame.value === 0) {
    frame.value = 1
    return
  }
  frame.value = 0
  selected.value = (selected.value + 1) % models.length
}

function choose(index: number) {
  chosen.value = true
  selected.value = index
  frame.value = 1
}
</script>

<template>
  <FilePage
    class="showcase"
    :class="{ cycling }"
    :source-lines="sourceLines"
    :model-index="selected"
    :frame="frame"
    @mouseenter="held = true"
    @mouseleave="held = false"
    @focusin="held = true"
    @focusout="held = false"
  >
    <template #tabs>
      <div class="tabs" role="tablist" aria-label="Open model files">
        <button
          v-for="(model, index) in models"
          :key="model.file"
          class="tab"
          role="tab"
          :aria-selected="index === selected"
          :title="model.file"
          @click="choose(index)"
        >
          {{ model.name }}
        </button>
      </div>
    </template>
  </FilePage>
</template>

<style scoped>
.tabs {
  display: flex;
  flex: 1;
  min-width: 0;
}
.tab {
  position: relative;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 160px;
  overflow: hidden;
  height: 32px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: var(--cd-radius-sm) var(--cd-radius-sm) 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 31px;
  color: var(--cd-ui-text-leise);
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
}
.tab + .tab::before {
  content: '';
  position: absolute;
  top: 9px;
  left: 0;
  width: 1px;
  height: 14px;
  background: var(--cd-ui-linie);
}
.tab:hover::before,
.tab:hover + .tab::before,
.tab[aria-selected='true']::before,
.tab[aria-selected='true'] + .tab::before {
  visibility: hidden;
}
.tab:hover {
  color: var(--cd-ui-text);
  background: var(--cd-ui-hover);
}
.tab:focus-visible {
  outline: 2px solid var(--cd-ui-interaktion);
  outline-offset: -2px;
}
.tab[aria-selected='true'] {
  flex-shrink: 0;
  height: 33px;
  margin-bottom: -1px;
  border-color: var(--cd-ui-linie);
  background: var(--cd-ui-flaeche);
  color: var(--cd-ui-text);
}
.tab[aria-selected='true']::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--cd-ui-interaktion);
  transform-origin: left;
}
.cycling .tab[aria-selected='true']::after {
  animation: fill 6s linear;
}
@keyframes fill {
  from {
    transform: scaleX(0);
  }
}
</style>
