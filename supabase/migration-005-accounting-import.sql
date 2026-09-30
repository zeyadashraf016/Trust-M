-- Run after migration 004. Commit before running accountant-account.sql.
alter type public.trust_role add value if not exists 'accountant';
begin;
create or replace function public.can_manage_finance()
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(public.current_role()::text in ('lamiaa_owner','accountant'),false);
$$;
create policy accountant_finance_workspaces_read on public.finance_workspaces for select using(public.can_manage_finance());
create policy accountant_finance_workspaces_insert on public.finance_workspaces for insert with check(public.can_manage_finance());
create policy accountant_finance_workspaces_update on public.finance_workspaces for update using(public.can_manage_finance()) with check(public.can_manage_finance());
create policy accountant_finance_entries_read on public.finance_entries for select using(public.can_manage_finance());
create policy accountant_finance_entries_insert on public.finance_entries for insert with check(public.can_manage_finance());
create policy accountant_finance_entries_update on public.finance_entries for update using(public.can_manage_finance()) with check(public.can_manage_finance());
create policy accountant_documents_read on public.documents for select using(public.can_manage_finance());
create policy accountant_documents_insert on public.documents for insert with check(public.can_manage_finance());
create policy accountant_documents_update on public.documents for update using(public.can_manage_finance()) with check(public.can_manage_finance());
create policy accountant_quotations_read on public.quotations for select using(public.can_manage_finance());
create policy accountant_quotations_insert on public.quotations for insert with check(public.can_manage_finance());
create policy accountant_quotations_update on public.quotations for update using(public.can_manage_finance()) with check(public.can_manage_finance());
create policy accountant_quotation_items_read on public.quotation_items for select using(public.can_manage_finance());
create policy accountant_quotation_items_insert on public.quotation_items for insert with check(public.can_manage_finance());
create policy accountant_quotation_items_update on public.quotation_items for update using(public.can_manage_finance()) with check(public.can_manage_finance());
create policy accountant_operational_costs_read on public.operational_costs for select using(public.can_manage_finance());
create policy accountant_operational_costs_insert on public.operational_costs for insert with check(public.can_manage_finance());
create policy accountant_operational_costs_update on public.operational_costs for update using(public.can_manage_finance()) with check(public.can_manage_finance());
create policy accountant_history_read on public.finance_workspace_history for select using(public.can_manage_finance());
create policy accountant_history_insert on public.finance_workspace_history for insert with check(public.can_manage_finance() and saved_by=auth.uid());
create policy accountant_finance_audit on public.audit_log for insert with check(public.can_manage_finance() and actor_id=auth.uid() and action='save' and entity_type='finance_workspace');
create policy accountant_clients_read on public.clients for select using(public.can_manage_finance());
create or replace function public.can_view_project(project_uuid uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_owner_or_partner() or public.can_manage_finance() or (public.current_role()::text='technician' and exists(
 select 1 from public.project_members pm where pm.project_id=project_uuid and pm.profile_id=auth.uid()));
$$;
create policy accountant_files_read on storage.objects for select using(bucket_id='trust-m-documents' and public.can_manage_finance());
create policy accountant_files_insert on storage.objects for insert with check(bucket_id='trust-m-documents' and public.can_manage_finance());
-- No accountant deletion policies for financial records or committed attachments.
-- Profiles, contracts and technician approvals retain their existing owner restrictions.
create table public.accounting_import_batches (
 id uuid primary key,fingerprint text not null unique,source_hash text not null,filename text not null,storage_path text,
 project_id uuid references public.projects(id),partner text not null check(partner in ('amr','lamiaa')),
 imported_by uuid not null references public.profiles(id),imported_at timestamptz not null default now(),
 row_count integer not null check(row_count>0),source_sheets jsonb not null default '[]'
);
create table public.accounting_import_rows (
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references public.accounting_import_batches(id),
 import_key text not null unique,record_kind text not null check(record_kind in ('receipt','expense','partner','shares')),
 source_sheet text not null,source_row integer not null,record jsonb not null
);
alter table public.accounting_import_batches enable row level security;
alter table public.accounting_import_rows enable row level security;
create policy imports_finance_read on public.accounting_import_batches for select using(public.can_manage_finance());
create policy import_rows_finance_read on public.accounting_import_rows for select using(public.can_manage_finance());
grant select on public.accounting_import_batches,public.accounting_import_rows to authenticated;
revoke insert,update,delete on public.accounting_import_batches,public.accounting_import_rows from authenticated;
create policy accountant_orphan_import_cleanup on storage.objects for delete using(
 bucket_id='trust-m-documents' and public.can_manage_finance()
 and (storage.foldername(name))[1]=auth.uid()::text and (storage.foldername(name))[2]='imports'
 and not exists(select 1 from public.accounting_import_batches b where b.storage_path=name)
);

create or replace function public.apply_accounting_import(p_batch jsonb,p_records jsonb,p_expected_revision bigint default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state jsonb; revision bigint; item jsonb; row_record jsonb; project_info jsonb; project_uuid uuid; client_uuid uuid; expense_uuid uuid; target text; batch_uuid uuid;
begin
 if not public.can_manage_finance() then raise exception 'NOT_AUTHORIZED'; end if;
 if jsonb_typeof(p_records) is distinct from 'array' then raise exception 'INVALID_RECORDS'; end if;
 if jsonb_array_length(p_records) not between 1 and 5000 then raise exception 'INVALID_RECORD_COUNT'; end if;
 if p_batch->>'fingerprint' is null or p_batch->>'sourceHash' is null or (p_batch->>'fingerprint') !~ '^[a-f0-9]{64}$' or (p_batch->>'sourceHash') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FILE_HASH'; end if;
 if p_batch->>'partner' not in ('amr','lamiaa') or p_batch->>'partner' is null then raise exception 'INVALID_PARTNER'; end if;
 batch_uuid:=(p_batch->>'id')::uuid;
 if p_batch->>'fileId' not like auth.uid()::text||'/imports/%' then raise exception 'INVALID_STORAGE_PATH'; end if;
 select w.state,w.revision into state,revision from public.finance_workspaces w where id='main' for update;
 if not found then raise exception 'FINANCE_WORKSPACE_MISSING'; end if;
 if p_expected_revision is not null and revision<>p_expected_revision then raise exception 'REVISION_CONFLICT' using errcode='40001'; end if;
 if exists(select 1 from public.accounting_import_batches where fingerprint=p_batch->>'fingerprint') then raise exception 'FILE_ALREADY_IMPORTED'; end if;
 for target in select unnest(array['projects','payments','expenses','charges','invoices','quotes','blocks','partnerLedger','expenseShares','importBatches']) loop
  if state->target is null then state:=jsonb_set(state,array[target],'[]'); end if;
  if jsonb_typeof(state->target)<>'array' then raise exception 'INVALID_WORKSPACE'; end if;
 end loop;
 project_info:=p_batch->'project';
 if project_info is not null and project_info<>'null'::jsonb then
  project_uuid:=(project_info->>'id')::uuid;
  if nullif(trim(project_info->>'name'),'') is null or nullif(trim(project_info->>'client'),'') is null then raise exception 'PROJECT_DETAILS_REQUIRED'; end if;
  if not exists(select 1 from public.projects where id=project_uuid) then
   insert into public.clients(display_name,created_by) values(project_info->>'client',auth.uid()) returning id into client_uuid;
   insert into public.projects(id,client_id,project_name,project_code,location,created_by)
   values(project_uuid,client_uuid,project_info->>'name',nullif(project_info->>'contractNumber',''),project_info->>'location',auth.uid());
  end if;
  if not exists(select 1 from jsonb_array_elements(state->'projects') p where p->>'id'=project_uuid::text) then
   state:=jsonb_set(state,'{projects}',(state->'projects')||jsonb_build_array(project_info||jsonb_build_object('source',p_batch->>'filename','accountingPending',true)));
  end if;
 end if;
 insert into public.accounting_import_batches(id,fingerprint,source_hash,filename,storage_path,project_id,partner,imported_by,row_count,source_sheets)
 values(batch_uuid,p_batch->>'fingerprint',p_batch->>'sourceHash',p_batch->>'filename',p_batch->>'fileId',project_uuid,p_batch->>'partner',auth.uid(),jsonb_array_length(p_records),coalesce(p_batch->'sourceSheets','[]'));
 for item in select value from jsonb_array_elements(p_records) loop
  if item->>'kind' not in ('receipt','expense','partner','shares') or item->>'kind' is null then raise exception 'INVALID_RECORD_KIND'; end if;
  if item->>'date' is null or item->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'DATE_REQUIRED'; end if;
  perform (item->>'date')::date;
  if nullif(trim(item->>'description'),'') is null or item->>'amount' is null or (item->>'amount')::numeric not between 0 and 999999999999 then raise exception 'INVALID_FINANCIAL_RECORD'; end if;
  if item->>'importKey' is null or item->>'importKey' !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_IMPORT_KEY'; end if;
  if exists(select 1 from public.accounting_import_rows where import_key=item->>'importKey') then raise exception 'DUPLICATE_IMPORT_ROW'; end if;
  insert into public.accounting_import_rows(batch_id,import_key,record_kind,source_sheet,source_row,record)
  values(batch_uuid,item->>'importKey',item->>'kind',item->>'sheet',(item->>'sourceRow')::integer,item);
  row_record:=item-'issues'-'included'-'duplicate'-'kind'||jsonb_build_object('importBatch',batch_uuid);
  if item->>'kind'='partner' then
   if item->>'debit' is null or item->>'credit' is null or (item->>'debit')::numeric<0 or (item->>'credit')::numeric<0 then raise exception 'INVALID_DEBIT_CREDIT'; end if;
   row_record:=row_record||jsonb_build_object('partner',p_batch->>'partner');target:='partnerLedger';
  elsif item->>'kind'='shares' then
   if item->>'amrShare' is null or item->>'amrPaid' is null or item->>'lamiaaShare' is null or item->>'lamiaaPaid' is null then raise exception 'INCOMPLETE_SHARES'; end if;
   if least((item->>'amrShare')::numeric,(item->>'amrPaid')::numeric,(item->>'lamiaaShare')::numeric,(item->>'lamiaaPaid')::numeric)<0 or abs((item->>'amrShare')::numeric+(item->>'lamiaaShare')::numeric-(item->>'amount')::numeric)>.01 then raise exception 'SHARES_DO_NOT_RECONCILE'; end if;
   expense_uuid:=gen_random_uuid();
   state:=jsonb_set(state,'{expenses}',(state->'expenses')||jsonb_build_array(row_record||jsonb_build_object('id',expense_uuid,'project','company-overhead','category','Overhead','operatingCategory','مصروفات تشغيل','party','الشركة','reference','IMPORT-'||expense_uuid::text)));
   row_record:=row_record||jsonb_build_object('expenseId',expense_uuid);target:='expenseShares';
  else
   if project_uuid is null then raise exception 'PROJECT_REQUIRED'; end if;
   row_record:=row_record||jsonb_build_object('project',project_uuid,'reference',coalesce(nullif(item->>'reference',''),'IMPORT-'||(item->>'id')));
   if item->>'kind'='receipt' then target:='payments';row_record:=row_record||jsonb_build_object('direction','in','method',coalesce(nullif(item->>'category',''),'تحويل نقدي'),'party',coalesce(nullif(item->>'party',''),project_info->>'client'));
   else target:='expenses';row_record:=row_record||jsonb_build_object('category',coalesce(nullif(item->>'category',''),'Other direct costs')); end if;
  end if;
  state:=jsonb_set(state,array[target],(state->target)||jsonb_build_array(row_record));
 end loop;
 state:=jsonb_set(state,'{importBatches}',(state->'importBatches')||jsonb_build_array(p_batch||jsonb_build_object('count',jsonb_array_length(p_records),'importedAt',now())));
 perform public.save_finance_workspace(state,revision);
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'import','accounting_import',batch_uuid::text,jsonb_build_object('filename',p_batch->>'filename','count',jsonb_array_length(p_records)));
 return state;
end;
$$;
revoke all on function public.apply_accounting_import(jsonb,jsonb,bigint) from public;
grant execute on function public.apply_accounting_import(jsonb,jsonb,bigint) to authenticated;
create view public.accounting_partner_ledger with (security_invoker=true) as
 select (item->>'id')::uuid id,item->>'partner' partner,(item->>'date')::date entry_date,item->>'description' description,
 (item->>'debit')::numeric debit,(item->>'credit')::numeric credit,item->>'importBatch' import_batch,item->>'sheet' source_sheet,item->>'sourceRow' source_row
 from public.finance_workspaces w cross join lateral jsonb_array_elements(coalesce(w.state->'partnerLedger','[]')) item;
create view public.accounting_expense_shares with (security_invoker=true) as
 select (item->>'id')::uuid id,(item->>'date')::date expense_date,item->>'description' description,(item->>'amount')::numeric amount,
 (item->>'amrShare')::numeric amr_share,(item->>'amrPaid')::numeric amr_paid,(item->>'lamiaaShare')::numeric lamiaa_share,(item->>'lamiaaPaid')::numeric lamiaa_paid,
 item->>'expenseId' expense_id,item->>'importBatch' import_batch
 from public.finance_workspaces w cross join lateral jsonb_array_elements(coalesce(w.state->'expenseShares','[]')) item;
grant select on public.accounting_partner_ledger,public.accounting_expense_shares to authenticated;
create or replace function public.get_amr_accounting()
returns jsonb language sql stable security definer set search_path=public as $$
 select case when public.current_role()::text is distinct from 'amr_partner' then jsonb_build_object('partnerLedger','[]'::jsonb,'expenseShares','[]'::jsonb) else
 coalesce((select jsonb_build_object(
 'partnerLedger',coalesce((select jsonb_agg(item) from jsonb_array_elements(coalesce(w.state->'partnerLedger','[]')) item where item->>'partner'='amr'),'[]'),
 'expenseShares',coalesce((select jsonb_agg(jsonb_build_object('date',item->>'date','description',item->>'description','amrShare',item->'amrShare','amrPaid',item->'amrPaid')) from jsonb_array_elements(coalesce(w.state->'expenseShares','[]')) item),'[]')
 ) from public.finance_workspaces w where id='main'),jsonb_build_object('partnerLedger','[]'::jsonb,'expenseShares','[]'::jsonb)) end;
$$;
revoke all on function public.get_amr_accounting() from public;
grant execute on function public.get_amr_accounting() to authenticated;
commit;
