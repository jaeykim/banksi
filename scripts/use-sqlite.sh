#!/bin/bash
# Switch Prisma to SQLite for local development
sed -i '' 's/provider  = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
sed -i '' '/directUrl/d' prisma/schema.prisma
echo "Switched to SQLite. Run: npx prisma generate"
