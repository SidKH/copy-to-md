import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

export function readFixturePayload(fileName: string): unknown {
  const raw = readFileSync(join(fixturesDir, fileName), "utf-8");
  return JSON.parse(raw);
}

export function readExpected(fileName: string): string {
  const raw = readFileSync(join(fixturesDir, fileName), "utf-8");
  return raw.replace(/\r\n/g, "\n").trimEnd();
}
