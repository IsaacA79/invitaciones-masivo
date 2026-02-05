<script>
  import { invalidateAll } from '$app/navigation';
  import { currentEventId } from '$lib/stores/current.js';
  import { resetEventState } from '$lib/stores/event.js';

  const props = $props();
  const data = $derived.by(() => props.data);

  const role = $derived.by(() => data?.role || 'viewer');
  const isAdmin = $derived.by(() => role === 'admin');
  const canHide = $derived.by(() => role === 'admin' || role === 'capturista');

  function beforeLogout() {
    $currentEventId = '';
    resetEventState?.();
  }

  function shortId(id) {
    if (!id) return '';
    return `${id.slice(0, 8)}…${id.slice(-6)}`;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  // ✅ UI state
  let q = $state('');
  let hideBusy = $state({});      // { [eventId]: true }
  let hideError = $state('');
  let locallyHidden = $state({}); // { [eventId]: true } (optimista)

  function setHideBusy(id, v) {
    hideBusy = { ...hideBusy, [id]: !!v };
  }

  function markHiddenLocal(id) {
    locallyHidden = { ...locallyHidden, [id]: true };
  }

  const eventsSorted = $derived.by(() => {
    const arr = Array.isArray(data?.events) ? [...data.events] : [];

    // Si tu server ya manda hidden, filtramos también aquí
    const filtered = arr.filter((ev) => !ev?.hidden && !locallyHidden?.[ev?.id]);

    filtered.sort(
      (a, b) =>
        new Date(b?.created_at || 0).getTime() -
        new Date(a?.created_at || 0).getTime()
    );

    return filtered;
  });

  const filtered = $derived.by(() => {
    const term = q.trim().toLowerCase();
    if (!term) return eventsSorted;

    return eventsSorted.filter((ev) => {
      const title = String(ev?.title || '').toLowerCase();
      const id = String(ev?.id || '').toLowerCase();
      const owner = String(ev?.owner_id || '').toLowerCase();
      return title.includes(term) || id.includes(term) || (isAdmin && owner.includes(term));
    });
  });

  async function onHide(evId) {
    hideError = '';
    if (!canHide) return;
    if (!evId || hideBusy?.[evId]) return;

    const ok = confirm('¿Ocultar este evento? Ya no aparecerá para nadie.');
    if (!ok) return;

    setHideBusy(evId, true);

    try {
      const res = await fetch(`/api/events/${evId}/hide`, {
        method: 'POST',
        credentials: 'include'
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || `Error (${res.status})`);

      // ✅ optimista: lo quitamos de la lista inmediatamente
      markHiddenLocal(evId);

      // ✅ refresca datos SSR (opcional pero recomendable)
      await invalidateAll();
    } catch (e) {
      hideError = e?.message || 'No se pudo ocultar el evento';
    } finally {
      setHideBusy(evId, false);
    }
  }
</script>

<div class="page">
  <!-- Background immersive -->
  <div class="bgfx" aria-hidden="true">
    <div class="bg-base"></div>
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
    <div class="gridfx"></div>
    <div class="vignette"></div>
  </div>

  <div class="content max-w-6xl mx-auto py-8 sm:py-12 px-4">
    <!-- Encabezado -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-in">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">Eventos</h2>
          <span class="pill">{isAdmin ? 'Admin' : 'Owner'}</span>
        </div>

        <p class="text-sm text-zinc-400 mt-1">
          {#if isAdmin}
            Vista administrativa: todos los proyectos.
          {:else}
            Vista por propietario: únicamente tus proyectos.
          {/if}
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <a class="btn btn-primary rounded-2xl depth" href="/events/new">Nuevo evento</a>

        <form method="POST" action="/auth/logout">
          <button type="submit" class="btn btn-ghost rounded-2xl depth" onclick={beforeLogout}>
            Salir
          </button>
        </form>
      </div>
    </div>

    <!-- Toolbar (glass) -->
    <div class="mt-6 glass-card p-4 sm:p-5 animate-in delay-1">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-zinc-300">
          Total: <span class="font-semibold text-zinc-100">{filtered.length}</span>
          <span class="text-zinc-500"> · </span>
          Orden: <span class="text-zinc-100 font-semibold">Más reciente</span>
        </div>

        <div class="w-full sm:w-105">
          <div class="search-wrap">
            <span class="search-dot"></span>
            <input
                class="search-input"
                placeholder={isAdmin ? 'Buscar por título, ID u owner…' : 'Buscar por título o ID…'}
                bind:value={q}
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                inputmode="search"
              />
          </div>
        </div>
      </div>
    </div>

    {#if hideError}
      <div class="mt-4 alert alert-error rounded-2xl">
        <span class="text-sm">{hideError}</span>
      </div>
    {/if}

    {#if !data?.events?.length}
      <div class="mt-6 glass-card p-6 text-zinc-300 animate-in delay-2">
        No hay eventos aún.
        <div class="mt-4">
          <a class="btn btn-primary rounded-2xl depth" href="/events/new">Crear primer evento</a>
        </div>
      </div>
    {:else if filtered.length === 0}
      <div class="mt-6 glass-card p-6 text-zinc-300 animate-in delay-2">
        No se encontraron resultados para <span class="font-semibold text-zinc-100">"{q.trim()}"</span>.
      </div>
    {:else}
      <!-- Desktop: table glass -->
      <div class="mt-6 hidden md:block animate-in delay-2">
        <div class="glass-sheet overflow-hidden">
          <div class="px-4 sm:px-6 py-4">
            <div class="overflow-x-auto rounded-2xl border border-white/10 bg-black/15">
              <table class="w-full table-auto text-sm">
                <thead class="sticky top-0 z-10 bg-black/35 backdrop-blur border-b border-white/10">
                  <tr class="text-zinc-300">
                    <th class="text-left font-medium px-6 py-4">Evento</th>
                    <th class="text-left font-medium px-6 py-4 w-47.5 whitespace-nowrap">Creado</th>
                    <th class="text-right font-medium px-6 py-4 w-55 whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-white/10">
                  {#each filtered as ev (ev.id)}
                    <tr class="rowfx">
                      <td class="px-6 py-5 align-top">
                        <div class="min-w-0">
                          <div class="font-semibold text-zinc-100 truncate">
                            {ev.title || 'Evento'}
                          </div>

                          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span class="badge badge-outline font-mono text-zinc-300 border-white/10 bg-white/5">
                              ID: {shortId(ev.id)}
                            </span>

                            {#if isAdmin}
                              <span class="badge badge-outline font-mono text-zinc-300 border-white/10 bg-white/5">
                                Owner: {shortId(ev.owner_id)}
                              </span>
                            {/if}
                          </div>
                        </div>
                      </td>

                      <td class="px-6 py-11 align-top">
                        <span class="text-sm text-zinc-300 whitespace-nowrap">
                          {fmtDate(ev.created_at)}
                        </span>
                      </td>

                      <td class="px-6 py-8 align-top">
                        <div class="ml-auto flex flex-row gap-2 items-center justify-end">
                          <a class="btn btn-xs rounded-2xl depth" href={`/events/${ev.id}/builder`}>
                            Abrir
                          </a>

                          <a class="btn btn-xs btn-outline rounded-xl depth" href={`/events/${ev.id}/logs`}>
                            Historial
                          </a>

                          {#if canHide}
                            <button
                              type="button"
                              class="btn btn-xs btn-outline rounded-xl depth"
                              onclick={() => onHide(ev.id)}
                              disabled={!!hideBusy?.[ev.id]}
                              title="Ocultar evento"
                            >
                              {hideBusy?.[ev.id] ? 'Ocultando…' : 'Ocultar'}
                            </button>
                          {/if}
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <div class="mt-3 text-xs text-zinc-500 px-1">
              Tip: busca por título, ID y (admin) owner.
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile: cards -->
      <div class="mt-6 grid gap-3 md:hidden animate-in delay-2">
        {#each filtered as ev (ev.id)}
          <div class="glass-card p-4 cardfx">
            <div class="min-w-0">
              <div class="text-base font-semibold text-zinc-100 truncate">{ev.title || 'Evento'}</div>

              <div class="mt-2 grid grid-cols-1 gap-2 text-xs text-zinc-400">
                <div class="flex items-center justify-between gap-3">
                  <span class="opacity-70">ID</span>
                  <span class="font-mono text-zinc-200">{shortId(ev.id)}</span>
                </div>

                {#if isAdmin}
                  <div class="flex items-center justify-between gap-3">
                    <span class="opacity-70">Owner</span>
                    <span class="font-mono text-zinc-200">{shortId(ev.owner_id)}</span>
                  </div>
                {/if}

                <div class="flex items-center justify-between gap-3">
                  <span class="opacity-70">Creado</span>
                  <span class="text-zinc-200">{fmtDate(ev.created_at)}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-col sm:flex-row gap-2">
              <a class="btn btn-sm rounded-2xl depth w-full sm:w-auto" href={`/events/${ev.id}/builder`}>
                Abrir editor
              </a>

              <a class="btn btn-sm btn-outline rounded-2xl depth w-full sm:w-auto" href={`/events/${ev.id}/logs`}>
                Historial
              </a>

              {#if canHide}
                <button
                  type="button"
                  class="btn btn-sm btn-outline rounded-2xl depth w-full sm:w-auto"
                  onclick={() => onHide(ev.id)}
                  disabled={!!hideBusy?.[ev.id]}
                >
                  {hideBusy?.[ev.id] ? 'Ocultando…' : 'Ocultar'}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* (tu CSS original igual) */
  .page { position: relative; min-height: calc(100dvh - 7rem); }
  .bgfx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .bg-base { position: absolute; inset: 0; background: #05070f; }
  .blob { position: absolute; border-radius: 999px; filter: blur(48px); opacity: .35; }
  .blob-a { top: -7rem; left: -7rem; width: 26rem; height: 26rem;
    background: linear-gradient(135deg, rgba(99,102,241,.55), rgba(34,211,238,.25), rgba(16,185,129,.18)); }
  .blob-b { bottom: -8rem; right: -8rem; width: 30rem; height: 30rem;
    background: linear-gradient(135deg, rgba(236,72,153,.35), rgba(168,85,247,.22), rgba(56,189,248,.14)); }
  .blob-c { left: 50%; top: 45%; transform: translate(-50%,-50%); width: 34rem; height: 34rem;
    background: linear-gradient(135deg, rgba(255,255,255,.10), transparent); opacity: .22; }

  .gridfx {
    position: absolute; inset: 0; opacity: .08;
    background-image:
      linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,.35) 1px, transparent 1px);
    background-size: 72px 72px;
  }

  .vignette { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.25), transparent, rgba(0,0,0,.55)); }
  .content { position: relative; z-index: 1; }

  .glass-card {
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow: 0 26px 70px -55px rgba(0,0,0,0.9);
  }

  .glass-sheet {
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.05);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow: 0 34px 90px -60px rgba(0,0,0,0.95);
  }

  .pill {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: rgba(244,244,245,0.9);
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    padding: 10px 12px;
    transition: 160ms ease;
  }
  .search-wrap:focus-within {
    border-color: rgba(34,211,238,0.35);
    box-shadow: 0 0 0 4px rgba(34,211,238,0.10);
  }
  .search-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgba(34,211,238,0.35);
    box-shadow: 0 0 0 4px rgba(34,211,238,0.10);
  }
  .search-input {
    width: 100%;
    background: transparent;
    outline: none;
    color: rgba(244,244,245,0.95);
    font-size: 14px;
  }
  .search-input::placeholder { color: rgba(161,161,170,0.75); }

  .depth { transition: transform 160ms ease, opacity 160ms ease; }
  .depth:hover { transform: translateY(-1px); }
  .depth:active { transform: translateY(1px); opacity: .92; }

  .rowfx { transition: background-color 160ms ease; }
  .rowfx:hover { background: rgba(255,255,255,0.03); }

  .cardfx { transition: transform 160ms ease, background-color 160ms ease; }
  .cardfx:hover { transform: translateY(-1px); background: rgba(255,255,255,0.07); }
  .cardfx:active { transform: translateY(1px); }

  .animate-in { animation: enter 520ms cubic-bezier(.2,.85,.2,1) both; }
  .delay-1 { animation-delay: 70ms; }
  .delay-2 { animation-delay: 140ms; }

  @keyframes enter {
    from { opacity: 0; transform: translateY(12px) scale(0.99); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-in, .depth, .cardfx, .rowfx { animation: none !important; transition: none !important; }
  }
</style>
