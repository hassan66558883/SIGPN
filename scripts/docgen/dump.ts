/** Read-only dump of the real catalogue (roles, permissions, demo accounts, navigation, sensitivity) used to generate the documentation. */
import { writeFileSync } from "node:fs";
import { SYSTEM_ROLES } from "../../src/server/rbac/roles";
import { PERMISSION_CATALOG } from "../../src/server/rbac/permissions";
import { DEMO_ACCOUNTS } from "../../src/server/demo/accounts";
import { NAVIGATION } from "../../src/lib/navigation";
import * as sens from "../../src/server/rbac/sensitivity";
writeFileSync("SIGEC_PN_DOCUMENTATION/_build/catalog.json", JSON.stringify({
  roles: SYSTEM_ROLES, permissions: PERMISSION_CATALOG, accounts: DEMO_ACCOUNTS, navigation: NAVIGATION,
  sensitive: [...((sens as any).SENSITIVE_PERMISSIONS ?? [])],
}, null, 1));
console.log(SYSTEM_ROLES.length, "roles", PERMISSION_CATALOG.length, "permissions", DEMO_ACCOUNTS.length, "accounts");
