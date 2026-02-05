<script>
  // src/routes/+layout.svelte
  import Footer from "$components/Footer.svelte";
  import AdminNav from "$components/AdminNav.svelte";
  import "../app.css";

  import { page } from "$app/stores";
  import { browser } from "$app/environment";
  import { invalidate } from "$app/navigation";

  import { currentEventId } from "$lib/stores/current.js";
  import { resetEventState } from "$lib/stores/event.js";

  const props = $props();
  const data = $derived.by(() => props.data);
  const children = $derived.by(() => props.children);

  const user = $derived.by(() => data?.user ?? null);

  const pathname = $derived.by(() => $page.url.pathname);
  const isLogin = $derived.by(() => pathname.startsWith("/login"));

  const isBuilder = $derived.by(() => pathname.includes("/builder"));
  const shellW = $derived.by(() =>
    isBuilder ? "max-w-[1600px]" : "max-w-6xl",
  );
  const shellPad = $derived.by(() =>
    isBuilder ? "px-3 sm:px-4" : "px-4 sm:px-6",
  );

  // ✅ áreas admin
  const isAdminArea = $derived.by(() => {
    const roots = [
      "/events",
      "/users",
      "/email-logs",
      "/templates",
      "/audit-logs",
    ];
    return roots.some((r) => pathname === r || pathname.startsWith(r + "/"));
  });

  // ✅ no pintar AdminNav dentro del builder
  const showAdminNav = $derived.by(() => isAdminArea && !isBuilder);

  function beforeLogout() {
    $currentEventId = "";
    resetEventState?.();
  }

  // ─────────────────────────────────────────
  // Tema (localStorage)
  // ─────────────────────────────────────────
  const THEMES = [
    {
      id: "midnight",
      label: "Nocturno",
      bg: "from-slate-950 via-slate-900 to-zinc-950",
      accent: "bg-teal-400 text-zinc-900",
    },
    {
      id: "graphite",
      label: "Grafito",
      bg: "from-zinc-950 via-zinc-900 to-slate-950",
      accent: "bg-emerald-400 text-zinc-900",
    },
    {
      id: "sand",
      label: "Claro",
      bg: "from-zinc-50 via-zinc-100 to-zinc-50",
      accent: "bg-zinc-900 text-zinc-50",
    },
  ];

  let themeId = $state("midnight");
  let userMenuEl = $state(null);

  const theme = $derived.by(
    () => THEMES.find((t) => t.id === themeId) ?? THEMES[0],
  );
  const isLight = $derived.by(() => themeId === "sand");

  function closeMenu() {
    userMenuEl?.removeAttribute?.("open");
  }

  function applyTheme(id) {
    themeId = id;
    if (browser) localStorage.setItem("ui-theme", id);
    closeMenu();
  }

  $effect(() => {
    if (!browser) return;
    const saved = localStorage.getItem("ui-theme");
    if (saved && saved !== themeId) themeId = saved;
  });

  // ✅ refresca auth en el cliente
  $effect(() => {
    if (!browser) return;
    const supabase = data?.supabase;
    if (!supabase) return;

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      invalidate("supabase:auth");
    });

    return () => sub?.subscription?.unsubscribe?.();
  });

  const headerBg = $derived.by(() =>
    isLight ? "bg-white/70 border-zinc-200" : "bg-black/20 border-white/10",
  );
  const titleText = $derived.by(() =>
    isLight ? "text-zinc-900" : "text-zinc-100",
  );
  const mutedText = $derived.by(() =>
    isLight ? "text-zinc-600" : "text-zinc-400",
  );
  const chip = $derived.by(() =>
    isLight ? "border-zinc-200 bg-zinc-900/5" : "border-white/10 bg-white/5",
  );
  const chipText = $derived.by(() =>
    isLight ? "text-zinc-700" : "text-zinc-200",
  );

  const btn = $derived.by(() =>
    isLight
      ? "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 border border-zinc-900"
      : "bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-100",
  );

  // ─────────────────────────────────────────
  // Glow GLOBAL (mouse + touch) y Glow HEADER
  // ─────────────────────────────────────────
  let gx = $state(50);
  let gy = $state(45);
  let gHover = $state(false);

  let hx = $state(50);
  let hy = $state(45);
  let hHover = $state(false);

  function updateGlow(clientX, clientY, el, setterX, setterY) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const py = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    setterX(Math.round(px * 100));
    setterY(Math.round(py * 100));
  }

  function onAppPointerMove(e) {
    gHover = true;
    const root = e.currentTarget;
    updateGlow(
      e.clientX,
      e.clientY,
      root,
      (v) => (gx = v),
      (v) => (gy = v),
    );
  }

  function onAppPointerLeave() {
    gHover = false;
    gx = 50;
    gy = 45;
  }

  function onHeaderPointerMove(e) {
    hHover = true;
    const header = e.currentTarget;
    updateGlow(
      e.clientX,
      e.clientY,
      header,
      (v) => (hx = v),
      (v) => (hy = v),
    );
  }

  function onHeaderPointerLeave() {
    hHover = false;
    hx = 50;
    hy = 45;
  }

  // click outside + ESC para dropdown
  function clickOutside(node) {
    if (!browser) return;

    const handler = (e) => {
      const t = e.target;
      if (!node.contains(t)) closeMenu();
    };

    const onKey = (e) => {
      if (e.key === "Escape") closeMenu();
    };

    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("keydown", onKey, true);

    return {
      destroy() {
        document.removeEventListener("pointerdown", handler, true);
        document.removeEventListener("keydown", onKey, true);
      },
    };
  }
