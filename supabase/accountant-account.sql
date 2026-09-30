-- Run after migration 005 commits and after creating/inviting this Auth user.
-- No password is embedded in this project.
do $$
declare accountant_id uuid; existing_role text;
begin
 select id into accountant_id from auth.users where lower(email)='ashraf@gmail.com';
 if accountant_id is null then raise exception 'Invite ashraf@gmail.com in Supabase Auth or from the owner accounting page first.'; end if;
 select role::text into existing_role from public.profiles where id=accountant_id;
 if existing_role is not null and existing_role<>'accountant' then raise exception 'Existing account has another role. Review it before changing permissions.'; end if;
 insert into public.profiles(id,full_name,role,is_active) values(accountant_id,'Ashraf Osama','accountant',true)
 on conflict(id) do update set full_name=excluded.full_name,role=excluded.role,is_active=true,updated_at=now();
end;
$$;
