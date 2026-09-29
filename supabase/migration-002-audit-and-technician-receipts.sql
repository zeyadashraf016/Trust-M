-- Trust M database upgrade: audit history and technician receipt approvals
-- Use this file only if supabase/schema.sql was already installed before this release.

begin;

create table if not exists public.finance_workspace_history (
  revision bigint primary key,
  state jsonb not null,
  saved_by uuid references public.profiles(id),
  saved_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.technician_submissions (
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

create index if not exists technician_submissions_project_idx
  on public.technician_submissions(project_id, created_at desc);
create index if not exists technician_submissions_submitter_idx
  on public.technician_submissions(submitted_by, created_at desc);
create index if not exists audit_log_created_at_idx
  on public.audit_log(created_at desc);

alter table public.finance_workspace_history enable row level security;
alter table public.audit_log enable row level security;
alter table public.technician_submissions enable row level security;

drop policy if exists finance_history_lamiaa_read on public.finance_workspace_history;
create policy finance_history_lamiaa_read on public.finance_workspace_history
  for select using (public.is_lamiaa());

drop policy if exists finance_history_lamiaa_insert on public.finance_workspace_history;
create policy finance_history_lamiaa_insert on public.finance_workspace_history
  for insert with check (public.is_lamiaa());

drop policy if exists audit_log_lamiaa_read on public.audit_log;
create policy audit_log_lamiaa_read on public.audit_log
  for select using (public.is_lamiaa());

drop policy if exists audit_log_lamiaa_insert on public.audit_log;
create policy audit_log_lamiaa_insert on public.audit_log
  for insert with check (public.is_lamiaa());

drop policy if exists technician_submissions_own_read on public.technician_submissions;
create policy technician_submissions_own_read on public.technician_submissions
  for select using (submitted_by = auth.uid() or public.is_lamiaa());

drop policy if exists technician_submissions_assigned_insert on public.technician_submissions;
create policy technician_submissions_assigned_insert on public.technician_submissions
  for insert with check (
    submitted_by = auth.uid()
    and public.current_role() = 'technician'
    and exists (
      select 1 from public.project_members member
      where member.project_id = project_id and member.profile_id = auth.uid()
    )
  );

drop policy if exists technician_submissions_lamiaa_update on public.technician_submissions;
create policy technician_submissions_lamiaa_update on public.technician_submissions
  for update using (public.is_lamiaa()) with check (public.is_lamiaa());

insert into storage.buckets (id, name, public)
values ('trust-m-technician-receipts', 'trust-m-technician-receipts', false)
on conflict (id) do update set public = false;

drop policy if exists technician_receipts_read on storage.objects;
create policy technician_receipts_read on storage.objects
  for select using (
    bucket_id = 'trust-m-technician-receipts'
    and (
      public.is_lamiaa()
      or (public.current_role() = 'technician' and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

drop policy if exists technician_receipts_insert on storage.objects;
create policy technician_receipts_insert on storage.objects
  for insert with check (
    bucket_id = 'trust-m-technician-receipts'
    and public.current_role() = 'technician'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists technician_receipts_delete_own on storage.objects;
create policy technician_receipts_delete_own on storage.objects
  for delete using (
    bucket_id = 'trust-m-technician-receipts'
    and (
      public.is_lamiaa()
      or (public.current_role() = 'technician' and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

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
      project_id, direction, entry_date, description, category, amount,
      created_by, approved_by, approved_at
    ) values (
      submission.project_id, 'project_expense', submission.expense_date,
      submission.notes, submission.category, submission.amount,
      auth.uid(), auth.uid(), now()
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


create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  is_flag boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists project_comments_project_idx
  on public.project_comments(project_id, created_at desc);

alter table public.project_comments enable row level security;

drop policy if exists project_comments_management_read on public.project_comments;
create policy project_comments_management_read on public.project_comments
  for select using (public.is_owner_or_partner());

drop policy if exists project_comments_management_insert on public.project_comments;
create policy project_comments_management_insert on public.project_comments
  for insert with check (public.is_owner_or_partner() and author_id = auth.uid());

commit;
