import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const getFallbackUser = (reqUser: any) => {
  if (!reqUser || !reqUser.claims) return null;
  return {
    id: reqUser.claims.sub,
    email: reqUser.claims.email,
    firstName: reqUser.claims.first_name,
    lastName: reqUser.claims.last_name,
    profileImageUrl: reqUser.claims.profile_image_url,
  };
};

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Check session without requiring auth (no 401 for unauthenticated users)
  app.get("/api/auth/session", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || "default-user";
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.json({ authenticated: true, user: getFallbackUser(req.user) });
      }
      res.json({ authenticated: true, user });
    } catch (error) {
      console.error("Error checking session:", error);
      res.json({ authenticated: true, user: getFallbackUser(req.user) });
    }
  });

  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || "default-user";
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.json(getFallbackUser(req.user));
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
