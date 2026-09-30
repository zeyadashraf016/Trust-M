-- Copy this file outside Git, replace the placeholders, and run it after migration-003-client-portal.sql.
insert into public.profiles (id, full_name, role, is_active)
values
  ('LAMIAA_AUTH_USER_ID', 'لمياء', 'lamiaa_owner', true),
  ('AMR_AUTH_USER_ID', 'عمرو', 'amr_partner', true),
  ('TECHNICIAN_AUTH_USER_ID', 'فني Trust M', 'technician', true),
  ('CLIENT_AUTH_USER_ID', 'عميل Trust M', 'client', true)
on conflict (id) do update
set full_name=excluded.full_name, role=excluded.role, is_active=true, updated_at=now();

insert into public.clients (display_name, auth_user_id, created_by)
values ('عميل Trust M', 'CLIENT_AUTH_USER_ID', 'LAMIAA_AUTH_USER_ID')
on conflict (auth_user_id) do nothing;
