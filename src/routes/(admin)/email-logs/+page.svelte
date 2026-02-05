<!-- src/routes/(admin)/email-logs/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  const props = $props();
  const data = $derived.by(() => props.data);
  const form = $derived.by(() => props.form);

  const events = $derived.by(() => data?.events ?? []);
  const logs = $derived.by(() => data?.logs ?? []);
  const count = $derived.by(() => data?.count ?? 0);

  const selectedEventId = $derived.by(() => data?.selectedEventId ?? '');
  const status = $derived.by(() => data?.status ?? '');
  const q = $derived.by(() => data?.q ?? '');
  const limit = $derived.by(() => data?.limit ?? 50);
  const offset = $derived.by(() => data?.offset ?? 0);

  // input editable (porque q es derived)
  let qInput = $state('');
  $effect(() => {
    qInput = q;
  });

  // Opciones (seleccionados)
  let selectedSubject = $state('');
  let selectedMessage = $state('');

  // Modal error
  let showError = $state(false);
  let errorTitle = $state('');
  let errorText = $state('');

  // Modal retry fallidos
  let retryFailedOpen = $state(false);
  let failedSubject = $state('');
  let failedMessage = $state('');

  const totalPages = $derived.by(() => Math.max(1, Math.ceil((count || 0) / (limit || 1))));
  const currentPage = $derived.by(() => Math.floor((offset || 0) / (limit || 1)) + 1);

  const pageStats = $derived.by(() => {
    const s = { queued: 0, sent: 0, failed: 0 };
    for (const r of logs) {
      if (r?.status === 'sent') s.sent++;
      else if (r?.status === 'failed') s.failed++;
      else s.queued++;
    }
    return s;
  });

  function fmtDate(ts) {
    try {
      return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
    } catch {
      return ts;
    }
  }

  function pill(st) {
    if (st === 'sent') return 'pill pill-ok';
    if (st === 'failed') return 'pill pill-bad';
    return 'pill pill-warn';
  }

  function setQuery(next) {
    const u = new URL($page.url);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    goto(`${u.pathname}?${u.searchParams.toString()}`);
  }

  function changeEvent(e) {
    setQuery({ eventId: e.currentTarget.value, offset: 0 });
  }
  function setStatus(next) {
    setQuery({ status: next, offset: 0 });
  }
  function submitSearch() {
    setQuery({ q: qInput.trim(), offset: 0 });
  }

  function prevPage() {
    setQuery({ offset: Math.max(0, offset - limit) });
  }
  function nextPage() {
    const nextOffset = offset + limit;
    if (nextOffset >= count) return;
    setQuery({ offset: nextOffset });
  }

  function openError(row) {
    errorTitle = `${row?.guests?.name || 'Invitado'}${row?.guests?.email ? ' • ' + row.guests.email : ''}`;
    errorText = row?.error || 'Sin error';
    showError = true;
  }
</script>

