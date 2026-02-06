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
  <!-- ✅ Render “para screenshot”: invitación completa escalada (sin crop) -->
  {@const scale = getScale()}
  {@const outW = Math.round(BASE_W * scale)}
  {@const outH = Math.round(BASE_H * scale)}

  <div class="bg-white">
    <div
      id="invite-frame"
      style={`width:${outW}px;height:${outH}px;background:#fff;`}
    >
      <div
        style={`width:${BASE_W}px;height:${BASE_H}px;
                transform:scale(${scale});
                transform-origin:top left;`}
      >
        <Template />
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-zinc-900 py-10 px-4">
    <div class="max-w-3xl mx-auto">
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">{data?.event_title || "Invitación"}</h2>

          {#if data?.guest_name}
            <p class="opacity-80">Hola {data.guest_name}.</p>
          {/if}

          {#if (data?.guest_role && data.guest_role.trim()) || (data?.guest_department && data.guest_department.trim())}
            <div
              class="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-base-300 bg-base-200/40 text-xs opacity-80"
            >
              <span>{(data.guest_role || "").trim()}</span>
              {#if (data.guest_role || "").trim() && (data.guest_department || "").trim()}
                ·
              {/if}
              <span>{(data.guest_department || "").trim()}</span>
            </div>
          {/if}

          <div class="mt-8 flex justify-center">
            <div class="w-132 h-160 rounded-md relative overflow-hidden">
              <Template />
            </div>
          </div>

          <p class="opacity-70 mt-3 text-center text">
            Puedes confirmar desde aquí.
          </p>

          <div class="mt-4 flex flex-wrap gap-6 text-center justify-center">
            <!-- Confirmar: Verde Acua Llamativo con Gradiente -->
            <a
              class="btn border-none rounded-xl p-2.5 bg-linear-to-r from-cyan-400 to-emerald-400 text-white shadow-lg hover:scale-105 hover:from-cyan-500 hover:to-emerald-500 transition-all duration-300"
              href={`/api/invites/${data.token}/confirm`}
            >
              ¡Confirmar!
            </a>

            <!-- No podré: Estilo minimalista pero elegante -->
            <a
              class="btn btn-ghost gap-2 rounded-xl p-2.5 bg-linear-to-r from-red-400 to-red-800 text-white border-slate-300 hover:scale-105 hover:bg-red-50 hover:text-white transition-all duration-300"
              href={`/api/invites/${data.token}/decline`}
            >
              No podré
            </a>

            <!-- Acompañantes: Outline acua -->
            <a
              class="btn btn-ghost gap-2 rounded-xl p-2.5 bg-linear-to-r from-cyan-400 to-cyan-800 text-white border-slate-300 hover:scale-105 hover:bg-cyan-50 hover:text-white transition-all duration-300"
              href={`/rsvp/${data.token}`}
            >
              Acompañantes
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
