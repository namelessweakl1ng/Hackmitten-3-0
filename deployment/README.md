# Deployment inventory

This directory contains the datacenter-facing deployment structure for the refactored app.

## Included files

- nginx/
- systemd/
- environment/
- scripts/

## Design

The frontend and backend are run as separate local services. The public internet reaches the host over HTTPS, and Nginx forwards /api/* to the backend while serving the frontend UI for all other paths.
