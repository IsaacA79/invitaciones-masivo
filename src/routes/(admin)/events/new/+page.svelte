<script>
  // src/routes/(admin)/events/new/+page.svelte
  import { enhance } from '$app/forms';

  const { form } = $props();

  let creating = $state(false);
  let title = $state('');

  const templates = [
    { label: 'Aparatos', value: 'Aparatos de ' },
    { label: 'Entrega', value: 'Entrega de ' },
    { label: 'Clausura', value: 'Clausura de ' },
    { label: 'Carrera', value: 'Carrera de ' },
    { label: 'Reunión', value: 'Reunión: ' },
    { label: 'Apertura', value: 'Apertura de ' }
  ];

  function applyTemplate(v) {
    const t = title.trim();
    if (!t) title = v;
    else if (!t.toLowerCase().startsWith(v.toLowerCase())) title = `${v}${t}`;
  }

  function smartCap(s) {
    s = (s || '').trim();
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const onEnhance = () => {
    creating = true;
    return async ({ update }) => {
      creating = false;
      await update();
    };
  };
</script>

<div class="max-w-2xl mx-auto py-8 sm:py-12 px-4">
  <div class="flex flex-col gap-2">
    <h2 class="text-3xl sm:text-4xl font-semibold text-zinc-100">Nuevo evento</h2>
    <p class="text-sm sm:text-base text-zinc-400 max-w-2xl">
      Crea un proyecto.
    </p>
  </div>

  <form method="POST" use:enhance={onEnhance} class="mt-6 sm:mt-8">
    <div class="rounded-3xl border border-zinc-800 bg-zinc-900/40 shadow-lg overflow-hidden">
      <div class="p-5 sm:p-7">
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-base sm:text-lg font-semibold text-zinc-100">Detalles</h3>
            <span class="text-xs text-zinc-500">{title.length}/200</span>
          </div>

          <div class="flex flex-wrap gap-2">
            {#each templates as t}
              <button
                type="button"
                class="btn btn-xs sm:btn-sm btn-outline rounded-full"
                disabled={creating}
                onclick={() => applyTemplate(t.value)}
                title={`Usar plantilla: ${t.label}`}
              >
                {t.label}
              </button>
            {/each}

            <button
              type="button"
              class="btn btn-xs sm:btn-sm btn-ghost rounded-full"
              disabled={creating}
              onclick={() => (title = '')}
              title="Limpiar título"
            >
              Limpiar
            </button>
          </div>

          <label class="text-sm text-zinc-300 mt-2">Título del evento</label>

          <!-- Input con “icono” simple y mejor focus -->
          <div class="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 focus-within:ring-2 focus-within:ring-teal-400/30">
            <span class="text-zinc-500 select-none">✦</span>
            <input
              name="title"
              class="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
              placeholder="Ej. Evento de lanzamiento"
              maxlength="200"
              autocomplete="off"
              required
              disabled={creating}
              bind:value={title}
              onblur={() => (title = smartCap(title))}
            />
          </div>

          <p class="text-xs text-zinc-500">
            Tip: usa una plantilla arriba para crear títulos más rápido.
          </p>

          {#if form?.message}
            <div class="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {form.message}
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer actions (responsive) -->
      <div class="border-t border-zinc-800 bg-zinc-950/30">
        <div class="p-4 sm:p-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <a class="btn btn-ghost w-full sm:w-auto" href="/events">Cancelar</a>

          <button
            class="btn btn-primary w-full sm:w-auto"
            type="submit"
            disabled={creating}
          >
            {creating ? 'Creando…' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  </form>
</div>
