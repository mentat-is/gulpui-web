import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localeDir = join(root, "src/locales");
const locales = Object.fromEntries(
  readdirSync(localeDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => [file.replace(/\.json$/, ""), JSON.parse(readFileSync(join(localeDir, file), "utf8"))]),
);
const en = locales.en;

assert.ok(en, "missing default locale: en");

const table = { "settings.title": undefined };
const t = (key) => table[key] ?? en[key] ?? key;
const keys = (table) => Object.keys(table).filter((key) => !key.startsWith("@")).sort();

assert.equal(t("settings.title"), "Settings");
assert.equal(t("missing.key"), "missing.key");
for (const [code, table] of Object.entries(locales)) {
  assert.equal(typeof table["@label"], "string", `${code} is missing @label`);
  assert.match(table["@dir"], /^(ltr|rtl)$/, `${code} has invalid @dir`);
  assert.deepEqual(keys(table), keys(en), `${code} locale keys differ from en`);
}
