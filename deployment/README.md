# Deployment inventory

This directory contains the datacenter-facing deployment structure for the refactored app.

## Included files

- nginx/
- systemd/
- environment/
- scripts/
- package/ (generated frontend and backend standalone artifacts after validation)

## Design

The frontend and backend are separate standalone Next.js services. The frontend serves the UI on port 3000, the backend owns all `/api/*` handlers on port 3001, and Nginx sends API requests directly to the backend while serving other paths from the frontend. Generate `package/frontend` and `package/backend` from each package's `.next/standalone/<package>` output only after the repository validation commands pass. Keep backend secrets and persistent uploads outside the package directory.
