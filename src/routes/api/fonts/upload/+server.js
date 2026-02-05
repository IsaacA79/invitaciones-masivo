import { json, error } from '@sveltejs/kit';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { requireRole, rateLimitOrThrow } from '$lib/server/guards.server.js';

export const POST = async (event) => {
  // roles que pueden subir assets
  const { user } = await requireRole(event, ['admin', 'designer']);

  // rate limit por IP + user
  await rateLimitOrThrow(event, {
    name: 'fonts_upload',
    key: `${event.locals.ip}:${user.id}`,
    limit: 10,
    windowSeconds: 60
  });

  const form = await event.request.formData();
  const file = form.get('font');
  if (!file || typeof file === 'string') throw error(400, 'No se recibió el archivo "font".');

  const allowed = new Set(['.ttf', '.otf', '.woff', '.woff2']);
  const ext = path.extname(file.name || '').toLowerCase();
  if (!allowed.has(ext)) throw error(415, 'Tipo de fuente no soportado.');

  // limite tamaño (ej 2MB) para evitar abuso
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > 2 * 1024 * 1024) throw error(413, 'Archivo demasiado grande.');

  const safeBase = (file.name || `fuente${ext}`).replace(/[^a-z0-9._-]+/gi, '_');
  const fileName = `${Date.now()}-${safeBase}`;

  const dir = path.join(process.cwd(), 'static', 'fonts');
  await mkdir(dir, { recursive: true });

  await writeFile(path.join(dir, fileName), bytes);

  return json({
    url: `/fonts/${fileName}`,
    name: safeBase.replace(/\.[^.]+$/, '')
  });
};
