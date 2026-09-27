/**
 * Permission boundary tests — verifies that the role-based access control
 * correctly grants/denies permissions for each role.
 *
 * Run: bun test tests/permissions.test.ts
 */
import { describe, it, expect } from "bun:test";
import { can, assertCan, PermissionError } from "../src/lib/permissions";
import type { Role } from "@prisma/client";

describe("role permissions", () => {
  describe("SUPER_ADMIN", () => {
    const role: Role = "SUPER_ADMIN";
    it("can view dashboard", () => expect(can(role, "dashboard:view")).toBe(true));
    it("can verify payments", () => expect(can(role, "registration:verify")).toBe(true));
    it("can reject payments", () => expect(can(role, "registration:reject")).toBe(true));
    it("can approve teams", () => expect(can(role, "team:approve")).toBe(true));
    it("can reject teams", () => expect(can(role, "team:reject")).toBe(true));
    it("can scan food", () => expect(can(role, "food:scan")).toBe(true));
    it("can edit config", () => expect(can(role, "config:edit")).toBe(true));
    it("can export data", () => expect(can(role, "export:data")).toBe(true));
    it("can manage users", () => expect(can(role, "user:manage")).toBe(true));
    it("can view audit", () => expect(can(role, "audit:view")).toBe(true));
  });

  describe("COORDINATOR — limited operational access", () => {
    const role: Role = "COORDINATOR";
    it("can view dashboard", () => expect(can(role, "dashboard:view")).toBe(true));
    it("can view registrations", () => expect(can(role, "registration:view")).toBe(true));
    it("cannot verify payments", () => expect(can(role, "registration:verify")).toBe(false));
    it("cannot reject payments", () => expect(can(role, "registration:reject")).toBe(false));
    it("cannot approve teams", () => expect(can(role, "team:approve")).toBe(false));
    it("cannot reject teams", () => expect(can(role, "team:reject")).toBe(false));
    it("cannot scan food", () => expect(can(role, "food:scan")).toBe(false));
    it("cannot edit config", () => expect(can(role, "config:edit")).toBe(false));
    it("cannot export data", () => expect(can(role, "export:data")).toBe(false));
    it("cannot manage users", () => expect(can(role, "user:manage")).toBe(false));
    it("can view audit log", () => expect(can(role, "audit:view")).toBe(true));
  });

  describe("FOOD_ADMIN — restricted to food scanning", () => {
    const role: Role = "FOOD_ADMIN";
    it("cannot view dashboard", () => expect(can(role, "dashboard:view")).toBe(false));
    it("cannot view registrations", () => expect(can(role, "registration:view")).toBe(false));
    it("cannot verify payments", () => expect(can(role, "registration:verify")).toBe(false));
    it("cannot approve teams", () => expect(can(role, "team:approve")).toBe(false));
    it("can scan food", () => expect(can(role, "food:scan")).toBe(true));
    it("can view food check-ins", () => expect(can(role, "food:view")).toBe(true));
    it("cannot edit config", () => expect(can(role, "config:edit")).toBe(false));
    it("cannot view audit log", () => expect(can(role, "audit:view")).toBe(false));
  });

  describe("PARTICIPANT — no admin access", () => {
    const role: Role = "PARTICIPANT";
    it("cannot view dashboard", () => expect(can(role, "dashboard:view")).toBe(false));
    it("cannot view registrations", () => expect(can(role, "registration:view")).toBe(false));
    it("cannot scan food", () => expect(can(role, "food:scan")).toBe(false));
    it("cannot edit config", () => expect(can(role, "config:edit")).toBe(false));
  });

  describe("anonymous (no role)", () => {
    it("returns false for any permission", () => {
      expect(can(null, "dashboard:view")).toBe(false);
      expect(can(undefined, "food:scan")).toBe(false);
    });
  });

  describe("assertCan", () => {
    it("throws PermissionError when role lacks permission", () => {
      expect(() => assertCan("COORDINATOR", "registration:verify")).toThrow(PermissionError);
    });
    it("does not throw when role has permission", () => {
      expect(() => assertCan("SUPER_ADMIN", "registration:verify")).not.toThrow();
    });
  });
});
