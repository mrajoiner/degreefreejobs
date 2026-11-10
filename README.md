# DegreeFreeJobs.com

**No degree. Work from home.**

A separate, map-first companion to EngIntern. Choose a U.S. state, browse remote jobs by job type, save roles, track applications, and compare resume skills locally in your browser.

## Live site

https://degree-free-jobs-aj.blooksy.chatgpt.site/

DegreeFreeJobs.com is the product name. The custom domain requires separate ownership and DNS configuration; this repository does not claim it is connected.

## Listing requirements

Every role must explicitly identify remote/work-from-home work and a route without a college degree: high-school/GED accepted, degree optional/preferred, or equivalent experience accepted. Education silence is insufficient. Hybrid and office-required roles are excluded. Experience, licensing, equipment, and work authorization may still be required. U.S.-remote listings with unspecified state rules require employer confirmation.

The catalog reads 13 public employer Greenhouse and Lever feeds. It is a curated collection, not every job on the internet. Removed postings disappear after successful source refresh; failed sources keep the last good records for at most seven days. Duplicate roles are collapsed. No fabricated jobs or minimum-count padding.

## Run locally

Requires Node.js 20 or newer. No dependency installation is needed.

```sh
npm test
npm run build
npm run dev
```

Open http://localhost:4173/. Run `node seed.mjs` to rebuild the initial catalog from employer feeds. Runtime endpoints: GET `/api/jobs`, POST `/api/refresh`, GET `/api/health`.

## Hosting and updates

The Worker requires an R2 binding named `BUCKET`. The owner’s live deployment persists refreshes there, refreshes stale catalogs during visits, and uses a linked daily cloud update. Ordinary data updates do not require rebuilding or republishing. Sites deployment identity and credentials are deliberately omitted from this public repository.

Resumes, saved jobs, and application notes stay in the visitor’s browser. Matching is a shared-skill check, not AI screening. Applications open the employer’s official form; this site does not submit applications on a visitor’s behalf.

## Assets

The map and interface retain the owner’s EngIntern design. Third-party browser libraries and their license notices are retained in `public/vendor/`.
