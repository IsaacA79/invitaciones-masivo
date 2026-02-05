drop extension if exists "pg_net";

create type "public"."app_role" as enum ('admin', 'sender', 'designer', 'viewer', 'capturista');

create sequence "public"."event_members_id_seq";


  create table "public"."email_logs" (
    "id" uuid not null default gen_random_uuid(),
    "invitation_id" uuid not null,
    "provider" text not null default 'smtp'::text,
    "provider_message_id" text,
    "status" text not null default 'queued'::text,
    "error" text,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."event_members" (
    "id" bigint not null default nextval('public.event_members_id_seq'::regclass),
    "event_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."event_members" enable row level security;


  create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null default auth.uid(),
    "title" text not null default 'Evento'::text,
    "event_json" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."events" enable row level security;


  create table "public"."guests" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "name" text not null default ''::text,
    "email" text not null,
    "created_at" timestamp with time zone not null default now(),
    "role" text,
    "department" text
      );


alter table "public"."guests" enable row level security;


  create table "public"."invitations" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid not null,
    "guest_id" uuid not null,
    "token_hash" text not null,
    "status" text not null default 'queued'::text,
    "sent_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "responded_at" timestamp with time zone,
    "response_json" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."profiles" (
    "id" uuid not null,
    "role" public.app_role not null default 'viewer'::public.app_role,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "email" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."rate_limits" (
    "key" text not null,
    "window_start" timestamp with time zone not null,
    "count" integer not null
      );


alter sequence "public"."event_members_id_seq" owned by "public"."event_members"."id";

CREATE UNIQUE INDEX email_logs_pkey ON public.email_logs USING btree (id);

CREATE UNIQUE INDEX event_members_event_id_user_id_key ON public.event_members USING btree (event_id, user_id);

CREATE INDEX event_members_event_idx ON public.event_members USING btree (event_id);

CREATE UNIQUE INDEX event_members_pkey ON public.event_members USING btree (id);

CREATE INDEX event_members_user_idx ON public.event_members USING btree (user_id);

CREATE INDEX events_owner_id_idx ON public.events USING btree (owner_id);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE UNIQUE INDEX guests_event_id_email_key ON public.guests USING btree (event_id, email);

CREATE UNIQUE INDEX guests_pkey ON public.guests USING btree (id);

CREATE UNIQUE INDEX invitations_event_id_guest_id_key ON public.invitations USING btree (event_id, guest_id);

CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id);

CREATE INDEX invitations_token_hash_idx ON public.invitations USING btree (token_hash);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX rate_limits_pkey ON public.rate_limits USING btree (key);

alter table "public"."email_logs" add constraint "email_logs_pkey" PRIMARY KEY using index "email_logs_pkey";

alter table "public"."event_members" add constraint "event_members_pkey" PRIMARY KEY using index "event_members_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."guests" add constraint "guests_pkey" PRIMARY KEY using index "guests_pkey";

alter table "public"."invitations" add constraint "invitations_pkey" PRIMARY KEY using index "invitations_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."rate_limits" add constraint "rate_limits_pkey" PRIMARY KEY using index "rate_limits_pkey";

alter table "public"."email_logs" add constraint "email_logs_invitation_id_fkey" FOREIGN KEY (invitation_id) REFERENCES public.invitations(id) ON DELETE CASCADE not valid;

alter table "public"."email_logs" validate constraint "email_logs_invitation_id_fkey";

alter table "public"."event_members" add constraint "event_members_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_members" validate constraint "event_members_event_id_fkey";

alter table "public"."event_members" add constraint "event_members_event_id_user_id_key" UNIQUE using index "event_members_event_id_user_id_key";

alter table "public"."event_members" add constraint "event_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text]))) not valid;

alter table "public"."event_members" validate constraint "event_members_role_check";

alter table "public"."event_members" add constraint "event_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."event_members" validate constraint "event_members_user_id_fkey";

alter table "public"."guests" add constraint "guests_event_id_email_key" UNIQUE using index "guests_event_id_email_key";

alter table "public"."guests" add constraint "guests_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."guests" validate constraint "guests_event_id_fkey";

alter table "public"."invitations" add constraint "invitations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_event_id_fkey";

alter table "public"."invitations" add constraint "invitations_event_id_guest_id_key" UNIQUE using index "invitations_event_id_guest_id_key";

alter table "public"."invitations" add constraint "invitations_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_guest_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_manage_event(eid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.is_admin()
     or exists(select 1 from public.events e where e.id = eid and e.owner_id = auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  now_ts timestamptz := now();
  win_ts timestamptz := to_timestamp(floor(extract(epoch from now_ts)/p_window_seconds)*p_window_seconds);
  current_count int;
begin
  insert into public.rate_limits(key, window_start, count)
  values (p_key, win_ts, 1)
  on conflict (key) do update
    set window_start = excluded.window_start,
        count = case
          when rate_limits.window_start = excluded.window_start then rate_limits.count + 1
          else 1
        end
  returning count into current_count;

  return current_count <= p_limit;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'viewer', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_event_member(eid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(select 1 from public.events e where e.id = eid and e.owner_id = auth.uid())
     or exists(select 1 from public.event_members m where m.event_id = eid and m.user_id = auth.uid());
$function$
;

grant delete on table "public"."email_logs" to "anon";

grant insert on table "public"."email_logs" to "anon";

grant references on table "public"."email_logs" to "anon";

grant select on table "public"."email_logs" to "anon";

grant trigger on table "public"."email_logs" to "anon";

grant truncate on table "public"."email_logs" to "anon";

grant update on table "public"."email_logs" to "anon";

grant delete on table "public"."email_logs" to "authenticated";

grant insert on table "public"."email_logs" to "authenticated";

grant references on table "public"."email_logs" to "authenticated";

grant select on table "public"."email_logs" to "authenticated";

grant trigger on table "public"."email_logs" to "authenticated";

grant truncate on table "public"."email_logs" to "authenticated";

grant update on table "public"."email_logs" to "authenticated";

grant delete on table "public"."email_logs" to "service_role";

grant insert on table "public"."email_logs" to "service_role";

grant references on table "public"."email_logs" to "service_role";

grant select on table "public"."email_logs" to "service_role";

grant trigger on table "public"."email_logs" to "service_role";

grant truncate on table "public"."email_logs" to "service_role";

grant update on table "public"."email_logs" to "service_role";

grant delete on table "public"."event_members" to "anon";

grant insert on table "public"."event_members" to "anon";

grant references on table "public"."event_members" to "anon";

grant select on table "public"."event_members" to "anon";

grant trigger on table "public"."event_members" to "anon";

grant truncate on table "public"."event_members" to "anon";

grant update on table "public"."event_members" to "anon";

grant delete on table "public"."event_members" to "authenticated";

grant insert on table "public"."event_members" to "authenticated";

grant references on table "public"."event_members" to "authenticated";

grant select on table "public"."event_members" to "authenticated";

grant trigger on table "public"."event_members" to "authenticated";

grant truncate on table "public"."event_members" to "authenticated";

grant update on table "public"."event_members" to "authenticated";

grant delete on table "public"."event_members" to "service_role";

grant insert on table "public"."event_members" to "service_role";

grant references on table "public"."event_members" to "service_role";

grant select on table "public"."event_members" to "service_role";

grant trigger on table "public"."event_members" to "service_role";

grant truncate on table "public"."event_members" to "service_role";

grant update on table "public"."event_members" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."guests" to "anon";

grant insert on table "public"."guests" to "anon";

grant references on table "public"."guests" to "anon";

grant select on table "public"."guests" to "anon";

grant trigger on table "public"."guests" to "anon";

grant truncate on table "public"."guests" to "anon";

grant update on table "public"."guests" to "anon";

grant delete on table "public"."guests" to "authenticated";

grant insert on table "public"."guests" to "authenticated";

grant references on table "public"."guests" to "authenticated";

grant select on table "public"."guests" to "authenticated";

grant trigger on table "public"."guests" to "authenticated";

grant truncate on table "public"."guests" to "authenticated";

grant update on table "public"."guests" to "authenticated";

grant delete on table "public"."guests" to "service_role";

grant insert on table "public"."guests" to "service_role";

grant references on table "public"."guests" to "service_role";

grant select on table "public"."guests" to "service_role";

grant trigger on table "public"."guests" to "service_role";

grant truncate on table "public"."guests" to "service_role";

grant update on table "public"."guests" to "service_role";

grant delete on table "public"."invitations" to "anon";

grant insert on table "public"."invitations" to "anon";

grant references on table "public"."invitations" to "anon";

grant select on table "public"."invitations" to "anon";

grant trigger on table "public"."invitations" to "anon";

grant truncate on table "public"."invitations" to "anon";

grant update on table "public"."invitations" to "anon";

grant delete on table "public"."invitations" to "authenticated";

grant insert on table "public"."invitations" to "authenticated";

grant references on table "public"."invitations" to "authenticated";

grant select on table "public"."invitations" to "authenticated";

grant trigger on table "public"."invitations" to "authenticated";

grant truncate on table "public"."invitations" to "authenticated";

grant update on table "public"."invitations" to "authenticated";

grant delete on table "public"."invitations" to "service_role";

grant insert on table "public"."invitations" to "service_role";

grant references on table "public"."invitations" to "service_role";

grant select on table "public"."invitations" to "service_role";

grant trigger on table "public"."invitations" to "service_role";

grant truncate on table "public"."invitations" to "service_role";

grant update on table "public"."invitations" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."rate_limits" to "anon";

grant insert on table "public"."rate_limits" to "anon";

grant references on table "public"."rate_limits" to "anon";

grant select on table "public"."rate_limits" to "anon";

grant trigger on table "public"."rate_limits" to "anon";

grant truncate on table "public"."rate_limits" to "anon";

grant update on table "public"."rate_limits" to "anon";

grant delete on table "public"."rate_limits" to "authenticated";

grant insert on table "public"."rate_limits" to "authenticated";

grant references on table "public"."rate_limits" to "authenticated";

grant select on table "public"."rate_limits" to "authenticated";

grant trigger on table "public"."rate_limits" to "authenticated";

grant truncate on table "public"."rate_limits" to "authenticated";

grant update on table "public"."rate_limits" to "authenticated";

grant delete on table "public"."rate_limits" to "service_role";

grant insert on table "public"."rate_limits" to "service_role";

grant references on table "public"."rate_limits" to "service_role";

grant select on table "public"."rate_limits" to "service_role";

grant trigger on table "public"."rate_limits" to "service_role";

grant truncate on table "public"."rate_limits" to "service_role";

grant update on table "public"."rate_limits" to "service_role";


  create policy "event_members_select"
  on "public"."event_members"
  as permissive
  for select
  to public
using ((public.is_admin() OR public.is_event_member(event_id)));



  create policy "event_members_write"
  on "public"."event_members"
  as permissive
  for all
  to public
using (public.can_manage_event(event_id))
with check (public.can_manage_event(event_id));



  create policy "events_delete_admin"
  on "public"."events"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "events_insert_admin_or_owner"
  on "public"."events"
  as permissive
  for insert
  to public
with check ((public.is_admin() OR (owner_id = auth.uid())));



  create policy "events_select_admin_or_owner"
  on "public"."events"
  as permissive
  for select
  to public
using ((public.is_admin() OR (owner_id = auth.uid())));



  create policy "events_select_members"
  on "public"."events"
  as permissive
  for select
  to public
using ((public.is_admin() OR public.is_event_member(id)));



  create policy "events_update_admin_or_owner"
  on "public"."events"
  as permissive
  for update
  to public
using ((public.is_admin() OR (owner_id = auth.uid())))
with check ((public.is_admin() OR (owner_id = auth.uid())));



  create policy "events_write_owner_admin"
  on "public"."events"
  as permissive
  for all
  to public
using (public.can_manage_event(id))
with check (public.can_manage_event(id));



  create policy "guests_delete_admin"
  on "public"."guests"
  as permissive
  for delete
  to public
using (public.is_admin());



  create policy "guests_insert_event_access"
  on "public"."guests"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = guests.event_id) AND (public.is_admin() OR (e.owner_id = auth.uid()))))));



  create policy "guests_select_event_access"
  on "public"."guests"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = guests.event_id) AND (public.is_admin() OR (e.owner_id = auth.uid()))))));



  create policy "guests_update_event_access"
  on "public"."guests"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = guests.event_id) AND (public.is_admin() OR (e.owner_id = auth.uid()))))))
with check ((EXISTS ( SELECT 1
   FROM public.events e
  WHERE ((e.id = guests.event_id) AND (public.is_admin() OR (e.owner_id = auth.uid()))))));



  create policy "profiles_select_admin"
  on "public"."profiles"
  as permissive
  for select
  to public
using (public.is_admin());



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((id = auth.uid()));



  create policy "profiles_update_admin"
  on "public"."profiles"
  as permissive
  for update
  to public
using (public.is_admin())
with check (public.is_admin());


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


