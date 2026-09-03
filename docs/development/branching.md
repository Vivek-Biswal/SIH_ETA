# Branching & Integration Guide

## Branch Strategy

```
main ──────────────────────────────────────────────────────────► (production)
  │
develop ───────────────────────────────────────────────────────► (integration)
  │        │              │              │
  │        │              │              │
feature/   feature/       feature/       feature/
mobile-*   backend-*      train-*        web-*
```

## Rules

1. **Never commit directly to `main` or `develop`** — always use feature branches + PRs
2. **Branch from `develop`**, not from `main`
3. Keep feature branches short-lived (max 3-5 days for hackathon pace)
4. Merge `develop` into your feature branch daily to stay current
5. Delete branches after merge

## Integration Points

| What changes | Impact on other teams | Required action |
|---|---|---|
| New/changed API endpoint | Mobile + Web must update | Update `shared/api_contracts/api-contract.yaml` first |
| New DB table/column | Backend repositories + migrations | Create Alembic migration, update `docs/database/` |
| New ML model version | Backend ETAService must update call | Update `intelligence/train_eta/inference/` interface |
| New Flutter dependency | Mobile builds | Update `pubspec.yaml`, notify team |
| New npm package | Web builds | Update `package.json`, commit lock file |

## Keeping Up With Develop

```bash
# From your feature branch:
git fetch origin
git merge origin/develop
# Resolve any conflicts, then continue
```
