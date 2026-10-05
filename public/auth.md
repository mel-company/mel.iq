# auth.md

Mel IQ agent authentication and registration guide for automated clients.

## Audience

This document is for AI agents and automated clients that need to discover how
merchants authenticate to Mel IQ (`https://www.mel.iq`) and the platform API
(`https://api.mel.iq/api/v1`).

## Summary

Mel uses **phone OTP + JWT bearer tokens**, not a classic browser OAuth redirect
for merchant login. Discovery metadata is published so agents can locate the
right endpoints:

| Document | URL |
| --- | --- |
| Protected resource metadata | https://www.mel.iq/.well-known/oauth-protected-resource |
| Authorization server metadata | https://www.mel.iq/.well-known/oauth-authorization-server |
| OpenID discovery | https://www.mel.iq/.well-known/openid-configuration |
| API catalog | https://www.mel.iq/.well-known/api-catalog |
| OpenAPI | https://www.mel.iq/docs/openapi.json |

## Human / agent merchant registration

1. Start checkout: `https://www.mel.iq/checkout`
2. Create an account with name, email, and Iraqi phone number
3. Complete OTP verification at `https://www.mel.iq/otp`
4. API clients exchange OTP for tokens via `POST https://api.mel.iq/api/v1/auth/verify`

There is no anonymous public write API for creating stores without a merchant
account. Agents that need automated provisioning should contact Mel support and
use a provisioned merchant credential.

## Phone OTP token flow

1. `POST /auth/login` with `{ "phone": "+9647XXXXXXXXX" }` — sends OTP SMS
2. `POST /auth/verify` with `{ "phone": "...", "code": 123456 }` — returns access + refresh tokens
3. Call protected routes with `Authorization: Bearer <access_token>`
4. Refresh with `POST /auth/refresh`
5. Revoke with `POST /auth/logout`

Base URL: `https://api.mel.iq/api/v1`

## Supported identity types

- **phone_otp** — primary merchant authentication
- **verified_email** — collected during registration / checkout
- **anonymous** — browse marketing pages and public discovery docs only

## Credential use

- Send bearer tokens in the `Authorization` header only
- Do not embed tokens in query strings
- Treat refresh tokens as secrets
- Prefer the protected-resource metadata scopes listed at
  `/.well-known/oauth-protected-resource`

## Support

- Contact form: https://www.mel.iq/#contact
- Support email: hassan.adnan@mel.iq
- Privacy: https://www.mel.iq/privacy-policy
- Delete account: https://www.mel.iq/delete-account
