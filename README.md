# Trust M portal

This folder is the complete static portal. Upload its contents to the root of the Trust-M GitHub repository. The connected Vercel project can deploy it without a build command.

## Pages

- `login.html`: shared sign-in and password reset.
- `index.html`: Lamiaa owner dashboard with live project and financial totals.
- `finance.html`: Lamiaa financial workspace and technician receipt approvals.
- `amr.html`: Amr project overview, operating-cost workspace and project comments. Client accounts and owner finance tools are excluded.
- `technician.html`: assigned projects and receipt/photo submission.
- `client.html`: restricted client project-progress portal with no internal cost or profit data.
- `print-document.html`: secure printable internal expense document.

The interface is right-to-left Egyptian Arabic. Review mode is clearly labelled and contains mock records only.

## Supabase setup

For a new Supabase project:

1. Enable Email/Password authentication.
2. Run `supabase/schema.sql` once in the Supabase SQL Editor.
3. Connect the Supabase project to the Vercel project and enable Production environment sync.
4. Create Lamiaa, Amr, technician and client users in Supabase Auth.
5. Insert matching `profiles` rows using `lamiaa_owner`, `amr_partner`, `technician` or `client`.
6. Add each technician to their projects in `project_members`.

For a project where the earlier Trust M schema is already installed, run only:

`supabase/migration-002-audit-and-technician-receipts.sql`

Then run:

`supabase/migration-003-client-portal.sql`

Do not rerun the full schema on an existing project. Use `supabase/assign-login-profiles.example.sql` as a private template for mapping Auth users to roles.

## Vercel environment variables

The SupabaseVercel connection creates the required variables automatically. The runtime endpoint accepts the current integration names:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Legacy anon-key names are accepted during migration. The Production sync shown in Supabase is sufficient for the live deployment; redeploy Vercel after this code is uploaded. Enable Preview or Development sync only when those environments should use Supabase.

The browser requests public configuration from `/api/config`. Only the Supabase URL and publishable key are returned. Server credentials such as `SUPABASE_SECRET_KEY` may exist in Vercel for server functions, but this endpoint never reads or returns them. Row Level Security remains the permission boundary.

For local live-mode testing, copy `.env.example` to `.env.local`, fill in the two values, and run the project with `vercel dev`. A plain static server cannot read environment variables and therefore stays in review mode. `.env.local` is ignored by Git.

## Access and workflow

Database Row Level Security is the real permission boundary:

- Lamiaa manages projects, finance, quotations, documents, approvals and users.
- Amr can view project progress and company operating costs, and add append-only project comments or follow-up flags. He cannot create client accounts or read the owner finance workspace.
- Technicians see assigned projects only. They can upload an expense receipt or site photo to a private Storage bucket.
- Clients receive a dedicated portal backed by a restricted database function. It returns their own project progress and contract value, never internal costs, supplier payments or forecast profit.
- Lamiaa approves or rejects each technician submission. Approval writes a project expense and an audit event.
- Finance saves use revision checks, keep the previous workspace revision and write an append-only audit event.
- Uploads complete before the finance workspace is saved. If the save fails, the new upload is removed to avoid an orphan file.

The browser receives the Supabase public publishable key through the runtime config endpoint. Never expose the service-role key.

## Finance features

The finance workspace includes:

- client receipts;
- supplier and technician payments;
- project expenses;
- invoice archive and private supporting files;
- internal expense PDFs;
- quotations assembled from reusable blocks;
- client statements;
- detailed project modals;
- management reports and P&L views;
- a quick-record button and JSON backup;
- technician-submission approval queue.

Internal expense PDFs are Trust M supporting documents. They are not supplier-issued or tax invoices.

During the transition, the owner dashboard combines approved normalized technician expenses with the shared finance workspace, so new approvals and existing records both appear in totals. The larger finance workspace remains revision-controlled JSON; moving every finance form to normalized database tables should be treated as a later data migration.

## Security and deployment

`vercel.json` adds a Content Security Policy and common browser security headers. Supabase and font browser assets are stored locally, so the portal does not depend on a public CDN at runtime. Uploaded finance and technician files are stored in private Supabase Storage buckets.

This package contains mock project data only. It excludes source workbooks, extracted workbook JavaScript, client files and reference PDFs.

Before replacing an older repository, remove these legacy files if they remain:

- `source-workbook-data.js`
- `source-import.js`
- `source-workbook.js`
- `local-source/`
- `app.js`

Replacing repository files does not erase sensitive content from Git history. Do not commit passwords, service-role keys, invoice attachments or client source workbooks.

## Local preview

Serve this folder with a static web server and open `index.html` for mock review mode. Use `vercel dev` with a gitignored `.env.local` for live local authentication and records.
