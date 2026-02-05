<script>
  import { page } from '$app/stores';
  import { currentEventId } from '$lib/stores/current.js';

  const eventId = $derived.by(() => $page.params.eventId || $page.params.id || $currentEventId || '');
  const role = $derived.by(() => $page.data?.role || 'viewer');

  let loading = $state(false);
  let email = $state('');
  let memberRole = $state('designer');
  let errorMsg = $state('');
  let members = $state([]);

  const roles = ['capturista', 'designer', 'sender', 'viewer'];

  async function loadMembers() {
    if (!eventId) return;
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/events/${eventId}/members`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error cargando miembros');
      members = data.members || [];
    } catch (e) {
      errorMsg = e?.message || 'Error';
    } finally {
      loading = false;
    }
  }

  async function addMember() {
    if (!email.trim()) return;
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, role: memberRole })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error agregando');
      email = '';
      await loadMembers();
    } catch (e) {
      errorMsg = e?.message || 'Error';
    } finally {
      loading = false;
    }
  }

  async function changeRole(userId, role) {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error actualizando rol');
      await loadMembers();
    } catch (e) {
      errorMsg = e?.message || 'Error';
    } finally {
      loading = false;
    }
  }

  async function removeMember(userId) {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Error eliminando');
      await loadMembers();
    } catch (e) {
      errorMsg = e?.message || 'Error';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (!eventId) return;
    if (role !== 'admin') return; // UI solo admin (owner también puede, pero aquí lo simplificamos)
    loadMembers();
  });
</script>

<section class="bg-base-100 border border-base-300 rounded-2xl p-5">
  <div class="flex items-center justify-between gap-3">
    <div>
      <div class="text-sm font-semibold">Accesos del evento</div>
      <div class="text-xs opacity-60">Invita por email y asigna rol por evento</div>
    </div>
    <button class="btn btn-outline btn-sm rounded-xl" disabled={loading} onclick={loadMembers}>
      {loading ? 'Cargando…' : 'Refrescar'}
    </button>
  </div>

  {#if errorMsg}
    <div class="alert alert-error mt-4 rounded-xl">
      <span class="text-sm">{errorMsg}</span>
    </div>
  {/if}

  <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
    <input class="input w-full" placeholder="correo@dominio.com" bind:value={email} />
    <select class="select w-full" bind:value={memberRole}>
      {#each roles as r}
        <option value={r}>{r}</option>
      {/each}
    </select>
    <button class="btn btn-primary rounded-xl" disabled={loading || !email.trim()} onclick={addMember}>
      {loading ? 'Procesando…' : 'Agregar / Invitar'}
    </button>
  </div>

  <div class="mt-5 overflow-x-auto border border-base-300 rounded-2xl">
    <table class="table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Rol</th>
          <th class="w-32">Acción</th>
        </tr>
      </thead>
      <tbody>
        {#each members as m}
          <tr>
            <td class="truncate max-w-105">{m.profiles?.email || m.user_id}</td>
            <td>
              <select
                class="select select-sm"
                value={m.role}
                onchange={(e) => changeRole(m.user_id, e.currentTarget.value)}
                disabled={loading}
              >
                {#each roles as r}
                  <option value={r} selected={m.role === r}>{r}</option>
                {/each}
              </select>
            </td>
            <td>
              <button class="btn btn-ghost btn-sm rounded-xl" disabled={loading} onclick={() => removeMember(m.user_id)}>
                Quitar
              </button>
            </td>
          </tr>
        {/each}
        {#if !members?.length}
          <tr>
            <td colspan="3" class="text-sm opacity-60">Sin miembros asignados</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</section>
