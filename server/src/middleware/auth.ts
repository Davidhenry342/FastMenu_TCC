import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fastmenu-tcc-jwt-secret-change-in-production';

export type EmployeeJwtPayload = {
  sub: string;
  role: string;
};

export type CustomerJwtPayload = {
  sub: string;
  role: string;
};

export type AuthRequest = Request & {
  employee?: { id: string; role: string };
  customer?: { id: string };
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

export function requireCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  const token = (req as unknown as { cookies?: Record<string, string> }).cookies?.customer_token as
    | string
    | undefined;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as CustomerJwtPayload;

    req.customer = { id: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

export function requireCustomerOrEmployee(req: AuthRequest, res: Response, next: NextFunction) {
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  const customerToken = cookies?.customer_token as string | undefined;
  const employeeToken = cookies?.employee_token as string | undefined;

  if (customerToken) {
    try {
      const payload = jwt.verify(customerToken, JWT_SECRET) as CustomerJwtPayload;

      req.customer = { id: payload.sub };
    } catch {
      // ignore invalid customer token, try employee
    }
  }

  if (employeeToken) {
    try {
      const payload = jwt.verify(employeeToken, JWT_SECRET) as EmployeeJwtPayload;

      req.employee = { id: payload.sub, role: normalizeRole(payload.role) };
    } catch {
      // ignore invalid employee token
    }
  }

  if (!req.customer && !req.employee) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  next();
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
