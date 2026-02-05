<script>
  // src/routes/(public)/i/[token]/+page.svelte
  import Template from '$components/Template.svelte';
  import { information } from '$lib/stores/event.js';
  import { onMount } from 'svelte';

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
          <h2 class="card-title">{data?.event_title || 'Invitación'}</h2>

          {#if data?.guest_name}
            <p class="opacity-80">Hola {data.guest_name}.</p>
          {/if}

          {#if (data?.guest_role && data.guest_role.trim()) || (data?.guest_department && data.guest_department.trim())}
            <div class="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-base-300 bg-base-200/40 text-xs opacity-80">
              <span>{(data.guest_role || '').trim()}</span>
              {#if (data.guest_role || '').trim() && (data.guest_department || '').trim()} · {/if}
              <span>{(data.guest_department || '').trim()}</span>
            </div>
          {/if}

          <p class="opacity-70 mt-3">
            Puedes confirmar desde aquí o dejar número de acompañantes y comentario.
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <a class="btn btn-success" href={`/api/invites/${data.token}/confirm`}>Confirmar</a>
            <a class="btn btn-error" href={`/api/invites/${data.token}/decline`}>No podré</a>
            <a class="btn btn-outline" href={`/rsvp/${data.token}`}>RSVP (acompañantes + comentario)</a>
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-center">
        <div class="w-132 h-160 rounded-md relative overflow-hidden">
          <Template />
        </div>
      </div>
    </div>
  </div>
{/if}