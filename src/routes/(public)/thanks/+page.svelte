<script>
  import { page } from '$app/stores';

  $: status = $page.url.searchParams.get('status') || 'saved';
</script>

<div class="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
  <div class="card bg-base-100 shadow max-w-lg w-full">
    <div class="card-body">
      {#if status === 'confirmed'}
        <h2 class="card-title">¡Gracias! Confirmado ✅</h2>
        <p class="opacity-80">Tu confirmación quedó registrada.</p>
      {:else if status === 'declined'}
        <h2 class="card-title">Registrado ❌</h2>
        <p class="opacity-80">Se registró que no podrás asistir.</p>
      {:else}
        <h2 class="card-title">Listo</h2>
        <p class="opacity-80">Tu respuesta quedó registrada.</p>
      {/if}

      <div class="mt-4">
        <a class="btn btn-primary" href="/">Inicio</a>
      </div>
    </div>
  </div>
</div>
