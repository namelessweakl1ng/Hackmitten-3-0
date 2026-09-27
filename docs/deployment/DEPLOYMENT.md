# Deployment overview

## Components

- Frontend: Next.js on 127.0.0.1:3000
- Backend: Node.js API on 127.0.0.1:3001
- Database: PostgreSQL with Prisma
- Storage: Linux filesystem at /var/lib/hackmitten
- SMTP: managed mail relay
- Nginx: TLS terminator / reverse proxy

## Files

- deployment/nginx/hackmitten.conf
- deployment/systemd/hackmitten-frontend.service
- deployment/systemd/hackmitten-backend.service
- deployment/environment/frontend.env.example
- deployment/environment/backend.env.example
- deployment/scripts/verify-deployment.sh
- deployment/scripts/health-check.sh

## Production notes

The provided production environment should be configured via environment files or a secret manager. The repository does not include live credentials.
