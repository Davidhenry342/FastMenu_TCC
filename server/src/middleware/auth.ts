import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fastmenu-tcc-jwt-secret-change-in-production';

export type EmployeeJwtPayload = {
  sub: string;
  role: string;
};

export type AuthRequest = Request & {
  employee?: { id: string; role: string };
};

const roleMapPrismaToDisplay: Record<string, string> = {
  Cozinheiro_a: 'Cozinheiro(a)',
};

const roleMapDisplayToPrisma: Record<string, string> = {
  'Cozinheiro(a)': 'Cozinheiro_a',
};

export function normalizeRole(role: string): string {
  return roleMapPrismaToDisplay[role] ?? role;
}

export function toPrismaRole(role: string): string {
  return roleMapDisplayToPrisma[role] ?? role;
}

export function requireEmployee(req: AuthRequest, res: Response, next: NextFunction) {
  const token = (req as unknown as { cookies?: Record<string, string> }).cookies?.employee_token as
    | string
    | undefined;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as EmployeeJwtPayload;

    req.employee = { id: payload.sub, role: normalizeRole(payload.role) };
    next();
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

export function requireRole(...allowed: string[]) {
  const normalizedAllowed = allowed.map(normalizeRole);
  const prismaAllowed = allowed.map(toPrismaRole);

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.employee?.role;

    if (!role) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const ok =
      normalizedAllowed.includes(role) ||
      normalizedAllowed.includes(normalizeRole(role)) ||
      prismaAllowed.includes(role) ||
      normalizedAllowed.includes(toPrismaRole(role));

    if (!ok) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    next();
  };
}
