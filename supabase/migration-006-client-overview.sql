-- Run after migration 005. Adds the client home summary and approved site updates.
begin;
create table public.client_project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  caption text not null default '',
  photo_path text,
  posted_by uuid not null references public.profiles(id),
  posted_at timestamptz not null default now()
);
alter table public.client_project_updates enable row level security;
create policy client_updates_owner_read on public.client_project_updates for select using(public.is_owner_or_partner());
create policy client_updates_owner_insert on public.client_project_updates for insert with check(public.is_owner_or_partner() and posted_by=auth.uid());
create policy client_updates_owner_update on public.client_project_updates for update using(public.is_owner_or_partner()) with check(public.is_owner_or_partner());
create or replace function public.get_client_portal_overview()
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(item order by (item->>'created_at') desc),'[]'::jsonb)
from (
 select jsonb_build_object(
   'id',project.id,'last_payment_amount',last_payment.amount,'last_payment_date',last_payment.date,
   'current_balance',coalesce(finance.charged,0)-coalesce(finance.received,0),
   'cost_to_date',coalesce(finance.cost,0),'next_payment_due',null,
   'latest_photo_path',latest_update.photo_path,'latest_photo_caption',coalesce(latest_update.caption,''),'created_at',project.created_at
 ) item
 from public.clients client
 join public.projects project on project.client_id=client.id
 left join lateral (
   select (p->>'amount')::numeric amount,(p->>'date')::date date
   from public.finance_workspaces workspace cross join lateral jsonb_array_elements(coalesce(workspace.state->'payments','[]')) p
   where workspace.id='main' and p->>'project'=project.id::text and p->>'direction'='in'
   order by (p->>'date')::date desc limit 1
 ) last_payment on true
 left join lateral (
   select sum(case when p->>'direction'='in' then (p->>'amount')::numeric else 0 end) received,
          sum(case when p->>'direction'='in' then 0 else (p->>'amount')::numeric end) cost,
          (select coalesce(sum((charge->>'amount')::numeric),0) from jsonb_array_elements(coalesce(workspace.state->'charges','[]')) charge where charge->>'project'=project.id::text) charged
   from public.finance_workspaces workspace cross join lateral jsonb_array_elements(coalesce(workspace.state->'payments','[]')) p
   where workspace.id='main' and p->>'project'=project.id::text
 ) finance on true
 left join lateral (select u.photo_path,u.caption from public.client_project_updates u where u.project_id=project.id order by u.posted_at desc limit 1) latest_update on true
 where public.current_role()::text='client' and client.auth_user_id=auth.uid()
) x;
$$;
revoke all on function public.get_client_portal_overview() from public;
grant execute on function public.get_client_portal_overview() to authenticated;
commit;
