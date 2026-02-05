<script>
  // src/routes/login/+page.svelte
  import { enhance } from '$app/forms';

  const { form } = $props();

  let submitting = $state(false);
  let showPassword = $state(false);

  // 3D / glow state
  let cardEl = $state(null);
  let mx = $state(50);
  let my = $state(35);
  let rx = $state(0);
  let ry = $state(0);
  let hovering = $state(false);

  // shake on error
  let shake = $state(false);
  let lastMsg = $state('');

  $effect(() => {
    const msg = String(form?.message || '');
    if (msg && msg !== lastMsg) {
      lastMsg = msg;
      shake = true;
      const t = setTimeout(() => (shake = false), 520);
      return () => clearTimeout(t);
    }
    if (!msg) lastMsg = '';
  });

  const onEnhance = () => {
    submitting = true;

    return async ({ update }) => {
      await update();
      submitting = false;
    };
  };

  function updateFromPoint(clientX, clientY) {
    if (!cardEl) return;

    const rect = cardEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));

    mx = Math.round(px * 100);
    my = Math.round(py * 100);

    const tiltX = (0.5 - py) * 10; // max 10deg
    const tiltY = (px - 0.5) * 12; // max 12deg
    rx = Number(tiltX.toFixed(2));
    ry = Number(tiltY.toFixed(2));
  }

  function onPointerMove(e) {
    hovering = true;
    updateFromPoint(e.clientX, e.clientY);
  }

  function onPointerEnter() {
    hovering = true;
  }

  function onPointerLeave() {
    hovering = false;
    mx = 50;
    my = 35;
    rx = 0;
    ry = 0;
  }

  function onPointerDown(e) {
    // En móvil: al tocar queremos que el glow se posicione de inmediato
    hovering = true;
    updateFromPoint(e.clientX, e.clientY);
  }
</script>

