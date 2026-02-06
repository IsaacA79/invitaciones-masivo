<script>
  import { page } from "$app/stores";

  $: status = $page.url.searchParams.get("status") || "saved";

  function handleBackTwice() {
    if (typeof window !== "undefined") {
      // Verificamos si hay al menos 2 páginas atrás en el historial
      if (history.length > 2) {
        history.go(-2);
      } else if (history.length === 2) {
        // Si solo hay una página atrás, volvemos una
        history.back();
      } else {
        // Si no hay historial previo, intentamos cerrar o mandamos a "/"
        window.close();
        window.location.href = "/";
      }
    }
  }

  function closeWindow() {
    if (typeof window !== "undefined") {
      window.close();

      // Opcional: Si no se puede cerrar (por seguridad),
      // redirigir al inicio para que no parezca que el botón no sirve.
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }
</script>

<div
  class="relative min-h-screen flex items-center justify-center bg-[#09090b] overflow-hidden font-sans antialiased"
>
  <!-- Elementos 3D de Fondo (Luces/Esferas) -->
  <div
    class="absolute top-1/4 -left-20 w-72 h-72 bg-purple-600/30 rounded-full blur-[120px] animate-pulse"
  ></div>
  <div
    class="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"
  ></div>

  <!-- Contenedor Principal con Glassmorphism -->
  <div class="relative z-10 w-full max-w-md px-6">
    <div class="relative group">
      <!-- Efecto de Borde Brillante (Glow) -->
      <div
        class="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/5 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"
      ></div>

      <!-- Card con Glassmorphism -->
      <div
        class="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 overflow-hidden"
      >
        <!-- Reflejo Superior (Efecto Cristal) -->
        <div
          class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        ></div>

        <div class="text-center space-y-6">
          {#if status === "confirmed"}
            <!-- Icono 3D Simulado -->
            <div class="flex justify-center">
              <div
                class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
              >
                <span class="text-4xl">✅</span>
              </div>
            </div>
            <h2 class="text-3xl font-bold text-white tracking-tight">
              ¡Gracias!
            </h2>
            <p class="text-zinc-400 leading-relaxed text-lg">
              Tu confirmación ha sido registrada con éxito.
            </p>
          {:else if status === "declined"}
            <div class="flex justify-center">
              <div
                class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <span class="text-4xl">❌</span>
              </div>
            </div>
            <h2 class="text-3xl font-bold text-white tracking-tight">
              Registrado
            </h2>
            <p class="text-zinc-400 leading-relaxed text-lg">
              Lamentamos que no puedas asistir.
            </p>
          {:else}
            <div class="flex justify-center">
              <div
                class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10"
              >
                <span class="text-4xl">✨</span>
              </div>
            </div>
            <h2 class="text-3xl font-bold text-white tracking-tight">Listo</h2>
            <p class="text-zinc-400 leading-relaxed text-lg">
              Tu respuesta quedó guardada.
            </p>
          {/if}

          <!-- Botón Minimalista con Elevación -->
          <div class="pt-4">
            <button
              on:click={closeWindow}
              class="inline-block w-full py-4 px-8 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_10px_20px_rgba(255,255,255,0.1)] text-center"
            >
              Finalizar y Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
