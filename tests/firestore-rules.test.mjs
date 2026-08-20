import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Firestore rules isolate each user's finance document", async () => {
  const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");

  assert.match(rules, /match \/users\/\{userId\}/);
  assert.match(rules, /request\.auth != null/);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.match(rules, /keys\(\)\.hasOnly/);
  assert.match(rules, /request\.resource\.data\.data is map/);
  assert.doesNotMatch(rules, /allow read, write: if true/);
});
