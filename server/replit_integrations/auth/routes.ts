import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Check session without requiring auth (no 401 for unauthenticated users)
  app.get("/api/auth/session", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json({ authenticated: false, user: null });
      }
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json({ authenticated: true, user });
    } catch (error) {
      console.error("Error checking session:", error);
      res.json({ authenticated: false, user: null });
    }
  });

  // Get current authenticated user (requires auth - returns 401 if not logged in)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
