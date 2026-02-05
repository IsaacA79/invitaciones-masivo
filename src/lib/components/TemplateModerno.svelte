<script>
  // src/lib/components/TemplateModerno.svelte
  import { information } from '$lib/stores/event.js';

  const formatDate = (dateStr) => {
    const s = typeof dateStr === 'string' ? dateStr.trim() : '';

    // YYYY-MM-DD sin TZ shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const month = dt.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).toUpperCase();
      const day = dt.toLocaleDateString('es-ES', { day: '2-digit', timeZone: 'UTC' });
      return `${month.slice(0, 3)} ${day}`;
    }

    const dt = dateStr instanceof Date ? dateStr : new Date();
    const month = dt.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    const day = dt.toLocaleDateString('es-ES', { day: '2-digit' });
    return `${month.slice(0, 3)} ${day}`;
  };

  const formatTime = (timeStr) => {
    let date = new Date(`1970-01-01T${timeStr}`);
    if (!timeStr) date = new Date();
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const defaultBg =
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWVLYM6ORuOZS8fc-mKlPj-HkTPlINmsD_7Q&s';

  const logos = [
    { key: 'logo1', x: 90 },
    { key: 'logo2', x: 290 },
    { key: 'logo3', x: 490 },
    { key: 'logo4', x: 690 },
    { key: 'logo5', x: 890 }
  ];
</script>

<svg
  id="invitacion_moderno"
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1280 1600"
  class="w-full h-full"
  style={`--txt:${$information.design.textColor};
          --url:${$information.design.urlColor};
          --acc:${$information.design.accentColor};
          --stroke:${$information.design.strokeColor};
          --strokeW:${$information.design.borderWidth};
          --bg:${$information.design.bgColor};
          --txtOpacity:${$information.design.textOpacity};
          font-family:${$information.design.fontFamily};
          --titleFont:${$information.design.titleFontFamily || 'inherit'};`}
>
  <defs>
    <!-- ✅ Mask: blanco = visible, transparente = fade -->
    <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="1" />
      <stop offset="70%" stop-color="#fff" stop-opacity="1" />
      <stop offset="100%" stop-color="#fff" stop-opacity="0" />
    </linearGradient>

    <mask id="bgMask">
      <rect x="0" y="0" width="1280" height="1600" fill="url(#fadeBottom)" />
    </mask>

    <style>
      .fo {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
        overflow: hidden;
      }
      .break {
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .clamp2 {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      .clamp3 {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
      }

      /* glass */
      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 18px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(0, 0, 0, 0.22);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
      }

      .pillsRow {
        display: flex;
        gap: 14px;
        align-items: center;
        justify-content: center;
      }

      .darkGlass {
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.24);
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
      }

      .lineAccent {
        height: 2px;
        width: 340px;
        background: rgba(255, 255, 255, 0.22);
      }
    </style>
  </defs>

  <!-- Background -->
  <g id="background" style:opacity={$information.design.bgOpacity}>
    {#if $information.design.bgMode === 'color'}
      <rect style="fill: var(--bg);" x="0" y="0" width="1280" height="1600" />
    {:else}
      <image
        href={$information.design.bgImage || defaultBg}
        width={$information.design.bgWidth}
        height={$information.design.bgHeight}
        mask="url(#bgMask)"
        transform={`translate(${$information.design.bgX},${$information.design.bgY}) scale(${$information.design.bgScale})`}
        preserveAspectRatio="xMidYMid slice"
      />
    {/if}

    <!-- overlay readability -->
    <rect x="0" y="0" width="1280" height="1600" fill="rgba(0,0,0,0.12)" />
  </g>

  <!-- Frame -->
  <g id="frame" style="opacity:0.95">
    <rect
      x="70"
      y="60"
      width="1140"
      height="1480"
      rx={$information.design.borderRadius}
      ry={$information.design.borderRadius}
      style="fill:transparent; stroke:var(--stroke); stroke-width:var(--strokeW);"
    />
  </g>

  <!-- Top logos -->
  <g id="logos_top">
    {#each logos as s (s.key)}
      <foreignObject x={s.x} y="60" width="300" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
          {#if $information[s.key]}
            <img
              src={$information[s.key]}
              alt={s.key}
              style="max-width:140px; max-height:90px; object-fit:contain;"
            />
          {/if}
        </div>
      </foreignObject>
    {/each}
  </g>

  <!-- Main logo -->
  <g id="hero_logo">
    <foreignObject x="420" y="165" width="440" height="170">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
        <label for="logo_principal" class="cursor-alias">
          <img
            src={$information.logo || 'https://ceascoahuila.gob.mx/wp-content/uploads/2024/02/Coahuila_Blanco-1024x295.png'}
            alt="Logo del evento"
            style="max-width:420px; max-height:150px; object-fit:contain;"
          />
        </label>
      </div>
    </foreignObject>
  </g>

  <!-- ✅ Pills (ahora dateX/dateY y timeX/timeY funcionan por separado) -->
  <g id="pills">
    <foreignObject x="0" y="370" width="1280" height="140">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
        <div class="pillsRow" style={`color:var(--txt); opacity:var(--txtOpacity);`}>
          <div
            class="pill"
            style={`transform: translate(${$information.design.dateX}px, ${$information.design.dateY}px);`}
          >
            <span style="font-size:26px; letter-spacing:.18em; font-weight:300;">
              {formatDate($information.date || new Date())}
            </span>
          </div>

          <div
            class="pill"
            style={`transform: translate(${$information.design.timeX}px, ${$information.design.timeY}px);`}
          >
            <span style="font-size:26px; letter-spacing:.18em; font-weight:300;">
              {$information.time ? formatTime($information.time) : formatTime()}
            </span>
          </div>
        </div>
      </div>
    </foreignObject>
  </g>

  <!-- Title -->
  <g id="title" transform={`translate(${$information.design.titleX},${$information.design.titleY})`}>
    <foreignObject x="0" y="520" width="1280" height="340">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
        <p
          class="break clamp2"
          style={`margin:0;
                  padding:0 130px;
                  font-size:92px;
                  font-weight:250;
                  letter-spacing:.08em;
                  line-height:1.04;
                  text-transform:${$information.design.uppercase ? 'uppercase' : 'none'};
                  color:var(--txt);
                  opacity:var(--txtOpacity);
                  font-family: ${$information.design.titleFontFamily || $information.design.fontFamily || 'system-ui'};
                  text-shadow:${$information.design.shadowEnabled ? `${$information.design.shadowOffsetX}px ${$information.design.shadowOffsetY}px ${$information.design.shadowBlur}px ${$information.design.shadowColor}` : 'none'};`}
        >
          <label for="name_event" class="cursor-alias">
            {$information.name || 'Nombre del evento'}
          </label>
        </p>
      </div>
    </foreignObject>
  </g>

  <!-- Divider -->
  <g id="divider" transform={`translate(${$information.design.descX},${$information.design.descY})`}>
    <foreignObject x="0" y="865" width="1280" height="40">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
        <div  class="lineAccent" style={`background:${$information.design.accentColor || 'rgba(255,255,255,.22)'}`}></div>
      </div>
    </foreignObject>
  </g>

  <!-- Description -->
  <g id="description" transform={`translate(${$information.design.descX},${$information.design.descY})`}>
    <foreignObject x="0" y="920" width="1280" height="360">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
        <div class="darkGlass" style="border-radius:28px; width:960px; padding:28px 36px;">
          <p
            class="break clamp3"
            style={`margin:0;
                    font-size:44px;
                    font-weight:300;
                    line-height:1.2;
                    letter-spacing:.02em;
                    color:var(--txt);
                    font-family:${$information.design.titleFontFamily || $information.design.fontFamily || 'system-ui'};
                    opacity:var(--txtOpacity);
                    white-space:pre-wrap;
                    text-shadow:${$information.design.shadowEnabled ? `${$information.design.shadowOffsetX}px ${$information.design.shadowOffsetY}px ${$information.design.shadowBlur}px ${$information.design.shadowColor}` : 'none'};`}
          >
            <label for="description_event" class="cursor-alias">
              {$information.description || 'Descripción del evento'}
            </label>
          </p>
        </div>
      </div>
    </foreignObject>
  </g>

  <!-- Address -->
  <g id="address" transform={`translate(${$information.design.webX},${$information.design.webY})`}>
    <foreignObject x="0" y="1380" width="1280" height="170">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo">
        <div style="width:100%; padding:0 120px;">
          <p
            class="break clamp2"
            style={`margin:0;
                    text-align:center;
                    font-size:34px;
                    font-weight:300;
                    letter-spacing:.10em;
                    line-height:1.15;
                    color:${$information.design.urlColor || $information.design.textColor};
                    font-family:${$information.design.titleFontFamily || $information.design.fontFamily || 'system-ui'};
                    opacity:var(--txtOpacity);
                    text-shadow:${$information.design.shadowEnabled ? `${$information.design.shadowOffsetX}px ${$information.design.shadowOffsetY}px ${$information.design.shadowBlur}px ${$information.design.shadowColor}` : 'none'};`}
          >
            {$information.address || 'Dirección del evento'}
          </p>

          <div style="margin:22px auto 0; width:380px; height:2px; background:rgba(255,255,255,.18);"></div>

          <p
            style={`margin:18px 0 0;
                    text-align:center;
                    font-size:22px;
                    letter-spacing:.18em;
                    color:var(--txt);
                    opacity:.55;`}
          >
            • Confirmación requerida
          </p>
        </div>
      </div>
    </foreignObject>
  </g>
</svg>
