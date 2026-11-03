<script setup lang="ts">
import { withBase } from 'vitepress'
import { computed } from 'vue'
import { models } from './data'

const props = defineProps<{ sourceLines?: number; modelIndex?: number; frame?: number }>()
const model = computed(() => models[props.modelIndex ?? 0])
const path = computed(() => `${model.value.dir}/${model.value.file}`)
const url = computed(() =>
  model.value.pullRequest
    ? `github.com/acme/shop/pull/${model.value.pullRequest}/files`
    : `github.com/acme/shop/blob/main/${path.value}`,
)
const image = computed(() => {
  const images = model.value.images ?? [model.value.image]
  return images[Math.min(props.frame ?? images.length - 1, images.length - 1)]
})
const changeOf = (line: string) => ({ '-': 'removed', '+': 'added' })[line[0]] ?? ''
</script>

<template>
  <div class="browser">
    <div v-if="$slots.tabs" class="tabstrip">
      <span class="lights"><i /><i /><i /></span>
      <slot name="tabs" />
    </div>
    <div class="chrome">
      <span v-if="!$slots.tabs" class="lights"><i /><i /><i /></span>
      <span class="url">{{ url }}</span>
      <span class="toolbar-icon" title="Diagit is active on this page">
        <img :src="withBase('/shots/extension-icon.png')" alt="Diagit" width="16" height="16" />
      </span>
    </div>
    <div class="file">
      <div v-if="model.pullRequest" class="crumb">
        acme / shop / Pull request #{{ model.pullRequest }} / <strong>Files changed</strong>
      </div>
      <div v-else class="crumb">
        acme / shop / {{ model.dir }} / <strong>{{ model.file }}</strong>
      </div>
      <div class="file-bar">
        <span>{{ model.pullRequest ? path : model.file }}</span
        ><span>{{ model.pullRequest ? 'Viewed' : 'Code · Blame' }}</span>
      </div>
      <div class="canvas" data-cd-theme="light">
        <img
          :src="withBase(`/shots/notations/${image}.png`)"
          :alt="`${model.name} ${model.file}, drawn by Diagit`"
          data-zoom="off"
        />
      </div>
      <ol class="source">
        <li
          v-for="(line, index) in model.lines.slice(0, sourceLines ?? model.lines.length)"
          :key="index"
          :class="changeOf(line)"
        >
          {{ line }}
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--cd-ui-kontur);
  border-radius: var(--cd-radius-sm);
  background: var(--cd-ui-seite);
}
.chrome {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--cd-ui-linie);
  background: var(--cd-ui-flaeche);
}
.tabstrip {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  padding: 8px 12px 0;
  background: var(--cd-ui-abschnitt);
  border-bottom: 1px solid var(--cd-ui-linie);
}
.tabstrip .lights {
  align-self: flex-end;
  margin: 0 10px 12px 0;
}
.lights {
  display: flex;
  gap: 6px;
}
.lights i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--cd-ui-kontur);
}
.url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 4px 10px;
  border: 1px solid var(--cd-ui-linie);
  border-radius: var(--cd-radius-sm);
  background: var(--cd-ui-seite);
  font: 400 12px/1.4 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.toolbar-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 2px solid var(--cd-ui-interaktion);
  border-radius: var(--cd-radius-sm);
}
.file {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 14px 18px 18px;
}
.crumb {
  font: 400 12px/1.4 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.crumb strong {
  color: var(--cd-ui-text);
}
.file-bar {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding: 7px 12px;
  border: 1px solid var(--cd-ui-linie);
  border-bottom: 0;
  border-radius: var(--cd-radius-sm) var(--cd-radius-sm) 0 0;
  background: var(--cd-ui-flaeche);
  font: 400 12px/1.4 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.canvas {
  border: 1px solid var(--cd-ui-linie);
}
.canvas img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
.source {
  flex: none;
  margin: 0;
  padding: 8px 0 10px;
  border: 1px solid var(--cd-ui-linie);
  border-top: 0;
  list-style: none;
  counter-reset: line;
  font: 400 12px/1.7 var(--vp-font-family-mono);
  color: var(--cd-ui-text-leise);
}
.source li {
  overflow: hidden;
  text-overflow: ellipsis;
  counter-increment: line;
  padding: 0 14px;
  white-space: pre;
}
.source li.added {
  background: var(--cd-ui-success-flaeche);
}
.source li.removed {
  background: var(--cd-ui-danger-flaeche);
}
.source li::before {
  content: counter(line);
  display: inline-block;
  width: 28px;
  color: var(--cd-ui-kontur);
}
@media (max-width: 640px) {
  .tabstrip .lights {
    display: none;
  }
}
</style>
