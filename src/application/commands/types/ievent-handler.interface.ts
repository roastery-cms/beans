import type { DomainEvent } from "@/domain/domain-event";

/**
 * The contract a reaction implements: a class with one method, `handle`,
 * called once per matching event with the dependencies `commands`
 * has available (see `RegistrableEventHandlerClass` for how `Deps` is
 * checked against what is actually supplied).
 *
 * Deliberately an interface, not an abstract base class like `Command`:
 * `Command` centralizes real, shared behaviour (blueprint validation,
 * accessors, `demo()`/`fromJSON()`) that justifies a base class. A reaction
 * has nothing analogous to centralize — its "input" is the event itself,
 * already shaped and validated by `DomainEvent`, with no schema of its own
 * to check — so a structural contract is all that is needed.
 *
 * @typeParam Event - The concrete event type this handler reacts to — an
 *   **instance** type (`OrderConfirmed`), never a class reference
 *   (`typeof OrderConfirmed`). This trips up a `defineDomainEvent`-generated
 *   event specifically, because the only thing in scope to name is the
 *   generated class itself: `const BeanPlanted = defineDomainEvent(...)`
 *   gives you a value whose natural type reference, `typeof BeanPlanted`, is
 *   `DomainEventClassOf` — the **class** shape (`{ prototype, new(...) }`),
 *   not `DomainEvent`. Passing `typeof BeanPlanted` here fails with
 *   `TS2344: Type 'DomainEventClassOf' does not satisfy the constraint
 *   'DomainEvent'` — reach for `InstanceType<typeof BeanPlanted>` instead. A
 *   hand-written `class OrderConfirmed extends DomainEvent { ... }` doesn't
 *   have this trap: `OrderConfirmed` on its own already names the instance
 *   type, so no `InstanceType<...>` is needed there.
 * @typeParam Deps - The dependencies this handler's `handle()` needs.
 *
 * @example
 * ```ts
 * // Hand-written event class: the class name already is the instance type.
 * class SendReceiptOnOrderConfirmed implements IEventHandler<OrderConfirmed, SendReceiptDeps> {
 *   public async handle(event: OrderConfirmed, deps: SendReceiptDeps): Promise<void> {
 *     await deps.commands.sendReceipt({ orderId: event.aggregateId, total: event.total });
 *   }
 * }
 *
 * // defineDomainEvent-generated event: InstanceType<typeof ...> is required.
 * const BeanPlanted = defineDomainEvent("bean.planted");
 *
 * class LogBeanPlanted implements IEventHandler<InstanceType<typeof BeanPlanted>, unknown> {
 *   public async handle(event: InstanceType<typeof BeanPlanted>): Promise<void> {
 *     console.log(`bean planted: ${event.aggregateId}`);
 *   }
 * }
 * ```
 *
 * @see `IEventedCommands.on` — where a concrete implementation is registered.
 */
export interface IEventHandler<Event extends DomainEvent, Deps> {
	/**
	 * Runs the reaction. `await`ed by `commands` before the command
	 * call that raised `event` resolves; a rejection here is isolated from
	 * every sibling reaction and from that call's own result — see
	 * `EventedCommandsOptions.onError`.
	 *
	 * @param event - The raised event, matched by `name`.
	 * @param deps - The dependencies this handler declared it needs.
	 */
	handle(event: Event, deps: Deps): Promise<void>;
}
