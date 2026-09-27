# Hackmitten 3.0 API contract

## Transport and responses

- API routes are owned by `backend/src/app/api` and use the `/api` prefix.
- Browser calls use same-origin `/api/*` URLs. The frontend proxies these to `BACKEND_API_ORIGIN`; the production Nginx config may route `/api/*` directly to port 3001.
- Responses are route-specific JSON or file downloads; there is no global `{ ok, data }` envelope. Errors generally use an `error` field and an HTTP status.
- Session and permission checks, database operations, filesystem storage, email, and exports are backend responsibilities.

## Health

- `GET /api/health`
- `200`: `{ "status": "ok", "database": "available" }`
- `503`: `{ "status": "unavailable", "database": "unavailable" }`

## Auth

- NextAuth credentials endpoints are served at `/api/auth/*` (`GET` and `POST`). The frontend uses the NextAuth client for sign-in, session, and sign-out.
- Roles are resolved and enforced by backend auth/permission helpers; clients must not treat UI role-gating as authorization.

## Registration

- `GET /api/registrations?name=...`: check normalized team-name availability.
- `POST /api/registrations`: submit a registration; accepts JSON or multipart form data with participant images.
- `GET /api/registrations/:id`: retrieve a registration using its access cookie.
- `POST /api/registrations/:id/payment`: submit payment transaction details using the registration access cookie.
- `POST /api/registrations/:id/payment-screenshot`: upload the payment screenshot using the registration access cookie.

## Admin

- `GET /api/admin/stats`, `/registrations`, `/teams`, `/users`, `/config`, `/audit`, `/change-history`, `/export`
- `POST /api/admin/teams`, `/users`, `/meals`, `/credentials`, `/audit/bulk-delete`
- `PATCH /api/admin/config`, `/teams/:id`, `/teams/:id/approve`, `/meals/:id`
- `DELETE /api/admin/teams/:id`, `/users/:id`, `/meals/:id`, `/audit/:id`
- Payment actions: `POST /api/admin/payments/:id/verify` and `/reject`; authorized screenshot and participant-image reads are `GET /api/admin/payments/:id/screenshot` and `/api/admin/participants/:id/image`.
- Change-history rollback: `POST /api/admin/change-history/:id/rollback`.

## Coordinator

- `GET /api/coordinator/teams`
- `GET /api/coordinator/teams/export`

## Food

- `GET /api/meals`, `/api/food/check-ins`, `/api/food/stats`, `/api/food/team-status`
- `POST /api/food/check-in`

## Pass and QR

- `GET /api/pass/:qrToken`
- `GET /api/uploads/:fileName` for public uploads.

## Uploads

- Private participant images and payment screenshots are stored in backend-managed directories and returned only by permission-checked routes.
- Public uploads are read through `/api/uploads/:fileName`; storage paths are never exposed directly.

## Error semantics

- `400`: malformed request or validation failure
- `401`: unauthenticated
- `403`: forbidden role, permission, or closed registration
- `404`: resource not found
- `409`: duplicate or conflict
- `413`: payload too large
- `500`: internal server error
