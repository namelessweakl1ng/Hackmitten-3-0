# Security

- Backend owns authentication, authz, database access, file storage, and SMTP.
- Frontend must use only safe public environment variables.
- Private files are never served directly by Nginx.
- Participant image validation must reject invalid or oversized uploads.
- Sensitive endpoints must authorize on the server using role and permission checks.
- Do not expose DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, SMTP_PASSWORD, or storage paths to the browser.
