/**
 * Copies the original class's `name` onto the wrapper a lifecycle decorator
 * generates, so a decorated entity keeps identifying itself as itself.
 *
 * Every decorator returns `class Decorated extends target`, and a class
 * declaration takes its own binding name — so without this, `User.name` reads
 * `"Decorated"` for every decorated class in the codebase. Nothing inside
 * `beans` reads `Class.name` (the blueprint machinery is entirely
 * structural), but consumers do: stack traces, log lines and DI containers
 * all key off it, and four different entities all reporting as `Decorated`
 * makes those unreadable.
 *
 * `name` is a configurable own property of every class, so redefining it is
 * the sanctioned way to do this — assignment alone would silently fail, since
 * the property is not writable.
 *
 * @typeParam Wrapper - The generated wrapper class type.
 *
 * @param wrapper - The wrapper class the decorator is about to return.
 * @param target - The class being decorated, whose name to adopt.
 * @returns The same `wrapper`, renamed, so the call can be inlined in the
 *   decorator's `return`.
 *
 * @example
 * ```ts
 * abstract class Decorated extends target { … }
 *
 * return renameDecorated(Decorated, target) as unknown as typeof target;
 * ```
 */
export function renameDecorated<Wrapper>(
	wrapper: Wrapper,
	target: { readonly name: string },
): Wrapper {
	Object.defineProperty(wrapper, "name", {
		configurable: true,
		value: target.name,
	});

	return wrapper;
}
