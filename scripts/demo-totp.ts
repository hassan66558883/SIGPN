/**
 * DEV helper: prints the current TOTP code of a demo account (for browser testing of MFA).
 * Usage: npx tsx scripts/demo-totp.ts admin
 */
import "dotenv/config";
import { Pool } from "pg";
import { decryptSecret } from "../src/server/crypto";
import { totpCode } from "../src/server/auth/mfa";

const username = process.argv[2] ?? "admin";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool
  .query(`SELECT "mfaSecretEnc" FROM "User" WHERE username=$1`, [username])
  .then((r) => {
    const enc = r.rows[0]?.mfaSecretEnc as string | null | undefined;
    if (!enc) console.log("NO_SECRET");
    else console.log("TOTP", totpCode(decryptSecret(enc)), "left", 30 - (Math.floor(Date.now() / 1000) % 30));
    return pool.end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