<div class="relative min-h-[calc(100dvh-7rem)] px-4 py-12 flex items-center justify-center overflow-hidden">
  <!-- Immersive background -->
  <div class="pointer-events-none absolute inset-0">
    <div class="absolute inset-0 bg-[#05070f]"></div>

    <div
      class="absolute -top-28 -left-28 h-[30rem] w-[30rem] rounded-full blur-3xl opacity-40
             bg-gradient-to-br from-indigo-500/40 via-cyan-400/25 to-emerald-400/20"
    ></div>

    <div
      class="absolute -bottom-32 -right-32 h-[32rem] w-[32rem] rounded-full blur-3xl opacity-35
             bg-gradient-to-br from-fuchsia-500/28 via-purple-500/22 to-sky-400/16"
    ></div>

    <div
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[38rem] w-[38rem]
             rounded-full blur-3xl opacity-25 bg-gradient-to-br from-white/10 to-transparent"
    ></div>

    <!-- subtle grid -->
    <div
      class="absolute inset-0 opacity-[0.08]"
      style="background-image: linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px),
                             linear-gradient(to bottom, rgba(255,255,255,.35) 1px, transparent 1px);
             background-size: 72px 72px;"
    ></div>

    <!-- vignette -->
    <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55"></div>
  </div>

  <div class="relative w-full max-w-md animate-in">
    <!-- Card -->
    <div
      bind:this={cardEl}
      onpointerenter={onPointerEnter}
      onpointermove={onPointerMove}
      onpointerdown={onPointerDown}
      onpointerleave={onPointerLeave}
      class="group relative rounded-[28px] border border-white/10 bg-white/[0.06] backdrop-blur-xl
             shadow-[0_30px_90px_-50px_rgba(0,0,0,0.85)] overflow-hidden will-change-transform touchy"
      class:shake={shake}
      style={`--mx:${mx}%; --my:${my}%; --rx:${rx}deg; --ry:${ry}deg;`}
      data-hovering={hovering ? '1' : '0'}
    >
      <!-- dynamic glow -->
      <div class="pointer-events-none absolute inset-0 glow-layer"></div>

      <!-- subtle sheen -->
      <div class="pointer-events-none absolute inset-0 opacity-70">
        <div class="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-white/10 blur-2xl"></div>
        <div class="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-white/5 blur-2xl"></div>
      </div>

      <!-- inner border -->
      <div
        class="pointer-events-none absolute inset-0 rounded-[28px]"
        style="box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);"
      ></div>

      <div class="relative p-6 sm:p-8">
        <!-- Header -->
        <div class="flex items-start gap-3">
          <div
            class="h-11 w-11 rounded-2xl grid place-items-center
                   bg-gradient-to-br from-cyan-400/25 via-emerald-400/15 to-indigo-400/20
                   border border-white/10 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)]
                   floaty"
          >
            <span class="text-zinc-100 font-semibold text-lg">I</span>
          </div>

          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-semibold text-zinc-100 leading-tight tracking-tight">
              Acceso al sistema
            </h1>
            <p class="text-sm text-zinc-400 mt-1">
              Inicia sesión para administrar eventos.
            </p>
          </div>
        </div>

        <!-- Form -->
        <form method="POST" use:enhance={onEnhance} class="mt-6 space-y-4">
          <!-- Email -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-zinc-300" for="email">Correo</label>

            <div class="relative">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                inputmode="email"
                required
                disabled={submitting}
                placeholder="tu@email.com"
                class="w-full px-4 py-3 rounded-2xl bg-black/25 border border-white/10 text-zinc-100
                       placeholder:text-zinc-500 outline-none transition
                       focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10
                       disabled:opacity-60"
              />
              <div class="pointer-events-none absolute inset-0 rounded-2xl sheen"></div>
            </div>
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-zinc-300" for="password">Contraseña</label>

            <div class="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autocomplete="current-password"
                autocorrect="off"
                spellcheck="false"
                required
                minlength="8"
                disabled={submitting}
                placeholder="••••••••"
                class="w-full px-4 py-3 pr-12 rounded-2xl bg-black/25 border border-white/10 text-zinc-100
                       placeholder:text-zinc-500 outline-none transition
                       focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10
                       disabled:opacity-60"
              />

              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm rounded-xl
                       text-xs text-zinc-400/80 hover:text-zinc-800 mr-2.5"
                onclick={() => (showPassword = !showPassword)}
                disabled={submitting}
                aria-label="Mostrar u ocultar contraseña"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>

              <div class="pointer-events-none absolute inset-0 rounded-2xl sheen"></div>
            </div>

            <p class="text-[11px] text-zinc-500">Mínimo 8 caracteres.</p>
          </div>

          {#if form?.message}
            <div class="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p class="text-sm text-red-200">{form.message}</p>
            </div>
          {/if}

          <button
            type="submit"
            disabled={submitting}
            class="w-full relative inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                   bg-gradient-to-b from-cyan-300 to-emerald-300 text-zinc-900 font-semibold
                   shadow-[0_18px_40px_-25px_rgba(34,211,238,0.65)]
                   hover:opacity-95 active:translate-y-[1px] active:opacity-90
                   disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <span class="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/40"></span>

            {#if submitting}
              <span class="loading loading-spinner loading-sm"></span>
              Entrando…
            {:else}
              Entrar
            {/if}
          </button>
        </form>
      </div>

      <div class="px-6 sm:px-8 py-4 border-t border-white/10 bg-black/15">
        <p class="text-[11px] text-zinc-400 leading-relaxed">
          DIF Coahuila, Secretaria Tecnica
        </p>
      </div>
    </div>

    <p class="mt-5 text-center text-[11px] text-zinc-500">
      Al iniciar sesión aceptas el uso de cookies de sesión para mantener tu acceso seguro.
    </p>
  </div>
</div>

<style>
  .touchy { touch-action: manipulation; }

  /* Entry animation */
  .animate-in {
    animation: enter 520ms cubic-bezier(.2,.85,.2,1) both;
  }
  @keyframes enter {
    from { opacity: 0; transform: translateY(14px) scale(0.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Floating icon */
  .floaty { animation: floaty 3.6s ease-in-out infinite; }
  @keyframes floaty {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  /* 3D tilt */
  .group {
    transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) translateZ(0);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .group[data-hovering="0"] {
    transition: transform 260ms ease;
  }

  /* dynamic glow */
  .glow-layer {
    background:
      radial-gradient(800px 500px at var(--mx) var(--my),
        rgba(34,211,238,0.18),
        rgba(16,185,129,0.10) 30%,
        rgba(255,255,255,0.06) 55%,
        transparent 72%);
    opacity: 0;
    transition: opacity 160ms ease;
  }
  .group[data-hovering="1"] .glow-layer {
    opacity: 1;
  }

  /* sheen inside inputs */
  .sheen {
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
    opacity: 0;
    transition: opacity 180ms ease;
  }
  .group:focus-within .sheen {
    opacity: 1;
  }

  /* Shake on error */
  .shake {
    animation: shake 520ms cubic-bezier(.36,.07,.19,.97) both;
  }
  @keyframes shake {
    10%, 90% { transform: translateX(-1px) perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)); }
    20%, 80% { transform: translateX(2px)  perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)); }
    30%, 50%, 70% { transform: translateX(-4px) perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)); }
    40%, 60% { transform: translateX(4px)  perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)); }
  }

  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .animate-in, .floaty, .shake { animation: none !important; }
    .group { transition: none !important; transform: none !important; }
    .glow-layer { transition: none !important; }
  }
</style>
