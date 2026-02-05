<!-- src/routes/(admin)/users/+page.svelte -->
<script>
  const props = $props();
  const data = $derived.by(() => props.data);
  const form = $derived.by(() => props.form);

  // UI state
  let showHelp = $state(false);

  // Filtros visuales (client-side para mantenerlo simple)
  let q = $state('');
  let roleFilter = $state('all');

  const profiles = $derived.by(() => data?.profiles ?? []);
  const roles = $derived.by(() => data?.roles ?? []);

  const filtered = $derived.by(() => {
    const qq = q.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesQ = !qq || (p.email || '').toLowerCase().includes(qq);
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      return matchesQ && matchesRole;
    });
  });

  function badgeRole(role) {
    if (role === 'admin') return 'pill pill-ok';
    if (role === 'sender') return 'pill pill-warn';
    if (role === 'designer') return 'pill pill-purple';
    return 'pill pill-neutral';
  }
</script>

<div class="page-wrap">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
      <div class="flex items-start gap-3">
        <div class="ico"><span>👤</span></div>
        <div>
          <h1 class="text-xl font-semibold leading-tight">Usuarios y roles</h1>
          <p class="text-xs opacity-70">Crea usuarios, envía invitaciones y administra permisos.</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn btn-sm rounded-2xl btn-outline" type="button" on:click={() => (showHelp = true)}>
          Tips
        </button>
        <a class="btn btn-sm rounded-2xl btn-ghost" href="/events">Volver</a>
      </div>
    </div>

    <!-- Alerts -->
    {#if form?.message}
      <div class="glass alert alert-error rounded-3xl mb-4">
        <span class="text-sm">{form.message}</span>
      </div>
    {:else if form?.ok}
      <div class="glass alert alert-success rounded-3xl mb-4">
        <span class="text-sm">Acción realizada correctamente.</span>
      </div>
    {/if}

    <!-- Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
      <!-- Crear usuario -->
      <section class="glass rounded-3xl p-4 sm:p-5 lg:col-span-6">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 class="font-semibold">Crear usuario</h2>
            <p class="text-xs opacity-70">Crea usuario con contraseña (sin correo de invitación).</p>
          </div>
          <span class="badge badge-neutral badge-sm">Directo</span>
        </div>

        <form method="POST" action="?/create" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label py-0 mb-1">
              <span class="label-text text-xs opacity-70">Email</span>
            </div>
            <input
              name="email"
              type="email"
              class="input input-bordered rounded-2xl bg-base-100/30 text-sm"
              placeholder="usuario@dominio.com"
              required
            />
          </label>

          <label class="form-control">
            <div class="label py-0 mb-1">
              <span class="label-text text-xs opacity-70">Contraseña</span>
            </div>
            <input
              name="password"
              type="password"
              minlength="8"
              class="input input-bordered rounded-2xl bg-base-100/30 text-sm"
              placeholder="mín. 8 caracteres"
              required
            />
          </label>

          <label class="form-control">
            <div class="label py-0 mb-1">
              <span class="label-text text-xs opacity-70">Rol</span>
            </div>
            <select name="role" class="select select-bordered rounded-2xl bg-base-100/30 text-sm" required>
              {#each roles as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </label>

          <div class="flex items-end">
            <button class="btn btn-primary rounded-2xl w-full" type="submit">
              Crear usuario
            </button>
          </div>
        </form>

        <p class="mt-3 text-xs opacity-70 leading-relaxed">
          Se requiere email. Si “no tienen correo”, usa un email interno.
        </p>
      </section>

      <!-- Invitar usuario -->
      <section class="glass rounded-3xl p-4 sm:p-5 lg:col-span-6">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 class="font-semibold">Invitar usuario</h2>
            <p class="text-xs opacity-70">Envía invitación por correo (proveedor configurado).</p>
          </div>
          <span class="badge badge-outline badge-sm">Invitación</span>
        </div>

        <form method="POST" action="?/invite" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label py-0 mb-1">
              <span class="label-text text-xs opacity-70">Email</span>
            </div>
            <input
              name="email"
              type="email"
              class="input input-bordered rounded-2xl bg-base-100/30 text-sm"
              placeholder="correo@dominio.com"
              required
            />
          </label>

          <label class="form-control">
            <div class="label py-0 mb-1">
              <span class="label-text text-xs opacity-70">Rol</span>
            </div>
            <select name="role" class="select select-bordered rounded-2xl bg-base-100/30 text-sm" required>
              {#each roles as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </label>

          <div class="sm:col-span-2">
            <button class="btn btn-primary rounded-2xl w-full" type="submit">
              Enviar invitación
            </button>
          </div>
        </form>

        <p class="mt-3 text-xs opacity-70 leading-relaxed">
          Se enviará un correo de invitación.
        </p>
      </section>
    </div>

    <!-- List / Filters -->
    <section class="glass rounded-3xl overflow-hidden">
      <div class="p-4 sm:p-5">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 class="font-semibold">Lista de usuarios</h2>
            <p class="text-xs opacity-70">Cambia roles y contraseñas (IDs ocultos).</p>
          </div>

          <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div class="join w-full sm:w-64">
              <input
                class="input input-bordered join-item rounded-l-2xl bg-base-100/30 text-sm w-full"
                placeholder="Buscar por email…"
                bind:value={q}
              />
              <button class="btn btn-sm join-item rounded-r-2xl btn-outline" type="button" on:click={() => (q = '')}>
                Limpiar
              </button>
            </div>

            <select
              class="select select-bordered rounded-2xl bg-base-100/30 text-sm w-full sm:w-48"
              bind:value={roleFilter}
            >
              <option value="all">Todos los roles</option>
              {#each roles as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span class="badge badge-neutral badge-sm">{filtered.length} / {profiles.length} usuarios</span>
          {#if roleFilter !== 'all'}
            <span class="pill pill-neutral">rol: {roleFilter}</span>
          {/if}
          {#if q.trim()}
            <span class="pill pill-neutral">q: {q.trim()}</span>
          {/if}
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table class="w-full">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th class="w-[420px]">Contraseña</th>
            </tr>
          </thead>

          <tbody>
            {#if filtered.length === 0}
              <tr>
                <td colspan="3" class="py-10 text-center text-sm opacity-70">Sin resultados.</td>
              </tr>
            {:else}
              {#each filtered as p (p.id)}
                <tr class="row">
                  <td class="min-w-[240px]">
                    <div class="leading-tight">
                      <div class="name">{p.email}</div>
                      <div class="sub">creado: {new Date(p.created_at).toLocaleDateString('es-MX')}</div>
                    </div>
                  </td>

                  <td class="min-w-[320px]">
                    <form method="POST" action="?/setRole" class="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <span class={badgeRole(p.role)}>{p.role}</span>

                      <select name="role" class="select select-bordered select-sm rounded-2xl bg-base-100/30 text-sm">
                        {#each roles as r}
                          <option value={r} selected={p.role === r}>{r}</option>
                        {/each}
                      </select>

                      <button class="btn btn-sm rounded-2xl btn-outline" type="submit">Guardar</button>
                    </form>
                  </td>

                  <td>
                    <form method="POST" action="?/setPassword" class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="password"
                        type="password"
                        minlength="8"
                        class="input input-bordered input-sm rounded-2xl bg-base-100/30 text-sm"
                        placeholder="Password (mín. 8)"
                        required
                      />
                      <button class="btn btn-sm rounded-2xl btn-outline whitespace-nowrap" type="submit">
                        Cambiar
                      </button>
                    </form>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- <div class="p-4 sm:p-5 text-xs opacity-60">
        Recomendación: roles mínimos necesarios y rotación de contraseñas.
      </div> -->
    </section>
  </div>

  <!-- Modal tips -->
  {#if showHelp}
    <div class="modal modal-open">
      <div class="modal-box rounded-3xl max-w-xl glass">
        <h3 class="text-lg font-semibold">Tips rápidos</h3>
        <ul class="mt-3 space-y-2 text-sm opacity-90">
          <li class="text-xs opacity-80">• Usa el principio de menor privilegio (no todo admin).</li>
          <li class="text-xs opacity-80">• Evita contraseñas compartidas y rota periódicamente.</li>
          <li class="text-xs opacity-80">• Para usuarios sin correo real, usa un email interno controlado.</li>
        </ul>

        <div class="modal-action">
          <button class="btn rounded-2xl" type="button" on:click={() => (showHelp = false)}>Cerrar</button>
        </div>
      </div>
      <div class="modal-backdrop" on:click={() => (showHelp = false)}></div>
    </div>
  {/if}
</div>

<style>
  /* Fondo clean + glassmorphism consistente */
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
  .pill-warn { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.20); }
  .pill-purple { background: rgba(168,85,247,0.10); border-color: rgba(168,85,247,0.20); }
  .pill-neutral { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.10); opacity: 0.85; }

  /* Tabla clean */
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
  .name { font-size: 13px; font-weight: 600; }
  .sub { font-size: 11px; opacity: 0.70; }
</style>
