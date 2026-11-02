import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const script = resolve("scripts/check-a11y-render.mjs");
function check(source: string) {
  const directory = mkdtempSync(join(tmpdir(), "a11y-render-"));
  try {
    mkdirSync(join(directory, "app"));
    mkdirSync(join(directory, "components"));
    writeFileSync(join(directory, "components", "fixture.tsx"), source);
    return spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
it("rejects a multiline Button rendered as a Link without nativeButton", () => {
  const result = check('<Button\n render={<Link href="/profile" />}\n>Profile</Button>');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("render-link-without-nativebutton");
});
it("accepts a menu link after an unrelated Button and a correctly configured Button link", () => {
  const result = check('<><Button>Open</Button><DropdownMenuItem render={<Link href="/new" />}>New</DropdownMenuItem><Button nativeButton={false}\n render={<Link href="/profile" />}\n>Profile</Button></>');
  expect(result.status).toBe(0);
});
