import type { TransactionBoundary } from "./transaction-boundary.type";

/**
 * `commands`' second argument in its **events-free** form: what a registry can
 * be configured with that does not involve an event bus.
 *
 * @remarks
 * `transaction` is **required** here even though the argument itself is
 * optional, for the same reason `emitter` is required inside
 * {@link EventedCommandsOptions}: an options object with nothing in it is just
 * `commands(spec)` written the long way, and allowing it would make `{}` a
 * valid call — which quietly costs the whole feature its discoverability.
 * TypeScript resolves an argument's completions against the overload that
 * *matches*, so an empty literal matching this one offers `transaction` alone
 * and hides `emitter`/`onError` from the editor entirely. Requiring the key
 * means `{}` matches neither overload, and the completion list becomes the
 * union of both — which is what a reader opening that brace is asking for.
 *
 * A caller whose boundary only sometimes exists branches at the call site,
 * exactly as one whose emitter does:
 * `transaction ? commands(spec, { transaction }) : commands(spec)`.
 *
 * @example
 * ```ts
 * // a transaction boundary, no bus in sight — `.on()` does not exist here
 * commands(spec, { transaction: (work) => runner.run(work) });
 * ```
 *
 * @see `EventedCommandsOptions` — the same option, optional there, alongside
 *   `emitter`/`onError`.
 * @see `commands` — the only consumer.
 */
export type CommandsOptions = {
	/**
	 * Opens a transaction around the `execute()` of every spec key whose
	 * command class carries the `transactional` marker — and around no other.
	 * Omit the whole options argument and a marked command still runs, just
	 * without a boundary (see `transactional`); pass this with nothing marked
	 * and no `BEGIN` is ever issued.
	 */
	readonly transaction: TransactionBoundary;
};
