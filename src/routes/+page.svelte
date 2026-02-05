<script>
  // landing simple (mejorada)
</script>

<div class="max-w-4xl mx-auto py-12 px-4">
  <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-lg">
    <div class="flex flex-col gap-2">
      <h2 class="text-3xl sm:text-4xl font-semibold text-zinc-100">Sistema de invitaciones</h2>
      <p class="text-zinc-300 max-w-2xl">
        Crea eventos, diseña invitaciones, carga invitados y envía correos con RSVP.
      </p>
    </div>

    <div class="mt-8 grid gap-4">
      <a
        href="/events"
        class="group w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-950 transition
               px-5 py-4 flex items-center justify-between"
      >
        <div class="flex flex-col">
          <span class="text-base font-medium text-zinc-100">Ir a eventos</span>
          <span class="text-sm text-zinc-400">Administra tus proyectos y abre el editor</span>
        </div>
        <span class="text-zinc-400 group-hover:text-zinc-200 transition">→</span>
      </a>

      <div class="h-px bg-zinc-800/80"></div>

      <a
        href="/login"
        class="group w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-950 transition
               px-5 py-4 flex items-center justify-between"
      >
        <div class="flex flex-col">
          <span class="text-base font-medium text-zinc-100">Iniciar sesión</span>
          <span class="text-sm text-zinc-400">Accede para crear y enviar invitaciones</span>
        </div>
        <span class="text-zinc-400 group-hover:text-zinc-200 transition">→</span>
      </a>

      <div class="h-px bg-zinc-800/80"></div>

      <a
        href="/events/new"
        class="group w-full rounded-2xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/15 transition
               px-5 py-4 flex items-center justify-between"
      >
        <div class="flex flex-col">
          <span class="text-base font-medium text-teal-200">Crear nuevo evento</span>
          <span class="text-sm text-teal-200/70">Empieza un proyecto desde cero</span>
        </div>
        <span class="text-teal-200/70 group-hover:text-teal-200 transition">→</span>
      </a>
    </div>

    <div class="mt-8 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
      <span class="badge badge-outline">RSVP</span>
      <span class="badge badge-outline">Email tracking</span>
      <span class="badge badge-outline">Import CSV/XLSX</span>
      <span class="badge badge-outline">Supabase</span>
    </div>
  </div>
</div>
