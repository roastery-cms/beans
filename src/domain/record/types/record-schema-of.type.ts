import type { t } from "@roastery/terroir";
import type { SchemaOf } from "@/domain/entity/types/schema-of.type";
import type { RecordDomainKeys } from "./record-domain-keys.type";
import type { RecordPropertiesShapeBase } from "./record-properties-shape-base.type";

/**
 * The aggregate TypeBox schema a record derives from its blueprint: one schema
 * per domain property, and **nothing else**.
 *
 * The entity's `EntitySchemaOf` intersects `id`, `createdAt` and an optional
 * `updatedAt` on top. A record has none of them, which is why the two pillars'
 * `modelFor`s cannot share one implementation and the entity's must delegate
 * to this one for a record-valued key rather than recursing into itself.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @see `EntitySchemaOf` in `@/domain/entity/types` — the entity counterpart.
 */
export type RecordSchemaOf<PropertiesShape extends RecordPropertiesShapeBase> =
	t.TObject<{
		[Key in RecordDomainKeys<PropertiesShape>]: SchemaOf<PropertiesShape[Key]>;
	}>;
