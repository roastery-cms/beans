import { describe, expect, it } from "bun:test";

import * as domainCustom from "@/domain/collections/value-objects/custom";
import * as domainNullable from "@/domain/collections/value-objects/nullable";
import * as domainOptional from "@/domain/collections/value-objects/optional";
import * as domainValueObjects from "@/domain/collections/value-objects";
import * as wayCustom from "@/way/collections/value-objects/custom";
import * as wayNullable from "@/way/collections/value-objects/nullable";
import * as wayOptional from "@/way/collections/value-objects/optional";
import * as wayValueObjects from "@/way/collections/value-objects";

/**
 * `way/collections/**` is a hand-kept alias onto `domain/collections/**`,
 * the same deal `application/collections/**` already is (see its own
 * `collections-alias.spec.ts`): every subpath mirrors its domain
 * counterpart with explicit re-export lines and no logic of its own.
 * Nothing but this suite enforces that, so the two halves are checked from
 * both directions — name parity read from the source, and reference
 * identity at runtime, so a barrel that *redeclares* a class instead of
 * re-exporting it (breaking `instanceof`, handing `SchemaManager` a second
 * cache key) fails loudly instead of quietly lining up by name alone.
 *
 * `schemas` and `value-objects/custom/types` are deliberately **not**
 * mirrored here — `way` is scoped to what a low-ceremony blueprint needs
 * (the VO classes themselves), not the raw TypeBox schemas or the
 * type-only escape hatches `defineValueObject`'s hooks use.
 */

/** Every mirrored subpath, relative to each layer's `collections` directory. */
const SUBPATHS = [
	"value-objects",
	"value-objects/optional",
	"value-objects/nullable",
	"value-objects/custom",
] as const;

/** The value-carrying subpaths, paired for the reference-identity check. */
const MODULE_PAIRS: ReadonlyArray<
	readonly [string, Record<string, unknown>, Record<string, unknown>]
> = [
	["value-objects", domainValueObjects, wayValueObjects],
	["value-objects/optional", domainOptional, wayOptional],
	["value-objects/nullable", domainNullable, wayNullable],
	["value-objects/custom", domainCustom, wayCustom],
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
	layer: "domain" | "way",
	subpath: string,
): Promise<ReadonlySet<string>> {
	const base =
		layer === "way"
			? import.meta.dir
			: `${import.meta.dir}/../../domain/collections`;

	return exportedNames(await Bun.file(`${base}/${subpath}/index.ts`).text());
}

describe("way/collections alias", () => {
	describe("mirrors every domain subpath, name for name", () => {
		for (const subpath of SUBPATHS)
			it(`re-exports the same names as domain/collections/${subpath}`, async () => {
				const domain = await barrelNames("domain", subpath);
				const way = await barrelNames("way", subpath);

				expect(domain.size).toBeGreaterThan(0);
				expect([...way].sort()).toEqual([...domain].sort());
			});
	});

	describe("re-exports the domain classes themselves, never a copy", () => {
		for (const [subpath, domain, way] of MODULE_PAIRS)
			it(`hands back the same references for ${subpath}`, () => {
				const keys = Object.keys(domain);

				expect(keys.length).toBeGreaterThan(0);
				expect(Object.keys(way).sort()).toEqual([...keys].sort());

				for (const key of keys) expect(way[key]).toBe(domain[key]);
			});
	});
});
