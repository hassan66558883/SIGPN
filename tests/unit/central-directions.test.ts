import { test } from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_DIRECTIONS, DGPN_ROOT } from "../../src/server/org/central-directions";
import { roleDescription, roleName } from "../../src/lib/i18n/catalog";
import { STATION_TYPE } from "../../src/lib/labels";
import { STATION_TYPES } from "../../src/server/org/schemas";

/** Lot 2: the official structure of the decree 0572/PT/PM/MSPI/2023 (articles 24 to 42). */
test("the decree lists ten central directions and four central units of the DGPN, and nothing else is invented", () => {
  assert.equal(CENTRAL_DIRECTIONS.length, 14);
  assert.deepEqual(CENTRAL_DIRECTIONS.map((d) => d.abbreviation).sort(), ["DBCN-IP", "DENP", "DIE", "DITT", "DLGDEAM", "DLS", "DPTSCI", "DRHM", "DSP", "DSPSM", "GMIP", "GSR", "UNILT", "USIP"]);
  assert.equal(new Set(CENTRAL_DIRECTIONS.map((d) => d.code)).size, 14, "codes are unique");
  assert.ok(CENTRAL_DIRECTIONS.every((d) => d.code.startsWith(`${DGPN_ROOT.code}-`) && d.name.length > 10 && d.article >= 24 && d.article <= 42));
});

test("the provincial level is the 'délégué provincial de Police' of the decree (article 87), in French and Arabic", () => {
  assert.equal(roleName("REGIONAL_COMMANDER", "Regional Commander", "fr"), "Délégué provincial de Police");
  assert.equal(roleName("REGIONAL_COMMANDER", "Regional Commander", "ar"), "المندوب الولائي للشرطة");
  assert.match(roleDescription("DEPARTMENTAL_COMMANDER", "x", "fr") ?? "", /non prévu par le décret/);
  assert.equal(STATION_TYPE.DELEGATION.fr, "Délégation provinciale de Police");
});

test("the new unit type is known to the interface and to the organisation forms", () => {
  assert.ok(STATION_TYPES.includes("CENTRAL_DIRECTION" as never) && STATION_TYPES.includes("DELEGATION" as never));
  assert.ok(STATION_TYPE.CENTRAL_DIRECTION.fr && STATION_TYPE.CENTRAL_DIRECTION.ar);
});
