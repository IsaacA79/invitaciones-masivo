<script>
  // src/lib/components/Preview.svelte
  import Template from '$components/Template.svelte';
  import TemplateModerno from '$components/TemplateModerno.svelte';
  import { information } from '$lib/stores/event.js';

  const templateKey = $derived.by(() =>
    String($information?.design?.template || 'clasico').toLowerCase()
  );
</script>

<!-- ✅ Mobile: normal (no sticky). ✅ XL+: sticky cuando ya hay 2 columnas -->
<div class="w-full flex justify-center xl:justify-start xl:sticky xl:top-24">
  <article
    class="relative w-full max-w-140 xl:max-w-175 2xl:max-w-205 aspect-4/5
           rounded-3xl overflow-hidden
           border border-white/10 bg-white/5 backdrop-blur-xl
           shadow-[0_25px_70px_-50px_rgba(0,0,0,0.9)]"
  >
    <div
      class="pointer-events-none absolute inset-0 opacity-70
             bg-[radial-gradient(700px_360px_at_30%_20%,rgba(34,211,238,0.12),transparent_60%)]"
    ></div>

    <div class="relative h-full w-full p-0">
      {#if templateKey === 'moderno'}
        <div class="fade-in h-full w-full">
          <TemplateModerno />
        </div>
      {:else}
        <div class="fade-in h-full w-full">
          <Template />
        </div>
      {/if}
    </div>
  </article>
</div>

<style>
  .fade-in {
    animation: fadeIn 180ms ease-out;
    transform-origin: center;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.995);
      filter: blur(1px);
    }
    to {
      opacity: 1;
      transform: scale(1);
      filter: blur(0px);
    }
  }
</style>
