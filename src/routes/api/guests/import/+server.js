// src/routes/api/guests/import/+server.js
import { json } from '@sveltejs/kit';
import XLSX from 'xlsx';
import { upsertGuests } from '$lib/server/repositories/guests.repo.js';

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '');

function findIdx(headers, candidates) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (candidates.some((c) => h.includes(c))) return i;
  }
  return -1;
}

function parseTable(rows) {
  const cleanRows = (rows ?? []).filter(
    (r) => Array.isArray(r) && r.some((x) => String(x ?? '').trim() !== '')
  );
  if (!cleanRows.length) return [];

  const header = cleanRows[0].map(norm);

  const looksLikeHeader =
    header.some((h) => h.includes('email')) ||
    header.some((h) => h.includes('correo')) ||
    header.some((h) => h.includes('mail'));

  let start = 0;
  let idxName = 0;
  let idxEmail = 1;
  let idxRole = 2;
  let idxDept = 3;

  if (looksLikeHeader) {
    start = 1;

    idxName = findIdx(header, ['name', 'nombre']);
    idxEmail = findIdx(header, ['email', 'correo', 'mail']);
    idxRole = findIdx(header, ['cargo', 'puesto', 'role', 'title']);
    idxDept = findIdx(header, [
      'dependencia',
      'departamento',
      'depto',
      'area',
      'institucion',
      'organizacion'
    ]);

    if (idxName < 0) idxName = 0;
    if (idxEmail < 0) idxEmail = 1;
  }

  const out = [];
  for (const r of cleanRows.slice(start)) {
    const row = r.map((x) => String(x ?? '').trim());

    const email = (row[idxEmail] || '').trim().toLowerCase();
    if (!email) continue;

    const name = (row[idxName] || '').trim();
    const role = idxRole >= 0 ? (row[idxRole] || '').trim() : '';
    const department = idxDept >= 0 ? (row[idxDept] || '').trim() : '';

    out.push({ name, email, role, department });
  }

  return out;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];

  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const rows = lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')));

  return parseTable(rows);
}

export async function POST({ locals, request }) {
  // ✅ /api: siempre safeGetSession()
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const eventId = String(form.get('eventId') || '').trim();
  const file = form.get('file');

  if (!eventId) return json({ error: 'eventId requerido' }, { status: 400 });
  if (!file || typeof file === 'string') return json({ error: 'Archivo requerido' }, { status: 400 });

  const name = (file.name || '').toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  let guests = [];

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = new TextDecoder('utf-8').decode(bytes);
    guests = parseCSV(text);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const wb = XLSX.read(bytes, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    guests = parseTable(rows);
  } else {
    return json({ error: 'Tipo de archivo no soportado (usa CSV o XLSX)' }, { status: 415 });
  }

  // ✅ RLS-first: upsert con el cliente de sesión
  const saved = await upsertGuests({
    supabase: locals.supabase,
    eventId,
    guests
  });

  return json({
    ok: true,
    imported: guests.length,
    saved: saved.length,
    guests: saved
  });
}
