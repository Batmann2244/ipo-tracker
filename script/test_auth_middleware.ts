import { requireAdmin } from "../server/middleware/auth";
import assert from "assert";

// Mock objects
const mockRes = () => {
  const res: any = {};
  res.statusCode = 200; // default
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
};

const mockNext = () => {
  let called = false;
  const next = () => {
    called = true;
  };
  (next as any).called = () => called;
  return next;
};

// Test cases
async function runTests() {
  console.log("Running Auth Middleware Tests...");

  // Test 1: Unauthenticated
  {
    console.log("Test 1: Unauthenticated user");
    const req: any = {
      isAuthenticated: () => false,
    };
    const res = mockRes();
    const next = mockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(res.statusCode, 401, "Should return 401");
    assert.strictEqual((next as any).called(), false, "Next should not be called");
    console.log("PASS");
  }

  // Test 2: Authenticated but not admin (no ADMIN_EMAILS set)
  {
    console.log("Test 2: Authenticated non-admin (no ADMIN_EMAILS set)");
    process.env.ADMIN_EMAILS = "";
    const req: any = {
      isAuthenticated: () => true,
      user: {
        claims: {
          email: "user@example.com"
        }
      }
    };
    const res = mockRes();
    const next = mockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(res.statusCode, 403, "Should return 403");
    assert.strictEqual((next as any).called(), false, "Next should not be called");
    console.log("PASS");
  }

  // Test 3: Authenticated admin
  {
    console.log("Test 3: Authenticated admin");
    process.env.ADMIN_EMAILS = "admin@example.com, other@example.com";
    const req: any = {
      isAuthenticated: () => true,
      user: {
        claims: {
          email: "admin@example.com"
        }
      }
    };
    const res = mockRes();
    const next = mockNext();

    requireAdmin(req, res, next);

    assert.strictEqual((next as any).called(), true, "Next should be called");
    console.log("PASS");
  }

  // Test 4: Authenticated non-admin (ADMIN_EMAILS set)
  {
    console.log("Test 4: Authenticated non-admin (ADMIN_EMAILS set)");
    process.env.ADMIN_EMAILS = "admin@example.com";
    const req: any = {
      isAuthenticated: () => true,
      user: {
        claims: {
          email: "user@example.com"
        }
      }
    };
    const res = mockRes();
    const next = mockNext();

    requireAdmin(req, res, next);

    assert.strictEqual(res.statusCode, 403, "Should return 403");
    assert.strictEqual((next as any).called(), false, "Next should not be called");
    console.log("PASS");
  }

  console.log("All tests passed!");
}

runTests().catch(console.error);
