import { test } from "node:test";
import assert from "node:assert/strict";
import { env } from "../../src/server/env";

/** The temporary switch MFA_ENFORCEMENT: on by default, off only when asked in so many words. */
test("the second factor is enforced unless MFA_ENFORCEMENT says off", () => {
  const saved = process.env.MFA_ENFORCEMENT;
  try {
    delete process.env.MFA_ENFORCEMENT;
    assert.equal(env.mfa.enforced, true, "unset = on");
    for (const v of ["on", "ON", "1", "true", "yes", "", "anything else", "of", "offf"]) {
      process.env.MFA_ENFORCEMENT = v;
      assert.equal(env.mfa.enforced, true, `"${v}" keeps it on (a typo must never switch security off)`);
    }
    for (const v of ["off", "OFF", " off ", "0", "false", "no"]) {
      process.env.MFA_ENFORCEMENT = v;
      assert.equal(env.mfa.enforced, false, `"${v}" switches it off`);
    }
  } finally {
    if (saved === undefined) delete process.env.MFA_ENFORCEMENT;
    else process.env.MFA_ENFORCEMENT = saved;
  }
});