</script>

<div
  class={`min-h-dvh w-full bg-linear-to-br ${theme.bg} app-shell`}
  data-mode={isLight ? "light" : "dark"}
  data-hovering={gHover ? "1" : "0"}
  style={`--gx:${gx}%; --gy:${gy}%;`}
  onpointermove={onAppPointerMove}
  onpointerleave={onAppPointerLeave}
>
  <!-- Global immersive background -->
  <div class="bgfx" aria-hidden="true">
    <div class="bg-base"></div>
    <div class="bg-glow"></div>

    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>

    <div class="gridfx"></div>
    <div class="vignette"></div>
  </div>

  <div class="flex min-h-dvh flex-col relative z-10">
    {#if !isLogin}
      <!-- Header -->
      <header
        class={`sticky top-0 z-30 border-b backdrop-blur ${headerBg} headerfx`}
        style={`--hx:${hx}%; --hy:${hy}%;`}
        data-hovering={hHover ? "1" : "0"}
        onpointermove={onHeaderPointerMove}
        onpointerleave={onHeaderPointerLeave}
      >
        <div
          class="pointer-events-none absolute inset-0 header-glow"
          aria-hidden="true"
        ></div>

        <div
          class={`${shellW} mx-auto ${shellPad} h-14 flex items-center gap-3 relative`}
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class={`h-9 w-9 rounded-2xl flex items-center justify-center shadow ${theme.accent}`}
            >
              <span class="font-bold">I</span>
            </div>

            <div class="min-w-0">
              <h1
                class={`text-base sm:text-lg font-semibold leading-tight truncate ${titleText}`}
              >
                Invitaciones DIF Coahuila
              </h1>
              <p class={`text-xs hidden sm:block ${mutedText}`}>
                Gestión de eventos
              </p>
            </div>
          </div>

          <div class="ml-auto flex items-center gap-2">
            {#if user}
              <div
                class={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${chip}`}
              >
                <span class={`text-xs truncate max-w-55 ${chipText}`}
                  >{user.email}</span
                >
              </div>

              <div use:clickOutside>
                <details class="dropdown dropdown-end" bind:this={userMenuEl}>
                  <summary class={`btn btn-sm rounded-xl ${btn}`}
                    >Opciones</summary
                  >

                  <ul
                    class={`dropdown-content menu p-2 shadow rounded-2xl w-52 mt-2 border ${
                      isLight
                        ? "bg-white border-zinc-200"
                        : "bg-zinc-950/95 border-zinc-800"
                    }`}
                  >
                    <li class="menu-title">
                      <span
                        class={`${isLight ? "text-zinc-700" : "text-zinc-300"}`}
                        >Tema</span
                      >
                    </li>

                    {#each THEMES as t (t.id)}
                      <li>
                        <button
                          type="button"
                          class={`rounded-xl ${t.id === themeId ? "active" : ""}`}
                          onclick={() => applyTheme(t.id)}
                        >
                          {t.label}
                        </button>
                      </li>
                    {/each}

                    <div
                      class={`my-2 h-px ${isLight ? "bg-zinc-200" : "bg-zinc-800"}`}
                    ></div>

                    <li>
                      <form method="POST" action="/auth/logout" class="ml-auto">
                        <button
                          type="submit"
                          class={`btn btn-sm rounded-xl ${btn} whitespace-nowrap`}
                          onclick={beforeLogout}
                        >
                          Cerrar sesión
                        </button>
                      </form>
                    </li>
                  </ul>
                </details>
              </div>
            {:else}
              <form method="POST" action="/auth/logout" class="w-full">
                <button
                  type="submit"
                  class="bg-zinc-300 m-2 p-2 w-full justify-start rounded-xl text-white"
                  onclick={beforeLogout}
                >
                  Cerrar sesión
                </button>
              </form>
            {/if}
          </div>
        </div>
      </header>
    {/if}

    <!-- Main -->
    <main class="flex-1">
      {#if isLogin}
        <div class="min-h-dvh flex items-center justify-center px-4 py-10">
          <div class={`w-full ${isLight ? "text-zinc-900" : "text-zinc-200"}`}>
            {@render children?.()}
          </div>
        </div>
      {:else}
        <div
            class={`${shellW} mx-auto ${shellPad} ${
              isBuilder ? "py-3" : "py-6"
            } ${isLight ? "text-zinc-900" : "text-zinc-200"}`}
          >

          {#if showAdminNav}
            <div
              class="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 items-start"
            >
              <AdminNav />
              <div class="min-w-0">
                {@render children?.()}
              </div>
            </div>
          {:else}
            {@render children?.()}
          {/if}
        </div>
      {/if}
    </main>

    {#if !isBuilder}
      <Footer />
    {/if}
  </div>
</div>

<style>
  .app-shell {
    position: relative;
    overflow: hidden;
    touch-action: manipulation;
  }

  /* Background layers */
  .bgfx {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .bg-base {
    position: absolute;
    inset: 0;
  }

  /* Base keeps your gradient visible; we only add overlays */
  .bg-glow {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 160ms ease;
    background: radial-gradient(
      300px 220px at var(--gx) var(--gy),
      rgba(34, 211, 238, 0.14),
      rgba(16, 185, 129, 0.08) 30%,
      rgba(255, 255, 255, 0.06) 55%,
      transparent 84%
    );
  }
  .app-shell[data-hovering="1"] .bg-glow {
    opacity: 1;
  }

  .blob {
    position: absolute;
    border-radius: 999px;
    filter: blur(52px);
    opacity: 0.3;
  }
  .blob-a {
    top: -7rem;
    left: -7rem;
    width: 28rem;
    height: 28rem;
  }
  .blob-b {
    bottom: -9rem;
    right: -9rem;
    width: 32rem;
    height: 32rem;
  }
  .blob-c {
    left: 50%;
    top: 46%;
    transform: translate(-50%, -50%);
    width: 36rem;
    height: 36rem;
    opacity: 0.18;
  }

  .app-shell[data-mode="dark"] .blob-a {
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.55),
      rgba(34, 211, 238, 0.22),
      rgba(16, 185, 129, 0.18)
    );
  }
  .app-shell[data-mode="dark"] .blob-b {
    background: linear-gradient(
      135deg,
      rgba(236, 72, 153, 0.3),
      rgba(168, 85, 247, 0.22),
      rgba(56, 189, 248, 0.14)
    );
  }
  .app-shell[data-mode="dark"] .blob-c {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
  }

  .app-shell[data-mode="light"] .bg-glow {
    background: radial-gradient(
      900px 520px at var(--gx) var(--gy),
      rgba(34, 211, 238, 0.1),
      rgba(16, 185, 129, 0.07) 30%,
      rgba(0, 0, 0, 0.04) 56%,
      transparent 74%
    );
  }
  .app-shell[data-mode="light"] .blob-a {
    opacity: 0.22;
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.22),
      rgba(34, 211, 238, 0.14),
      rgba(16, 185, 129, 0.1)
    );
  }
  .app-shell[data-mode="light"] .blob-b {
    opacity: 0.18;
    background: linear-gradient(
      135deg,
      rgba(236, 72, 153, 0.16),
      rgba(168, 85, 247, 0.12),
      rgba(56, 189, 248, 0.1)
    );
  }
  .app-shell[data-mode="light"] .blob-c {
    opacity: 0.1;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.06), transparent);
  }

  .gridfx {
    position: absolute;
    inset: 0;
    opacity: 0.08;
    background-image: linear-gradient(
        to right,
        rgba(255, 255, 255, 0.35) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 1px, transparent 1px);
    background-size: 72px 72px;
  }
  .app-shell[data-mode="light"] .gridfx {
    opacity: 0.06;
    background-image: linear-gradient(
        to right,
        rgba(0, 0, 0, 0.25) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.25) 1px, transparent 1px);
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.2),
      transparent,
      rgba(0, 0, 0, 0.55)
    );
  }
  .app-shell[data-mode="light"] .vignette {
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.18),
      transparent,
      rgba(0, 0, 0, 0.18)
    );
  }

  /* Header glow */
  .headerfx {
    position: sticky;
    top: 0;
    overflow: hidden;
  }
  .header-glow {
    opacity: 0;
    transition: opacity 160ms ease;
    background: radial-gradient(
      700px 220px at var(--hx) var(--hy),
      rgba(34, 211, 238, 0.14),
      rgba(16, 185, 129, 0.08) 38%,
      rgba(255, 255, 255, 0.05) 60%,
      transparent 76%
    );
  }
  header[data-hovering="1"] .header-glow {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .bg-glow,
    .header-glow {
      transition: none !important;
    }
  }
</style>
