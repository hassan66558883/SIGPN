/**
 * i18n unit tests: dictionary completeness, interpolation, service-message translation.
 *   npx tsx --test tests/unit/i18n.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fr } from "../../src/lib/i18n/fr";
import { ar } from "../../src/lib/i18n/ar";
import { DEFAULT_LOCALE, interpolate, isRtl, translate } from "../../src/lib/i18n";
import { translateMessage } from "../../src/lib/i18n/errors";
import { PERMISSION_DESCRIPTIONS_AR, PERMISSION_DESCRIPTIONS_FR, ROLE_NAMES_AR, ROLE_NAMES_FR } from "../../src/lib/i18n/catalog";
import { PERMISSION_CATALOG } from "../../src/server/rbac/permissions";
import { SYSTEM_ROLES } from "../../src/server/rbac/roles";

test("French is the default locale; Arabic is RTL", () => {
  assert.equal(DEFAULT_LOCALE, "fr");
  assert.equal(isRtl("ar"), true);
  assert.equal(isRtl("fr"), false);
});

test("Arabic dictionary has exactly the French keys and no empty values", () => {
  const frKeys = Object.keys(fr).sort();
  const arKeys = Object.keys(ar).sort();
  assert.deepEqual(arKeys, frKeys);
  for (const k of frKeys) {
    assert.ok((fr as Record<string, string>)[k].length > 0, `fr.${k} empty`);
    assert.ok((ar as Record<string, string>)[k].length > 0, `ar.${k} empty`);
  }
});

test("placeholders match between languages", () => {
  for (const k of Object.keys(fr) as (keyof typeof fr)[]) {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    assert.deepEqual(ph(ar[k]), ph(fr[k]), `placeholder mismatch in ${k}`);
  }
});

test("interpolation replaces known placeholders and keeps unknown ones", () => {
  assert.equal(interpolate("Page {page} of {pages}", { page: 2, pages: 5 }), "Page 2 of 5");
  assert.equal(interpolate("Hello {name}", {}), "Hello {name}");
  assert.equal(translate("fr", "dash.welcome", { name: "Aïcha" }), "Bienvenue, Aïcha");
  assert.equal(translate("ar", "dash.welcome", { name: "Aïcha" }), "مرحبًا، Aïcha");
});

test("service messages are translated to French and Arabic; unknown strings pass through unchanged", () => {
  assert.equal(translateMessage("Invalid username or password.", "fr"), "Nom d'utilisateur ou mot de passe invalide.");
  assert.equal(translateMessage("Invalid username or password.", "ar"), "اسم المستخدم أو كلمة المرور غير صحيحة.");
  assert.equal(translateMessage("Account temporarily locked. Try again in 15 minutes or contact an administrator.", "fr"), "Compte temporairement verrouillé. Réessayez dans 15 minutes ou contactez un administrateur.");
  assert.equal(translateMessage("Account temporarily locked. Try again in 15 minutes or contact an administrator.", "ar"), "الحساب مقفل مؤقتًا. أعد المحاولة خلال 15 دقيقة أو اتصل بمسؤول.");
  assert.equal(translateMessage("Password does not meet the policy: at least 12 characters; must not contain your username.", "fr"), "Le mot de passe ne respecte pas la politique : au moins 12 caractères ; ne doit pas contenir votre nom d'utilisateur.");
  assert.equal(translateMessage("Some brand new message.", "fr"), "Some brand new message.");
  assert.equal(translateMessage("Some brand new message.", "ar"), "Some brand new message.");
});

test("every permission and every system role has a French and an Arabic label", () => {
  for (const [code] of PERMISSION_CATALOG) {
    assert.ok(PERMISSION_DESCRIPTIONS_FR[code], `missing FR description for ${code}`);
    assert.ok(PERMISSION_DESCRIPTIONS_AR[code], `missing AR description for ${code}`);
  }
  for (const r of SYSTEM_ROLES) {
    assert.ok(ROLE_NAMES_FR[r.code], `missing FR name for ${r.code}`);
    assert.ok(ROLE_NAMES_AR[r.code], `missing AR name for ${r.code}`);
  }
});
