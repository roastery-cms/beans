import { describe, expect, it } from "bun:test";

import * as applicationCustom from "@/application/collections/value-objects/custom";
import * as applicationNullable from "@/application/collections/value-objects/nullable";
import * as applicationOptional from "@/application/collections/value-objects/optional";
import * as applicationSchemas from "@/application/collections/schemas";
import * as applicationValueObjects from "@/application/collections/value-objects";
import * as domainCustom from "@/domain/collections/value-objects/custom";
import * as domainNullable from "@/domain/collections/value-objects/nullable";
import * as domainOptional from "@/domain/collections/value-objects/optional";
import * as domainSchemas from "@/domain/collections/schemas";
import * as domainValueObjects from "@/domain/collections/value-objects";

/**
 * `application/collections/**` is a hand-kept alias onto `domain/collections/**`:
 * every subpath mirrors its domain counterpart with explicit re-export lines
 * and no logic of its own. Nothing but this suite enforces that, so the two
 * halves are checked from both directions:
 *
 * 1. **Name parity, read from the source.** The `custom/types` barrel exports
 *    only types, which do not exist at runtime — a `Object.keys` comparison
 *    would see `{}` on both sides and pass vacuously. Parsing the barrels
 *    instead covers the type-only subpath like any other.
 * 2. **Reference identity at runtime**, for the subpaths that carry values.
 *    Name parity alone would accept a barrel that *redeclares* a class rather
 *    than re-exporting it — two unrelated classes with the same name, which
 *    breaks `instanceof` and gives `SchemaManager` a second cache key while
 *    every name still lines up.
 */

/** Every mirrored subpath, relative to each layer's `collections` directory. */
const SUBPATHS = [
	"schemas",
	"value-objects",
	"value-objects/optional",
	"value-objects/nullable",
	"value-objects/custom",
	"value-objects/custom/types",
] as const;

/** The value-carrying subpaths, paired for the reference-identity check. */
const MODULE_PAIRS: ReadonlyArray<
	readonly [string, Record<string, unknown>, Record<string, unknown>]
> = [
	["schemas", domainSchemas, applicationSchemas],
	["value-objects", domainValueObjects, applicationValueObjects],
	["value-objects/optional", domainOptional, applicationOptional],
	["value-objects/nullable", domainNullable, applicationNullable],
	["value-objects/custom", domainCustom, applicationCustom],
];

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

/**
 * Reads one layer's barrel for a mirrored subpath.
 *
 * @param layer - Which layer's copy to read.
 * @param subpath - The subpath under that layer's `collections` directory.
 * @returns The barrel's exported names.
 */
async function barrelNames(
	layer: "application" | "domain",
	subpath: string,
): Promise<ReadonlySet<string>> {
	const base =
		layer === "application"
			? import.meta.dir
			: `${import.meta.dir}/../../domain/collections`;

	return exportedNames(await Bun.file(`${base}/${subpath}/index.ts`).text());
}

describe("application/collections alias", () => {
	describe("mirrors every domain subpath, name for name", () => {
		for (const subpath of SUBPATHS)
			it(`re-exports the same names as domain/collections/${subpath}`, async () => {
				const domain = await barrelNames("domain", subpath);
				const application = await barrelNames("application", subpath);

				expect(domain.size).toBeGreaterThan(0);
				expect([...application].sort()).toEqual([...domain].sort());
			});
	});

	describe("re-exports the domain classes themselves, never a copy", () => {
		for (const [subpath, domain, application] of MODULE_PAIRS)
			it(`hands back the same references for ${subpath}`, () => {
				const keys = Object.keys(domain);

				expect(keys.length).toBeGreaterThan(0);
				expect(Object.keys(application).sort()).toEqual([...keys].sort());

				for (const key of keys) expect(application[key]).toBe(domain[key]);
			});
	});
});
