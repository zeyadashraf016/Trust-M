-- Trust M database upgrade: restricted client portal
-- Run after migration-002-audit-and-technician-receipts.sql.

alter type public.trust_role add value if not exists 'client';

alter table public.clients
  add column if not exists auth_user_id uuid unique references public.profiles(id) on delete set null;

create index if not exists clients_auth_user_idx on public.clients(auth_user_id);

create or replace function public.get_client_portal_projects()
returns table (
  id uuid,
  project_name text,
  project_code text,
  location text,
  status public.project_status,
  current_phase text,
  next_phase text,
  start_date date,
  target_end_date date,
  total_contract_value numeric,
  progress_percent integer,
  phases jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    project.id,
    project.project_name,
    project.project_code,
    project.location,
    project.status,
    project.current_phase,
    project.next_phase,
    project.start_date,
    project.target_end_date,
    project.total_contract_value,
    coalesce((
      select round(avg(phase.progress_percent))::integer
      from public.project_phases phase
      where phase.project_id = project.id
    ), 0) as progress_percent,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', phase.phase_name,
          'from', phase.starts_on,
          'to', phase.ends_on,
          'progress', phase.progress_percent,
          'status', case
            when phase.progress_percent >= 100 then 'complete'
            when phase.progress_percent > 0 then 'in_progress'
            else 'planned'
          end
        )
        order by phase.sort_order
      )
      from public.project_phases phase
      where phase.project_id = project.id
    ), '[]'::jsonb) as phases
  from public.clients client
  join public.projects project on project.client_id = client.id
  where public.current_role()::text = 'client'
    and client.auth_user_id = auth.uid()
  order by project.created_at desc;
$$;

revoke all on function public.get_client_portal_projects() from public;
grant execute on function public.get_client_portal_projects() to authenticated;
