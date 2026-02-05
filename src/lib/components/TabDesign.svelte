<script>
  // src/lib/components/TabDesign.svelte
  import { information, DEFAULT_FONTS } from '$lib/stores/event.js';
  import { currentEventId } from '$lib/stores/current.js';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  // ✅ eventId robusto: URL primero, fallback store
  const eventId = $derived.by(() =>
    String($page.params.eventId || $page.params.id || $currentEventId || '').trim()
  );

  // ─────────────────────────────────────────────────────────────
  // Templates
  // ─────────────────────────────────────────────────────────────
  const TEMPLATES = [
    { id: 'clasico', label: 'Clásica', hint: 'Diseño tradicional, limpio y corporativo.' },
    { id: 'moderno', label: 'Moderna', hint: 'Glass + premium, tarjetas y “pills”.' }
  ];

  const templateKey = $derived.by(() =>
    String($information?.design?.template || 'clasico').toLowerCase()
  );

  function patchDesign(patch) {
    information.update((cur) => ({
      ...(cur ?? {}),
      design: { ...(cur?.design ?? {}), ...(patch ?? {}) }
    }));
  }

  // ✅ Asegura defaults sin mutación profunda
  $effect(() => {
    const d = $information?.design ?? {};

    const needTemplate =
      !d.template || !['clasico', 'moderno'].includes(String(d.template).toLowerCase());
    const needFonts = !Array.isArray(d.availableFonts) || d.availableFonts.length === 0;
    const needTitleFont = !d.titleFontFamily;

    const patch = {};

    if (needTemplate) patch.template = 'clasico';
    if (needFonts) patch.availableFonts = DEFAULT_FONTS;
    if (needTitleFont) patch.titleFontFamily = d.fontFamily || 'inherit';

    if (d.bgMode !== 'image' && d.bgMode !== 'color') patch.bgMode = d.bgImage ? 'image' : 'color';

    const numDefaults = {
      bgScale: 1.35,
      bgOpacity: 1,
      textOpacity: 1,
      bgWidth: 1280,
      bgHeight: 1600,
      bgX: 0,
      bgY: 0,
      titleX: 0,
      titleY: 0,
      dateX: 0,
      dateY: 0,
      timeX: 0,
      timeY: 0,
      descX: 0,
      descY: 0,
      webX: 0,
      webY: 0,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      shadowBlur: 3,
      borderRadius: 8,
      borderWidth: 6
    };

    for (const [k, v] of Object.entries(numDefaults)) {
      if (!Number.isFinite(+d?.[k])) patch[k] = v;
    }

    if (Object.keys(patch).length) patchDesign(patch);
  });

  function setTemplate(id) {
    const key = String(id || '').toLowerCase();
    if (!['clasico', 'moderno'].includes(key)) return;
    patchDesign({ template: key });
  }

  // ─────────────────────────────────────────────────────────────
  // Background upload (Supabase Storage via /api/events/[eventId]/assets)
  // ─────────────────────────────────────────────────────────────
  const MAX_BYTES = 2 * 1024 * 1024; // ✅ debe empatar con el server
  const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

  let bgUploading = $state(false);
  let bgError = $state('');
  let bgFileName = $state('');
  let bgObjectUrl = $state('');

  function validateImage(file) {
    if (!ALLOWED.has(file.type)) return 'Tipo no permitido (PNG/JPG/WEBP).';
    if (file.size <= 0) return 'Archivo vacío.';
    if (file.size > MAX_BYTES) return `La imagen excede ${(MAX_BYTES / (1024 * 1024)).toFixed(0)}MB.`;
    return '';
  }

  function revokeBgObjectUrl() {
    if (!browser) return;
    if (bgObjectUrl) {
      URL.revokeObjectURL(bgObjectUrl);
      bgObjectUrl = '';
    }
  }

  async function uploadAsset(slot, file) {
    if (!eventId) throw new Error('No hay evento seleccionado');

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
    if (!eventId) return;

    const res = await fetch(`/api/events/${eventId}/assets`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ slot })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error || `No se pudo eliminar (${res.status})`);
  }

  async function onBgFile(e) {
    bgError = '';
    const input = e.currentTarget;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;

    bgFileName = f.name;

    const err = validateImage(f);
    if (err) {
      bgError = err;
      bgFileName = '';
      return;
    }

    const prev = $information?.design?.bgImage || '';
    bgUploading = true;

    // preview inmediato
    if (browser) {
      revokeBgObjectUrl();
      bgObjectUrl = URL.createObjectURL(f);
      patchDesign({ bgMode: 'image', bgImage: bgObjectUrl });
    } else {
      patchDesign({ bgMode: 'image' });
    }

    try {
      // ✅ sube a Storage (NO base64)
      const { url } = await uploadAsset('bgImage', f);

      // ✅ guarda URL final
      patchDesign({ bgMode: 'image', bgImage: url });

      // limpia preview
      revokeBgObjectUrl();
      bgFileName = '';
    } catch (ex) {
      // revierte
      revokeBgObjectUrl();
      patchDesign({ bgImage: prev, bgMode: prev ? 'image' : 'color' });
      bgError = ex?.message || 'Error al subir imagen';
    } finally {
      bgUploading = false;
    }
  }

  async function clearBg() {
    bgError = '';
    const prev = $information?.design?.bgImage || '';

    // UI optimista
    revokeBgObjectUrl();
    patchDesign({ bgImage: '', bgMode: 'color' });

    try {
      await deleteAsset('bgImage');
    } catch (ex) {
      // rollback
      patchDesign({ bgImage: prev, bgMode: prev ? 'image' : 'color' });
      bgError = ex?.message || 'No se pudo eliminar el fondo';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Fonts
  // ─────────────────────────────────────────────────────────────
  function safeFontName(name) {
    return (
      String(name || '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .slice(0, 60) || 'CustomFont'
    );
  }

  function applyUploadedFont(name, url) {
    if (!browser) return;

    const safeName = safeFontName(name);
    const styleId = `font-${safeName.replace(/\s+/g, '-').toLowerCase()}`;

    let el = document.getElementById(styleId);
    const css = `
@font-face{
  font-family:'${safeName}';
  src: url('${url}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;

    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = css;

    const current = $information?.design?.availableFonts ?? DEFAULT_FONTS;
    const nextFonts = Array.from(new Set([...current, safeName]));
    patchDesign({ availableFonts: nextFonts, titleFontFamily: safeName });
  }

  async function onFontFile(e) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!f) return;

    try {
      const fd = new FormData();
      fd.append('font', f);

      const res = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });

      if (res.ok) {
        const { url, name } = await res.json();
        applyUploadedFont(name || f.name.replace(/\.[^.]+$/, ''), url);
        return;
      }
    } catch {
      // fallback session-only
    }

    if (browser) {
      const url = URL.createObjectURL(f);
      applyUploadedFont(f.name.replace(/\.[^.]+$/, ''), url);
    }
  }

  $effect(() => {
    if (!browser) return;
    const font = $information?.design?.titleFontFamily || 'inherit';
    document.documentElement.style.setProperty('--title-font', font);
  });
</script>

<section class="bg-base-100/60 backdrop-blur border border-base-300 rounded-3xl p-6">
  <div class="grid grid-cols-2 gap-4">

    <!-- ✅ Plantilla -->
    <fieldset class="fieldset w-full col-span-2">
      <legend class="fieldset-legend">Plantilla</legend>

      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="join w-full sm:w-auto">
          <button
            type="button"
            class={`btn btn-sm join-item rounded-2xl ${templateKey === 'clasico' ? 'btn-neutral text-white' : 'btn-ghost'}`}
            onclick={() => setTemplate('clasico')}
          >
            Clásica
          </button>

          <button
            type="button"
            class={`btn btn-sm join-item rounded-2xl ${templateKey === 'moderno' ? 'btn-neutral text-white' : 'btn-ghost'}`}
            onclick={() => setTemplate('moderno')}
          >
            Moderna
          </button>
        </div>

        <div class="text-xs opacity-70">
          {TEMPLATES.find((t) => t.id === templateKey)?.hint}
        </div>
      </div>
    </fieldset>

    <!-- ✅ Imagen de fondo (Storage) -->
    <fieldset class="fieldset w-full col-span-2">
      <legend class="fieldset-legend">Imagen de fondo</legend>

      <input
        id="bg-file"
        type="file"
        class="hidden"
        accept="image/png,image/jpeg,image/webp"
        onchange={onBgFile}
        disabled={bgUploading}
      />

      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <label
          for="bg-file"
          class={`btn btn-outline btn-sm rounded-2xl justify-between min-w-0 ${bgUploading ? 'btn-disabled' : ''}`}
          title="Subir imagen de fondo"
        >
          <span class="font-medium">{bgUploading ? 'Subiendo…' : 'Subir'}</span>
          <span class="truncate max-w-48 text-xs opacity-70">{bgFileName || 'PNG/JPG/WEBP (máx 2MB)'}</span>
        </label>

        {#if $information?.design?.bgImage}
          <button type="button" class="btn btn-ghost btn-sm rounded-2xl" onclick={clearBg} disabled={bgUploading}>
            Quitar fondo
          </button>
        {/if}
      </div>

      {#if bgError}
        <div class="alert alert-error mt-3 rounded-2xl">
          <span class="text-sm">{bgError}</span>
        </div>
      {/if}

      {#if $information?.design?.bgImage}
        <div class="mt-3 flex items-center gap-3 min-w-0">
          <img
            src={$information.design.bgImage}
            alt="Fondo"
            class="h-14 w-24 object-cover rounded-2xl border border-base-300"
          />
          <div class="text-xs opacity-70 truncate min-w-0">{$information.design.bgImage}</div>
        </div>
      {/if}
    </fieldset>

    <!-- Tamaño del fondo -->
    <fieldset class="fieldset w-full col-span-2">
      <legend class="fieldset-legend">Tamaño del fondo (px)</legend>

      <div class="grid grid-cols-2 gap-4">
        <label class="text-sm">
          Ancho
          <div class="flex items-center gap-2">
            <input type="range" min="320" max="2560" step="1" bind:value={$information.design.bgWidth} class="w-full" />
            <input type="number" min="320" max="2560" step="1" class="input w-28 h-8" bind:value={$information.design.bgWidth} />
          </div>
        </label>

        <label class="text-sm">
          Alto
          <div class="flex items-center gap-2">
            <input type="range" min="480" max="3000" step="1" bind:value={$information.design.bgHeight} class="w-full" />
            <input type="number" min="480" max="3000" step="1" class="input w-28 h-8" bind:value={$information.design.bgHeight} />
          </div>
        </label>
      </div>
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Opacidad del fondo</legend>
      <input type="range" min="0" max="1" step="0.01" bind:value={$information.design.bgOpacity} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Opacidad de texto</legend>
      <input type="range" min="0" max="1" step="0.01" bind:value={$information.design.textOpacity} />
    </fieldset>

    <!-- Posiciones -->
    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Título (Y)</legend>
      <input type="range" min="-700" max="700" step="1" bind:value={$information.design.titleY} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Título (X)</legend>
      <input type="range" min="-300" max="300" step="1" bind:value={$information.design.titleX} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Fecha (Y)</legend>
      <input type="range" min="-1000" max="600" step="1" bind:value={$information.design.dateY} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Fecha (X)</legend>
      <input type="range" min="-200" max="600" step="1" bind:value={$information.design.dateX} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Hora (Y)</legend>
      <input type="range" min="-700" max="300" step="1" bind:value={$information.design.timeY} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Hora (X)</legend>
      <input type="range" min="-700" max="300" step="1" bind:value={$information.design.timeX} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Descripción (Y)</legend>
      <input type="range" min="-700" max="300" step="1" bind:value={$information.design.descY} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Descripción (X)</legend>
      <input type="range" min="-200" max="250" step="1" bind:value={$information.design.descX} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Web (Y)</legend>
      <input type="range" min="-300" max="300" step="1" bind:value={$information.design.webY} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Web (X)</legend>
      <input type="range" min="-300" max="300" step="1" bind:value={$information.design.webX} />
    </fieldset>

    <!-- Sombra -->
    <fieldset class="fieldset w-full col-span-2">
      <legend class="fieldset-legend">Sombra de texto</legend>

      <label class="label cursor-pointer flex items-center gap-2">
        <input type="checkbox" class="toggle" bind:checked={$information.design.shadowEnabled} />
        <span>Activar</span>
      </label>

      <div class="grid grid-cols-4 gap-3 mt-2">
        <label class="text-sm">
          <span>Color</span>
          <input type="color" class="mt-1 input h-16 p-1" bind:value={$information.design.shadowColor} />
        </label>

        <div class="grid col-span-3 grid-cols-2 gap-x-3 gap-y-1">
          <label class="text-sm">
            Offset X
            <input type="range" min="-20" max="20" step="1" bind:value={$information.design.shadowOffsetX} />
          </label>

          <label class="text-sm">
            Offset Y
            <input type="range" min="-20" max="20" step="1" bind:value={$information.design.shadowOffsetY} />
          </label>

          <label class="text-sm">
            Blur
            <input type="range" min="0" max="20" step="1" bind:value={$information.design.shadowBlur} />
          </label>
        </div>
      </div>
    </fieldset>

    <!-- Borde -->
    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Radio de borde</legend>
      <input type="range" min="0" max="30" step="1" bind:value={$information.design.borderRadius} />
    </fieldset>

    <fieldset class="fieldset w-full">
      <legend class="fieldset-legend">Grosor de borde</legend>
      <input type="range" min="0" max="16" step="1" bind:value={$information.design.borderWidth} />
    </fieldset>

    <!-- Tipografía -->
    <fieldset class="fieldset w-full col-span-2">
      <legend class="fieldset-legend">Tipografía del título</legend>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="text-sm">
          Seleccionar fuente
          <select class="select w-full" bind:value={$information.design.titleFontFamily}>
            {#each ($information.design.availableFonts ?? DEFAULT_FONTS) as f}
              <option value={f} style={`font-family:${f}`}>{f}</option>
            {/each}
          </select>
        </label>

        <label class="text-sm">
          Cargar fuente personalizada (.ttf, .otf, .woff, .woff2)
          <input type="file" accept=".ttf,.otf,.woff,.woff2" class="file-input w-full" onchange={onFontFile} />
          <span class="label text-xs opacity-70">
            Si tu backend implementa <code>/api/fonts/upload</code> la fuente se guardará; si no, solo aplica en esta sesión.
          </span>
        </label>
      </div>
    </fieldset>

  </div>
</section>
