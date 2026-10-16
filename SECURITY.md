# Security and credential reporting

Do not post API keys, passwords, service-role credentials, tokens, private user
data, `.env` files or unredacted provider responses in issues, pull requests or
screenshots.

For a security vulnerability, use this repository's **Security → Advisories →
Report a vulnerability** if private reporting is available. If it is unavailable,
open a minimal issue asking the maintainer for a private reporting channel;
**do not include exploit details or credentials** in that public issue.

If a credential has leaked, revoke or rotate it at its provider immediately.
Removing the latest file does not remove it from Git history. Tell the maintainer
which provider was affected without sharing the replacement secret.

## Configuration boundaries

- RailRadar, OpenWeather and Supabase service-role keys belong only in the
  backend environment. Never put them in `NEXT_PUBLIC_*`, Flutter defines or APKs.
- MapTiler browser keys are delivered to map clients by design. Restrict them to
  approved website domains and use the provider's browser-key controls.
- `.env.example` files contain placeholders only; real environment files remain
  ignored by Git.
- Passenger APIs and older compatibility routes must not be assumed to provide
  production JWT authorization. See [current feature status](docs/FEATURE_STATUS.md).

No formal security audit, response SLA or supported-release security guarantee
is implied by this prototype's public availability.
