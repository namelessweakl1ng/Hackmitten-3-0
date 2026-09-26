# Architecture documentation

The authoritative developer and deployment documentation is HUMAN_DEVELOPER_GUIDE.md. This file remains as a short pointer for existing links.

The application uses Next.js standalone output, PostgreSQL/Prisma, NextAuth credentials authentication, and a local datacenter deployment model. Production build, migration, bootstrap, and runtime startup are separate operations. New uploads use persistent public/private filesystem directories; legacy Supabase screenshots are read-only compatibility. Vercel Blob is not used.
