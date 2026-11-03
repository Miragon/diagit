<script setup lang="ts">
import ModelShowcase from './ModelShowcase.vue'
import StoreButtons from './StoreButtons.vue'
</script>

<template>
  <div class="one">
    <section class="pitch">
      <h1>Your diagrams, drawn on the Git page you already have open.</h1>
      <p class="lede">
        A browser extension for GitHub and GitLab. Open a model file and Diagit draws the diagram
        above the source.
      </p>
      <StoreButtons />
    </section>
    <section class="stage" aria-label="GitHub file pages with Diagit, one model type after another">
      <ModelShowcase class="with" :source-lines="4" />
    </section>
  </div>
</template>

<style scoped>
.one {
  display: grid;
  border-top: 1px solid var(--cd-ui-linie);
}
.pitch {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 22px;
  padding: 40px 32px;
}
h1 {
  margin: 0;
  font-size: clamp(34px, 5.2vh, 52px);
  line-height: 1.04;
  font-weight: 700;
  letter-spacing: -0.045em;
}
.lede {
  max-width: 40ch;
  margin: 0;
  font-size: 16px;
  line-height: 1.55;
  color: var(--cd-ui-text-leise);
}
.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 40px;
  border-left: 1px solid var(--cd-ui-linie);
  background: var(--cd-ui-abschnitt);
  overflow: hidden;
}
.with {
  width: 100%;
}

@media (min-width: 960px) {
  .one {
    grid-template-columns: 4fr 6fr;
    height: calc(100dvh - var(--vp-nav-height) - 53px);
    min-height: 620px;
  }
  .stage {
    container-type: size;
    padding: 24px 40px;
  }
  .with {
    width: min(100%, calc((100cqh - 288px) * 16 / 9 + 40px));
  }
  .pitch {
    padding-left: max(32px, calc((100vw - var(--vp-layout-max-width)) / 2 + 32px));
  }
}
@media (max-width: 959px) {
  .stage {
    padding: 24px 16px;
    border-top: 1px solid var(--cd-ui-linie);
    border-left: 0;
  }
}
</style>
