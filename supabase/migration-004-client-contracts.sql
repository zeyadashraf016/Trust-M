-- Run after migration-003, or after schema.sql for a new installation.
begin;
create table public.contract_company_settings (
  id text primary key check(id='main'),
  fields jsonb not null default '{}'
);
alter table public.contract_company_settings enable row level security;
create policy company_settings_owner on public.contract_company_settings for all using(public.is_lamiaa()) with check(public.is_lamiaa());
grant select,insert,update on public.contract_company_settings to authenticated;
create table public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  version text not null check(length(version) between 1 and 80),
  title text not null,
  body text not null check(length(body)>500 and body not like '%{{%'),
  future_forms text not null default '',
  client_name text not null,
  details jsonb not null default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index client_contracts_client_idx on public.client_contracts(client_id);
create table public.client_contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.client_contracts(id),
  signer_id uuid not null references public.profiles(id),
  signer_name text not null,
  signature jsonb not null,
  signed_at timestamptz not null default now(),
  unique(contract_id,signer_id)
);
alter table public.client_contracts enable row level security;
alter table public.client_contract_acceptances enable row level security;
create policy contracts_owner_read on public.client_contracts for select using(public.is_lamiaa());
create policy contracts_owner_issue on public.client_contracts for insert with check(public.is_lamiaa() and created_by=auth.uid());
create policy acceptances_owner_read on public.client_contract_acceptances for select using(public.is_lamiaa());
-- Issued text and signed records are append-only, including for management.
revoke update,delete on public.client_contracts from authenticated;
revoke insert,update,delete on public.client_contract_acceptances from authenticated;
grant select,insert on public.client_contracts to authenticated;
grant select on public.client_contract_acceptances to authenticated;

create or replace function public.get_client_contract_gate()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('allowed',
    coalesce(public.current_role()::text='client',false)
    and exists(select 1 from public.client_contracts c join public.clients cl on cl.id=c.client_id where cl.auth_user_id=auth.uid())
    and not exists(select 1 from public.client_contracts c join public.clients cl on cl.id=c.client_id
      where cl.auth_user_id=auth.uid() and not exists(select 1 from public.client_contract_acceptances a where a.contract_id=c.id and a.signer_id=auth.uid()))
  );
$$;
create or replace function public.get_client_contracts()
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('acceptance',(
   select to_jsonb(a) from public.client_contract_acceptances a where a.contract_id=c.id and a.signer_id=auth.uid()
 )) order by c.created_at desc),'[]'::jsonb)
 from public.client_contracts c join public.clients cl on cl.id=c.client_id
 where cl.auth_user_id=auth.uid() and public.current_role()::text='client';
$$;
create or replace function public.sign_client_contract(p_contract_id uuid,p_version text,p_signer_name text,p_signature jsonb,p_consent boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare c public.client_contracts; accepted uuid; stroke jsonb; point jsonb; point_count integer:=0;
begin
 if public.current_role()::text is distinct from 'client' or p_consent is distinct from true then raise exception 'NOT_AUTHORIZED'; end if;
 select ct.* into c from public.client_contracts ct join public.clients cl on cl.id=ct.client_id
 where ct.id=p_contract_id and cl.auth_user_id=auth.uid() for update of ct;
 if c.id is null or c.version is distinct from p_version then raise exception 'CONTRACT_UNAVAILABLE'; end if;
 if p_signer_name is null or length(trim(p_signer_name)) not between 3 and 150 then raise exception 'INVALID_NAME'; end if;
 if p_signature is null or length(p_signature::text)>200000 then raise exception 'INVALID_SIGNATURE'; end if;
 if p_signature->>'kind'='typed' then
   if length(trim(coalesce(p_signature->>'text',''))) not between 3 and 150 then raise exception 'INVALID_SIGNATURE'; end if;
 elsif p_signature->>'kind'='drawn' then
   if jsonb_typeof(p_signature->'strokes') is distinct from 'array' then raise exception 'INVALID_SIGNATURE'; end if;
   for stroke in select value from jsonb_array_elements(p_signature->'strokes') loop
     if jsonb_typeof(stroke) is distinct from 'array' or jsonb_array_length(stroke)<2 then raise exception 'INVALID_SIGNATURE'; end if;
     for point in select value from jsonb_array_elements(stroke) loop
       if jsonb_typeof(point) is distinct from 'array' or jsonb_array_length(point)<>2 then raise exception 'INVALID_SIGNATURE'; end if;
       if jsonb_typeof(point->0) is distinct from 'number' or jsonb_typeof(point->1) is distinct from 'number' then raise exception 'INVALID_SIGNATURE'; end if;
       if (point->>0)::numeric not between 0 and 600 or (point->>1)::numeric not between 0 and 240 then raise exception 'INVALID_SIGNATURE'; end if;
       point_count:=point_count+1;
     end loop;
   end loop;
   if point_count<2 then raise exception 'INVALID_SIGNATURE'; end if;
 else raise exception 'INVALID_SIGNATURE'; end if;
 select id into accepted from public.client_contract_acceptances where contract_id=c.id and signer_id=auth.uid();
 if accepted is not null then return accepted; end if;
 insert into public.client_contract_acceptances(contract_id,signer_id,signer_name,signature)
 values(c.id,auth.uid(),trim(p_signer_name),p_signature) returning id into accepted;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'sign','client_contract',c.id::text,jsonb_build_object('acceptance_id',accepted,'version',c.version));
 return accepted;
end;
$$;
revoke all on function public.get_client_contract_gate() from public;
revoke all on function public.get_client_contracts() from public;
revoke all on function public.sign_client_contract(uuid,text,text,jsonb,boolean) from public;
grant execute on function public.get_client_contract_gate() to authenticated;
grant execute on function public.get_client_contracts() to authenticated;
grant execute on function public.sign_client_contract(uuid,text,text,jsonb,boolean) to authenticated;
-- A caller cannot bypass the signing page by invoking the project RPC directly.
alter function public.get_client_portal_projects() rename to client_portal_projects_internal;
revoke all on function public.client_portal_projects_internal() from public,authenticated,anon;
create function public.get_client_portal_projects()
returns table(id uuid,project_name text,project_code text,location text,status public.project_status,current_phase text,next_phase text,start_date date,target_end_date date,total_contract_value numeric,progress_percent integer,phases jsonb)
language plpgsql stable security definer set search_path=public as $$
begin
 if not coalesce((public.get_client_contract_gate()->>'allowed')::boolean,false) then raise exception 'CONTRACT_REQUIRED'; end if;
 return query select * from public.client_portal_projects_internal();
end;
$$;
revoke all on function public.get_client_portal_projects() from public;
grant execute on function public.get_client_portal_projects() to authenticated;
-- Client accounts never read the full project table through membership policies.
create or replace function public.can_view_project(project_uuid uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_owner_or_partner() or (public.current_role()::text='technician' and exists(
   select 1 from public.project_members pm where pm.project_id=project_uuid and pm.profile_id=auth.uid()
 ));
$$;
commit;
