import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";

/**
 * The instance type an `Entity` **class** produces — what every generated
 * repository method reads back and every write method accepts.
 *
 * Repository ports in this pillar are parametrized by the class
 * (`typeof User`), never by the instance, for the same reason `EntityHas` is:
 * the blueprint lives behind the class's `prototype`, and a caller naming a
 * port already has the class in scope. This type is the one hop back to the
 * instance.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 *
 * @see {@link RepositoryOf} — the generator every contract feeds into.
 */
export type EntityInstanceOf<EntityClass extends AnyEntityClass> =
	EntityClass["prototype"];
