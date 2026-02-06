<script>
  import Template from '$components/Template.svelte';
  import { information } from '$lib/stores/event.js';
  import { onMount } from 'svelte';

  const { data } = $props();

  let attending = 'yes';
  let guests_count = 1;
  let comment = '';

  const isYes = $derived(attending === 'yes');

  onMount(() => {
    if (data?.event_json) information.set(data.event_json);
  });
</script>

<div class="min-h-screen relative overflow-hidden bg-zinc-950 text-zinc-100">
  <!-- Fondo futurista (radiales + grid sutil) -->
  <div class="pointer-events-none absolute inset-0">
    <div class="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-3xl"></div>
    <div class="absolute -bottom-48 -right-48 h-[34rem] w-[34rem] rounded-full bg-fuchsia-500/10 blur-3xl"></div>
    <div class="absolute inset-0 opacity-[0.08]"
      style="background-image: linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px); background-size: 48px 48px;">
    </div>
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_55%)]"></div>
  </div>

  <div class="relative mx-auto max-w-6xl px-4 py-10">
    <div class="grid gap-8 lg:grid-cols-2">
      <!-- Card -->
      <div
        class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl
               shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_80px_-35px_rgba(0,0,0,0.9)]"
      >
        <div class="p-6 sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">
                <span class="text-white/60"></span> {data?.event_title || 'Evento'}
              </h2>

              {#if data?.guest_name}
                <p class="mt-1 text-sm text-white/70">
                  Para: <span class="text-white">{data.guest_name}</span>
                  <span class="text-white/40">({data.guest_email})</span>
                </p>
              {/if}
            </div>

            <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70">
              <span class="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.65)]"></span>
              Confirmación
            </span>
          </div>

          <div class="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          <form method="POST" action={`/api/invites/${data.token}/rsvp`} class="mt-6 grid gap-5">
            <!-- Para garantizar envío del conteo aunque el input esté disabled -->
            <input type="hidden" name="guests_count" value={isYes ? guests_count : 0} />

            <fieldset class="grid gap-2">
              <legend class="text-sm font-medium text-white/85">¿Asistirás?</legend>

              <div class="grid grid-cols-2 gap-2">
                <label
                  class={`group cursor-pointer rounded-xl border px-4 py-3 transition
                    ${attending === 'yes'
                      ? 'border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
                      : 'border-white/10 bg-black/20 hover:border-white/20'}`}
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <input class="accent-cyan-400" type="radio" name="attending" value="yes" bind:group={attending} />
                      <span class="font-medium">Sí</span>
                    </div>
                    <span class={`h-2 w-2 rounded-full ${attending === 'yes' ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]' : 'bg-white/20'}`}></span>
                  </div>
                </label>

                <label
                  class={`group cursor-pointer rounded-xl border px-4 py-3 transition
                    ${attending === 'no'
                      ? 'border-fuchsia-400/40 bg-fuchsia-500/10 shadow-[0_0_0_1px_rgba(232,121,249,0.16)]'
                      : 'border-white/10 bg-black/20 hover:border-white/20'}`}
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <input class="accent-fuchsia-300" type="radio" name="attending" value="no" bind:group={attending} />
                      <span class="font-medium">No</span>
                    </div>
                    <span class={`h-2 w-2 rounded-full ${attending === 'no' ? 'bg-fuchsia-300 shadow-[0_0_12px_rgba(232,121,249,0.6)]' : 'bg-white/20'}`}></span>
                  </div>
                </label>
              </div>
            </fieldset>

            <fieldset class="grid gap-2">
              <legend class="text-sm font-medium text-white/85">
                Número de acompañantes <span class="text-white/50">(incluyéndote)</span>
              </legend>

              <div class="relative">
                <input
                  class="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white
                         outline-none transition placeholder:text-white/30
                         focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/15
                         disabled:cursor-not-allowed disabled:opacity-50"
                  type="number"
                  min="1"
                  max="5"
                  bind:value={guests_count}
                  disabled={!isYes}
                  inputmode="numeric"
                  placeholder="1"
                />
                <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-white/40">
                  máx 5
                </div>
              </div>

              <!-- <p class="text-xs text-white/55">
                 <span class="text-white/80">0</span>.
              </p> -->
            </fieldset>

            <fieldset class="grid gap-2">
              <legend class="text-sm font-medium text-white/85">Comentario</legend>
              <textarea
                class="w-full h-28 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white
                       outline-none transition placeholder:text-white/30
                       focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/15"
                name="comment"
                bind:value={comment}
                placeholder="Ej. Llegamos 15 min tarde..."
              ></textarea>
            </fieldset>

            <div class="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a
                class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2.5
                       text-sm text-white/80 hover:border-white/20 hover:bg-black/30 transition"
                href={`/i/${data.token}`}
              >
                Volver
              </a>

              <button
                class="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold
                       border border-cyan-400/30 bg-gradient-to-b from-cyan-400/20 to-cyan-400/5
                       hover:border-cyan-300/50 hover:from-cyan-300/25 hover:to-cyan-400/10
                       shadow-[0_0_24px_rgba(34,211,238,0.18)]
                       focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition"
                type="submit"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Preview -->
      <div class="lg:sticky lg:top-10 flex justify-center items-start">
        <div
          class="w-[22rem] sm:w-[26rem] lg:w-[33rem] h-[34rem] sm:h-[38rem] lg:h-[40rem]
                 rounded-2xl relative overflow-hidden
                 border border-white/10 bg-white/5 backdrop-blur-xl
                 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_120px_-70px_rgba(34,211,238,0.45)]"
        >
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.10),transparent_55%)]"></div>
          <div class="absolute inset-0 p-2">
            <div class="h-full w-full rounded-xl overflow-hidden bg-black/20">
              <Template />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- <p class="mt-10 text-center text-xs text-white/35">
      Tip: el diseño usa blur/glow sutil para verse bien en Windows e iOS sin saturar.
    </p> -->
  </div>
</div>
