import type { Express, RequestHandler } from "express";
import { authStorage } from "./storage";

export function getSession() {
  return (req: any, res: any, next: any) => next();
}

export async function setupAuth(app: Express) {
  // Mock User
  const mockUser = {
    claims: {
      sub: "default-user",
      email: "user@example.com",
      first_name: "Default",
      last_name: "User",
      profile_image_url: null,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 1 week
    },
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  };

  try {
    // Ensure user exists in DB
    await authStorage.upsertUser({
      id: mockUser.claims.sub,
      email: mockUser.claims.email,
      firstName: mockUser.claims.first_name,
      lastName: mockUser.claims.last_name,
      profileImageUrl: mockUser.claims.profile_image_url,
    });
  } catch (error) {
    console.error("Failed to upsert default user:", error);
  }

  app.use((req: any, res, next) => {
    req.user = mockUser;
    req.isAuthenticated = () => true;
    req.logout = (cb: any) => {
      if (cb) cb();
    };
    next();
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  next();
};
