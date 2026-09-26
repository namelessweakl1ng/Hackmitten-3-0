# Backend API contract

Base path: `/api`. Production browser traffic uses the frontend HTTPS origin; Nginx proxies this path to the backend's private listener. JSON endpoints return JSON objects. CSV and image endpoints return binary content with `Content-Disposition` and `Cache-Control: private, no-store` as applicable.

| Endpoint | Methods | Authentication / role | Request and success response |
| --- | --- | --- | --- |
| `/health` | GET | Public readiness | `{status:"ok",database:"available"}`; 503 when database unavailable |
| `/auth/*` | NextAuth GET/POST | Credentials login/session/CSRF/sign-out | NextAuth protocol; cookie session is HttpOnly, secret signed by backend |
| `/event-state` | GET | Public | Event lifecycle, registration availability/capacity |
| `/registrations` | POST, GET | POST registration public; GET team-name availability public | POST multipart with `registration` JSON and optional indexed participant image files; returns created team and acknowledgement result, and sets a team-scoped 24-hour HttpOnly `SameSite=Strict` payment-access cookie. GET `/registrations/check-team-name?name=` returns availability |
| `/registrations/{id}` | GET | `registration:view` coordinator or super admin | Admin/coordinator registration details; unauthorized requests receive 401/403 |
| `/registrations/{id}/payment` | POST | Possession of that team's scoped HttpOnly registration cookie | Submit/update transaction details; no bearer token is returned to browser JavaScript |
| `/registrations/{id}/payment-screenshot` | POST | Possession of that team's scoped HttpOnly registration cookie | Multipart payment screenshot metadata |
| `/pass/{qrToken}` | GET | Possession of opaque server-generated QR token | Participant pass details only |
| `/coordinator/teams` | GET | Coordinator or super admin | Approved teams; member QR IDs and image-availability flags, no private filesystem keys |
| `/coordinator/teams/export` | GET | Coordinator or super admin | UTF-8 CSV; team/member orientation, college, degree and transaction number |
| `/admin/export` | GET | Super admin | Admin transaction/team CSV for manual transaction-number verification |
| `/admin/participants/{id}/image` | GET | `registration:view` (coordinator or super admin) | Private image bytes; every request rechecks role and participant record |
| `/admin/payments/{id}/screenshot` | GET | `registration:view` | Private payment screenshot bytes |
| `/admin/*` | GET/POST/PATCH/DELETE as implemented | Per-route permission checks; admin mutations require super-admin permissions | Registration, team, payment, user, meal, config, audit, and change-history JSON; see route handlers for fields |
| `/food/*`, `/meals` | GET/POST/PATCH/DELETE as implemented | Food coordinator/super admin; coordinator read-only stats where allowed | Meal, participant status, statistics, and check-in JSON; check-in is transactionally duplicate protected |
| `/uploads/{fileName}` | GET | Public compatibility uploads only | Constrained legacy public image retrieval; never maps private storage |

## Errors

Expected failures use `{ "error": "human-readable message" }`, optionally with a stable `code` or field `issues`. Statuses include 400 validation, 401 unauthenticated, 403 forbidden/origin rejected, 404 unavailable record, 409 conflict or duplicate, 413 request/file too large, 429 rate limited, and 503 temporary service/database unavailability. Internal exceptions, SQL, paths, SMTP details, and stack traces must not be returned. CSV exports use 403 when authorization fails.

For the exact fields, optional values, and method variants of admin/food endpoints, inspect this contract alongside the route implementation in `src/app/api`. Route-level permission checks are authoritative; browser role checks only control navigation and display.
