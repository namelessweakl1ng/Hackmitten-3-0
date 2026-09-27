# Hackmitten 3.0 API contract

## Base rules

- All server endpoints are under /api
- Success responses use { ok: true, data: ... }
- Error responses use { ok: false, error: "..." }
- Authorization is always validated on the backend
- Database and filesystem writes happen only in the backend app

## Health

- GET /api/health
- Response: { ok: true, data: { status: "ok", ok: true, timestamp: "..." } }

## Auth

- POST /api/auth/login
- GET /api/auth/session
- POST /api/auth/logout

## Registration

- POST /api/registrations
- GET /api/registrations/:id
- POST /api/registrations/:id/payment
- POST /api/registrations/:id/payment-screenshot
- GET /api/registrations/:id/payment-screenshot

## Admin

- GET /api/admin/stats
- GET /api/admin/registrations
- GET /api/admin/teams
- GET /api/admin/users
- GET /api/admin/config
- GET /api/admin/export
- GET /api/admin/audit

## Coordinator

- GET /api/coordinator/teams
- GET /api/coordinator/teams/export

## Food

- POST /api/food/check-in
- GET /api/food/check-ins
- GET /api/food/stats
- GET /api/food/team-status

## Pass and QR

- GET /api/pass/:qrToken
- GET /api/uploads/:fileName

## Uploads

- Private uploads are stored in backend-managed directories with authorization checks before retrieval.
- Public uploads remain served through application-controlled endpoints, never by direct path exposure.

## Error semantics

- 400: malformed request or validation failure
- 401: unauthenticated
- 403: forbidden role or permission
- 404: resource not found
- 409: duplicate or conflict
- 413: payload too large
- 500: internal server error
