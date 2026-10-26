import { describe, expect, it } from "vitest";
import { passwordMatches } from "./password";

describe("password comparison", () => {
  it("accepts the same password", () => {
    expect(passwordMatches("correct horse battery staple", "correct horse battery staple")).toBe(true);
  });

  it("rejects a wrong password and different lengths", () => {
    expect(passwordMatches("wrong", "correct horse battery staple")).toBe(false);
    expect(passwordMatches("short", "a-much-longer-password")).toBe(false);
    expect(passwordMatches("", "expected")).toBe(false);
  });

  it("rejects when no expected password is configured", () => {
    expect(passwordMatches("anything", undefined)).toBe(false);
    expect(passwordMatches("anything", "")).toBe(false);
  });
});
