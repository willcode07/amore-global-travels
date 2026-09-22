import assert from "node:assert/strict";
import test from "node:test";
import { bestPlaceMatch, ghostRemainder } from "@/lib/places";

test("departure city autofills one prefix match", () => {
  assert.equal(bestPlaceMatch("Mia", "city"), "Miami, FL");
  assert.equal(bestPlaceMatch("atl", "city"), "Atlanta, GA");
  assert.equal(ghostRemainder("Mia", "Miami, FL"), "mi, FL");
});

test("departure city stays quiet when several cities still fit", () => {
  assert.equal(bestPlaceMatch("New", "city"), null);
});

test("destination autofills a unique Amore match, not a remote gazetteer list", () => {
  assert.equal(bestPlaceMatch("Jam", "destination"), "Jamaica");
  assert.equal(bestPlaceMatch("Canc", "destination"), "Cancun");
  assert.equal(bestPlaceMatch("Peru", "destination"), null);
});

test("street address does not look up suggestions", () => {
  assert.equal(bestPlaceMatch("100 Peachtree", "address"), null);
});
