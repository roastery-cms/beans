import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { IRawEntity } from "./raw-entity.interface";

/**
 * Every key `get` accepts: the blueprint's own keys plus the identity fields
 * (`id`, `createdAt`, `updatedAt`). Anything outside this union is rejected at
 * compile time and, for plain-JS callers, at runtime.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 */
export type ReadableKey<PropertiesShape extends PropertiesShapeBase> =
	| DomainKeys<PropertiesShape>
	| keyof IRawEntity;
