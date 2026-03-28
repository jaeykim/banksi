import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type RouteHandler = (
  req: NextRequest,
  context?: Record<string, unknown>
) => Promise<NextResponse>;

export function withRole(...allowedRoles: string[]) {
  return function (handler: RouteHandler): RouteHandler {
    return async function (
      req: NextRequest,
      context?: Record<string, unknown>
    ): Promise<NextResponse> {
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(req, context);
    };
  };
}
