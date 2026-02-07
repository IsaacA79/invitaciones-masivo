<script>
  // src/lib/components/Template.svelte
  import { information } from '$lib/stores/event.js';
  import { normalizeTime, to12h } from '$lib/utils/time.js';

  function onBlur(e) {
    $information.time = normalizeTime(e.target.value);
  }

  const formatDate = (dateStr) => {
  // acepta "YYYY-MM-DD" o Date
    const s = typeof dateStr === 'string' ? dateStr.trim() : '';

    // Caso 1: viene del input date => YYYY-MM-DD (NO usar new Date(s))
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d)); // ✅ fijo, sin TZ shift
      const month = dt.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).toUpperCase();
      const day = dt.toLocaleDateString('es-ES', { day: '2-digit', timeZone: 'UTC' });
      return `${month.slice(0, 3)} ${day}`;
    }

    // Caso 2: si te llega Date (fallback)
    const dt = dateStr instanceof Date ? dateStr : new Date();
    const month = dt.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    const day = dt.toLocaleDateString('es-ES', { day: '2-digit' });
    return `${month.slice(0, 3)} ${day}`;
  };


  const formatTime = (timeStr) => {
    let date = new Date(`1970-01-01T${timeStr}`);
    if (!timeStr) date = new Date();
    const options = { hour: "numeric", minute: "2-digit", hour12: true };
    return date.toLocaleTimeString("en-US", options);
  };

  const defaultBg ="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWVLYM6ORuOZS8fc-mKlPj-HkTPlINmsD_7Q&amp;s";

  const logoSlots = [
    { key: 'logo1', x: 20 },
    { key: 'logo2', x: 230 },
    { key: 'logo3', x: 420 },
    { key: 'logo4', x: 620 },
    { key: 'logo5', x: 820 }
  ];
</script>

