import type { ValueObject } from "@/domain/value-object";
import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";

/**
 * The TypeBox schema type contributed by one blueprint property: the nested
 * entity's aggregate schema, or the schema parameter of the value-object.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link EntitySchemaOf} — the aggregate object schema built from these.
 */
export type SchemaOf<Class extends AnyPropertyClass> =
	Class extends AnyEntityClass
		? Class["prototype"]["schema"]
		: Class["prototype"] extends ValueObject<unknown, infer SchemaType, boolean>
			? SchemaType
			: never;
