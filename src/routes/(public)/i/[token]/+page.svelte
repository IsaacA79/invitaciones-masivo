<script>
  // src/routes/(public)/i/[token]/+page.svelte
  import Template from "$components/Template.svelte";
  import { information } from "$lib/stores/event.js";
  import { onMount } from "svelte";

  const { data } = $props();

  onMount(() => {
    if (data?.event_json) information.set(data.event_json);
  });

  const BASE_W = 1280;
  const BASE_H = 1600;

  const getScale = () => {
    const s = Number(data?.renderScale ?? 0.55);
    return Number.isFinite(s) ? Math.min(Math.max(s, 0.2), 1) : 0.55;
  };
  
</script>

{#if data?.render}
  <!-- ✅ Render “para screenshot” (Mantiene lógica original) -->
  {@const scale = getScale()}
  <div class="bg-white">
    <div id="invite-frame" style={`width:${Math.round(BASE_W * scale)}px;height:${Math.round(BASE_H * scale)}px;background:#fff;`}>
      <div style={`width:${BASE_W}px;height:${BASE_H}px;transform:scale(${scale});transform-origin:top left;`}>
        <Template />
      </div>
    </div>
  </div>
{:else}
  <!-- 💎 UI Inmersiva Ajustada al Viewport (No Scroll) -->
  <div class="h-screen w-full relative flex items-center justify-center bg-[#050505] p-4 md:p-8 overflow-hidden">
    
    <!-- Efectos de profundidad 3D de fondo -->
    <div class="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-cyan-500/10 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald-500/10 rounded-full blur-[100px]"></div>

    <div class="relative z-10 w-full max-w-lg h-full max-h-[850px] flex flex-col justify-center">
      <!-- Tarjeta Glassmorphism con altura dinámica -->
      <div class="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full max-h-fit">
        
        <div class="p-6 md:p-10 flex flex-col h-full justify-between items-center text-center">
          
          <!-- Header -->
          <header>
            <h2 class="text-2xl md:text-3xl font-light tracking-tight text-white mb-1 italic">
              {data?.event_title || "Invitación"}
            </h2>
            {#if data?.guest_name}
              <p class="text-zinc-400 text-sm md:text-base font-light tracking-[0.1em] uppercase">
                Para: <span class="text-white font-normal">{data.guest_name}</span>
              </p>
            {/if}
          </header>

          <!-- Contenedor de la Invitación: Crece y se encoge según espacio disponible -->
          <div class="flex-1 my-6 flex items-center justify-center w-full min-h-0">
             <div class="relative h-full aspect-[132/160] max-h-full rounded-xl overflow-hidden shadow-2xl border border-white/5 group">
                <!-- Brillo dinámico sobre la invitación -->
                <div class="absolute inset-0 z-10 bg-linear-to-tr from-white/10 via-transparent to-transparent opacity-40 pointer-events-none"></div>
                <div class="w-full h-full scale-[1.01]">
                   <Template />
                </div>
             </div>
          </div>

          <!-- Acciones e Información Inferior -->
          <footer class="w-full space-y-6">
            {#if (data?.guest_role || data?.guest_department)}
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                <span class="text-cyan-400">{data.guest_role || ""}</span>
                {#if data.guest_role && data.guest_department}<span class="opacity-20">|</span>{/if}
                <span>{data.guest_department || ""}</span>
              </div>
            {/if}

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <!-- Botón Primario -->
              <a
                class="sm:col-span-1 flex items-center justify-center py-3 px-4 rounded-xl bg-white text-black text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-cyan-500/20"
                href={`/api/invites/${data.token}/confirm`}
              >
                ¡Confirmar!
              </a>

              <!-- Secundario -->
              <a
                class="flex items-center justify-center py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all"
                href={`/rsvp/${data.token}`}
              >
                Acompañantes
              </a>

              <!-- Terciario -->
              <a
                class="flex items-center justify-center py-3 px-4 rounded-xl text-zinc-500 text-xs hover:text-red-400 transition-colors"
                href={`/api/invites/${data.token}/decline`}
              >
                No podré
              </a>
            </div>
          </footer>

        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Prevención de scroll y optimización de renderizado */
  :global(body, html) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    background-color: #050505;
  }
</style>
