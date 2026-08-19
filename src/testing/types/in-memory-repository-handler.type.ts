import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type {
	RepositoryExtraMethodsBase,
	RepositoryMethodsOf,
} from "@/domain/repository/types";
import type { InMemoryRepositoryContext } from "./in-memory-repository-context.type";

/**
 * `inMemoryRepositoryOf`'s third argument: given what was generated, return
 * the extra methods to add.
 *
 * The runtime counterpart of `RepositoryOf`'s own `Extras` type parameter, and
 * with the same contract — whatever it returns is folded into the repository
 * verbatim, names and signatures both. `beans` cannot derive a custom query
 * from a blueprint, so it does not pretend to check one; the generated half is
 * proven against the model, the returned half is the test's own word.
 *
 * The returned object is merged **over** the generated methods, so a key that
 * collides replaces it. That is deliberate, not an oversight: stubbing one
 * method to throw, or counting how many times it was called, is a routine
 * thing for a test double to want, and {@link InMemoryRepositoryContext} being
 * a snapshot means the replacement can still delegate to the original.
 *
 * `Extras` is inferred from the return position, so a handler written inline
 * needs no type argument — the resulting repository's type simply gains
 * whatever the function returns.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Names - The method names that were generated.
 * @typeParam Extras - The extra methods, inferred from the return value.
 *
 * @example
 * ```ts
 * const users = inMemoryRepositoryOf(User, [], (context) => {
 *   let calls = 0;
 *
 *   return {
 *     callCount: () => calls,
 *     async findById(id: string) {
 *       calls += 1;
 *       if (calls === 3) throw new Error("connection lost");
 *       return context.findById(id); // the generated one, still reachable
 *     },
 *   };
 * });
 * ```
 *
 * @see {@link InMemoryRepositoryContext} — what the handler is given.
 */
export type InMemoryRepositoryHandler<
	EntityClass extends AnyEntityClass,
	Names extends RepositoryMethodsOf<EntityClass>,
	Extras extends RepositoryExtraMethodsBase,
> = (context: InMemoryRepositoryContext<EntityClass, Names>) => Extras;
