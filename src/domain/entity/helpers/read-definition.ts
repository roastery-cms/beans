import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { AnyEntityClass } from "../types/any-entity-class.type";
import type { EntityDefinition, PropertiesShapeBase } from "../types";

/**
 * Invokes an object's `defineEntity`, guarding against the class-field trap.
 *
 * The base calls `this.defineEntity()` **inside** its constructor, because it
 * needs the blueprint to build the instance. A class field's initializer only
 * runs after `super()` returns, so a `protected defineEntity = () => …` would
 * arrive too late and construction would die with a bare `TypeError`.
 * TypeScript cannot reject that (a property may override a method), so the
 * guard is a runtime one — swapping the raw `TypeError` for an exception that
 * explains the initialization order.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @param entity - The instance (or probe) expected to implement `defineEntity`.
 * @returns The subclass's definition: blueprint and entity-type name.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineEntity` is not a
 *   prototype method.
 */
export function readDefinition<PropertiesShape extends PropertiesShapeBase>(
	entity: object,
): EntityDefinition<PropertiesShape> {
	const define = (
		entity as { defineEntity?: () => EntityDefinition<PropertiesShape> }
	).defineEntity;

	if (typeof define !== "function")
		throw new InvalidEntityDefinitionException(
			"entity",
			"Entity: defineEntity must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction.",
		);

	return define.call(entity);
}

/**
 * Reads the definition of an entity **class** without constructing anything:
 * builds a probe with `Object.create` and calls the `defineEntity` living on
 * the prototype. Only sound because `defineEntity` is pure by contract.
 *
 * @param entityClass - The entity class to inspect.
 * @returns The class's definition: blueprint and entity-type name.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineEntity` is not a
 *   prototype method.
 */
export function definitionOf(
	entityClass: AnyEntityClass,
): EntityDefinition<PropertiesShapeBase> {
	return readDefinition<PropertiesShapeBase>(
		Object.create(entityClass.prototype) as object,
	);
}
