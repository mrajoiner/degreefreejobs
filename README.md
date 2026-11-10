# Degree Free Jobs

**No degree. Work from home.**

A separate, map-first companion to EngIntern. Choose a U.S. state, browse remote jobs by job type, save roles, track applications, and compare resume skills locally in your browser.

## Live site

https://degree-free-jobs-aj.blooksy.chatgpt.site/

Degree Free Jobs is the product name. DegreeFreeJobs.com is the requested domain. The custom domain requires separate ownership and DNS configuration; this repository does not claim it is connected.

## Listing requirements

Every role must explicitly identify remote/work-from-home work and a route without a college degree: high-school/GED accepted, degree optional/preferred, or equivalent experience accepted. Education silence is insufficient. Hybrid and office-required roles are excluded. Experience, licensing, equipment, and work authorization may still be required. U.S.-remote listings with unspecified state rules require employer confirmation.

The catalog reads 13 public employer Greenhouse and Lever feeds. It is a curated collection, not every job on the internet. Removed postings disappear after successful source refresh; failed sources keep the last good records for at most seven days. Duplicate roles are collapsed. No fabricated jobs or minimum-count padding.

## Run locally

Requires Node.js 24 or newer for the local SQLite preview. No dependency installation is needed.

```sh
npm test
npm run build
npm run dev
```

Open http://localhost:4173/. Run `node seed.mjs` to rebuild the initial catalog from employer feeds. Runtime endpoints: GET `/api/jobs`, POST `/api/refresh`, GET `/api/health`.

## Hosting and updates

The Worker requires an R2 binding named `BUCKET` and D1 database named `DB`. Schema migrations live in `drizzle/`. The secret runtime variable `ADMIN_EMAIL` identifies the verified owner email; never expose it in the client. The owner’s live deployment persists refreshes there, refreshes stale catalogs during visits, and uses a linked daily cloud update. Ordinary data updates do not require rebuilding or republishing. Sites deployment identity and credentials are deliberately omitted from this public repository.

Resumes are parsed on the visitor’s device. On explicit save, verified ChatGPT sign-in and a matching email are required; account profiles and resume text are stored in D1, original files in private R2. Server authorization scopes all account data to the verified identity. `/administrator` requires the owner or an assigned admin; account suspension, role changes, deletion, and administrator downloads are audited. Saved jobs and application notes remain in the visitor’s browser. Matching is a shared-skill check, not AI screening. Applications open the employer’s official form; this site does not submit applications on a visitor’s behalf.

## Assets

The map and interface retain the owner’s EngIntern design. Third-party browser libraries and their license notices are retained in `public/vendor/`.

## Account development

`DFJ_PREVIEW_AUTH=1 npm run dev` enables a synthetic administrator only on the loopback local preview. Preview data is in memory, separate from production. Never enable simulated identity in hosted code. Account endpoints reject missing identity, suspended users, cross-origin mutations, oversized bodies, unsupported files, and unauthorized administrator requests. Profile export and deletion are available at `/account`. File removal and account deletion remove active records; operator review of backup/log retention remains necessary.
