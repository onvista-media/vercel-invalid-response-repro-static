# CONTROL VARIANT (static not-found) of vercel-invalid-response-repro

Same app as `vercel-invalid-response-repro`, only `app/not-found.tsx` no longer reads request headers, so `/_not-found` is fully static. If `/snapshot/unknown` returns 404 here for a browser user agent, the invalid response is tied to the partially prerendered, streamed not-found.

---

# INTERNAL_INVALID_RESPONSE for pages-router `notFound` on Vercel

Minimal reproduction for a Vercel support case. Extracted from www.onvista.de
(Vercel team `onvista`, project `onvista`, region fra1).

## Summary

A Next.js 16.2.11 app that uses the pages router and the app router side by side
(`cacheComponents: true`). When a pages-router `getServerSideProps` returns
`{ notFound: true }`, Next.js renders `app/not-found.tsx`. Our not-found tree reads a
request header (`headers()`) inside `<Suspense>`, so `/_not-found` is a partially
prerendered shell whose remainder is streamed at request time.

- For user agents on Next.js's internal crawler list (Googlebot, bingbot, Slackbot, ...)
  Next.js renders blocking and Vercel serves a correct `404`.
- For every other user agent (browsers, curl, monitoring, HomeAssistant, GPTBot, ...)
  Vercel answers `500` with `x-vercel-error: INTERNAL_INVALID_RESPONSE`. The request log
  shows `Cache: 500 Internal Invalid Response` followed by a normal Function Invocation
  block. Also with `x-vercel-cache: BYPASS` (request with `Authorization` header), so this
  is not a cache hit of a bad entry.

Second, worse effect: once such a response reaches a cacheable key that previously held
a valid entry (a hot page whose backend hiccuped once), every later request for that key
returns the same 500 from the Cache stage without invoking the function, for hours.
`vercel cache purge --type cdn` clears it. The request log for these shows Middleware 200,
Cache 500, no Function Invocation, total ~30 ms.

## Environment

- Next.js 16.2.11, React 19, Node.js 24.x (project setting), region fra1
- Framework preset Next.js, no middleware in this repro (production has one, the bug
  reproduces without it)

## Reproduce

Deploy this repo to Vercel (`vercel --prod`). Then, with `HOST` set to the deployment:

```bash
# Baseline: pages-router page that returns props -> 200, cached
curl -s -D - -o /dev/null -A "Mozilla/5.0" "https://$HOST/snapshot/known"

# Bug 1: pages-router notFound, browser user agent -> expected 404, actual 500
curl -s -D - -o /dev/null -A "Mozilla/5.0" "https://$HOST/snapshot/unknown?r=$RANDOM"

# Same URL, crawler user agent from Next.js's internal isBot list -> 404 as expected
curl -s -D - -o /dev/null -A "Googlebot/2.1" "https://$HOST/snapshot/unknown?r=$RANDOM"

# Same URL, browser user agent, cache bypass (Authorization header) -> still 500,
# so the function response itself is what Vercel rejects
curl -s -D - -o /dev/null -A "Mozilla/5.0" -H "Authorization: Bearer x" "https://$HOST/snapshot/unknown?r=$RANDOM"
```

Expected for the browser request: `HTTP/2 404`, HTML body, `x-matched-path: /snapshot/[slug]`.
Actual: `HTTP/2 500`, `x-vercel-error: INTERNAL_INVALID_RESPONSE`, 101-byte text body.

### Bug 2: key stays broken

`/flaky/dax` returns 200 (cacheable 60 s) in even UTC minutes and `notFound` in odd
UTC minutes. Request it with a browser user agent once per 20 s for ~5 minutes:

```bash
for i in $(seq 1 15); do
  date -u +%H:%M:%S; curl -s -D - -o /dev/null -A "Mozilla/5.0" "https://$HOST/flaky/dax" | grep -iE "^HTTP|x-vercel-cache|x-vercel-error"; sleep 20
done
```

Expected: 200 HIT/MISS in even minutes, 404 in odd minutes, recovery in the next even minute.
Actual (production): after the first invalid response the key answers 500 from the Cache stage
with no function invocation and does not recover on its own.

## Results from this repro (2026-09-15, team onvista, project vercel-invalid-response-repro)

Deployment `dpl_6noj4aAeEyXveqUzxPynCNDq9SSY`, host `vercel-invalid-response-repro.preview.onvista.de`, fra1.

| Request | Result |
|---|---|
| `/snapshot/known`, `Mozilla/5.0` | 200, `x-vercel-cache: HIT` |
| `/snapshot/unknown?r=…`, `Mozilla/5.0` | **500 `INTERNAL_INVALID_RESPONSE`** |
| `/snapshot/unknown?r=…`, Chrome UA | **500** |
| `/snapshot/unknown?r=…`, `curl/8.7.1`, `GPTBot`, `HomeAssistant` | **500** |
| `/snapshot/unknown?r=…`, `Googlebot/2.1` | 404, `x-vercel-cache: MISS` |
| `/snapshot/unknown?r=…`, `Mozilla/5.0` + `Authorization` header | **500**, so not a cached bad entry |
| `/nope-…` (no matching route, static `/404`) | 404 |

Request log for `pr2fx-1789453856140-ba155039872b` (`/snapshot/unknown`, UA `Mozilla/5.0`):
Firewall Allowed -> Cache "500 Internal Invalid Response" (key `/snapshot/[slug]`, `r`, `nxtPslug=unknown`)
-> Function Invocation `/snapshot/[slug]`, 37 ms, no outgoing requests -> response finished in 230 ms.
Identical shape to the production requests below.

## Production evidence (team onvista, project onvista, deployment dpl_91M8zoWghTrEEC7mk3xMr1iRJnWC)

- `qm4gr-1789453071559-adba3a88411b` (2026-09-15 08:17:51 CEST): Middleware 200 ->
  Cache "500 Internal Invalid Response" -> Function Invocation `/futures/[...snapshot]`,
  upstream `api.onvista.de/api/v1/futures/289497111/snapshot` 404 -> `notFound`.
- `dqpvv-1789453140151-508e4ec07e41` (2026-09-15 08:19:00 CEST): `/realtime/DAX?notation=14734849`,
  Middleware 200 -> Cache "500 Internal Invalid Response", finished in 29 ms, no function invocation.
- `fra1::fra1::82hdr-1789397496626-e1abc62fb739` (2026-09-14 16:51 CEST): `/index/DAX-Index-20735`,
  hot page stuck for ~3.5 h until `vercel cache purge --type cdn`. Same URL with `Authorization`
  header (BYPASS) rendered 200 the whole time.

## Questions for Vercel

1. What exactly makes the streamed not-found response invalid for the proxy, given that the
   same render served blocking (crawler UA) is accepted?
2. Why does a key stop being revalidated after one invalid origin response, and is there a
   way to bound that (we could not find one; `stale-if-error` is documented as unsupported)?
