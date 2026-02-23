import { Request, Response, NextFunction } from "express";

export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please sign in" });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized - Please sign in" });
  }

  const user = (req as any).user as any;
  const userEmail = user?.claims?.email?.toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (userEmail && adminEmails.includes(userEmail)) {
    return next();
  }

  res.status(403).json({ message: "Forbidden - Admin access required" });
};
