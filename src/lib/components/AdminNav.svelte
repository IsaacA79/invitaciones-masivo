<script>
  // src/lib/components/AdminNav.svelte
  import { page } from '$app/stores';

  import BookTypeIcon from '$icons/book-type';
  import UsersIcon from '$icons/users';
  import SendIcon from '$icons/send';
  import PaletteIcon from '$icons/palette';

  const role = $derived.by(() => $page.data?.role || 'viewer');
  const pathname = $derived.by(() => $page.url.pathname);

  let open = $state(false);

  const NAV = [
    { href: '/events', label: 'Eventos', desc: 'Crea y gestiona', Icon: BookTypeIcon, roles: ['admin', 'capturista', 'sender', 'designer'] },
    { href: '/users', label: 'Usuarios', desc: 'Roles y accesos', Icon: UsersIcon, roles: ['admin'] },
    { href: '/email-logs', label: 'Historial', desc: 'Envíos y fallas', Icon: SendIcon, roles: ['admin', 'sender'] },
    { href: '/audit-logs', label: 'Auditoría', desc: 'Acciones admin', Icon: SendIcon, roles: ['admin'] },
    { href: '/templates', label: 'Plantillas', desc: 'Diseño base', Icon: PaletteIcon, roles: ['admin', 'designer'] }
  ];

  const items = $derived.by(() => NAV.filter((x) => x.roles.includes(role)));
  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  function close() {
    open = false;
  }
</script>

<!-- Mobile top bar -->
<div class="lg:hidden sticky top-14 z-20">
  <div class="mx-auto max-w-7xl px-4 sm:px-6">
    <div class="glass-nav h-12 px-3 rounded-2xl border border-white/10 backdrop-blur-xl flex items-center justify-between">
      <button
        class="btn btn-ghost btn-sm rounded-2xl"
        onclick={() => (open = true)}
        aria-label="Abrir menú"
        title="Menú"
      >
        ☰
      </button>

      <div class="min-w-0 text-sm font-semibold tracking-tight truncate">Panel</div>

      <span class="badge badge-outline text-[11px] rounded-full">{role}</span>
    </div>
  </div>
</div>

<!-- Mobile drawer -->
{#if open}
  <div class="lg:hidden fixed inset-0 z-50">
    <button class="absolute inset-0 bg-black/40" onclick={close} aria-label="Cerrar overlay"></button>

    <div class="absolute left-0 top-0 h-full w-88 max-w-[90vw] p-4">
      <div class="glass-panel h-full rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden">
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
          <div class="min-w-0">
            <div class="text-sm font-semibold">Navegación</div>
            <div class="text-xs opacity-70 truncate">Acceso según tu rol</div>
          </div>
          <button class="btn btn-ghost btn-sm rounded-2xl" onclick={close} aria-label="Cerrar menú">✕</button>
        </div>

        <nav class="p-3">
          <div class="space-y-1">
            {#each items as it}
              {@const Icon = it.Icon}
              <a
                href={it.href}
                onclick={close}
                class={"nav-item " + (isActive(it.href) ? 'active' : '')}
              >
                <span class={"nav-ico " + (isActive(it.href) ? 'active' : '')}>
                  <Icon size={16} />
                </span>

                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-semibold truncate">{it.label}</span>
                  <span class="block text-xs opacity-70 truncate">{it.desc}</span>
                </span>

                <span class={"dot " + (isActive(it.href) ? 'on' : '')}></span>
              </a>
            {/each}
          </div>
        </nav>

        <div class="mt-auto p-4 border-t border-white/10">
          <div class="flex items-center justify-between text-xs opacity-70">
            <span>Modo: Admin Panel</span>
            <span class="badge badge-outline text-[11px] rounded-full">{role}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Desktop sidebar -->
<aside class="hidden lg:block w-64 min-w-64">
  <div class="sticky top-20">
    <div class="glass-panel rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden">
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-sm font-semibold">Panel</div>
          <div class="text-xs opacity-70 truncate">Admin / Operación</div>
        </div>
        <span class="badge badge-outline text-[11px] rounded-full">{role}</span>
      </div>

      <nav class="p-3">
        <div class="space-y-1">
          {#each items as it}
            {@const Icon = it.Icon}
            <a href={it.href} class={"nav-item " + (isActive(it.href) ? 'active' : '')}>
              <span class={"nav-ico " + (isActive(it.href) ? 'active' : '')}>
                <Icon size={16} />
              </span>

              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold truncate">{it.label}</span>
                <span class="block text-xs opacity-70 truncate">{it.desc}</span>
              </span>

              <span class={"dot " + (isActive(it.href) ? 'on' : '')}></span>
            </a>
          {/each}
        </div>
      </nav>

      <div class="p-4 border-t border-white/10">
        <div class="text-xs opacity-70 leading-relaxed">
          Tip: usa roles mínimos y revisa auditoría para cambios sensibles.
        </div>
      </div>
    </div>
  </div>
</aside>

<style>
  .glass-panel {
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }
  .glass-nav {
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 18px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.03);
    transition: 160ms ease;
  }
  .nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .nav-item.active {
    background: rgba(99, 102, 241, 0.14);
    border-color: rgba(99, 102, 241, 0.22);
  }

  .nav-ico {
    width: 38px;
    height: 38px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.04);
    flex: 0 0 auto;
  }
  .nav-ico.active {
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.28);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    flex: 0 0 auto;
    opacity: 0.6;
  }
  .dot.on {
    background: rgba(99, 102, 241, 0.75);
    opacity: 1;
  }
</style>
