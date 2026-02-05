<script>
  // src/lib/components/TabInfo.svelte
  import { information } from '$lib/stores/event.js';
  import { currentEventId } from '$lib/stores/current.js';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';

  const MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

  // ✅ eventId robusto: URL primero, fallback al store
  const eventId = $derived.by(() =>
    String($page.params.eventId || $page.params.id || $currentEventId || '').trim()
  );

  const logos = ['logo1', 'logo2', 'logo3', 'logo4', 'logo5'];

  let fileNames = $state({
    logo: '',
    logo1: '',
    logo2: '',
    logo3: '',
    logo4: '',
    logo5: ''
  });

  let uploading = $state({});
  let errors = $state({});
  let objUrls = $state({}); // slot -> blob url (solo preview temporal)

  function setUploading(slot, v) {
    uploading = { ...(uploading ?? {}), [slot]: !!v };
  }
  function setError(slot, msg) {
    errors = { ...(errors ?? {}), [slot]: String(msg || '') };
  }
  function setFileName(slot, name) {
    fileNames = { ...(fileNames ?? {}), [slot]: String(name || '') };
  }
  function setObjUrl(slot, url) {
    objUrls = { ...(objUrls ?? {}), [slot]: String(url || '') };
  }

  function revokeObj(slot) {
    if (!browser) return;
    const u = objUrls?.[slot];
    if (u) URL.revokeObjectURL(u);
    setObjUrl(slot, '');
  }

  function validateImage(file) {
    if (!file) return 'Archivo inválido.';
    if (!ALLOWED.has(file.type)) return 'Tipo no permitido (PNG/JPG/WEBP).';
    if (file.size <= 0) return 'Archivo vacío.';
    if (file.size > MAX_BYTES) return `Tamaño máximo ${Math.floor(MAX_BYTES / 1024 / 1024)}MB.`;
    return '';
  }

  async function uploadAsset(slot, file) {
    if (!eventId) throw new Error('Falta eventId');

    const fd = new FormData();
    fd.append('slot', slot);
    fd.append('file', file);

    const res = await fetch(`/api/events/${eventId}/assets`, {
      method: 'POST',
      body: fd,
      credentials: 'include'
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || `Upload failed (${res.status})`);
    return payload; // { ok, path, url }
  }

  async function deleteAsset(slot) {
    if (!eventId) throw new Error('Falta eventId');

    const res = await fetch(`/api/events/${eventId}/assets`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ slot })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || `No se pudo eliminar (${res.status})`);
    return payload;
  }

  async function handleFileChange(e, slot) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (uploading?.[slot]) return;

    const err = validateImage(file);
    if (err) {
      setError(slot, err);
      return;
    }

    if (!eventId) {
      setError(slot, 'No hay evento seleccionado.');
      return;
    }

    setError(slot, '');
    setUploading(slot, true);
    setFileName(slot, file.name);

    const prev = $information?.[slot] || '';

    // preview inmediato (blob)
    if (browser) {
      revokeObj(slot);
      const u = URL.createObjectURL(file);
      setObjUrl(slot, u);
      $information[slot] = u; // blob: mientras sube
    }

    try {
      const { url } = await uploadAsset(slot, file);
      $information[slot] = url; // ✅ URL final persistente
      revokeObj(slot);
    } catch (ex) {
      revokeObj(slot);
      $information[slot] = prev; // rollback
      setError(slot, ex?.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(slot, false);
    }
  }

  async function clearLogo(slot) {
    if (uploading?.[slot]) return;

    setError(slot, '');
    revokeObj(slot);

    const prev = $information?.[slot] || '';
    const prevName = fileNames?.[slot] || '';

    // UI optimista
    $information[slot] = '';
    setFileName(slot, '');

    try {
      if (!eventId) return;
      await deleteAsset(slot);
    } catch (ex) {
      // rollback
      $information[slot] = prev;
      setFileName(slot, prevName);
      setError(slot, ex?.message || 'No se pudo eliminar');
    }
  }

  const labelText = (slot) => {
    if (uploading?.[slot]) return 'Subiendo…';
    if (fileNames?.[slot]) return fileNames[slot];
    if ($information?.[slot]) return 'Cargado';
    return 'Seleccionar imagen';
  };
</script>

