<script>
  // src/routes/(admin)/events/[eventId]/+layout.svelte
  import { page } from '$app/stores';
  import { currentEventId } from '$lib/stores/current.js';

  let { children } = $props();

  $effect(() => {
    const id = $page.params.eventId || $page.params.id || '';
    if (id && $currentEventId !== id) $currentEventId = id;
  });
</script>

{@render children?.()}
