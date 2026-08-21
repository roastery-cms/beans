import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import type { AnyRecordClass } from "../types/any-record-class.type";
import type { RecordDefinition } from "../types/record-definition.type";
import type { RecordPropertiesShapeBase } from "../types/record-properties-shape-base.type";

/**
 * Invokes an object's `defineRecord`, guarding against the class-field trap.
 *
 * The base calls `this.defineRecord()` **inside** its constructor, because it
 * needs the blueprint to build the instance. A class field's initializer only
 * runs after `super()` returns, so a `protected defineRecord = () => …` would
 * arrive too late and construction would die with a bare `TypeError`.
 * TypeScript cannot reject that (a property may override a method), so the
 * guard is a runtime one — swapping the raw `TypeError` for an exception that
 * explains the initialization order.
 *
 * Duplicated per pillar rather than parameterised, exactly as the entity and
 * command pillars already duplicate theirs: the whole content of the function
 * *is* the method name it probes and the message explaining the trap, so
 * factoring it out would trade duplication for indirection with nothing left
 * to share.
 *
 * @typeParam PropertiesShape - The record's blueprint shape.
 *
 * @param record - The instance (or probe) expected to implement `defineRecord`.
 * @returns The subclass's definition: blueprint and record-type name.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineRecord` is not a
 *   prototype method.
 */
export function readDefinition<
	PropertiesShape extends RecordPropertiesShapeBase,
>(record: object): RecordDefinition<PropertiesShape> {
	const define = (
		record as { defineRecord?: () => RecordDefinition<PropertiesShape> }
	).defineRecord;

	if (typeof define !== "function")
		throw new InvalidEntityDefinitionException(
			"record",
			"Record: defineRecord must be a prototype method. Declared as a class field, its initializer only runs after super() returns, and the base invokes it during construction.",
		);

	return define.call(record);
}

/**
 * Reads the definition of a record **class** without constructing anything:
 * builds a probe with `Object.create` and calls the `defineRecord` living on
 * the prototype. Only sound because `defineRecord` is pure by contract.
 *
 * This is the entry point the entity pillar's `modelFor` reaches for when it
 * meets a record-valued blueprint key — and it is deliberately free of any
 * reference to the `DomainRecord` class, so importing it never drags a class
 * module across the pillar boundary.
 *
 * @param recordClass - The record class to inspect.
 * @returns The class's definition: blueprint and record-type name.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineRecord` is not a
 *   prototype method.
 */
export function definitionOf(
	recordClass: AnyRecordClass,
): RecordDefinition<RecordPropertiesShapeBase> {
	return readDefinition<RecordPropertiesShapeBase>(
		Object.create(recordClass.prototype) as object,
	);
}
