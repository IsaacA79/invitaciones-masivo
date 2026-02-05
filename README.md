# Invitaciones masivas (SvelteKit + Svelte 5 + Tailwind 4 + Supabase)

Incluye:
- Editor (Info / Diseño / Invitados / Enviar)
- Importación de invitados desde **CSV o Excel (XLSX)**
- Envío por **SMTP** con links de **Confirmar / No podré / RSVP (acompañantes + comentario)**
- Página pública para ver invitación y confirmar
- Historial de correos enviados

## Requisitos
- Node.js (LTS)
- Un proyecto de Supabase

## 1) Instalar dependencias
```bash
npm install
# o pnpm i / yarn
```

## 2) Crear tablas en Supabase
Ejecuta el SQL en `supabase/schema.sql` desde el SQL editor de Supabase.

## 3) Configurar variables de entorno
Copia `.env.example` a `.env` y llena los valores.

> **DEV_OWNER_ID**: en modo dev fija un owner_id sin implementar auth todavía. Puedes usar cualquier UUID.

## 4) Correr
```bash
npm run dev
```

Abre:
- Admin: `http://localhost:5173/events`
- Público: links generados en los correos (o revisa logs)

## Notas
- El diseño de invitación se guarda en `events.event_json`.
- Para producción, conviene subir imágenes a un bucket (Supabase Storage) en vez de usar `URL.createObjectURL()`.
