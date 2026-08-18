/**
 * The fallback used when `eventedRegistry` was given no `onError` (or when
 * the one it was given itself threw): re-throws `error` inside a microtask.
 *
 * Never called from inside the same `try`/`catch` protecting the reaction
 * loop — by the time this runs, the failing reaction (or the failing
 * `onError`) has already been fully isolated. The re-throw surfaces as an
 * unhandled exception in whatever the host runtime already does with those
 * (visible in Bun/Node's own reporting), without rejecting the `Promise`
 * `eventedRegistry`'s own caller is awaiting — no `console.*` call exists
 * anywhere else in this package, so this deliberately doesn't introduce one
 * either.
 *
 * @param error - Whatever was caught.
 */
export function defaultOnError(error: unknown): void {
	queueMicrotask(() => {
		throw error;
	});
}
