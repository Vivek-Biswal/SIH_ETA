# Branching and integration

The current default branch is `main`. Start focused work from its current state
and propose it through a pull request; for example:

```bash
git switch main
git pull --ff-only
git switch -c feature/clear-arrival-explanation
```

Use `git status` before switching or pulling; preserve unrelated local work.
This guide does not assert that GitHub branch protection, reviewer counts or a
`develop` workflow have been configured.

Coordinate API changes across the web and Flutter adapters. Update the runtime
FastAPI schemas and tests, then [the API guide](../api/api-contract.md). The
original shared YAML remains a historical proposal, not an enforced contract.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for scoped checks and evidence
requirements. Do not push, deploy, publish a release or alter repository settings
without the appropriate maintainer authorization.
