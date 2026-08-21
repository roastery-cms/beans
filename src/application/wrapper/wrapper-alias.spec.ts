import { describe, expect, it } from "bun:test";

import * as applicationWrapper from "@/application/wrapper/helpers";
import * as domainWrapper from "@/domain/wrapper/helpers";

/**
 * `application/wrapper/helpers` is a hand-kept alias onto
 * `domain/wrapper/helpers`, mirroring what `application/collections/**` already
 * is for `domain/collections/**`. Nothing but this suite enforces that, so the
 * two halves are checked from both directions — name parity read from the
 * source, and reference identity at runtime.
 *
 * The second check is the one that matters most here: name parity alone would
 * accept a barrel that *redeclares* a factory rather than re-exporting it, and
 * two `arrayOf`s would mint unrelated classes for the same blueprint.
 */

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /\/\/[^\n]*/g;
const EXPORT_BLOCK = /export\s+(?:type\s+)?\{([^}]*)\}/g;

/**
 * Extracts the identifiers a barrel re-exports, from its source text.
 *
 * @param source - The barrel's contents.
 * @returns The exported names, with any `type` prefix and `as` alias stripped.
 */
function exportedNames(source: string): ReadonlySet<string> {
	const clean = source.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "");
	const names = new Set<string>();

	for (const match of clean.matchAll(EXPORT_BLOCK)) {
		const block = match[1];

		if (block === undefined) continue;

		for (const entry of block.split(",")) {
			const [exported] = entry
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/);

			if (exported) names.add(exported);
		}
	}

	return names;
}

describe("application/wrapper alias", () => {
	it("re-exports the same names as domain/wrapper/helpers", async () => {
		const domain = exportedNames(
			await Bun.file(
				`${import.meta.dir}/../../domain/wrapper/helpers/index.ts`,
			).text(),
		);
		const application = exportedNames(
			await Bun.file(`${import.meta.dir}/helpers/index.ts`).text(),
		);

		expect(domain.size).toBeGreaterThan(0);
		expect([...application].sort()).toEqual([...domain].sort());
	});

	it("hands back the domain factories themselves, never a copy", () => {
		const keys = Object.keys(domainWrapper);

		expect(keys.length).toBeGreaterThan(0);
		expect(Object.keys(applicationWrapper).sort()).toEqual([...keys].sort());

		for (const key of keys)
			expect((applicationWrapper as Record<string, unknown>)[key]).toBe(
				(domainWrapper as Record<string, unknown>)[key],
			);
	});
});
