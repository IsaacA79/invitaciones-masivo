<!-- src/routes/(admin)/audit-logs/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  const props = $props();
  const data = $derived.by(() => props.data);

  const logs = $derived.by(() => data?.logs ?? []);
  const count = $derived.by(() => data?.count ?? 0);
  const limit = $derived.by(() => data?.limit ?? 50);
  const offset = $derived.by(() => data?.offset ?? 0);

  const actions = $derived.by(() => data?.actions ?? []);
  const selectedAction = $derived.by(() => data?.action ?? '');
  const from = $derived.by(() => data?.from ?? '');
  const to = $derived.by(() => data?.to ?? '');
  const q = $derived.by(() => data?.q ?? '');

  const actorsById = $derived.by(() => data?.actorsById ?? {});
  const targetsById = $derived.by(() => data?.targetsById ?? {});

  let qInput = $state('');
  let fromInput = $state('');
  let toInput = $state('');
  let actionInput = $state('');

  $effect(() => {
    qInput = q || '';
    fromInput = from || '';
    toInput = to || '';
    actionInput = selectedAction || '';
  });

  // Modal meta
  let showModal = $state(false);
  let modalTitle = $state('');
  let modalJson = $state('');
  let modalSub = $state('');

  const totalPages = $derived.by(() => Math.max(1, Math.ceil((count || 0) / (limit || 1))));
  const currentPage = $derived.by(() => Math.floor((offset || 0) / (limit || 1)) + 1);

  function setQuery(next) {
    const u = new URL($page.url);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    goto(`${u.pathname}?${u.searchParams.toString()}`);
  }

  function applyFilters() {
    setQuery({ q: qInput.trim(), from: fromInput, to: toInput, action: actionInput, offset: 0 });
  }

  function clearFilters() {
    qInput = '';
    fromInput = '';
    toInput = '';
    actionInput = '';
    setQuery({ q: '', from: '', to: '', action: '', offset: 0 });
  }

  function fmtDate(ts) {
    try {
      return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
    } catch {
      return ts;
    }
  }

  function shortId(id) {
    if (!id) return '—';
    const s = String(id);
    return s.length <= 10 ? s : `${s.slice(0, 4)}…${s.slice(-4)}`;
  }

  function actionPill(action) {
    // colores sutiles, no chillones
    if (action === 'user.create') return 'pill pill-ok';
    if (action === 'user.invite') return 'pill pill-purple';
    if (action === 'user.set_role') return 'pill pill-warn';
    if (action === 'user.set_password') return 'pill pill-bad';
    return 'pill pill-neutral';
  }

  function actorLabel(row) {
    const a = actorsById[row.actor_id];
    return a?.email || shortId(row.actor_id);
  }

  function targetLabel(row) {
    // preferimos target_email, si no, por profile map
    const t = targetsById[row.target_id];
    return row.target_email || t?.email || shortId(row.target_id);
  }

  function jsonPretty(v) {
    try {
      return JSON.stringify(v ?? {}, null, 2);
    } catch {
      return String(v ?? '');
    }
  }

  function openRow(row) {
    modalTitle = row.action || 'audit';
    modalSub = `${fmtDate(row.created_at)} • actor: ${actorLabel(row)} • target: ${targetLabel(row)}`;
    modalJson = jsonPretty({
      target_email: row.target_email ?? null,
      ip: row.ip ?? null,
      user_agent: row.user_agent ?? null,
      meta: row.meta ?? {}
    });
    showModal = true;
  }

  function prevPage() {
    setQuery({ offset: Math.max(0, offset - limit) });
  }

  function nextPage() {
    const next = offset + limit;
    if (next >= count) return;
    setQuery({ offset: next });
  }
</script>

