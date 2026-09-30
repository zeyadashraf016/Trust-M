# Trust M Supabase setup

This folder contains the database and private-file permissions for the Trust M portal.

## New installation

1. Create a Supabase project.
2. Enable **Authentication > Sign In / Providers > Email**.
3. Run `schema.sql` once in the SQL Editor.
4. Connect this Supabase project to the Vercel project, enable Production sync, and redeploy after uploading the portal.
5. Create the users and add matching `profiles` records.
6. Add each technician to the right projects in `project_members`.

## Upgrade an existing Trust M database

If the earlier Trust M schema is already installed, do not rerun `schema.sql`. Run these migrations in order:

1. `migration-002-audit-and-technician-receipts.sql`
2. `migration-003-client-portal.sql`

They add workspace history, the append-only audit log, technician receipt approvals, project comments, client portal access and private Storage permissions.

## Users and roles

Create users under **Authentication > Users**. Never store their passwords in GitHub.

After each user is created, copy the Auth user id and run a matching profile insert:

```sql
insert into public.profiles (id, full_name, role, phone)
values
  ('AUTH_USER_ID_FOR_LAMIAA', 'Lamiaa', 'lamiaa_owner', null),
  ('AUTH_USER_ID_FOR_AMR', 'Amr', 'amr_partner', null),
  ('AUTH_USER_ID_FOR_TECHNICIAN', 'Technician Name', 'technician', null);
```

Roles:

- `lamiaa_owner` opens `index.html` and manages projects, client accounts, finance, quotations, documents and technician approvals.
- `amr_partner` opens `amr.html`, sees project execution and company operating costs, and can add project comments. Owner finance data stays unavailable.
- `technician` opens `technician.html`, sees assigned projects and submits expense receipts or photos for approval.
- `client` opens `client.html` and receives only their linked projects through a restricted RPC. Internal costs and profit are excluded.

Use `assign-login-profiles.example.sql` as a template, but keep the completed file with real Auth user IDs outside Git.

The database enforces these rules with Row Level Security. Hiding a button in the browser is not the permission boundary. The public publishable key is loaded through `/api/config`; the runtime endpoint never returns server secret keys.

## Private file storage

The SQL creates and protects these private buckets:

- `trust-m-documents`: finance attachments managed by Lamiaa.
- `trust-m-technician-receipts`: technician receipts and photos. A technician can access their own folder; Lamiaa can review all submissions.

Files are opened with short-lived signed URLs. Do not make either bucket public, and never expose the Supabase service-role key in browser code.
