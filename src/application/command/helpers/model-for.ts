import { modelFor as recordModelFor } from "@/domain/record/helpers/model-for";
import { definitionOf as recordDefinitionOf } from "@/domain/record/helpers/read-definition";
import { metaOf } from "@/domain/value-object/helpers";
import { isRecordClass } from "@/shared/helpers/is-record-class";
import { isWrapperClass } from "@/shared/helpers/is-wrapper-class";
import { wrapperModelFor } from "@/domain/wrapper/helpers/model-for";
import { t } from "@roastery/terroir";
import { SchemaManager } from "@roastery/terroir/schema";
import type { AnyValueObjectClass } from "../types/any-value-object-class.type";
import type { CommandPropertiesShapeBase } from "../types/command-properties-shape-base.type";

/** Aggregate schema memoized per blueprint object — one `t.TObject` per class. */
const models = new WeakMap<CommandPropertiesShapeBase, t.TObject>();

/**
 * Reads a value-object class's own schema off its metadata, without
 * constructing an instance.
 *
 * @param valueObjectClass - The blueprint property's value-object class.
 * @returns The class's TypeBox schema.
 */
function modelOfValueObject(valueObjectClass: AnyValueObjectClass): t.TSchema {
	return metaOf(valueObjectClass).schema;
}

/**
 * Whether a property's schema accepts `undefined` as a value — true for every
 * `optionalVO`-built class (whose schema is `t.Union([…, t.Undefined()])`),
 * false for a `nullableVO` one (`null` is not `undefined`, so a nullable key
 * stays required) and for every ordinary value-object.
 *
 * Asks the schema itself rather than testing for the union shape, matching
 * the package's preference for structural discrimination. Only ever called
 * from {@link modelFor}, which memoizes per blueprint, so the cost is one
 * `Value.Check` per property per class — not per construction.
 *
 * @param schema - The property's own TypeBox schema.
 * @returns `true` when `undefined` passes the schema.
 *
 * @see `CommandUndefinedableKeys` in `../types/command-undefinedable-keys.type`
 *   — the type-level counterpart, deciding the same thing about the same keys.
 */
function acceptsUndefined(schema: t.TSchema): boolean {
	return SchemaManager.match(schema, undefined);
}

/**
 * Derives (and memoizes) the aggregate TypeBox object schema of a command
 * blueprint: one schema per property, read off each value-object class's
 * own metadata.
 *
 * Simpler than the entity pillar's own `modelFor`: there are no identity
 * fields to seed the shape with, and no nested-entity branch to recurse
 * into (a `Command` blueprint is value-objects only) — which also means
 * there is no cycle to guard against here, unlike the entity pillar's
 * version.
 *
 * A property whose schema accepts `undefined` is emitted through
 * `t.Optional`, so it drops out of `required` — otherwise `fromJSON`, the
 * documented entry point for an untrusted HTTP body, would reject the very
 * payloads an `optionalVO` key exists to allow: `JSON.stringify` drops a
 * key whose value is `undefined`, so a client omitting an optional field
 * would get a `BadRequestException`.
 *
 * @param properties - The blueprint to derive a schema for.
 * @returns The memoized aggregate object schema.
 *
 * @see {@link acceptsUndefined} — the per-property discriminant.
 */
export function modelFor(properties: CommandPropertiesShapeBase): t.TObject {
	const cached = models.get(properties);
	if (cached) return cached;

	const shape: t.TProperties = {};
	for (const [key, propertyClass] of Object.entries(properties)) {
		// First in the loop, and it must not `continue` past the
		// `acceptsUndefined` line below: an `optionalOf` wrapper's derived
		// schema accepts `undefined`, so the existing `t.Optional` handling
		// is exactly what makes the key drop out of `required` — the same
		// treatment an `optionalVO` property already gets.
		if (isWrapperClass(propertyClass)) {
			const wrapped = wrapperModelFor(propertyClass);

			shape[key] = acceptsUndefined(wrapped) ? t.Optional(wrapped) : wrapped;
			continue;
		}

		// A record-valued key delegates into the record pillar rather than
		// recursing here: this function knows nothing about nested blueprints,
		// and the record pillar already owns the memo and the cycle guard.
		if (isRecordClass(propertyClass)) {
			const nested = recordDefinitionOf(propertyClass);

			shape[key] = recordModelFor(nested.properties, nested.source);
			continue;
		}

		const model = modelOfValueObject(propertyClass as AnyValueObjectClass);

		shape[key] = acceptsUndefined(model) ? t.Optional(model) : model;
	}

	const model = t.Object(shape, { additionalProperties: false });
	models.set(properties, model);
	return model;
}
