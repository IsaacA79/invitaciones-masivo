<script>
  // src/lib/components/TabGuest.svelte
  import PlusIcon from '$icons/plus';
  import TrashIcon from '$icons/trash';
  import { guests } from '$lib/stores/event.js';
  import { currentEventId } from '$lib/stores/current.js';
  import { page } from '$app/stores';

  // ✅ eventId robusto: URL primero, fallback store
  const eventId = $derived.by(() => $page.params.eventId || $page.params.id || $currentEventId || '');

  let uploading = $state(false);
  let uploadError = $state('');
  let importFileName = $state('');

  // ✅ Toggle global para campos extra (cargo/dependencia)
  let showExtraFields = $state(false);

  // ✅ avisos de duplicados
  let dupWarning = $state('');

  const normEmail = (s) => String(s || '').trim().toLowerCase();

  function dedupeGuests(list) {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    for (const g of list) {
      const email = normEmail(g?.email);

      // no dedupe si email vacío
      if (!email) {
        unique.push(g);
        continue;
      }

      if (seen.has(email)) {
        duplicates.push({ email, name: String(g?.name || '').trim() });
        continue;
      }

      seen.add(email);
      unique.push(g);
    }

    return { unique, duplicates };
  }

  function applyDedupe(reason = 'lista') {
    dupWarning = '';
    const { unique, duplicates } = dedupeGuests($guests);

    if (duplicates.length) {
      guests.set(unique);

      const emails = duplicates.map((d) => d.email);
      const head = emails.slice(0, 6).join(', ');
      const more = emails.length > 6 ? ` y ${emails.length - 6} más` : '';

      dupWarning = `Se detectaron ${emails.length} correos duplicados; se eliminaron de la lista: ${head}${more}`;
      // ✅ alerta inmediata (puedes comentar si prefieres solo el banner)
      alert(dupWarning);
    }
  }

  const addGuest = () => {
    $guests = [
      ...$guests,
      {
        id: crypto.randomUUID(),
        name: '',
        email: '',
        role: '',
        department: ''
      }
    ];
  };

  const removeGuest = (id) => {
    $guests = $guests.filter((t) => t.id !== id);
  };

  const extraSummary = (g) =>
    [g?.role, g?.department]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join(' · ');

  async function onImportFile(e) {
    uploadError = '';
    dupWarning = '';

    const input = e?.currentTarget; // ✅ snapshot para evitar null después de await
    const file = input?.files?.[0];
    if (!file) return;

    importFileName = file.name;

    if (!eventId) {
      uploadError = 'No hay evento seleccionado';
      if (input) input.value = '';
      importFileName = '';
      return;
    }

    uploading = true;

    try {
      const fd = new FormData();
      fd.set('eventId', eventId);
      fd.set('file', file);

      const res = await fetch('/api/guests/import', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error al importar');

      if (Array.isArray(data?.guests)) {
        const mapped = data.guests.map((g) => ({
          id: g.id || crypto.randomUUID(),
          name: g.name || '',
          email: g.email || '',
          role: g.role || '',
          department: g.department || ''
        }));

        // ✅ dedupe al importar
        const { unique, duplicates } = dedupeGuests(mapped);
        guests.set(unique);

        if (duplicates.length) {
          const emails = duplicates.map((d) => d.email);
          const head = emails.slice(0, 6).join(', ');
          const more = emails.length > 6 ? ` y ${emails.length - 6} más` : '';
          dupWarning = `Importación: se detectaron ${emails.length} correos duplicados y se eliminaron: ${head}${more}`;
          alert(dupWarning);
        }
      }

      if (input) input.value = '';
      importFileName = '';
    } catch (err) {
      uploadError = err?.message || 'Error al importar';
      if (input) input.value = '';
    } finally {
      uploading = false;
    }
  }

  function onEmailBlur() {
    // ✅ dedupe cuando el usuario termina de editar correos
    applyDedupe('email');
  }
</script>

<section class="bg-base-100 border border-base-300 rounded-2xl p-5 min-w-0">
  <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-base-300 pb-4 min-w-0">
    <div class="min-w-0">
      <h3 class="text-base font-semibold">Invitados</h3>
      <p class="text-xs opacity-60 truncate">Agrega  </p>
    </div>

    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
      <button
        type="button"
        class="btn btn-ghost btn-sm rounded-xl"
        onclick={() => (showExtraFields = !showExtraFields)}
        title="Mostrar/Ocultar cargo y dependencia"
      >
        {showExtraFields ? 'Ocultar campos extra' : 'Mostrar campos extra'}
      </button>

      <input
        id="import-guests-file"
        type="file"
        class="hidden"
        accept=".csv,.xlsx,.xls,.txt"
        onchange={onImportFile}
        disabled={uploading}
      />

      <label
        for="import-guests-file"
        class={`btn btn-outline btn-sm rounded-xl justify-between min-w-0 ${uploading ? 'btn-disabled' : ''}`}
        title={importFileName || 'Importar CSV/XLSX'}
      >
        <span class="font-medium">{uploading ? 'Importando…' : 'Importar'}</span>
        <span class="truncate max-w-40 text-xs opacity-70">
          {importFileName || 'CSV/XLSX'}
        </span>
      </label>

      <button class="btn btn-neutral btn-sm rounded-xl" onclick={addGuest} type="button">
        <PlusIcon size={18} />
        Agregar
      </button>
    </div>
  </header>

  {#if uploadError}
    <div class="alert alert-error mt-4 rounded-xl">
      <span class="text-sm">{uploadError}</span>
    </div>
  {/if}

  {#if dupWarning}
    <div class="alert alert-warning mt-4 rounded-xl">
      <span class="text-sm">{dupWarning}</span>
      <button type="button" class="btn btn-ghost btn-xs rounded-lg ml-auto" onclick={() => (dupWarning = '')}>
        OK
      </button>
    </div>
  {/if}

  <div class="mt-4 min-w-0">
    <ul class="w-full flex flex-col gap-2 min-w-0">
      {#each $guests as g, index (g.id)}
        <li class="w-full bg-base-200/40 border border-base-300 rounded-2xl p-3 min-w-0">
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start min-w-0">
            <div class="sm:col-span-4 min-w-0">
              <input
                bind:value={g.name}
                class="input input-sm w-full min-w-0"
                type="text"
                placeholder={`Invitado ${index + 1}`}
                required
              />
            </div>

            <div class="sm:col-span-6 min-w-0">
              <input
                bind:value={g.email}
                class="input input-sm w-full min-w-0"
                type="email"
                placeholder={`Correo ${index + 1}`}
                required
                onblur={onEmailBlur}
              />
            </div>

            <div class="sm:col-span-2 flex justify-end">
              <button
                class="btn btn-ghost btn-sm rounded-xl"
                onclick={() => removeGuest(g.id)}
                type="button"
                aria-label="Eliminar invitado"
                title="Eliminar"
              >
                <TrashIcon size={16} />
              </button>
            </div>

            {#if showExtraFields}
              <div class="sm:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <input
                  bind:value={g.role}
                  class="input input-sm w-full min-w-0"
                  type="text"
                  placeholder="Cargo (opcional)"
                />
                <input
                  bind:value={g.department}
                  class="input input-sm w-full min-w-0"
                  type="text"
                  placeholder="Dependencia (opcional)"
                />
              </div>
            {:else}
              {#if extraSummary(g)}
                <div class="sm:col-span-12 text-xs opacity-70 px-1 truncate">
                  {extraSummary(g)}
                </div>
              {/if}
            {/if}
          </div>
        </li>
      {:else}
        <div class="text-sm opacity-60 text-center py-10">
          No hay invitados
        </div>
      {/each}
    </ul>
  </div>

  <footer class="flex justify-between items-center mt-5 pt-4 border-t border-base-300 text-xs opacity-70">
    <span>Total</span>
    <span class="font-medium">{$guests.length}</span>
  </footer>
</section>
