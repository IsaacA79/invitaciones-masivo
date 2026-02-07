<script>
  import { generateImage } from "./../utils/converts.js";
  // src/lib/components/TabSend.svelte
  import MailIcon from "$icons/mail";
  import { guests, information } from "$lib/stores/event.js";
  import { currentEventId } from "$lib/stores/current.js";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";

  const EMAIL_RE = /.+@.+\..+/;

  let subject = $state("");
  let message = $state("");
  let error = $state("");
  let warning = $state("");
  let sending = $state(false);

  // ✅ role y approved vienen del SSR (admin layout + builder load)
  const role = $derived.by(() => $page.data?.role || "viewer");
  const approved = $derived.by(() => $page.data?.event?.approved ?? false);

  // ✅ quién puede ver TabSend (visible para capturista si así lo deseas)
  const canSeeSend = $derived.by(() =>
    ["admin", "sender", "capturista"].includes(role),
  );

  // ✅ quién puede ejecutar el envío ahora
  const canSendNow = $derived.by(
    () => role === "admin" || role === "capturista" || approved,
  );

  // ✅ eventId robusto (URL -> store -> information.id)
  const eventId = $derived.by(
    () => $page.params.eventId || $currentEventId || $information?.id || "",
  );

  function dedupeGuestsByEmail(list) {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    for (const g of Array.isArray(list) ? list : []) {
      const email = String(g?.email || "")
        .trim()
        .toLowerCase();

      // deja pasar vacíos (validateData los bloqueará)
      if (!email) {
        unique.push(g);
        continue;
      }

      if (seen.has(email)) {
        duplicates.push({ email, name: String(g?.name || "").trim() });
        continue;
      }

      seen.add(email);
      unique.push(g);
    }

    return { unique, duplicates };
  }

  function formatDupAlert(duplicates) {
    const emails = duplicates.map((d) => d.email);
    const head = emails.slice(0, 6).join(", ");
    const more = emails.length > 6 ? ` y ${emails.length - 6} más` : "";
    return `Se detectaron ${emails.length} correos duplicados. Se eliminaron de la lista y NO se enviarán: ${head}${more}`;
  }

  function validateData() {
    error = "";
    subject = subject.trim();
    message = message.trim();

    if (!eventId)
      return (error = "No hay evento seleccionado (eventId)"), false;
    if (subject.length < 3)
      return (error = "Ingrese un asunto más largo"), false;
    if (message.length < 3)
      return (error = "Ingrese un mensaje más largo"), false;
    if ($guests.length === 0)
      return (error = "Agregue al menos un invitado"), false;

    const bad = $guests.filter(
      (g) => !g.email || !EMAIL_RE.test(String(g.email)),
    );
    if (bad.length) return (error = "Hay correos inválidos en la lista"), false;

    return true;
  }

  function getInvitationHTML() {
    if (!browser) return "";
    const svg =
      document.getElementById("invitacion") || document.querySelector("svg");
    if (!svg) return "";

    let html = svg.outerHTML;

    // compat: autocierre en tags comunes
    html = html.replace(/<br( [^>]*)?>/gi, "<br$1 />");
    html = html.replace(/<img( [^>]*?)>(?!\s*<\/img>)/gi, "<img$1 />");

    // escape de & en href/src
    html = html.replace(
      /\b(xlink:href|href|src)="([^"]*)"/gi,
      (m, attr, val) =>
        `${attr}="${val.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;")}"`,
    );

    return html;
  }

  async function onSend() {
    if (sending) return;

    // ✅ bloquea envío si no está aprobado (muestra error, no warning)
    if (!canSendNow) {
      error = "Pendiente aprobación del admin para enviar.";
      return;
    }

    // ✅ 1) limpia duplicados por email y avisa
    warning = "";
    const { unique, duplicates } = dedupeGuestsByEmail($guests);

    if (duplicates.length) {
      $guests = unique; // ✅ se actualiza la lista automáticamente
      warning = formatDupAlert(duplicates);
      alert(warning); // opcional
    }

    // ✅ 2) valida ya con la lista limpia
    if (!validateData()) return;

    sending = true;

    try {
      const html = getInvitationHTML();

      const { blob, file } = await generateImage();

      const payload = {
        eventId,
        subject,
        message,
        guests: $guests.map((g) => ({
          id: g.id,
          name: g.name,
          email: g.email,
          role: g.role,
          department: g.department,
        })),
        html,
        information: $information,
      };

      const fd = new FormData();

      fd.append("payload", JSON.stringify(payload));
      fd.append(
        "image",
        file ?? new File([blob], "invitacion.jpeg", { type: "image/jpeg" }),
      );

      const res = await fetch("/api/send-invites", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const raw = await res.text().catch(() => "");
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (!res.ok)
        throw new Error(
          data?.error || raw || `Error al enviar (${res.status})`,
        );

      alert(
        `¡Listo! Se enviaron ${data.sent} invitaciones. Fallidas: ${data.failed ?? 0}`,
      );
    } catch (e) {
      console.error(e);
      error = e?.message || "Error al enviar";
    } finally {
      sending = false;
    }
  }
</script>

{#if !canSeeSend}
  <div class="alert alert-error rounded-xl">
    <span class="text-sm"
      >Sin permisos para enviar invitaciones (rol: {role}).</span
    >
  </div>
{:else}
  <section class="bg-base-100 border border-base-300 rounded-2xl p-6">
    <div class="flex flex-col gap-5 w-full mb-3">
      <span class="text-xl tracking-wide">
        {#if $guests.length > 0}
          {$guests.length}
          {$guests.length === 1 ? `invitado` : `invitados`} en lista
        {:else}
          Aún no tienes invitados
        {/if}
      </span>

      {#if canSeeSend && !canSendNow}
        <div class="alert alert-warning rounded-xl">
          <span class="text-sm"
            >Pendiente aprobación del admin para enviar.</span
          >
        </div>
      {/if}

      {#if warning}
        <div class="alert alert-warning rounded-xl">
          <span class="text-sm">{warning}</span>
        </div>
      {/if}

      <label class="label flex flex-col items-start">
        <span>Asunto</span>
        <input
          bind:value={subject}
          type="text"
          class="input w-full"
          placeholder="Asunto de la invitación"
        />
      </label>

      <label class="label flex flex-col items-start">
        <span>Mensaje</span>
        <textarea
          bind:value={message}
          class="textarea w-full"
          placeholder="Mensaje de la invitación"
        ></textarea>
      </label>

      {#if error}
        <span class="text-sm text-red-400">* {error}</span>
      {/if}
    </div>

    <div class="w-full flex justify-center items-center mt-7">
      {#if $guests.length > 0}
        <button
          class="w-3/5 bg-teal-600 py-2.5 text-sm tracking-wider rounded-md px-2 uppercase flex justify-center items-center gap-2 cursor-pointer disabled:opacity-60"
          onclick={onSend}
          disabled={sending || !canSendNow}
          title={!canSendNow
            ? "Pendiente aprobación del admin"
            : "Enviar invitaciones"}
        >
          {sending
            ? "Enviando…"
            : `Enviar ${$guests.length} ${$guests.length === 1 ? "invitación" : "invitaciones"}`}
          <MailIcon size={18} />
        </button>
      {/if}
    </div>
  </section>
{/if}
