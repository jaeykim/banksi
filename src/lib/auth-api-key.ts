import { prisma } from '@/lib/prisma';

/**
 * Authenticate a request via API key (Authorization: Bearer bks_xxx).
 * Returns the merchant if valid, null otherwise.
 */
export async function authenticateApiKey(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer bks_')) return null;

  const apiKey = authHeader.slice(7); // Remove "Bearer "
  const merchant = await prisma.merchant.findUnique({
    where: { apiKey },
    select: { id: true, slug: true, name: true, isActive: true },
  });

  if (!merchant || !merchant.isActive) return null;
  return merchant;
}
