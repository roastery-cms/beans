import { DateTimeSchema, UuidSchema } from "@/domain/collections/schemas";
import { modelFor as recordModelFor } from "@/domain/record/helpers/model-for";
import { definitionOf as recordDefinitionOf } from "@/domain/record/helpers/read-definition";
import { cycleError } from "@/shared/helpers/cycle-error";
import { isEntityClass } from "@/shared/helpers/is-entity-class";
import { isRecordClass } from "@/shared/helpers/is-record-class";
import { t } from "@roastery/terroir";
import type { PropertiesShapeBase } from "../types";
import { acceptsUndefined } from "./accepts-undefined";
import { modelOfValueObject } from "./model-of-value-object";
import { definitionOf } from "./read-definition";

/**
 * Memoized aggregate schemas, keyed by the **blueprint object** rather than by
 * the class, so every instance of an entity shares one `t.TObject`.
 *
 * Memoizing the model is also what keeps validation cheap: `SchemaManager`
 * caches each compiled validator against the schema's object identity, so a
 * stable model means the validator is compiled once per blueprint.
 *
 * The record pillar keeps its **own** memo, and must: this one holds a schema
 * *with* the three identity fields, so handing the same blueprint object to
 * `entityOf` and to `recordOf` would otherwise serve the second the first's
 * model.
 */
const models = new WeakMap<PropertiesShapeBase, t.TObject>();

/** Blueprints currently being derived into schemas — the cycle guard of {@link modelFor}. */
const deriving = new Set<PropertiesShapeBase>();

/**
 * Derives (and memoizes) the aggregate schema of an entity blueprint: identity
 * fields plus one schema per property, recursing into nested entity blueprints
 * and delegating into the record pillar for nested record ones. Every level is
 * emitted with `additionalProperties: false`.
 *
 * A property whose schema accepts `undefined` is emitted through `t.Optional`,
 * so it drops out of the model's `required` list. Without that, `toJSON()`
 * emitting the key as present-with-`undefined` and `JSON.stringify` then
 * dropping it entirely would make a real round-trip
 * (`fromJSON(JSON.parse(JSON.stringify(entity.toJSON())))`) fail on a key the
 * blueprint declared optional in the first place. Nullable keys are
 * unaffected — `null` serializes fine and stays required.
 *
 * **The record branch must delegate rather than recurse.** This function
 * hardcodes `id`/`createdAt`/`updatedAt` into the initial `shape`, and a
 * record's schema carries none of them, so recursing here would invent an
 * identity the nested record does not have and reject every payload of it.
 *
 * This module and its record counterpart import each other, which is a
 * deliberate and safe cycle: both are **class-free**, so the two `modelFor`s
 * only reach each other at call time, never during module evaluation. That is
 * the entire reason this function was extracted from `entity.ts` — living
 * next to `class BoundEntity extends Entity`, it could not be imported from
 * the record pillar without risking `ReferenceError: Cannot access 'Entity'
 * before initialization` on some import orders. Keep it class-free.
 *
 * The cycle guard stays per-pillar. It still catches a cycle that alternates
 * pillars (`Entity A → Record R → Entity A`), because the nested call happens
 * inside this function's own `try` and `A` is therefore still in `deriving`
 * when the recursion comes back around.
 *
 * @param properties - The blueprint to derive from.
 * @param source - Entity-type name, for error context.
 * @returns The memoized aggregate model.
 *
 * @throws `CyclicEntityDefinitionException` — when the blueprint references
 *   itself, directly or indirectly.
 *
 * @see {@link acceptsUndefined} — the per-property discriminant.
 * @see `modelFor` in `@/domain/record/helpers/model-for` — the record counterpart.
 */
export function modelFor(
	properties: PropertiesShapeBase,
	source: string,
): t.TObject {
	const cached = models.get(properties);

	if (cached) return cached;

	if (deriving.has(properties)) throw cycleError(source, "Entity");

	deriving.add(properties);

	try {
		const shape: t.TProperties = {
			id: UuidSchema,
			createdAt: DateTimeSchema,
			updatedAt: t.Optional(DateTimeSchema),
		};

		for (const [key, propertyClass] of Object.entries(properties)) {
			if (isEntityClass(propertyClass)) {
				const nested = definitionOf(propertyClass);

				shape[key] = modelFor(nested.properties, nested.source);
				continue;
			}

			if (isRecordClass(propertyClass)) {
				const nested = recordDefinitionOf(propertyClass);

				shape[key] = recordModelFor(nested.properties, nested.source);
				continue;
			}

			const model = modelOfValueObject(propertyClass);

			shape[key] = acceptsUndefined(model) ? t.Optional(model) : model;
		}

		const model = t.Object(shape, { additionalProperties: false });

		models.set(properties, model);

		return model;
	} finally {
		deriving.delete(properties);
	}
}