<svg
  id="invitacion"
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
    <filter id="txtShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow
        dx={$information.design.shadowEnabled ? $information.design.shadowOffsetX : 0}
        dy={$information.design.shadowEnabled ? $information.design.shadowOffsetY : 0}
        stdDeviation={$information.design.shadowEnabled ? $information.design.shadowBlur : 0}
        flood-color={$information.design.shadowColor}
        flood-opacity={$information.design.shadowEnabled ? 1 : 0}
      />
    </filter>

    <!-- ✅ Estilos para evitar overflow dentro de SVG/foreignObject -->
    <style>
      .fo-wrap{
        width:100%;
        height:100%;
        display:flex;
        justify-content:center;
        align-items:center;
        text-align:center;
        overflow:hidden;
      }
      .break{
        overflow-wrap:anywhere;
        word-break:break-word;
      }
      .clamp2{
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:2;
        overflow:hidden;
      }
      .clamp3{
        display:-webkit-box;
        -webkit-box-orient:vertical;
        -webkit-line-clamp:3;
        overflow:hidden;
      }
    </style>
  </defs>

  <g id="background" style:opacity={$information.design.bgOpacity}>
    {#if $information.design.bgMode === 'color'}
      <rect style="fill: var(--bg);" x="0" y="0" width="1280" height="1600" />
    {:else}
      <image
        href={$information.design.bgImage || defaultBg}
        width={$information.design.bgWidth}
        height={$information.design.bgHeight}
        style="-webkit-mask-image:linear-gradient(#000 50%, #0000 100%); mask-image:linear-gradient(#000 50%, #0000);"
        transform={`translate(${$information.design.bgX},${$information.design.bgY}) scale(${$information.design.bgScale})`}
        preserveAspectRatio="xMidYMid slice"
      />
    {/if}
  </g>

  <g id="logo1">
    <foreignObject x="20" y="0" width="200" height="200" transform="matrix(1.25,0,0,1.10,0,0)">
      <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center items-center h-full w-full scale-75">
        {#if $information.logo1}
          <img src={$information.logo1} alt="Logo 1" />
        {/if}
      </div>
    </foreignObject>
  </g>

  <g id="logo2">
    <foreignObject x="230" y="0" width="200" height="200" transform="matrix(1.25,0,0,1.10,0,0)">
      <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center items-center h-full w-40 ">
        {#if $information.logo2}
          <img src={$information.logo2} alt="Logo 2" />
        {/if}
      </div>
    </foreignObject>
  </g>

  <g id="logo3">
    <foreignObject x="420" y="0" width="200" height="200" transform="matrix(1.25,0,0,1.10,0,0)">
      <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center items-center h-full w-full">
        {#if $information.logo3}
          <img src={$information.logo3} alt="Logo 3" />
        {/if}
      </div>
    </foreignObject>
  </g>

  <g id="logo4">
    <foreignObject x="620" y="0" width="200" height="200" transform="matrix(1.25,0,0,1.10,0,0)">
      <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center items-center h-full w-full">
        {#if $information.logo4}
          <img src={$information.logo4} alt="Logo 4" />
        {/if}
      </div>
    </foreignObject>
  </g>

  <g id="logo5">
    <foreignObject x="820" y="0" width="200" height="200" transform="matrix(1.25,0,0,1.10,0,0)">
      <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center items-center h-full w-full">
        {#if $information.logo5}
          <img src={$information.logo5} alt="Logo 5" />
        {/if}
      </div>
    </foreignObject>
  </g>

  <!-- ✅ Title minimal + clamp 2 -->
  <g id="title" transform={`translate(${$information.design.titleX},${$information.design.titleY})`}>
    <!-- mantiene tu y original (680), pero con contenedor controlado -->
    <foreignObject x="0" y="620" width="1280" height="340">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">
        <p
          class="break clamp2"
          style={`margin:0;
                  padding:0 120px;
                  font-size:92px;
                  font-weight:300;
                  letter-spacing:.08em;
                  line-height:1.05;
                  text-transform:${$information.design.uppercase ? 'uppercase' : 'none'};
                  color:${$information.design.textColor};
                  opacity:${$information.design.textOpacity};
                  text-shadow:${$information.design.shadowEnabled ? `${$information.design.shadowOffsetX}px ${$information.design.shadowOffsetY}px ${$information.design.shadowBlur}px ${$information.design.shadowColor}` : 'none'};
                  font-family: ${$information.design.titleFontFamily || $information.design.fontFamily || 'system-ui'};`}
        >
          <label for="name_event" class="cursor-alias">
            {$information.name || "Nombre del evento"}
          </label>
        </p>
      </div>
    </foreignObject>
  </g>

  <!-- date (mantengo tu estructura; ojo: tu rect tiene x distinto al text, no lo toco para no romper layout) -->
  <g id="date" transform={`translate(${$information.design.dateX},${$information.design.dateY})`}>
    
    <text
      filter={$information.design.shadowEnabled ? "url(#txtShadow)" : null}
      text-anchor="middle"
      class="text-center text-6xl font-extralight tracking-widest"
      style="transform: matrix(1, 0, 0, 1, 500, 1005); fill: var(--txt); fill-opacity: var(--txtOpacity);"
    >
      {formatDate($information.date || new Date())}
    </text>
  </g>

  <g id="time" transform={`translate(${$information.design.timeX},${$information.design.timeY})`}>
    <rect x="745" y="933" width="245" height="100" rx={$information.design.borderRadius} ry={$information.design.borderRadius} style="fill: var(--acc);" />
    <rect x="745" y="933.5" width="245" height="100" rx={$information.design.borderRadius} ry={$information.design.borderRadius}
      style="fill:#0000; stroke: var(--stroke); stroke-width: var(--strokeW); paint-order: stroke fill markers;" />
    <text
      filter={$information.design.shadowEnabled ? "url(#txtShadow)" : null}
      text-anchor="middle"
      class="text-center text-5xl font-extralight tracking-widest"
      style="transform: matrix(1, 0, 0, 1, 870, 1000); fill: var(--txt); fill-opacity: var(--txtOpacity);"
    >
      {$information.time ? formatTime($information.time) : formatTime()}
    </text>
  </g>

  <!-- ✅ Description minimal + clamp 3 -->
  <g id="description">
    <foreignObject x="0" y="1100" width="1280" height="320">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">
        <p
          class="break clamp3"
          style={`margin:0;
                  padding:0 160px;
                  font-size:48px;
                  font-weight:300;
                  line-height:1.2;
                  letter-spacing:.02em;
                  color:${$information.design.textColor};
                  opacity:${$information.design.textOpacity};
                  text-shadow:${$information.design.shadowEnabled ? `${$information.design.shadowOffsetX}px ${$information.design.shadowOffsetY}px ${$information.design.shadowBlur}px ${$information.design.shadowColor}` : 'none'};
                  `}
        >
          <label for="description_event" class="cursor-alias">
            {$information.description || "Descripción del evento"}
          </label>
        </p>
      </div>
    </foreignObject>
  </g>

  <g id="logo">
    <foreignObject x="420" y="930" width="200" height="200" transform="matrix(1.25,0,0,1.35,0,0)">
      <div xmlns="http://www.w3.org/1999/xhtml" class="flex justify-center items-center h-full w-full scale-75">
        <label for="logo_principal" class="cursor-alias">
          <img src={$information.logo || '/img/Coahuila_Blanco-1024x295.png'} alt="Logo del evento" />
        </label>
      </div>
    </foreignObject>
  </g>

  <!-- ✅ Address: cambia <text> (no wrap) por foreignObject con clamp -->
  <g id="web" transform={`translate(${$information.design.webX},${$information.design.webY})`}>
    <foreignObject x="0" y="1460" width="1280" height="120">
      <div xmlns="http://www.w3.org/1999/xhtml" class="fo-wrap">
        <p
          class="break clamp2"
          style={`margin:0;
                  padding:0 120px;
                  font-size:34px;
                  font-weight:300;
                  letter-spacing:.08em;
                  line-height:1.15;
                  color:${$information.design.urlColor || $information.design.textColor};
                  opacity:${$information.design.textOpacity};
                  text-shadow:${$information.design.shadowEnabled ? `${$information.design.shadowOffsetX}px ${$information.design.shadowOffsetY}px ${$information.design.shadowBlur}px ${$information.design.shadowColor}` : 'none'};`}
        >
          {$information.address || "Dirección del evento"}
        </p>
      </div>
    </foreignObject>
  </g>
</svg>
