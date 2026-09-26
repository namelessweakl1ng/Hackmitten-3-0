#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/../artifacts"
sha256sum -c SHA256SUMS

for archive in hackmitten-frontend.tar.gz hackmitten-backend.tar.gz; do
  listing=$(tar -tzf "$archive")
  if printf '%s\n' "$listing" | grep -E '(^|/)\.env($|/)|(^|/)\.git(/|$)|(^|/)node_modules(/|$)|(^|/)\.next(/|$)|(^|/)(storage|private-uploads)(/|$)' >/dev/null; then
    echo "Forbidden deployment content found in $archive" >&2
    exit 1
  fi
  for example in $(printf '%s\n' "$listing" | grep -E '(^|/)\.env\.example$' || true); do
    if tar -xOzf "$archive" "$example" | grep -E '^(DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|NEXTAUTH_SECRET|HM3_BERSERK_SECRET)=.+' >/dev/null; then
      echo "Non-empty secret-like environment assignment found in $archive:$example" >&2
      exit 1
    fi
  done
done

echo "Artifact checksums and package exclusions passed."