<div class="page-wrap">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
      <div class="flex items-start gap-3">
        <div class="ico"><span>🧾</span></div>
        <div>
          <h1 class="text-xl font-semibold leading-tight">Audit logs</h1>
          <p class="text-xs opacity-70">Trazabilidad de acciones administrativas (solo admins).</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <a class="btn btn-sm rounded-2xl btn-ghost" href="/events">Volver</a>
      </div>
    </div>

    <!-- Filters (Glass) -->
    <div class="glass rounded-3xl p-4 sm:p-5 mb-5">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div class="lg:col-span-5">
          <label class="text-xs opacity-70">Buscar</label>
          <input
            class="input input-bordered rounded-2xl w-full bg-base-100/30 text-sm mt-1"
            placeholder="target email / action / UUID"
            bind:value={qInput}
            on:keydown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>

        <div class="lg:col-span-3">
          <label class="text-xs opacity-70">Acción</label>
          <select class="select select-bordered rounded-2xl w-full bg-base-100/30 text-sm mt-1" bind:value={actionInput}>
            <option value="">Todas</option>
            {#each actions as a}
              <option value={a}>{a}</option>
            {/each}
          </select>
        </div>

        <div class="lg:col-span-2">
          <label class="text-xs opacity-70">Desde</label>
          <input class="input input-bordered rounded-2xl w-full bg-base-100/30 text-sm mt-1" type="date" bind:value={fromInput} />
        </div>

        <div class="lg:col-span-2">
          <label class="text-xs opacity-70">Hasta</label>
          <input class="input input-bordered rounded-2xl w-full bg-base-100/30 text-sm mt-1" type="date" bind:value={toInput} />
        </div>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="badge badge-neutral badge-sm">{count} registros</span>
          <span class="opacity-60">Página {currentPage} / {totalPages}</span>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={clearFilters}>
            Limpiar
          </button>
          <button class="btn btn-sm rounded-2xl btn-primary" type="button" on:click={applyFilters}>
            Aplicar
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <section class="glass rounded-3xl overflow-hidden">
      <div class="table-wrap">
        <table class="w-full">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Actor</th>
              <th>Target</th>
              <th class="text-right">Detalle</th>
            </tr>
          </thead>

          <tbody>
            {#if logs.length === 0}
              <tr>
                <td colspan="5" class="py-10 text-center text-sm opacity-70">Sin registros para estos filtros.</td>
              </tr>
            {:else}
              {#each logs as row (row.id)}
                <tr class="row">
                  <td class="nowrap">{fmtDate(row.created_at)}</td>

                  <td>
                    <span class={actionPill(row.action)}>{row.action}</span>
                  </td>

                  <td>
                    <div class="leading-tight">
                      <div class="name">{actorLabel(row)}</div>
                      <div class="sub">{shortId(row.actor_id)}</div>
                    </div>
                  </td>

                  <td>
                    <div class="leading-tight">
                      <div class="name">{targetLabel(row)}</div>
                      <div class="sub">{row.target_id ? shortId(row.target_id) : '—'}</div>
                    </div>
                  </td>

                  <td class="text-right">
                    <button class="btn btn-ghost btn-xs rounded-full" type="button" on:click={() => openRow(row)}>
                      Ver
                    </button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="text-xs opacity-70">
          Página <span class="font-semibold">{currentPage}</span> / {totalPages}
        </div>

        <div class="flex items-center gap-2">
          <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={prevPage} disabled={offset === 0}>
            ← Anterior
          </button>
          <button
            class="btn btn-sm rounded-2xl btn-outline"
            type="button"
            on:click={nextPage}
            disabled={offset + limit >= count}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </section>
  </div>

  <!-- Modal JSON -->
  {#if showModal}
    <div class="modal modal-open">
      <div class="modal-box rounded-3xl max-w-2xl glass">
        <h3 class="text-lg font-semibold">{modalTitle}</h3>
        <p class="text-xs opacity-70 mt-1">{modalSub}</p>

        <div class="mt-4 p-4 rounded-2xl bg-base-100/10 border border-base-200/20">
          <pre class="text-xs whitespace-pre-wrap leading-relaxed">{modalJson}</pre>
        </div>

        <div class="modal-action">
          <button class="btn rounded-2xl" type="button" on:click={() => (showModal = false)}>Cerrar</button>
        </div>
      </div>
      <div class="modal-backdrop" on:click={() => (showModal = false)}></div>
    </div>
  {/if}
</div>

<style>
  .page-wrap {
    background:
      radial-gradient(900px 600px at 15% 10%, rgba(99,102,241,0.20), transparent 60%),
      radial-gradient(700px 500px at 85% 20%, rgba(16,185,129,0.16), transparent 60%),
      radial-gradient(800px 700px at 60% 90%, rgba(236,72,153,0.12), transparent 55%);
  }

  .glass {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  }

  .ico {
    height: 38px;
    width: 38px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
  }

  .pill {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .pill-ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.22); }
  .pill-warn { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.20); }
  .pill-bad { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.20); }
  .pill-purple { background: rgba(168,85,247,0.10); border-color: rgba(168,85,247,0.20); }
  .pill-neutral { opacity: 0.85; }

  .table-wrap {
    overflow-x: auto;
    border-top: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  }

  table { border-collapse: separate; border-spacing: 0; }

  thead th {
    font-size: 11px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 10px 14px;
    opacity: 0.75;
    background: rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  tbody td {
    font-size: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    vertical-align: top;
  }

  .row:hover td { background: rgba(255,255,255,0.03); }
  .nowrap { white-space: nowrap; opacity: 0.85; }
  .name { font-size: 13px; font-weight: 600; }
  .sub { font-size: 11px; opacity: 0.70; }
</style>
