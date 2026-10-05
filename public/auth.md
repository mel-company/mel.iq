# auth.md

You are an agent. Mel IQ supports **agentic registration**: discover → register → (claim if needed) → exchange for an access_token → call API → handle revocation.

Mel IQ is an Iraqi ecommerce platform. Merchants also authenticate with phone OTP for the human dashboard; agents should prefer the discovery flow below.

## Step 1 — Discover

### 1a. Fetch the Protected Resource Metadata

[OAuth Protected Resource Metadata](https://www.mel.iq/.well-known/oauth-protected-resource)

```http
GET https://www.mel.iq/.well-known/oauth-protected-resource
```

### 1b. Fetch the Authorization Server metadata

[OAuth Authorization Server Metadata](https://www.mel.iq/.well-known/oauth-authorization-server)

```http
GET https://www.mel.iq/.well-known/oauth-authorization-server
```

The Authorization Server document includes the `agent_auth` block with:

- `skill` — this document
- `identity_endpoint` / `register_uri`
- `claim_endpoint`
- `events_endpoint`
- supported identity types and assertion types

Also useful:

- [OpenID configuration](https://www.mel.iq/.well-known/openid-configuration)
- [OpenAPI](https://www.mel.iq/docs/openapi.json)
- [API catalog](https://www.mel.iq/.well-known/api-catalog)

## Step 2 — Pick a method

1. **ID-JAG / identity_assertion** — you can mint an audience-bound identity assertion for Mel
2. **service_auth** — you only have the user's email; claim ceremony required
3. **anonymous** — no user identity yet; optional deferred claim

Human merchants may still use phone OTP via the dashboard login at [https://www.mel.iq/login](https://www.mel.iq/login).

## Step 3 — Register

```http
POST https://www.mel.iq/api/agent/identity
Content-Type: application/json
```

### identity_assertion

```json
{
  "type": "identity_assertion",
  "assertion_type": "urn:ietf:params:oauth:token-type:id-jag",
  "assertion": "<ID-JAG JWT>"
}
```

### service_auth

```json
{
  "type": "service_auth",
  "login_hint": "user@example.com"
}
```

### anonymous

```json
{
  "type": "anonymous"
}
```

Registration returns a service-signed `identity_assertion` (and optionally a claim block). It does **not** return an API access token directly.

## Step 4 — Claim ceremony (when required)

```http
POST https://www.mel.iq/api/agent/identity/claim
Content-Type: application/json
```

Surface `user_code` + `verification_uri` to the user. The user completes claim in the browser, then the agent polls the token endpoint with the claim grant.

## Step 5 — Exchange the assertion

```http
POST https://www.mel.iq/api/oauth2/token
Content-Type: application/x-www-form-urlencoded
```

```
grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<identity_assertion>
```

Claim polling grant:

```
grant_type=urn:workos:agent-auth:grant-type:claim&claim_token=<claim_token>
```

## Step 6 — Use the access_token

Call Mel APIs with:

```http
Authorization: Bearer <access_token>
```

Primary API base: `https://api.mel.iq/api/v1`

## Credential use

- Send bearer tokens in the `Authorization` header only
- Do not put tokens in query strings
- Treat refresh tokens / claim tokens as secrets
- Prefer scopes from the Protected Resource Metadata

## Revocation

- Credential layer: [https://www.mel.iq/api/oauth2/revoke](https://www.mel.iq/api/oauth2/revoke)
- Registration / provider events: [https://www.mel.iq/api/agent/event/notify](https://www.mel.iq/api/agent/event/notify)

## Support

- Contact: [https://www.mel.iq/#contact](https://www.mel.iq/#contact)
- Email: hassan.adnan@mel.iq
- Privacy: [https://www.mel.iq/privacy-policy](https://www.mel.iq/privacy-policy)
- Delete account: [https://www.mel.iq/delete-account](https://www.mel.iq/delete-account)
