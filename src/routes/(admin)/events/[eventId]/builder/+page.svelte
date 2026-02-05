<script>
  // src/routes/(admin)/events/[eventId]/builder/+page.svelte
  import BuilderAside from "$components/BuilderAside.svelte";
  import Preview from "$components/Preview.svelte";

  import {
    information,
    guests,
    normalizeInformation,
    setInformation
  } from "$lib/stores/event.js";

  import { currentEventId } from "$lib/stores/current.js";

  const { data } = $props();

  let initDone = $state(false);

  // UI autosave
  let autosaveState = $state("idle"); // 'idle' | 'saving' | 'saved' | 'error'
  let autosaveError = $state("");
  let lastSavedAt = $state("");

  // estados individuales
  let savingInfo = $state(false);
  let savingGuests = $state(false);
  let saveInfoError = $state("");
  let saveGuestsError = $state("");

  // timers debounce
  let tInfo;
  let tGuests;

  // baseline server
  let serverInfo = null;
  let serverInfoSig = "";
  let serverGuestsSig = "";

  // control de concurrencia / backoff
  let saveInfoSeq = 0;
  let infoAbort = null;
  let infoBackoffUntil = 0;

  let guestsAbort = null;
  let guestsBackoffUntil = 0;

  // móvil: evita “empalme” mostrando solo 1 panel
  let mobileTab = $state("editor"); // 'editor' | 'preview'

  const ASSET_KEYS = ["logo", "logo1", "logo2", "logo3", "logo4", "logo5"];

  function nowLabel() {
    try {
      return new Date().toLocaleTimeString();
    } catch {
      return "";
    }
  }

  function clone(obj) {
    try {
      return structuredClone(obj);
    } catch {
      return JSON.parse(JSON.stringify(obj ?? {}));
    }
  }

  function isTempOrUnsafeUrl(v) {
    return (
      typeof v === "string" &&
      (v.startsWith("blob:") || v.startsWith("data:"))
    );
  }

  // ✅ NUNCA guardar blob: ni data: (solo URLs persistentes)
  function sanitizeForSave(info, baseline) {
    const clean = clone(info ?? {});
    const base = baseline ?? {};

    // logos directos
    for (const k of ASSET_KEYS) {
      if (isTempOrUnsafeUrl(clean?.[k])) {
        clean[k] = typeof base?.[k] === "string" ? base[k] : "";
      }
    }

    // bgImage anidado
    if (!clean.design) clean.design = {};
    if (isTempOrUnsafeUrl(clean?.design?.bgImage)) {
      clean.design.bgImage =
        typeof base?.design?.bgImage === "string" ? base.design.bgImage : "";
    }

    return clean;
  }

  // stringify estable (para dirty-check real)
  function stableStringify(value) {
    const seen = new WeakSet();

    const walk = (v) => {
      if (v === null || v === undefined) return v;

      const t = typeof v;
      if (t === "string" || t === "number" || t === "boolean") return v;

      if (v instanceof Date) return v.toISOString();

      if (Array.isArray(v)) return v.map(walk);

      if (t === "object") {
        if (seen.has(v)) return null; // evita ciclos (no deberían existir)
        seen.add(v);
        const out = {};
        for (const key of Object.keys(v).sort()) out[key] = walk(v[key]);
        return out;
      }

      return null;
    };

    return JSON.stringify(walk(value));
  }

  function safeReadJsonText(text) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  let lastLoadedEventId = $state(null);

  // ✅ carga inicial
  $effect(() => {
    const ev = data?.event;
    const evId = ev?.id;

    if (!evId) return;
    if (lastLoadedEventId === evId) return;
    lastLoadedEventId = evId;

    const normalized = normalizeInformation(clone(ev.event_json || {}));
    serverInfo = normalized;

    // baseline signatures
    serverInfoSig = stableStringify(normalized);

    setInformation(normalized);

    if (Array.isArray(data?.guests)) {
      const mapped = data.guests.map((g) => ({
        id:
          g.id ||
          (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
        name: g.name || "",
        email: g.email || "",
        role: g.role || "",
        department: g.department || ""
      }));
      guests.set(mapped);
      serverGuestsSig = JSON.stringify(mapped);
    } else {
      guests.set([]);
      serverGuestsSig = "[]";
    }

    currentEventId.set(evId);
    initDone = true;
    autosaveState = "idle";
    autosaveError = "";
    saveInfoError = "";
    saveGuestsError = "";
  });

  // ✅ guarda info (ya sanitizada y normalizada)
  async function saveInfo(eventId, safeInfo) {
    if (!eventId) return;
    if (Date.now() < infoBackoffUntil) return;

    savingInfo = true;
    const mySeq = ++saveInfoSeq;

    // aborta request anterior
    try {
      infoAbort?.abort?.();
    } catch {}
    infoAbort = new AbortController();

    try {
      autosaveState = "saving";
      autosaveError = "";
      saveInfoError = "";

      const bodyObj = {
        event_json: safeInfo,
        title: String(safeInfo?.name || "").trim()
      };

      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: infoAbort.signal,
        body: JSON.stringify(bodyObj)
      });

      if (mySeq !== saveInfoSeq) return; // llegó uno más nuevo

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        const j = safeReadJsonText(raw);
        const msg = j?.error || j?.message || raw || `No se pudo guardar (${res.status})`;

        // backoff si es timeout (57014)
        if (raw.includes("57014") || msg.toLowerCase().includes("statement timeout")) {
          infoBackoffUntil = Date.now() + 30_000;
        }

        saveInfoError = msg;
        autosaveState = "error";
        autosaveError = msg;
        return;
      }

      // ✅ actualiza baseline (dirty-check)
      serverInfo = safeInfo;
      serverInfoSig = stableStringify(safeInfo);

      autosaveState = "saved";
      lastSavedAt = nowLabel();
    } catch (e) {
      if (e?.name === "AbortError") return;
      const msg = e?.message || "Error guardando la invitación";
      saveInfoError = msg;
      autosaveState = "error";
      autosaveError = msg;
    } finally {
      if (mySeq === saveInfoSeq) savingInfo = false;
    }
  }

  // ✅ guarda guests (con dirty-check)
  async function saveGuestsList(eventId, list) {
    if (!eventId) return;
    if (Date.now() < guestsBackoffUntil) return;

    savingGuests = true;

    try {
      guestsAbort?.abort?.();
    } catch {}
    guestsAbort = new AbortController();

    try {
      autosaveState = "saving";
      autosaveError = "";
      saveGuestsError = "";

      const EMAIL_RE = /.+@.+\..+/;

      const cleanList = (Array.isArray(list) ? list : []).map((g) => ({
        ...g,
        email: String(g?.email || '').trim().toLowerCase()
      })).filter((g) => {
        // decide tu regla: si quieres exigir email para persistir:
        if (!g.email) return false;
        return EMAIL_RE.test(g.email);
      });


      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: guestsAbort.signal,
        body: JSON.stringify({ guests: list })
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        const j = safeReadJsonText(raw);
        const msg = j?.error || j?.message || raw || `No se pudo guardar invitados (${res.status})`;

        if (raw.includes("57014") || msg.toLowerCase().includes("statement timeout")) {
          guestsBackoffUntil = Date.now() + 30_000;
        }

        saveGuestsError = msg;
        autosaveState = "error";
        autosaveError = msg;
        return;
      }

      serverGuestsSig = JSON.stringify(list);

      autosaveState = "saved";
      lastSavedAt = nowLabel();
    } catch (e) {
      if (e?.name === "AbortError") return;
      const msg = e?.message || "Error guardando invitados";
      saveGuestsError = msg;
      autosaveState = "error";
      autosaveError = msg;
    } finally {
      savingGuests = false;
    }
  }

  // ✅ autosave info (debounce + dirty-check + NO blob/data)
  $effect(() => {
    if (!initDone) return;

    const eventId = data?.event?.id;
    if (!eventId) return;

    // construye el objeto a guardar SIN blob/data y normalizado
    const safe0 = sanitizeForSave($information, serverInfo);
    const safeInfo = normalizeInformation(safe0);
    const sig = stableStringify(safeInfo);

    // ✅ evita autosave “en frío”
    if (sig === serverInfoSig) return;

    clearTimeout(tInfo);
    tInfo = setTimeout(() => {
      saveInfo(eventId, safeInfo);
    }, 700);

    return () => clearTimeout(tInfo);
  });

  // ✅ autosave guests (debounce + dirty-check)
  $effect(() => {
    if (!initDone) return;

    const eventId = data?.event?.id;
    if (!eventId) return;

    const list = $guests;
    const sig = JSON.stringify(list ?? []);

    if (sig === serverGuestsSig) return;

    clearTimeout(tGuests);
    tGuests = setTimeout(() => {
      saveGuestsList(eventId, list);
    }, 700);

    return () => clearTimeout(tGuests);
  });

  // ✅ cleanup al desmontar
  $effect(() => {
    return () => {
      try { infoAbort?.abort?.(); } catch {}
      try { guestsAbort?.abort?.(); } catch {}
      clearTimeout(tInfo);
      clearTimeout(tGuests);
    };
  });
