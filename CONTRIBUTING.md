# Contributing to SIH_ETA

Welcome to the SIH ETA project! This guide defines how all team members collaborate on the codebase. Please read this before making your first contribution.

---

## Table of Contents

1. [Team Structure & Ownership](#team-structure--ownership)
2. [Branching Strategy](#branching-strategy)
3. [Commit Message Convention](#commit-message-convention)
4. [Pull Request Process](#pull-request-process)
5. [Code Review Guidelines](#code-review-guidelines)
6. [Where Does Each Type of Code Go?](#where-does-each-type-of-code-go)
7. [Integration Rules](#integration-rules)
8. [Environment Setup](#environment-setup)

---

## Team Structure & Ownership

| Area | Directory | Owner(s) |
|------|-----------|----------|
| Mobile App | `apps/mobile/` | Mobile/Flutter developer(s) |
| Web App | `apps/web/` | Web/Frontend developer(s) |
| Backend API | `backend/api/`, `backend/services/`, `backend/middleware/` | Backend developer(s) |
| Database | `backend/database/`, `backend/models/`, `backend/repositories/` | Backend/Database developer(s) |
| Train ETA Intelligence | `intelligence/train_eta/` | ML/Intelligence developer(s) |
| Network Intelligence | `intelligence/network_intelligence/` | ML/Intelligence developer(s) |
| Shared Contracts | `shared/` | **All teams** (require consensus to change) |
| Documentation | `docs/` | **All teams** |

---

## Branching Strategy

### Main Branches

| Branch | Purpose | Who merges into it |
|--------|---------|-------------------|
| `main` | Production-ready code. Protected. | Team lead via PR from `develop` |
| `develop` | Integration branch for tested features | Team members via PR |

### Feature Branches

Create feature branches from `develop`. **Never from `main`.**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<type>-<short-description>
```

### Branch Naming Convention

```
feature/mobile-<description>           # Flutter mobile work
feature/web-<description>              # Next.js web work
feature/backend-<description>          # FastAPI backend work
feature/database-<description>         # DB migrations, schema changes
feature/train-intelligence-<description>   # ETA ML pipeline
feature/network-intelligence-<description> # Network graph work
feature/shared-<description>           # Shared contract changes
fix/<area>-<description>               # Bug fixes
docs/<area>-<description>              # Documentation only
chore/<description>                    # Tooling, CI, config
```

**Examples:**
```
feature/mobile-eta-display-screen
feature/backend-train-search-endpoint
feature/train-intelligence-xgboost-model
fix/backend-eta-response-null-handling
docs/api-contract-train-search
```

---

## Commit Message Convention

We follow the **Conventional Commits** standard.

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no behavior change |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, tooling, dependencies |
| `perf` | Performance improvement |
| `data` | Data processing, schema, migration changes |

### Scopes

Use the area of the codebase: `mobile`, `web`, `backend`, `db`, `eta`, `network`, `shared`, `ci`, `docs`

### Examples

```
feat(mobile): add real-time ETA display on train status screen
fix(backend): handle null platform in station response
docs(api): document TrainSearchRequest schema
feat(eta): integrate XGBoost model into inference pipeline
chore(ci): add backend test workflow for pull requests
data(db): add migration for station_coordinates column
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Your branch is up-to-date with `develop`
- [ ] All tests pass locally
- [ ] No secrets or credentials in the diff
- [ ] No `.env` files committed
- [ ] No unrelated changes mixed in
- [ ] Documentation updated if you changed an API or interface

### PR Title Format

```
[Area] Short description of change
```

Examples:
```
[Mobile] Add ETA countdown on home screen
[Backend] Add /trains/search endpoint with pagination
[Intelligence] Train ETA XGBoost model training pipeline
[DB] Migration: add delay_history table
```

### PR Description Template

```markdown
## What does this PR do?
<!-- Brief description of the change -->

## Why?
<!-- Motivation / linked issue -->

## How to test?
<!-- Steps to verify the change works -->

## API / Interface changes?
<!-- List any API contract or schema changes, or write "None" -->

## Checklist
- [ ] Tests added / updated
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] `develop` merged in
```

### Merging Rules

- Minimum **1 reviewer approval** before merging into `develop`
- Minimum **2 reviewer approvals** before merging into `main`
- All CI checks must pass
- No force-pushes to `main` or `develop`

---

## Code Review Guidelines

**As an author:**
- Keep PRs focused and small
- Explain non-obvious decisions in comments
- Respond to all review comments before re-requesting review

**As a reviewer:**
- Review within 24 hours if possible
- Comment on logic, not style (CI handles style)
- Distinguish between blocking (`MUST`) and suggestions (`NIT`)
- Approve if the PR is correct even if you'd do it differently

---

## Where Does Each Type of Code Go?

### ❌ Things that must NOT happen

| What | Why it's wrong |
|------|---------------|
| API call inside a Flutter screen widget | Violates separation of concerns — use repository/service |
| Database query inside a FastAPI route function | Route = controller only — use repository layer |
| ML inference logic inside a FastAPI controller | Put inference in `intelligence/` or `backend/services/` |
| Hardcoded API URL in mobile/web code | Must come from environment config |
| Committing `.env` with real credentials | Security risk — use `.env.example` |
| Direct DB access from mobile/web | Frontend never talks to database directly |
| New top-level directory without team discussion | Breaks monorepo architecture |

### ✅ Correct placement

| Code type | Where it goes |
|-----------|---------------|
| Flutter screen widgets | `apps/mobile/flutter_app/lib/features/<feature>/presentation/` |
| Flutter business logic (UseCases) | `apps/mobile/flutter_app/lib/features/<feature>/domain/` |
| Flutter API calls (Repositories) | `apps/mobile/flutter_app/lib/features/<feature>/data/` |
| Reusable Flutter widgets | `apps/mobile/flutter_app/lib/shared/widgets/` |
| Next.js pages/routes | `apps/web/web_app/src/app/` |
| Next.js React components | `apps/web/web_app/src/components/` |
| Next.js API service calls | `apps/web/web_app/src/services/` |
| FastAPI route definitions | `backend/api/routes/` |
| FastAPI request handlers | `backend/api/controllers/` |
| Business logic (Python) | `backend/services/` |
| DB queries | `backend/repositories/` |
| SQLAlchemy models | `backend/models/` |
| DB migrations | `backend/database/migrations/` |
| ML training scripts | `intelligence/train_eta/training/` |
| ML inference code | `intelligence/train_eta/inference/` |
| Feature engineering | `intelligence/train_eta/features/` |
| Network graph logic | `intelligence/network_intelligence/graph/` |
| API request/response schemas | `shared/api_contracts/` or `shared/schemas/` |
| Cross-team constants | `shared/constants/` |
| Architecture docs | `docs/architecture/` |
| API docs | `docs/api/` |
| Setup / dev guides | `docs/development/` |

---

## Integration Rules

### How teams communicate

All cross-team communication happens through:

1. **REST API** — documented in `shared/api_contracts/`
2. **WebSocket** — for real-time updates (train positions, ETA updates)
3. **Shared schemas** — Pydantic models in `shared/schemas/`

### Changing a shared contract

If you need to change an API endpoint or schema:

1. **Discuss with all affected teams first**
2. Update `shared/api_contracts/` with the new spec
3. Version the endpoint if it's a breaking change (`/api/v2/...`)
4. Update `docs/api/api-contract.md`
5. Open a PR with `[Shared]` prefix and tag all team leads as reviewers

### Never directly access another team's data store

- Mobile/Web → Backend API only (never direct DB)
- Backend → Database only via repositories
- Backend → Intelligence via service layer / internal API calls
- Intelligence models → exposed through `intelligence/<module>/inference/`

---

## Environment Setup

1. Copy `.env.example` to `.env` in the root and each subsystem
2. Fill in your local credentials
3. **Never commit `.env`**

For subsystem-specific setup, see:
- [`apps/mobile/flutter_app/README.md`](apps/mobile/flutter_app/README.md)
- [`apps/web/web_app/README.md`](apps/web/web_app/README.md)
- [`backend/README.md`](backend/README.md)
- [`intelligence/README.md`](intelligence/README.md)
- [`docs/development/setup.md`](docs/development/setup.md)
