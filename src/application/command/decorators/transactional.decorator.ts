import type { AnyCommandClass } from "../types/any-command-class.type";

/**
 * Class decorator: **declares** that this command must run inside a
 * transaction. It wraps nothing.
 *
 * All it does is stamp `static readonly transactional = true` on the class.
 * Who actually opens the transaction is `commands`, and only when it was
 * given a `transaction` option — the decorator names *who* needs a boundary,
 * the option supplies *how* to open one. Splitting it that way is what keeps
 * `execute()` free of any notion of persistence and, more importantly, keeps
 * a command from having to receive a runner through a magic `deps.uow`
 * convention: `Deps` has no runtime footprint, so the base could never derive
 * one, only guess at a name.
 *
 * **A marked command in a registry without a runner is not an error.** It
 * runs exactly as it would unmarked. That is deliberate: a test wired with
 * `inMemoryRepositoryOf` should need no ceremony to exercise a command whose
 * production registry is transactional. The declarative-marker-plus-adapter
 * split is the same one `meta.unique` already uses — a unique value object
 * never fails construction either; the port's adapter is what enforces it.
 *
 * The net against "I marked it and assumed I was covered" is the same net
 * `unique` gets: keep the declaration readable. `transactionalKeysOf(spec)`
 * (`@roastery/beans/application/commands`, mirroring `uniqueKeysOf`) lets a
 * caller who wants rigor fail at bootstrap rather than in production.
 *
 * | | registry without `transaction` | with `transaction` |
 * | --- | --- | --- |
 * | undecorated | runs directly | runs directly |
 * | `@transactional` | runs directly (degraded) | runs inside the transaction |
 *
 * **Only the command's own `execute()` is wrapped** — never the publication
 * and reactions that follow it. Ordering is therefore `COMMIT` → `emit` →
 * reactions, so an e-mail never rides inside the transaction and a reaction
 * can never roll back what already committed.
 *
 * **A nested command inherits the boundary instead of opening a second one**,
 * whether or not it is itself marked, so the adapter never has to be
 * reentrant. A command dispatched by a *reaction* does open its own — by then
 * the original has already committed.
 *
 * An adjective where the entity decorators are verbs (`onCreate`, `emit`),
 * because it is a different family: those *do* something at a point in a
 * lifecycle, this one only states a fact about the class.
 *
 * @param target - The `Command` subclass being decorated. Mutated in place —
 *   no subclass is returned, so `instanceof`, the class identity and the
 *   `static readonly definition` a bound base already stamped all survive
 *   untouched.
 * @param _context - The standard (TC39) class-decorator context. Unused: the
 *   marker is stamped directly, with no initializer to defer to.
 *
 * @example
 * ```ts
 * import { transactional } from "@roastery/beans/application/command/decorators";
 *
 * @transactional
 * class PlaceOrder extends defineUseCase<typeof props, Deps, Order>(props, "place-order") {
 *   protected async handle(deps: Deps): Promise<Order> {
 *     const order = new Order(this.toJSON());
 *     await deps.orders.create(order);   // both writes commit together,
 *     await deps.stock.update(reserved); // or neither does
 *     return order;
 *   }
 * }
 *
 * const registry = commands(
 *   { placeOrder: PlaceOrder, findOrder: FindOrder },
 *   { transaction: (work) => runner.run(work) },
 * ).withDependencies({ orders, stock });
 *
 * await registry.placeOrder(payload); // BEGIN … COMMIT
 * await registry.findOrder(payload);  // no BEGIN at all — unmarked
 * ```
 *
 * @see `ITransactionRunner` in `@roastery/beans/domain/repository/types` — the
 *   contract the `transaction` option is usually built from.
 * @see `transactionalKeysOf` in `@roastery/beans/application/commands`.
 */
export function transactional(
	target: AnyCommandClass,
	_context: ClassDecoratorContext,
): void {
	Object.defineProperty(target, "transactional", {
		configurable: false,
		enumerable: false,
		value: true,
		writable: false,
	});
}
