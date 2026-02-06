<script>
  // src/lib/components/BuilderAside.svelte
  import BookTypeIcon from '$icons/book-type';
  import PaletteIcon from '$icons/palette';
  import UsersIcon from '$icons/users';
  import SendIcon from '$icons/send';

  import TabDesign from '$components/TabDesign.svelte';
  import TabGuest from '$components/TabGuest.svelte';
  import TabInfo from '$components/TabInfo.svelte';
  import TabSend from '$components/TabSend.svelte';

  import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';

  const role = $derived.by(() => $page.data?.role || 'viewer');
  const approved = $derived.by(() => $page.data?.event?.approved ?? false);

  const eventTitle = $derived.by(() => String($page.data?.event?.title || 'Editor').trim());
  const eventId = $derived.by(() => $page.params.eventId || $page.params.id || '');

  let approvedLocal = $state(false);
  let approveBusy = $state(false);
  let approveError = $state('');

  $effect(() => {
    approvedLocal = approved;
  });

  const ALL_TABS = [
    { key: 'info', label: 'Info', short: 'Info', Icon: BookTypeIcon, roles: ['admin', 'capturista'] },
    { key: 'design', label: 'Diseño', short: 'Diseño', Icon: PaletteIcon, roles: ['admin', 'designer', 'capturista'] },
    { key: 'guests', label: 'Invitados', short: 'Inv.', Icon: UsersIcon, roles: ['admin', 'capturista'] },
    { key: 'send', label: 'Enviar', short: 'Enviar', Icon: SendIcon, roles: ['admin', 'sender', 'capturista'] }
  ];

  const tabs = $derived.by(() => ALL_TABS.filter((t) => t.roles.includes(role)));

  let tabSelected = $state('info');

  $effect(() => {
    const allowed = tabs.map((t) => t.key);
    if (!allowed.includes(tabSelected)) tabSelected = allowed[0] || 'info';
  });

  function pillStatus() {
    return approvedLocal ? 'pill pill-ok' : 'pill pill-warn';
  }

  async function approveEvent() {
    if (approveBusy) return;
    approveError = '';

    if (role !== 'admin') {
      approveError = 'Solo admin puede aprobar.';
      return;
    }

    if (!eventId) {
      approveError = 'Falta eventId.';
      return;
    }

    approveBusy = true;

    try {
      const res = await fetch(`/api/events/${eventId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });

      const raw = await res.text().catch(() => '');
      let payload = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = {};
      }

      if (!res.ok) throw new Error(payload?.error || raw || `No se pudo aprobar (${res.status})`);

      approvedLocal = true;
      await invalidateAll();
    } catch (e) {
      approveError = e?.message || 'Error aprobando';
    } finally {
      approveBusy = false;
    }
  }
</script>

<aside class="w-full min-w-0">
  <div class="glass-panel rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-white/10 min-w-0">
      <!-- Breadcrumb + back -->
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0 flex items-center gap-2 text-xs opacity-80 overflow-hidden">
          <a href="/events" class="crumb hover:opacity-100 shrink-0">Eventos</a>
          <span class="opacity-40 shrink-0">/</span>
          <span class="truncate min-w-0">{eventTitle}</span>
        </div>

        <a href="/events" class="btn btn-xs rounded-2xl btn-ghost whitespace-nowrap shrink-0" title="Volver a eventos"></a>
      </div>

      <div class="mt-2 flex items-start justify-between gap-3 min-w-0">
        <div class="min-w-0 flex-1 overflow-hidden">
          <div class="text-sm font-semibold truncate">{eventTitle}</div>
          <!-- <div class="text-xs opacity-70 truncate">Configura tu invitación y envíala</div> -->
        </div>


        <div class="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <span class="pill pill-neutral whitespace-nowrap">
            Paso: {tabs.find((t) => t.key === tabSelected)?.label}
          </span>

          <span class={`${pillStatus()} whitespace-nowrap`}>
            {approvedLocal ? 'Aprobado' : 'Pendiente'}
          </span>

          {#if role === 'admin' && !approvedLocal}
            <button
              type="button"
              class="btn btn-sm rounded-2xl btn-outline"
              onclick={approveEvent}
              disabled={approveBusy}
              title="Aprobar invitación"
            >
              {approveBusy ? 'Aprobando…' : 'Aprobar'}
            </button>
          {/if}
        </div>
      </div>
    </div>

    {#if approveError}
      <div class="px-5 pt-3">
        <div class="glass-soft alert alert-error rounded-2xl">
          <span class="text-sm">{approveError}</span>
        </div>
      </div>
    {/if}

    <!-- Tabs -->
    <div class="p-4">
      <div class="seg grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each tabs as t}
          {@const Icon = t.Icon}
          <label class={"seg-btn " + (tabSelected === t.key ? 'active' : '')} title={t.label}>
            <input class="hidden" type="radio" name="tabs" value={t.key} bind:group={tabSelected} />
            <span class={"seg-ico " + (tabSelected === t.key ? 'active' : '')}>
              <Icon size={14} />
            </span>
            <span class="min-w-0">
              <span class="truncate text-xs sm:text-sm">
                <span class="sm:hidden">{t.short ?? t.label}</span>
                <span class="hidden sm:inline">{t.label}</span>
              </span>
            </span>
          </label>
        {/each}
      </div>

      <div class="mt-3 text-xs opacity-70">
        Rol: <span class="font-semibold">{role}</span>
        {#if eventId}
          <span class="opacity-40">•</span>
          <span class="opacity-70">Evento:</span> <span class="font-mono opacity-60">{eventId.slice(0, 6)}…</span>
        {/if}
      </div>
    </div>

    <!-- Content -->
    <div class="px-4 pb-5">
      <div class="glass-content rounded-3xl border border-white/10 p-3 max-h-[72vh] overflow-auto min-w-0">
        {#if tabSelected === 'info'}
          <TabInfo />
        {:else if tabSelected === 'design'}
          <TabDesign />
        {:else if tabSelected === 'guests'}
          <TabGuest />
        {:else if tabSelected === 'send'}
          <TabSend />
        {/if}
      </div>
    </div>
  </div>
</aside>

<style>
  .glass-panel {
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }
  .glass-soft {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.10);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .glass-content {
    background: linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .crumb {
    opacity: 0.85;
    text-decoration: none;
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
    opacity: 0.92;
  }
  .pill-ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.22); }
  .pill-warn { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.20); }
  .pill-neutral { opacity: 0.85; }

  /* .seg {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  } */

  .seg-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
    transition: 160ms ease;
    min-width: 0;
    justify-content: center;
  }
  .seg-btn:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.14);
  }
  .seg-btn.active {
    background: rgba(99,102,241,0.14);
    border-color: rgba(99,102,241,0.26);
  }

  .seg-ico {
    width: 34px;
    height: 34px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    flex: 0 0 auto;
  }
  .seg-ico.active {
    background: rgba(99,102,241,0.18);
    border-color: rgba(99,102,241,0.28);
  }

  @media (min-width: 1024px) {
    .seg-btn { justify-content: flex-start; }
  }
</style>
