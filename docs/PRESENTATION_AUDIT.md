# Repository presentation audit

Audited **17 October 2026**, against source revision
`6e3293e0e87ced76acbb2c31cd20faaa4c15f1c3` and the current working tree.
The separate native 1.1.10+12 feedback change arrived during the audit and was
reconciled into the feature/setup guides without altering its implementation.
Gallery captures retain their original 1.1.9+11 provenance.
This update concerns documentation, genuine application imagery and contributor
workflow configuration. It does not replace the ETA model or redesign the app.

## Main findings and resolutions

| Finding | Resolution |
| --- | --- |
| README linked a missing banner and used older branding/framework versions | Etaernal header, existing train logo, restrained technology badges and source-verified stack |
| Old text claimed NTES training, broad high-precision prediction and weather/congestion features | Real three-train model, pinned third-party provenance, measured MAE/RMSE and explicit serving/validation limits |
| No dependable actual application gallery | Genuine deployed Chrome and Android release screenshots, descriptive captions, capture record and hash/dimension manifest |
| Setup required nonexistent Alembic/seed/test commands and assumed Redis/PostgreSQL | Directory-specific setup for the actual FastAPI, Next.js and Flutter paths; optional database boundary and valid checks |
| Fresh Android clones require signing properties even for debug configuration | Explicit local-keystore/key.properties instructions, private-file boundaries and debug package identity |
| Original API proposal looked authoritative and claimed universal JWT | Runtime OpenAPI guide; proposal marked historical; unauthenticated/illustrative compatibility boundaries stated |
| Network screenshots/old copy implied current nationwide traffic | Dated historical summary, selected-journey analytics and explicitly illustrative simulation documented separately |
| Backend CI referenced absent test requirements/migrations; web CI invoked missing scripts | Dedicated test requirements and current backend/web check commands; no runtime dependency change |
| Contribution guide asserted unverified branch protection and team policies | Practical scoped contribution/PR guidance, issue forms and credential-reporting policy |
| Root and mobile environment templates advertised unused names/URLs | Root configuration index, accurate Flutter defines, backend model/archive examples and JSON CORS example |
| No selected licence / public APK release | Documented honestly; no invented licence, release badge or broken download button |

## Significant files

| Files / area | Purpose |
| --- | --- |
| `README.md` | Project story, genuine galleries, ETA evidence, architecture, setup, deployments and roadmap |
| `docs/README.md`, `docs/FEATURE_STATUS.md` | Navigation and implemented/limited/planned capability matrix |
| `docs/architecture/system-architecture.md`, `docs/api/api-contract.md` | Current runtime/data flow and actual API integration boundaries |
| `docs/development/setup.md`, `docs/v1_deployment_guide.md` | Local setup, checks, environments, hosting and APK delivery |
| `backend/README.md`, both application READMEs, `intelligence/README.md` | Accurate subsystem entry points linked to canonical guides |
| `docs/DATA_SOURCES.md` | Dataset/provider attribution and licence/persistence limitations |
| `docs/screenshots/`, `docs/assets/logo.png` | Real captures, provenance, manifest and existing brand asset |
| `CONTRIBUTING.md`, `SECURITY.md`, `docs/development/branching.md` | Contribution workflow and safe bug/security reporting |
| `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md` | Structured, evidence-oriented issue/PR reporting |
| `.github/workflows/backend-ci.yml`, `web-ci.yml`, `docs-ci.yml` | Current runnable checks and maintained-document/gallery validation |
| `backend/requirements-test.txt`, `scripts/check_docs.py` | Explicit test-only dependencies and dependency-free documentation checks |
| Root/backend/mobile `.env.example` | Configuration ownership, placeholders, correct URLs and current options |
| Historical design headers and `shared/api_contracts/api-contract.yaml` | Prevent earlier proposals from being mistaken for deployed contracts |
| `docs/REPOSITORY_SETTINGS.md` | Exact About description/topics and remaining maintainer decisions |

## Validation record

- Source audit: routes, client adapters, dependency/lock files, settings,
  trained artifact/evaluation, historical manifest and existing workflows.
- Public website loaded; health returned `healthy`; model endpoint returned
  enabled `validated_pilot` with the expected three-train scope and measured errors.
- Backend: **179 tests passed**; existing dependency/date-time deprecation warnings.
- Website: **62 focused tests passed** and TypeScript check passed.
- ETA importer/training-contract checks: **8 passed**; this documentation update
  did not retrain the model or introduce new accuracy claims.
- Website production build passed; existing multiple-lockfile root warning.
- Flutter analysis reported no issues; **109 unit/widget tests passed** on the
  current shared workspace. No new Android build was needed for this docs work.
- Documentation checker: **18 maintained documents, 145 local links/images/
  fragments**, including all referenced screenshots and manifest SHA-256 values.
- All **10 public README URLs/badges** and **7 additional dataset/provider/OpenAPI
  links** returned HTTP 200 at audit time (including normal redirects).
- GitHub's non-publishing Markdown API rendered the README successfully and
  recognized the Mermaid block. Desktop/narrow local previews of that rendered
  HTML loaded **15 images with zero broken images**. This is not a claim that
  unpublished changes are already visible in the repository's live README.
- All seven repository workflow/issue-form YAML files parsed; `git diff --check`
  passed. Text credential-pattern review found no matches in 41 scoped files;
  screenshots were visually inspected. No real environment files were copied.

The workflow edits are local; they have not run on GitHub Actions yet. Source
tests use controlled fixtures, while all gallery images use actual application
interfaces without injected data. These are different forms of evidence.

## Outstanding maintainer decisions

- Select a software licence with contributors, considering external data/assets.
- Apply the exact About/topics values in [repository settings](REPOSITORY_SETTINGS.md);
  the connector does not expose those edits.
- Authorize/review a signed public APK release before adding a download URL.
- Broader prospective ETA validation, durable observation storage, production
  authorization and older lint/research cleanup remain product/engineering work;
  documentation does not claim to complete them.

No Git push, release publication, deployment, repository visibility/permission
change or raw-dataset import is part of this presentation update. The pre-existing
untracked `railway_eta_data/data/raw/` content is outside the change.
