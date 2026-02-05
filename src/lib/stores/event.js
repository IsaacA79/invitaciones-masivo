// src/lib/stores/event.js
import { writable } from 'svelte/store';

export const DEFAULT_FONTS = [
  'Arial',
  'Verdana',
  'Times New Roman',
  'Georgia',
  'Tahoma',
  'Trebuchet MS',
  'Courier New',
  'Impact',
  'System UI'
];

export const defaultInformation = {
  name: '',
  date: '',
  time: '',
  description: '',
  logo: '',
  logo1: '',
  logo2: '',
  logo3: '',
  logo4: '',
  logo5: '',
  address: '',
  design: {
    // ✅ nuevo: selector de plantilla
    template: 'clasico', // 'clasico' | 'moderno'

    // colores
    textColor: '#ffffff',
    urlColor: '#ffffff',
    accentColor: '#50c5c2',
    strokeColor: '#ffffff',

    // background
    bgMode: 'image', // 'image' | 'color'
    bgColor: '#000000',
    bgImage: '',
    bgScale: 1.35,
    bgX: 0,
    bgY: 0,
    bgOpacity: 1,
    bgWidth: 1280,
    bgHeight: 1600,

    // texto
    textOpacity: 1,
    uppercase: true,
    fontFamily: 'inherit',

    // ✅ nuevo: font title + lista disponibles (para select)
    titleFontFamily: 'inherit',
    availableFonts: DEFAULT_FONTS,

    // posiciones
    titleY: 0,
    dateY: 0,
    timeY: 0,
    descY: 0,
    webY: 0,

    titleX: 0,
    dateX: 0,
    timeX: 0,
    descX: 0,
    webX: 0,

    // sombras
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowBlur: 3,

    // borde
    borderRadius: 8,
    borderWidth: 6
  }
};

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

// Merge “deep-ish” para mantener defaults y no perder campos nuevos.
export function normalizeInformation(input) {
  const base = structuredClone(defaultInformation);
  const src = isObject(input) ? input : {};

  // top-level
  for (const k of Object.keys(base)) {
    if (k === 'design') continue;
    if (src[k] !== undefined) base[k] = src[k];
  }

  // design
  const d = isObject(src.design) ? src.design : {};
  base.design = { ...base.design, ...d };

  // sane defaults / compat
  if (!base.design.template) base.design.template = 'clasico';
  if (!['clasico', 'moderno'].includes(base.design.template)) base.design.template = 'clasico';

  if (!base.design.availableFonts || !Array.isArray(base.design.availableFonts)) {
    base.design.availableFonts = [...DEFAULT_FONTS];
  }

  if (!base.design.titleFontFamily) base.design.titleFontFamily = base.design.fontFamily || 'inherit';

  // bgMode
  if (base.design.bgMode !== 'image' && base.design.bgMode !== 'color') {
    base.design.bgMode = base.design.bgImage ? 'image' : 'color';
  }

  // clamps básicos para evitar NaN raros
  if (!Number.isFinite(+base.design.bgScale)) base.design.bgScale = 1.35;
  if (!Number.isFinite(+base.design.bgOpacity)) base.design.bgOpacity = 1;
  if (!Number.isFinite(+base.design.textOpacity)) base.design.textOpacity = 1;

  return base;
}

export const information = writable(structuredClone(defaultInformation));
export const guests = writable([]);

// ✅ helper para setear desde DB sin perder nuevos campos
export function setInformation(next) {
  information.set(normalizeInformation(next));
}

export function resetEventState() {
  information.set(structuredClone(defaultInformation));
  guests.set([]);
}
