<script>
  // src/routes/(admin)/events/[eventId]/logs/+page.svelte
  const { data } = $props();

  function fmt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function badgeClass(status) {
    if (status === 'sent') return 'badge-success';
    if (status === 'failed') return 'badge-error';
    if (status === 'queued') return 'badge-warning';
    return 'badge-ghost';
  }
</script>

<div class="max-w-6xl mx-auto py-10">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <div class="min-w-0">
      <h2 class="text-3xl font-semibold text-zinc-100">Historial de correos</h2>
      <p class="text-zinc-300 mt-1 truncate">{data?.event?.title || 'Evento'}</p>
    </div>

    <a class="btn rounded-2xl" href={`/events/${data?.event?.id}/builder`}>Volver al editor</a>
  </div>

  {#if !(data?.logs || []).length}
    <div class="alert alert-info mt-6 rounded-2xl">Aún no hay correos registrados para este evento.</div>
  {:else}
    <div class="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/15">
      <table class="table table-zebra w-full">
        <thead class="bg-black/35">
          <tr>
            <th>Fecha</th>
            <th>Invitado</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Error</th>
          </tr>
        </thead>

        <tbody>
          {#each (data?.logs || []) as row (row.id)}
            <tr>
              <td class="whitespace-nowrap">{fmt(row.created_at)}</td>
              <td class="max-w-[220px] truncate">{row.invitations?.guests?.name || '—'}</td>
              <td class="max-w-[260px] truncate">{row.invitations?.guests?.email || '—'}</td>
              <td>
                <span class={`badge ${badgeClass(row.status)}`}>{row.status || '—'}</span>
              </td>
              <td class="text-xs opacity-80 max-w-[420px]">
                <div class="break-words whitespace-pre-wrap">{row.error || ''}</div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
