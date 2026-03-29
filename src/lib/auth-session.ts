import { cookies } from 'next/headers';
import { getAdminAuth } from './firebase-admin';
import { prisma } from './prisma';

export interface AppSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    merchantId: string | null;
  };
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('firebase-token')?.value;
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, email: true, name: true, role: true, merchantId: true },
    });
    if (!user) return null;
    return { user };
  } catch {
    return null;
  }
}
