#!/bin/bash
# Switch Prisma to PostgreSQL for production/Vercel
sed -i '' 's/provider = "sqlite"/provider  = "postgresql"/' prisma/schema.prisma
# Add directUrl if not present
if ! grep -q "directUrl" prisma/schema.prisma; then
  sed -i '' '/url.*=.*env("DATABASE_URL")/a\
  directUrl = env("DIRECT_URL")
' prisma/schema.prisma
fi
echo "Switched to PostgreSQL. Run: npx prisma generate"