<div class="page-wrap">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
      <div class="flex items-start gap-3">
        <div class="ico">
          <span>✉️</span>
        </div>
        <div>
          <h1 class="text-xl font-semibold leading-tight">Email logs</h1>
          <p class="text-xs opacity-70">Historial por evento con filtros y reintentos.</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={() => setQuery({ offset: 0 })}>
          Refrescar
        </button>
        <a class="btn btn-sm rounded-2xl btn-ghost" href="/">Volver</a>
      </div>
    </div>

    {#if form?.message}
      <div class="glass alert alert-error rounded-3xl mb-4">
        <span class="text-sm">{form.message}</span>
      </div>
    {:else if form?.ok}
      <div class="glass alert alert-success rounded-3xl mb-4">
        <span class="text-sm">
          Reintento: elegibles {form.retry?.eligible ?? 0}, enviados {form.retry?.sent ?? 0}, fallidos {form.retry?.failed ?? 0}.
        </span>
      </div>
    {/if}

    <!-- Controls (Clean + Glass) -->
    <div class="glass rounded-3xl p-4 sm:p-5 mb-5">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <!-- Evento -->
        <div class="lg:col-span-4">
          <label class="text-xs opacity-70">Evento</label>
          <select class="select select-bordered w-full rounded-2xl mt-1 bg-base-100/30" value={selectedEventId} on:change={changeEvent}>
            {#each events as ev (ev.id)}
              <option value={ev.id}>{ev.title}{ev.approved ? '' : ' (pendiente)'}</option>
            {/each}
          </select>
        </div>

        <!-- Buscar -->
        <div class="lg:col-span-5">
          <label class="text-xs opacity-70">Buscar invitado (email o nombre)</label>
          <div class="join w-full mt-1">
            <input
              class="input input-bordered join-item w-full rounded-l-2xl bg-base-100/30 text-sm"
              placeholder="Ej: ana@ / Ana"
              bind:value={qInput}
              on:keydown={(e) => e.key === 'Enter' && submitSearch()}
            />
            <button class="btn btn-primary btn-sm join-item rounded-r-2xl" type="button" on:click={submitSearch}>Buscar</button>
          </div>

          <div class="mt-2 flex items-center gap-2">
            {#if q}
              <button class="btn btn-xs rounded-full btn-ghost" type="button" on:click={() => setQuery({ q: '', offset: 0 })}>
                Limpiar
              </button>
            {/if}
            <span class="text-xs opacity-60">
              Página: <span class="font-semibold">{currentPage}</span> / {totalPages}
            </span>
          </div>
        </div>

        <!-- Status pills -->
        <div class="lg:col-span-3">
          <label class="text-xs opacity-70">Estado</label>
          <div class="seg mt-1">
            <button type="button" class={"seg-btn " + (status === '' ? 'active' : '')} on:click={() => setStatus('')}>T</button>
            <button type="button" class={"seg-btn " + (status === 'queued' ? 'active' : '')} on:click={() => setStatus('queued')}>C</button>
            <button type="button" class={"seg-btn " + (status === 'sent' ? 'active' : '')} on:click={() => setStatus('sent')}>E</button>
            <button type="button" class={"seg-btn " + (status === 'failed' ? 'active' : '')} on:click={() => setStatus('failed')}>X</button>
          </div>
        </div>
      </div>

      <!-- Mini stats + actions -->
      <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="badge badge-neutral badge-sm">{count} logs</span>
          <span class="pill pill-warn">fila {pageStats.queued}</span>
          <span class="pill pill-ok">enviados {pageStats.sent}</span>
          <span class="pill pill-bad">error {pageStats.failed}</span>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={() => (retryFailedOpen = true)}>
            Reintentar fallidos
          </button>
        </div>
      </div>
    </div>

    <!-- Table (Glass + clean) -->
    <div class="glass rounded-3xl p-0 overflow-hidden">
      <form method="POST" action="?/retrySelected" use:enhance class="p-4 sm:p-5">
        <input type="hidden" name="eventId" value={selectedEventId} />

        <details class="mb-3 rounded-2xl border border-base-200/20 bg-base-100/10">
          <summary class="cursor-pointer select-none px-3 py-2 text-xs opacity-80">
            Opciones para “Reintentar seleccionados”
          </summary>
          <div class="px-3 pb-3 pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              class="input input-bordered rounded-2xl bg-base-100/30 text-sm"
              name="subject"
              placeholder="(opcional) Asunto"
              bind:value={selectedSubject}
            />
            <input
              class="input input-bordered rounded-2xl bg-base-100/30 text-sm"
              name="message"
              placeholder="(opcional) Mensaje corto"
              bind:value={selectedMessage}
            />
          </div>
        </details>

        <div class="table-wrap">
          <table class="w-full">
            <thead>
              <tr>
                <th class="w-10"></th>
                <th>Fecha</th>
                <th>Invitado</th>
                <th>Estado</th>
                <th class="hidden sm:table-cell">Proveedor</th>
                <th class="text-right">Detalle</th>
              </tr>
            </thead>

            <tbody>
              {#if logs.length === 0}
                <tr>
                  <td colspan="6" class="py-10 text-center text-sm opacity-70">Sin registros para este filtro.</td>
                </tr>
              {:else}
                {#each logs as row (row.id)}
                  <tr class={"row " + (row.status === 'failed' ? 'row-failed' : '')}>
                    <td>
                      <input class="checkbox checkbox-xs" type="checkbox" name="invitationIds" value={row.invitation_id} />
                    </td>

                    <td class="nowrap">{fmtDate(row.created_at)}</td>

                    <td>
                      <div class="leading-tight">
                        <div class="name">{row.guests?.name || '—'}</div>
                        <div class="sub">{row.guests?.email || '—'}</div>
                        {#if row.guests?.department}
                          <div class="sub">{row.guests.department}</div>
                        {/if}
                      </div>
                    </td>

                    <td>
                      <span class={pill(row.status)}>{row.status}</span>
                    </td>

                    <td class="hidden sm:table-cell">
                      <span class="sub">{row.provider || 'smtp'}</span>
                    </td>

                    <td class="text-right">
                      {#if row.error}
                        <button class="btn btn-ghost btn-xs rounded-full" type="button" on:click={() => openError(row)}>
                          Ver
                        </button>
                      {:else}
                        <span class="sub">—</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="text-xs opacity-70">
            Página <span class="font-semibold">{currentPage}</span> / {totalPages}
          </div>

          <div class="flex items-center gap-2">
            <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={prevPage} disabled={offset === 0}>
              ← Anterior
            </button>
            <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={nextPage} disabled={offset + limit >= count}>
              Siguiente →
            </button>
            <button class="btn btn-sm rounded-2xl btn-primary" type="submit">
              Reintentar seleccionados
            </button>
          </div>
        </div>

        <!-- <p class="mt-2 text-xs opacity-60">
          ✅ UI limpia: no mostramos IDs largos. Solo acciones y datos útiles.
        </p> -->
      </form>
    </div>
  </div>

  <!-- Modal Error -->
  {#if showError}
    <div class="modal modal-open">
      <div class="modal-box rounded-3xl max-w-2xl glass">
        <h3 class="text-lg font-semibold">Detalle del error</h3>
        <p class="text-xs opacity-70 mt-1">{errorTitle}</p>

        <div class="mt-4 p-4 rounded-2xl bg-base-100/10 border border-base-200/20">
          <pre class="text-xs whitespace-pre-wrap leading-relaxed">{errorText}</pre>
        </div>

        <div class="modal-action">
          <button class="btn rounded-2xl" type="button" on:click={() => (showError = false)}>Cerrar</button>
        </div>
      </div>
      <div class="modal-backdrop" on:click={() => (showError = false)}></div>
    </div>
  {/if}

  <!-- Modal Retry Failed -->
  {#if retryFailedOpen}
    <div class="modal modal-open">
      <div class="modal-box rounded-3xl max-w-xl glass">
        <h3 class="text-lg font-semibold">Reintentar fallidos</h3>
        <p class="text-xs opacity-70 mt-1">Reintenta invitaciones cuyo último log sea <span class="font-semibold">failed</span>.</p>

        <form method="POST" action="?/retryFailed" use:enhance class="mt-4 space-y-2">
          <input type="hidden" name="eventId" value={selectedEventId} />
          <input type="hidden" name="limit" value="200" />

          <input class="input input-bordered rounded-2xl w-full bg-base-100/30 text-sm" name="subject" placeholder="(opcional) Asunto" bind:value={failedSubject} />
          <textarea class="textarea textarea-bordered rounded-2xl w-full bg-base-100/30 text-sm" name="message" rows="3" placeholder="(opcional) Mensaje" bind:value={failedMessage}></textarea>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button class="btn btn-ghost rounded-2xl" type="button" on:click={() => (retryFailedOpen = false)}>Cancelar</button>
            <button class="btn btn-primary rounded-2xl" type="submit">Reintentar</button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" on:click={() => (retryFailedOpen = false)}></div>
    </div>
  {/if}
</div>

<style>
  /* Fondo limpio + glass */
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

  /* Segmented control minimal */
  .seg {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .seg-btn {
    font-size: 12px;
    padding: 8px 10px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    opacity: 0.85;
    transition: 150ms ease;
  }
  .seg-btn:hover { opacity: 1; background: rgba(255,255,255,0.06); }
  .seg-btn.active {
    opacity: 1;
    background: rgba(99,102,241,0.18);
    border-color: rgba(99,102,241,0.28);
  }

  /* Pills */
  .pill {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .pill-ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.22); }
  .pill-bad { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.22); }
  .pill-warn { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.20); }

  /* Tabla ultra clean */
  .table-wrap {
    overflow-x: auto;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  }

  table { border-collapse: separate; border-spacing: 0; }
  thead th {
    font-size: 11px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    padding: 10px 12px;
    opacity: 0.75;
    background: rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    position: sticky;
    top: 0;
    z-index: 1;
  }
  tbody td {
    font-size: 12px;
    padding: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    vertical-align: top;
  }
  .row:hover td { background: rgba(255,255,255,0.03); }
  .row-failed td { background: rgba(239,68,68,0.05); }
  .nowrap { white-space: nowrap; opacity: 0.85; }
  .name { font-size: 13px; font-weight: 600; }
  .sub { font-size: 11px; opacity: 0.70; }
</style>
