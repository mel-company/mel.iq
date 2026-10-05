# DNS-AID + DNSSEC for mel.iq

The scanner already sees DNS-AID records. Remaining work is **DNSSEC validation**
at your DNS provider / registrar — this cannot be fixed in the web app repo.

## Cloudflare (recommended if DNS is on Cloudflare)

1. Open the `mel.iq` zone → **DNS** → **Settings** / **DNSSEC**
2. Click **Enable DNSSEC**
3. Copy the **DS record** Cloudflare shows
4. Add that DS record at your **domain registrar** (where the domain was bought)
5. Wait for propagation (often minutes to a few hours)
6. Verify:

```bash
dig DS mel.iq +dnssec
dig _index._agents.mel.iq SVCB +dnssec
```

Or: https://dnssec-analyzer.verisignlabs.com/mel.iq

## If DNS is elsewhere

Enable DNSSEC in that provider’s panel, publish DS at the registrar, confirm
`AD` flag from a validating resolver (Cloudflare DoH / Google DoH).

## Suggested DNS-AID shape (if you need to re-publish)

```dns
_index._agents.mel.iq. 3600 IN HTTPS 1 www.mel.iq. alpn="h2,h3"
_catalog._agents.mel.iq. 3600 IN TXT "url=https://www.mel.iq/.well-known/ai-catalog.json"
```

Sign the zone with DNSSEC after publishing.
