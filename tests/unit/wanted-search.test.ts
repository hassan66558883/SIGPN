import { test } from "node:test";
import assert from "node:assert/strict";
import { AVAILABLE_SOURCES, SEARCH_SOURCES, UNAVAILABLE_SOURCES, describeCriteria, diffusionVisible, hasCriteria, parseSearchParams, tokens } from "../../src/server/wanted/search-criteria";

/** The wanted-persons search of the client's mock-up: honest about its sources, strict about what it matches. */
test("only the two sources that exist are available; borders, video and interoperability are listed as not connected", () => {
  assert.deepEqual(AVAILABLE_SOURCES, ["NATIONAL_DB", "WANTED"]);
  assert.deepEqual(UNAVAILABLE_SOURCES, ["BORDERS", "VIDEO", "INTEROP"]);
  assert.equal(SEARCH_SOURCES.length, 5);
});

test("a first visit searches nothing; a submitted form keeps exactly the sources ticked, and a source that is not connected is ignored", () => {
  const first = parseSearchParams({});
  assert.equal(first.submitted, false);
  assert.deepEqual(first.sources, ["NATIONAL_DB", "WANTED"], "every available source is proposed");
  const only = parseSearchParams({ go: "1", search: "Mahamat Idriss", src: "WANTED" });
  assert.deepEqual(only.sources, ["WANTED"]);
  const none = parseSearchParams({ go: "1", search: "x", src: [] });
  assert.deepEqual(none.sources, [], "nothing ticked is nothing queried");
  const fake = parseSearchParams({ go: "1", search: "Mahamat", src: ["VIDEO", "BORDERS", "WANTED", "WANTED", "NOPE"] });
  assert.deepEqual(fake.sources, ["WANTED"], "an unavailable or unknown source is dropped, duplicates collapse");
});

test("criteria are validated: quick needs two characters, advanced a real field; the date and the sex are checked", () => {
  assert.equal(hasCriteria(parseSearchParams({ go: "1", search: "M" })), false);
  assert.equal(hasCriteria(parseSearchParams({ go: "1", search: "Ma" })), true);
  assert.equal(hasCriteria(parseSearchParams({ go: "1", mode: "advanced", firstName: "M" })), false);
  assert.equal(hasCriteria(parseSearchParams({ go: "1", mode: "advanced", lastName: "Idriss" })), true);
  assert.equal(hasCriteria(parseSearchParams({ go: "1", mode: "advanced", dateOfBirth: "1990-03-14" })), true);
  assert.equal(parseSearchParams({ mode: "advanced", dateOfBirth: "14/03/1990" }).dateOfBirth, "", "a malformed date is ignored");
  assert.equal(parseSearchParams({ mode: "advanced", dateOfBirth: "1990-13-45" }).dateOfBirth, "");
  assert.equal(parseSearchParams({ gender: "ROBOT" }).gender, "");
  assert.equal(parseSearchParams({ gender: "FEMALE" }).gender, "FEMALE");
  assert.equal(parseSearchParams({ search: "x".repeat(500) }).q.length, 120, "input length is bounded");
});

test("the quick search matches word by word, and the criteria are described for the audit trail and the no-result message", () => {
  assert.deepEqual(tokens("  Mahamat   Idriss "), ["Mahamat", "Idriss"]);
  assert.equal(tokens("a b c d e f g").length, 5);
  assert.equal(describeCriteria(parseSearchParams({ search: "Mahamat Idriss" })), "Mahamat Idriss");
  assert.match(describeCriteria(parseSearchParams({ mode: "advanced", lastName: "Idriss", dateOfBirth: "1990-03-14", idNumber: "TD123" })), /Idriss.*ID TD123.*1990-03-14/);
});

test("a notice in force is visible outside its unit through its diffusion, never otherwise", () => {
  const actor = { regionId: "R1" };
  const n = (over: Partial<{ diffusionLevel: string; regionId: string; status: string }> = {}) => ({ diffusionLevel: "NATIONAL", regionId: "R9", status: "ACTIVE", ...over });
  assert.equal(diffusionVisible(actor, n()), true, "national diffusion");
  assert.equal(diffusionVisible(actor, n({ status: "LOCATED" })), true, "a located person is still looked for");
  assert.equal(diffusionVisible(actor, n({ status: "DRAFT" })), false);
  assert.equal(diffusionVisible(actor, n({ status: "CANCELLED" })), false);
  assert.equal(diffusionVisible(actor, n({ status: "ARRESTED" })), false);
  assert.equal(diffusionVisible(actor, n({ diffusionLevel: "REGIONAL", regionId: "R1" })), true, "regional: same province");
  assert.equal(diffusionVisible(actor, n({ diffusionLevel: "REGIONAL", regionId: "R2" })), false, "regional: another province");
  assert.equal(diffusionVisible(actor, n({ diffusionLevel: "LOCAL" })), false, "local: only the unit's own scope");
  assert.equal(diffusionVisible({ regionId: null }, n({ diffusionLevel: "REGIONAL" })), false);
});
