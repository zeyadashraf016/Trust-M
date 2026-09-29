-- Trust M production database foundation for Supabase
-- Run this in Supabase SQL Editor after enabling Auth email/password.

create extension if not exists pgcrypto;

create type public.trust_role as enum ('lamiaa_owner', 'amr_partner', 'technician');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
create type public.money_direction as enum ('client_receipt', 'supplier_payment', 'technician_payment', 'project_expense', 'client_charge', 'overhead_expense');
create type public.document_type as enum ('supplier_invoice', 'technician_receipt', 'internal_expense_pdf', 'client_statement', 'quotation', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.trust_role not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_name text not null,
  project_code text unique,
  location text,
  status public.project_status not null default 'planning',
  current_phase text,
  next_phase text,
  start_date date,
  target_end_date date,
  total_contract_value numeric(14,2) not null default 0 check (total_contract_value >= 0),
  forecast_final_cost numeric(14,2) not null default 0 check (forecast_final_cost >= 0),
  forecast_profit numeric(14,2) generated always as (total_contract_value - forecast_final_cost) stored,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'technician',
  can_view_financials boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_name text not null,
  starts_on date,
  ends_on date,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.counterparties (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  category text not null,
  phone text,
  tax_id text,
  address text,
  created_at timestamptz not null default now()
);

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  direction public.money_direction not null,
  entry_date date not null,
  description text not null,
  category text,
  amount numeric(14,2) not null check (amount >= 0),
  payment_method text,
  reference_no text,
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  finance_entry_id uuid references public.finance_entries(id) on delete set null,
  document_type public.document_type not null,
  title text not null,
  document_no text,
  storage_path text,
  issued_on date,
  amount numeric(14,2) check (amount is null or amount >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  quotation_no text unique not null,
  title text not null,
  status text not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  margin_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  block_name text not null,
  description text not null,
  unit text,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  sort_order integer not null default 0
);

create table public.operational_costs (
  id uuid primary key default gen_random_uuid(),
  cost_date date not null,
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  payment_method text,
  reference_no text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns public.trust_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_owner_or_partner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('lamiaa_owner', 'amr_partner');
$$;

create or replace function public.is_lamiaa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'lamiaa_owner';
$$;

create or replace function public.can_view_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner_or_partner()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = project_uuid and pm.profile_id = auth.uid()
    );
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_phases enable row level security;
alter table public.counterparties enable row level security;
alter table public.finance_entries enable row level security;
alter table public.documents enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.operational_costs enable row level security;

create policy profiles_read_own_or_management on public.profiles
  for select using (id = auth.uid() or public.is_owner_or_partner());
create policy profiles_lamiaa_manage on public.profiles
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy clients_management_read on public.clients
  for select using (public.is_owner_or_partner());
create policy clients_lamiaa_write on public.clients
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy projects_visible_by_role on public.projects
  for select using (public.can_view_project(id));
create policy projects_lamiaa_write on public.projects
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy project_members_management_read on public.project_members
  for select using (public.is_owner_or_partner() or profile_id = auth.uid());
create policy project_members_lamiaa_write on public.project_members
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy phases_project_visibility on public.project_phases
  for select using (public.can_view_project(project_id));
create policy phases_lamiaa_write on public.project_phases
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy counterparties_management_read on public.counterparties
  for select using (public.is_owner_or_partner());
create policy counterparties_lamiaa_write on public.counterparties
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy finance_lamiaa_full on public.finance_entries
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());
create policy documents_lamiaa_full on public.documents
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());
create policy documents_management_read on public.documents
  for select using (public.is_owner_or_partner());

create policy quotations_lamiaa_full on public.quotations
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());
create policy quotations_management_read on public.quotations
  for select using (public.is_owner_or_partner());

create policy quotation_items_management_read on public.quotation_items
  for select using (public.is_owner_or_partner());
create policy quotation_items_lamiaa_write on public.quotation_items
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create policy operational_costs_lamiaa_full on public.operational_costs
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());
create policy operational_costs_amr_read on public.operational_costs
  for select using (public.current_role() = 'amr_partner');

create index clients_created_by_idx on public.clients(created_by);
create index projects_client_idx on public.projects(client_id);
create index project_members_profile_idx on public.project_members(profile_id);
create index finance_entries_project_date_idx on public.finance_entries(project_id, entry_date desc);
create index finance_entries_direction_idx on public.finance_entries(direction);
create index documents_project_idx on public.documents(project_id);
create index documents_finance_entry_idx on public.documents(finance_entry_id);
create index operational_costs_date_idx on public.operational_costs(cost_date desc);


