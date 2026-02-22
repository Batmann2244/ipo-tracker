import { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please sign in" });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized - Please sign in" });
  }

  // Type assertion since req.user is typed as any or Express.User which might not have claims
  const user = req.user as any;
  const userEmail = user?.claims?.email;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];

  if (userEmail && adminEmails.includes(userEmail)) {
    return next();
  }

  res.status(403).json({ message: "Forbidden - Admin access required" });
};
