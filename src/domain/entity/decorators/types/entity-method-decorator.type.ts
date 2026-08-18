/**
 * The shape every method-handle decorator (`beforeHandle`, `afterHandle`)
 * returns: a standard (TC39) method decorator, generic over the exact
 * receiver, argument tuple and return type of the method it wraps, so the
 * replacement keeps the original method's own signature intact.
 *
 * Three type parameters where {@link EntityLifecycleDecorator} needed only
 * one (`Class`): a class decorator's mixin base can be captured by a single
 * constructor type, but a method has no equivalent single shape — receiver,
 * arguments and return type vary independently per decorated method.
 *
 * `Args extends unknown[]`, not `any[]`: unlike the class decorators, there
 * is no mixin base class here (no `class Decorated extends target`), so none
 * of the TS2545/TS2515 mixin-pattern traps apply, and `unknown[]` is
 * strictly safer with no `biome-ignore` needed.
 */
export type EntityMethodDecorator = <This, Args extends unknown[], Return>(
	target: (this: This, ...args: Args) => Return,
	context: ClassMethodDecoratorContext<
		This,
		(this: This, ...args: Args) => Return
	>,
) => (this: This, ...args: Args) => Return;
