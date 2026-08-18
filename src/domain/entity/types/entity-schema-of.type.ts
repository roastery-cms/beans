import type { DateTimeSchema, UuidSchema } from "@/domain/collections/schemas";
import type { t } from "@roastery/terroir";
import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { SchemaOf } from "./schema-of.type";

/**
 * The aggregate TypeBox object schema of an entity: the identity fields
 * (`id`, `createdAt`, optional `updatedAt`) plus one schema per blueprint
 * property. This is the type of `entity.schema`, derived from the blueprint —
 * never written by hand.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 */
export type EntitySchemaOf<PropertiesShape extends PropertiesShapeBase> =
	t.TObject<
		{
			id: typeof UuidSchema;
			createdAt: typeof DateTimeSchema;
			updatedAt: t.TOptional<typeof DateTimeSchema>;
		} & {
			[Key in DomainKeys<PropertiesShape>]: SchemaOf<PropertiesShape[Key]>;
		}
	>;