-- Shared finance workspace used by the current static frontend.
-- Revision checks prevent one browser from silently overwriting a newer save.
create table public.finance_workspaces (
  id text primary key check (id = 'main'),
  state jsonb not null,
  revision bigint not null default 1,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.finance_workspaces enable row level security;

create policy finance_workspace_lamiaa_read on public.finance_workspaces
  for select using (public.is_lamiaa());
create policy finance_workspace_lamiaa_write on public.finance_workspaces
  for all using (public.is_lamiaa()) with check (public.is_lamiaa());

create or replace function public.save_finance_workspace(
  p_state jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_revision bigint;
begin
  update public.finance_workspaces
     set state = p_state,
         revision = revision + 1,
         updated_by = auth.uid(),
         updated_at = now()
   where id = 'main'
     and revision = p_expected_revision
  returning revision into saved_revision;

  if saved_revision is not null then
    return saved_revision;
  end if;

  if p_expected_revision = 0 then
    insert into public.finance_workspaces (id, state, revision, updated_by)
    values ('main', p_state, 1, auth.uid())
    on conflict (id) do nothing
    returning revision into saved_revision;

    if saved_revision is not null then
      return saved_revision;
    end if;
  end if;

  raise exception 'Finance workspace was changed by another user. Please retry.'
    using errcode = '40001';
end;
$$;

insert into storage.buckets (id, name, public)
values ('trust-m-documents', 'trust-m-documents', false)
on conflict (id) do nothing;

create policy trust_documents_management_read on storage.objects
  for select using (
    bucket_id = 'trust-m-documents'
    and public.is_lamiaa()
  );
create policy trust_documents_lamiaa_insert on storage.objects
  for insert with check (
    bucket_id = 'trust-m-documents'
    and public.is_lamiaa()
  );
create policy trust_documents_lamiaa_update on storage.objects
  for update using (
    bucket_id = 'trust-m-documents'
    and public.is_lamiaa()
  ) with check (
    bucket_id = 'trust-m-documents'
    and public.is_lamiaa()
  );
create policy trust_documents_lamiaa_delete on storage.objects
  for delete using (
    bucket_id = 'trust-m-documents'
    and public.is_lamiaa()
  );


-- Amr can read only the operating-cost slice required by his dashboard.
create or replace function public.get_amr_operational_workspace()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_role() not in ('lamiaa_owner', 'amr_partner') then
      jsonb_build_object('expenses', '[]'::jsonb, 'payments', '[]'::jsonb, 'invoices', '[]'::jsonb, 'projects', '[]'::jsonb)
    else
      coalesce((
        select jsonb_build_object(
          'expenses', coalesce((
            select jsonb_agg(item)
            from jsonb_array_elements(workspace.state -> 'expenses') item
            where item ->> 'project' = 'company-overhead'
          ), '[]'::jsonb),
          'payments', coalesce((
            select jsonb_agg(item)
            from jsonb_array_elements(workspace.state -> 'payments') item
            where item ->> 'project' = 'company-overhead'
          ), '[]'::jsonb),
          'invoices', '[]'::jsonb,
          'projects', '[]'::jsonb
        )
        from public.finance_workspaces workspace
        where workspace.id = 'main'
      ), jsonb_build_object('expenses', '[]'::jsonb, 'payments', '[]'::jsonb, 'invoices', '[]'::jsonb, 'projects', '[]'::jsonb))
  end;
$$;

revoke all on function public.get_amr_operational_workspace() from public;
grant execute on function public.get_amr_operational_workspace() to authenticated;


-- Revision history and append-only audit trail for the shared finance workspace.
create table public.finance_workspace_history (
  revision bigint primary key,
  state jsonb not null,
  saved_by uuid references public.profiles(id),
  saved_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.finance_workspace_history enable row level security;
alter table public.audit_log enable row level security;

create policy finance_history_lamiaa_read on public.finance_workspace_history
  for select using (public.is_lamiaa());
create policy finance_history_lamiaa_insert on public.finance_workspace_history
  for insert with check (public.is_lamiaa());
create policy audit_log_lamiaa_read on public.audit_log
  for select using (public.is_lamiaa());
create policy audit_log_lamiaa_insert on public.audit_log
  for insert with check (public.is_lamiaa());

create or replace function public.save_finance_workspace(
  p_state jsonb,
  p_expected_revision bigint
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_state jsonb;
  current_revision bigint;
  saved_revision bigint;
begin
  select state, revision into current_state, current_revision
  from public.finance_workspaces
  where id = 'main'
  for update;

  if found then
    if current_revision <> p_expected_revision then
      raise exception 'Finance workspace was changed by another user.'
        using errcode = '40001';
    end if;

    insert into public.finance_workspace_history (revision, state, saved_by)
    values (current_revision, current_state, auth.uid())
    on conflict (revision) do nothing;

    update public.finance_workspaces
       set state = p_state,
           revision = current_revision + 1,
           updated_by = auth.uid(),
           updated_at = now()
     where id = 'main'
    returning revision into saved_revision;
  else
    if p_expected_revision <> 0 then
      raise exception 'Finance workspace revision is no longer current.'
        using errcode = '40001';
    end if;
    insert into public.finance_workspaces (id, state, revision, updated_by)
    values ('main', p_state, 1, auth.uid())
    returning revision into saved_revision;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'save', 'finance_workspace', 'main', jsonb_build_object('revision', saved_revision));

  return saved_revision;
end;
$$;


-- Technician receipt/photo submissions with owner approval.
create table public.technician_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  expense_date date not null,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  notes text not null,
  storage_path text not null,
  original_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  finance_entry_id uuid references public.finance_entries(id),
  created_at timestamptz not null default now()
);

alter table public.technician_submissions enable row level security;

create policy technician_submissions_own_read on public.technician_submissions
  for select using (submitted_by = auth.uid() or public.is_lamiaa());
create policy technician_submissions_assigned_insert on public.technician_submissions
  for insert with check (
    submitted_by = auth.uid()
    and public.current_role() = 'technician'
    and exists (
      select 1 from public.project_members member
      where member.project_id = project_id and member.profile_id = auth.uid()
    )
  );
create policy technician_submissions_lamiaa_update on public.technician_submissions
  for update using (public.is_lamiaa()) with check (public.is_lamiaa());

insert into storage.buckets (id, name, public)
values ('trust-m-technician-receipts', 'trust-m-technician-receipts', false)
on conflict (id) do nothing;

create policy technician_receipts_read on storage.objects
  for select using (
    bucket_id = 'trust-m-technician-receipts'
    and (
      public.is_lamiaa()
      or (public.current_role() = 'technician' and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
create policy technician_receipts_insert on storage.objects
  for insert with check (
    bucket_id = 'trust-m-technician-receipts'
    and public.current_role() = 'technician'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy technician_receipts_delete_own on storage.objects
  for delete using (
    bucket_id = 'trust-m-technician-receipts'
    and (
      public.is_lamiaa()
      or (public.current_role() = 'technician' and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create or replace function public.review_technician_submission(
  p_submission_id uuid,
  p_approved boolean,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  submission public.technician_submissions;
  entry_id uuid;
begin
  if not public.is_lamiaa() then
    raise exception 'Only Lamiaa can review technician submissions.';
  end if;

  select * into submission
  from public.technician_submissions
  where id = p_submission_id
  for update;

  if not found then raise exception 'Submission not found.'; end if;
  if submission.status <> 'pending' then raise exception 'Submission was already reviewed.'; end if;

  if p_approved then
    insert into public.finance_entries (
      project_id, direction, entry_date, description, category, amount, created_by, approved_by, approved_at
    ) values (
      submission.project_id, 'project_expense', submission.expense_date, submission.notes,
      submission.category, submission.amount, auth.uid(), auth.uid(), now()
    ) returning id into entry_id;
  end if;

  update public.technician_submissions
     set status = case when p_approved then 'approved' else 'rejected' end,
         review_note = nullif(trim(p_review_note), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         finance_entry_id = entry_id
   where id = p_submission_id;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    case when p_approved then 'approve' else 'reject' end,
    'technician_submission',
    p_submission_id::text,
    jsonb_build_object('finance_entry_id', entry_id)
  );

  return entry_id;
end;
$$;

revoke all on function public.review_technician_submission(uuid, boolean, text) from public;
grant execute on function public.review_technician_submission(uuid, boolean, text) to authenticated;


-- Append-only project comments for Lamiaa and Amr.
create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  is_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create index project_comments_project_idx on public.project_comments(project_id, created_at desc);
alter table public.project_comments enable row level security;

create policy project_comments_management_read on public.project_comments
  for select using (public.is_owner_or_partner());
create policy project_comments_management_insert on public.project_comments
  for insert with check (public.is_owner_or_partner() and author_id = auth.uid());