</script>

<div class="h-full min-h-0 flex flex-col">
  <!-- Mobile toggle (evita empalme) -->
  <div class="xl:hidden mb-3 flex items-center gap-2">
    <button
      type="button"
      class={"btn btn-sm rounded-2xl flex-1 " + (mobileTab === "editor" ? "btn-neutral text-white" : "btn-ghost")}
      onclick={() => (mobileTab = "editor")}
    >
      Editor
    </button>

    <button
      type="button"
      class={"btn btn-sm rounded-2xl flex-1 " + (mobileTab === "preview" ? "btn-neutral text-white" : "btn-ghost")}
      onclick={() => (mobileTab = "preview")}
    >
      Vista previa
    </button>
  </div>

  <div
    class="flex-1 min-h-0 grid grid-cols-1 gap-6 items-start
           xl:grid-cols-[minmax(0,1fr)_560px]
           2xl:grid-cols-[minmax(0,1fr)_600px]"
  >
    <!-- Aside -->
    <aside
      class={"min-w-0 min-h-0 xl:order-2 " + (mobileTab !== "editor" ? "hidden xl:block" : "")}
    >
      <div class="h-full min-h-0">
        <BuilderAside />
      </div>
    </aside>

    <!-- Preview -->
    <section
      class={"min-w-0 min-h-0 xl:order-1 " + (mobileTab !== "preview" ? "hidden xl:block" : "")}
    >
      <div class="h-full min-h-0 rounded-3xl border border-base-300 bg-base-100/10 p-4 sm:p-6">
        <Preview />
      </div>
    </section>
  </div>

  <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
    <span>
      {#if saveInfoError || saveGuestsError}
        <span class="text-red-400">Error guardando: {saveInfoError || saveGuestsError}</span>
      {:else if autosaveState === "saving" || savingInfo || savingGuests}
        Guardando…
      {:else if autosaveState === "saved"}
        Guardado {lastSavedAt ? "· " + lastSavedAt : ""}
      {:else}
        Auto-guardado…
      {/if}
    </span>

    <a class="link" href="/events">Volver a eventos</a>
  </div>
</div>
