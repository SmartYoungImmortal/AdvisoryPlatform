#!/usr/bin/env node
/**
 * `<Button render={<Link/>}>` needs `nativeButton={false}`.
 *
 * Base UI's Button defaults the prop to true, so when `render` puts it on an
 * anchor the primitive keeps assuming a native <button> and skips the keyboard
 * and ARIA handling a non-button needs — the exact thing `render` is used to
 * preserve. Base UI only says so at runtime, in a dev-server log nobody opens,
 * and it slipped past seven call sites across two people before anyone noticed.
 * ESLint has no rule for it and Sonar does not model the prop, so it is checked
 * here.
 *
 * `components/ui/**` is exempt — it is vendored by `shadcn add`.
 *
 * Run: node scripts/check-a11y-render.mjs
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

import { sourceFiles } from "./source-files.mjs";

const problems = [];

function unwrap(expression) {
  while (expression && ts.isParenthesizedExpression(expression)) expression = expression.expression;
  return expression;
}

// Read JSX nodes so a menu item's render prop cannot be attributed to an
// unrelated Button earlier in the file.
for (const file of sourceFiles()) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "Button") {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const render = attributes.find(attribute => attribute.name.getText(source) === "render");
      const expression = unwrap(render?.initializer && ts.isJsxExpression(render.initializer) ? render.initializer.expression : undefined);
      const tag = expression && (ts.isJsxSelfClosingElement(expression) ? expression.tagName : ts.isJsxElement(expression) ? expression.openingElement.tagName : undefined);
      const nativeButton = attributes.find(attribute => attribute.name.getText(source) === "nativeButton");
      const nativeValue = unwrap(nativeButton?.initializer && ts.isJsxExpression(nativeButton.initializer) ? nativeButton.initializer.expression : undefined);
      if (tag?.getText(source) === "Link" && nativeValue?.kind !== ts.SyntaxKind.FalseKeyword) {
        problems.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, match: node.getText(source).slice(0, 60) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (problems.length === 0) {
  console.log("a11y render: no <Button render={<Link/>}> is missing nativeButton");
  process.exit(0);
}

for (const p of problems) {
  console.error(
    `${p.file}:${p.line}  ${p.match}\n` +
      "    [render-link-without-nativebutton] add nativeButton={false} — Base UI assumes a" +
      " native <button> and drops the anchor's keyboard/ARIA handling",
  );
}
console.error(`\n${problems.length} render-as-link violation(s)`);
process.exit(1);
