import { Entity } from "@/entity";
import type { IEntity } from "@/entity/types";
import { ValueObject } from "@/value-object";
import type { t } from "@roastery/terroir";
import { Schema } from "@roastery/terroir/schema";

/**
 * Service that flattens an {@link Entity} instance into its plain-object DTO.
 *
 * Exposed as a frozen namespace (`as const`) rather than a class so it can be
 * called without instantiation. **Intended to be consumed via {@link Mapper.toDTO}**;
 * the mapper handles validation against the entity's `[EntitySchema]` after this
 * service finishes the conversion.
 *
 * The conversion walks every field on the entity (own properties + inherited
 * getters from the prototype) and applies the conventions below to each value.
 * Symbol-keyed fields — including `[EntitySource]`, `[EntitySchema]`,
 * `[EntityContext]`, and `[EntityStorage]` — are skipped automatically because
 * `Object.entries` ignores symbol keys.
 *
 * **Mapping conventions** (mirrors the table in the README):
 *
 * | Convention                         | Behaviour                                      |
 * | ---------------------------------- | ---------------------------------------------- |
 * | `_property`                        | Stripped to `property` in DTO output.          |
 * | `__property`                       | Ignored entirely (internal metadata).          |
 * | `ValueObject` instance             | Replaced with `.value`.                        |
 * | `Schema` instance                  | Replaced with `.toString()`.                   |
 * | Nested `Entity`                    | Recursively converted by this service.         |
 * | Object exposing `toDTO()`          | Replaced with the result of `.toDTO()`.        |
 * | Arrays                             | Each element processed recursively.            |
 * | `null` / `undefined` / primitives  | Passed through unchanged.                      |
 *
 * **Cycle detection is intentionally absent** — the service assumes acyclic
 * entity graphs. If two entities reference each other, the recursion will
 * stack-overflow. Break cycles at the call site (e.g. by snapshotting one side
 * to ids) before invoking the mapper.
 *
 * @see {@link Mapper.toDTO} — the public consumer that validates the produced DTO.
 *
 * @example
 * ```ts
 * import { ParseEntityToDTOService } from "@roastery/beans/entity";
 *
 * const dto = ParseEntityToDTOService.run(post);
 * ```
 */
export const ParseEntityToDTOService = {
	/**
	 * Walks `entity`, applies the mapping conventions documented on the parent
	 * namespace, and returns the resulting plain object cast to the schema's
	 * static type.
	 *
	 * @typeParam SchemaType - TypeBox schema describing the entity's DTO.
	 * @typeParam EntityType - The concrete entity type (`extends IEntity<SchemaType>`).
	 *
	 * @param entity - The entity instance to flatten.
	 * @returns A plain object matching the static type of `SchemaType`. **Not validated** —
	 *   call `entity[EntitySchema].match(result)` (or use {@link Mapper.toDTO}) to enforce schema conformance.
	 */
	run: <SchemaType extends t.TSchema, EntityType extends IEntity<SchemaType>>(
		entity: EntityType,
	): t.Static<SchemaType> => {
		const dto: Record<string, unknown> = {};

		Object.entries(entity).forEach(([key, value]) => {
			if (!key.startsWith("__")) {
				const finalKey = key.startsWith("_") ? key.slice(1) : key;
				dto[finalKey] = value;
			}
		});

		const proto = Object.getPrototypeOf(entity);
		const descriptors = Object.getOwnPropertyDescriptors(proto);

		Object.entries(descriptors).forEach(([key, descriptor]) => {
			if (typeof descriptor.get === "function" && !key.startsWith("__")) {
				const finalKey = key.startsWith("_") ? key.slice(1) : key;

				dto[finalKey] = (entity as unknown as Record<string, unknown>)[key];
			}
		});

		const processValue = (value: unknown): unknown => {
			if (value === undefined || value === null) return value;

			if (Array.isArray(value)) return value.map(processValue);
			if (value instanceof ValueObject) return value.value;
			if (value instanceof Schema) return value.toString();
			if (value instanceof Entity)
				return ParseEntityToDTOService.run(
					value as unknown as IEntity<t.TSchema>,
				);
			if (
				typeof value === "object" &&
				"toDTO" in value! &&
				typeof (value as { toDTO: () => unknown }).toDTO === "function"
			)
				return (value as { toDTO: () => unknown }).toDTO();

			return value;
		};

		return Object.fromEntries(
			Object.entries(dto).map(([key, value]) => [key, processValue(value)]),
		) as t.Static<SchemaType>;
	},
} as const;
