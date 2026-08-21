import { acceptsUndefined } from "@/domain/entity/helpers/accepts-undefined";
import { modelFor as entityModelFor } from "@/domain/entity/helpers/model-for";
import { modelOfValueObject } from "@/domain/entity/helpers/model-of-value-object";
import { definitionOf as entityDefinitionOf } from "@/domain/entity/helpers/read-definition";
import { cycleError } from "@/shared/helpers/cycle-error";
import { isEntityClass } from "@/shared/helpers/is-entity-class";
import { isRecordClass } from "@/shared/helpers/is-record-class";
import { t } from "@roastery/terroir";
import type { RecordPropertiesShapeBase } from "../types/record-properties-shape-base.type";
import { definitionOf } from "./read-definition";

/**
 * Memoized aggregate schemas, keyed by the **blueprint object** rather than by
 * the class, so every instance of a record shares one `t.TObject`.
 *
 * Separate from the entity pillar's memo by necessity, not by symmetry: that
 * one holds a schema *with* the three identity fields, and nothing stops the
 * same blueprint object being handed to both `entityOf` and `recordOf`.
 */
const models = new WeakMap<RecordPropertiesShapeBase, t.TObject>();

/** Blueprints currently being derived into schemas — the cycle guard of {@link modelFor}. */
const deriving = new Set<RecordPropertiesShapeBase>();

/**
 * Derives (and memoizes) the aggregate schema of a record blueprint: one
 * schema per property and **nothing else** — no identity fields, which is the
 * whole difference from the entity pillar's counterpart. Every level is
 * emitted with `additionalProperties: false`.
 *
 * Recurses into nested record blueprints and delegates back into the entity
 * pillar for nested entity ones, so an entity nested inside a record still
 * gets its `id`/`createdAt`/`updatedAt` in the derived schema.
 *
 * **This module must stay class-free.** It imports the entity pillar's
 * `modelFor` and is imported by it in turn; that cycle is safe only because
 * neither side evaluates a class at module load. Reaching for `DomainRecord`
 * or `Entity` from here would put a `class X extends Y` inside the cycle and
 * reintroduce `ReferenceError: … before initialization`. Both pillars'
 * property discriminants are structural (`isEntityClass`, `isRecordClass`,
 * `isValueObjectClass`) precisely so this file never needs one.
 *
 * @param properties - The blueprint to derive from.
 * @param source - Record-type name, for error context.
 * @returns The memoized aggregate model.
 *
 * @throws `CyclicEntityDefinitionException` — when the blueprint references
 *   itself, directly or indirectly.
 *
 * @see `modelFor` in `@/domain/entity/helpers/model-for` — the entity counterpart.
 */
export function modelFor(
	properties: RecordPropertiesShapeBase,
	source: string,
): t.TObject {
	const cached = models.get(properties);

	if (cached) return cached;

	if (deriving.has(properties)) throw cycleError(source, "Record");

	deriving.add(properties);

	try {
		const shape: t.TProperties = {};

		for (const [key, propertyClass] of Object.entries(properties)) {
			if (isEntityClass(propertyClass)) {
				const nested = entityDefinitionOf(propertyClass);

				shape[key] = entityModelFor(nested.properties, nested.source);
				continue;
			}

			if (isRecordClass(propertyClass)) {
				const nested = definitionOf(propertyClass);

				shape[key] = modelFor(nested.properties, nested.source);
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
