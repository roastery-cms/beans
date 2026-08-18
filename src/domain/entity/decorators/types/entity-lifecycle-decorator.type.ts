import type { EntityConstructor } from "./entity-constructor.type";

/**
 * The shape every lifecycle decorator (`onCreate`, `onUpdate`,
 * `onDelete`) returns: a standard (TC39) class decorator, generic over the
 * exact `Entity` subclass it wraps so the decorated class keeps its own
 * accessors and blueprint typing intact.
 */
export type EntityLifecycleDecorator = <Class extends EntityConstructor>(
	target: Class,
	context: ClassDecoratorContext<Class>,
) => Class;