<section class="bg-base-100 border border-base-300 rounded-2xl p-5">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
    <fieldset class="fieldset w-full md:col-span-2 min-w-0">
      <legend class="fieldset-legend">Nombre del evento</legend>
      <input
        class="input w-full"
        placeholder="Nombre del evento"
        id="name_event"
        name="name_event"
        bind:value={$information.name}
      />
    </fieldset>

    <fieldset class="fieldset w-full min-w-0">
      <legend class="fieldset-legend">Fecha</legend>
      <input type="date" class="input w-full" id="date" name="date" bind:value={$information.date} />
    </fieldset>

    <fieldset class="fieldset w-full min-w-0">
      <legend class="fieldset-legend">Hora</legend>
      <input type="time" class="input w-full" id="time_event" name="time_event" bind:value={$information.time} />
    </fieldset>

    <fieldset class="fieldset w-full md:col-span-2 min-w-0">
      <legend class="fieldset-legend">Breve descripción</legend>
      <textarea
        class="textarea w-full min-h-28"
        placeholder="Breve descripción"
        id="description_event"
        name="description_event"
        bind:value={$information.description}
      ></textarea>
    </fieldset>

    <fieldset class="fieldset w-full md:col-span-2 min-w-0">
      <legend class="fieldset-legend">Dirección</legend>
      <input
        type="text"
        class="input w-full"
        placeholder="Dirección"
        id="address_event"
        name="address_event"
        bind:value={$information.address}
      />
    </fieldset>

    <!-- Logo principal -->
    <fieldset class="fieldset w-full min-w-0">
      <legend class="fieldset-legend">Logo principal</legend>

      <input
        id="file-logo"
        type="file"
        class="hidden"
        accept="image/png,image/jpeg,image/webp"
        onchange={(e) => handleFileChange(e, 'logo')}
        disabled={!!uploading?.logo}
      />

      <label
        for="file-logo"
        class={`btn btn-outline rounded-xl w-full justify-between min-w-0 ${uploading?.logo ? 'btn-disabled' : ''}`}
      >
        <span class="font-medium">Seleccionar</span>
        <span class="truncate max-w-48 text-xs opacity-70">{labelText('logo')}</span>
      </label>

      <div class="flex items-center justify-between mt-2">
        <span class="text-xs opacity-50">Máx. 2MB · PNG/JPG/WEBP</span>
        {#if $information.logo}
          <button type="button" class="btn btn-ghost btn-xs rounded-lg" onclick={() => clearLogo('logo')} disabled={!!uploading?.logo}>
            Limpiar
          </button>
        {/if}
      </div>

      {#if errors?.logo}
        <div class="alert alert-error mt-3 rounded-2xl">
          <span class="text-sm">{errors.logo}</span>
        </div>
      {/if}

      {#if $information.logo}
        <div class="mt-3 flex items-center gap-3">
          <img
            src={$information.logo}
            alt="Logo principal"
            class="h-12 w-auto object-contain rounded-lg border border-base-300 bg-base-100"
          />
        </div>
      {/if}
    </fieldset>

    {#each logos as logo, i}
      <fieldset class="fieldset w-full min-w-0">
        <legend class="fieldset-legend">Logo {i + 1}</legend>

        <input
          id={`file-${logo}`}
          type="file"
          class="hidden"
          accept="image/png,image/jpeg,image/webp"
          onchange={(e) => handleFileChange(e, logo)}
          disabled={!!uploading?.[logo]}
        />

        <label
          for={`file-${logo}`}
          class={`btn btn-outline rounded-xl w-full justify-between min-w-0 ${uploading?.[logo] ? 'btn-disabled' : ''}`}
        >
          <span class="font-medium">Seleccionar</span>
          <span class="truncate max-w-48 text-xs opacity-70">{labelText(logo)}</span>
        </label>

        <div class="flex items-center justify-between mt-2">
          <span class="text-xs opacity-50">Máx. 2MB · PNG/JPG/WEBP</span>
          {#if $information[logo]}
            <button
              type="button"
              class="btn btn-ghost btn-xs rounded-lg"
              onclick={() => clearLogo(logo)}
              disabled={!!uploading?.[logo]}
            >
              Limpiar
            </button>
          {/if}
        </div>

        {#if errors?.[logo]}
          <div class="alert alert-error mt-3 rounded-2xl">
            <span class="text-sm">{errors[logo]}</span>
          </div>
        {/if}

        {#if $information[logo]}
          <div class="mt-3 flex items-center gap-3">
            <img
              src={$information[logo]}
              alt={"Logo " + (i + 1)}
              class="h-12 w-auto object-contain rounded-lg border border-base-300 bg-base-100"
            />
          </div>
        {/if}
      </fieldset>
    {/each}
  </div>
</section>
