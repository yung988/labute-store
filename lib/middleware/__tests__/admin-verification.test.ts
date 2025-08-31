import { NextRequest } from "next/server";
import {
  verifyAdminRoleFromClaims,
  isAdminUser,
  AdminUser,
  verifyAdminAccess,
  createAdminErrorResponse
} from "../admin-verification";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY = "test-anon-key";

describe("Admin Verification Middleware", () => {
  describe("verifyAdminRoleFromClaims", () => {
    it("should return true for admin role in root level", () => {
      const claims = { role: "admin", id: "123", email: "admin@test.com" };
      expect(verifyAdminRoleFromClaims(claims)).toBe(true);
    });

    it("should return true for admin role in user_metadata", () => {
      const claims = {
        id: "123",
        email: "admin@test.com",
        user_metadata: { role: "admin" }
      };
      expect(verifyAdminRoleFromClaims(claims)).toBe(true);
    });

    it("should return true for admin role in app_metadata", () => {
      const claims = {
        id: "123",
        email: "admin@test.com",
        app_metadata: { role: "admin" }
      };
      expect(verifyAdminRoleFromClaims(claims)).toBe(true);
    });

    it("should return false for non-admin roles", () => {
      const claims = { role: "user", id: "123", email: "user@test.com" };
      expect(verifyAdminRoleFromClaims(claims)).toBe(false);
    });

    it("should return false for null/undefined claims", () => {
      expect(verifyAdminRoleFromClaims(null)).toBe(false);
      expect(verifyAdminRoleFromClaims(undefined)).toBe(false);
    });
  });

  describe("isAdminUser", () => {
    it("should return true for valid admin user", () => {
      const user: AdminUser = {
        id: "123",
        email: "admin@test.com",
        role: "admin"
      };
      expect(isAdminUser(user)).toBe(true);
    });

    it("should return false for invalid user structure", () => {
      const invalidUser = { name: "test" };
      expect(isAdminUser(invalidUser)).toBe(false);
    });

    it("should return false for non-admin role", () => {
      const user = {
        id: "123",
        email: "user@test.com",
        role: "user"
      };
      expect(isAdminUser(user)).toBe(false);
    });
  });

  describe("createAdminErrorResponse", () => {
    it("should create proper error response", () => {
      const response = createAdminErrorResponse("Test error", 403);
      expect(response.status).toBe(403);

      const body = response.json();
      expect(body).resolves.toEqual({
        error: "Test error",
        code: "ADMIN_ACCESS_DENIED",
        timestamp: expect.any(String)
      });
    });

    it("should use default status 403", () => {
      const response = createAdminErrorResponse("Test error");
      expect(response.status).toBe(403);
    });
  });

  describe("verifyAdminAccess", () => {
    // Note: Full integration tests would require mocking Supabase client
    // These are basic structure tests

    it("should handle missing env vars", async () => {
      // Temporarily remove env vars
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

      const request = new NextRequest("http://localhost:3000/admin");
      const result = await verifyAdminAccess(request);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Environment not configured");

      // Restore env vars
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY = originalKey;
    });
  });
});