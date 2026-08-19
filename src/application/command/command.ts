import type { ValueObject } from "@/domain/value-object";
import type { t } from "@roastery/terroir";
import { BadRequestException } from "@roastery/terroir/exceptions/application";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { Context, Demo, Properties, Source } from "@roastery/terroir/symbols";
import { installAccessors } from "@/shared/helpers/install-accessors";
import { redactIfSensitive } from "@/shared/redaction/redact-if-sensitive";
import { resolveSensitiveKeys } from "@/shared/redaction/resolve-sensitive-keys";
import type { ISensitiveKey } from "@/shared/redaction/sensitive-keys-of";
import { buildContext } from "./helpers/build-context";
import { modelFor } from "./helpers/model-for";
import { readBoundDefinition } from "./helpers/read-bound-definition";
import { readDefinition } from "./helpers/read-definition";
import type { CommandContextOf } from "./types/command-context-of.type";
import type { CommandDefinition } from "./types/command-definition.type";
import type { CommandDomainKeys } from "./types/command-domain-keys.type";
import type { CommandPropertiesOfClass } from "./types/command-properties-of-class.type";
import type { CommandPropertiesShapeBase } from "./types/command-properties-shape-base.type";
import type { CommandRawValueOf } from "./types/command-raw-value-of.type";
import type { CommandResult } from "./types/command-result.type";
import type { CommandSchemaOf } from "./types/command-schema-of.type";
import type { ICommand } from "./types/icommand.interface";
import type { RawCommandContextOf } from "./types/raw-command-context-of.type";
import type { SerializedCommand } from "./types/serialized-command.type";

/**
 * Abstract, blueprint-driven base for application-layer commands.
 *
 * A `Command` validates a schema-shaped input the same way an `Entity`
 * validates its blueprint — one `ValueObject` per field, resolved through
 * explicit value → rule `default` → rule `derive` — but carries no identity
 * and no mutation: it is built once, read through typed accessors, and then
 * `execute()`d with whatever dependencies its behaviour needs (repositories,
 * external services), resolving to a {@link CommandResult}.
 *
 * Structurally closer to a composite `ValueObject` than to an `Entity`: the
 * construction/validation half is the same shape, but there is no `set`,
 * `setMany`, `id`, `createdAt` or `updatedAt` — a `Command` that needs to
 * change something does so by calling behaviour on the `Entity` it
 * orchestrates inside `execute()`, never by mutating itself.
 *
 * @typeParam Shape - The command's blueprint shape: one `ValueObject` class
 *   per input field.
 * @typeParam Deps - The dependencies `execute()` takes (repositories,
 *   external services, …).
 * @typeParam Result - The domain value `execute()` produces.
 *
 * @throws `InvalidEntityDefinitionException` — when `defineCommand` is
 *   declared as a class field instead of a prototype method (a definition-time
 *   mistake, kept domain-layer like `Entity`/`ValueObject`'s own guard).
 * @throws `UnprocessableContentException` — when a property's raw value fails
 *   validation during construction; wraps the underlying `InvalidPropertyException`
 *   as `cause`, re-tagged application-layer since the input crossed the
 *   command's own boundary.
 * @throws `BadRequestException` — from `fromJSON`, when the payload does not
 *   match the blueprint's aggregate schema (missing or unexpected keys);
 *   application-layer for the same reason.
 *
 * @example
 * ```ts
 * const createUserProperties = { email: EmailVO, name: StringVO, password: PlainPasswordVO };
 *
 * // biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
 * interface CreateUserCommand extends CommandAccessorsOf<typeof createUserProperties> {}
 * class CreateUserCommand extends Command<typeof createUserProperties, Deps, User> {
 *   protected defineCommand(): CommandDefinition<typeof createUserProperties> {
 *     return { properties: createUserProperties, source: "create-user" };
 *   }
 *
 *   public async execute({ secrets, users }: Deps): Promise<CommandResult<User>> {
 *     const passwordId = await secrets.hash(this.password);
 *     const user = new User({ email: this.email, name: this.name, password: passwordId });
 *     await users.save(user);
 *     return { result: user, events: collectDomainEvents(user) };
 *   }
 * }
 * ```
 */
export abstract class Command<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result,
> implements ICommand<Shape, Deps, Result>
{
	/** The blueprint, as returned by the subclass's {@link Command.defineCommand}. */
	public readonly [Properties]: Shape;

	/**
	 * The built property map: one `ValueObject` instance per blueprint key.
	 * Unlike `Entity`'s, it carries no identity slice — a `Command` has no
	 * `id`/`createdAt`/`updatedAt` — and never holds a nested instance, since
	 * the blueprint is value-object-only.
	 */
	public readonly [Context]: CommandContextOf<Shape>;

	/** Stable command-type identifier (e.g. `"create-user"`), the `source` of every validation error. */
	public readonly [Source]: string;

	/**
	 * Which keys {@link Command.toJSON} replaces, and with what. Resolved once
	 * per instance from the two declaring sources — each value-object's own
	 * `sensitive` flag, plus any extra key `defineCommand` named — over a memo
	 * shared by every instance of the class.
	 *
	 * A true JS private field, not a terroir symbol slot: nothing outside this
	 * class keys off it.
	 */
	readonly #sensitive: ReadonlyMap<string, ISensitiveKey>;

	/**
	 * Declares what the command **is**: its blueprint and its command-type name.
	 *
	 * **Must be a prototype method, never a class field** — the base invokes it
	 * inside the constructor, before any field initializer runs. And it must be
	 * **pure**: `fromJSON` invokes it on a probe created without running any
	 * constructor, purely to read the blueprint before validating.
	 *
	 * @returns The blueprint and the command-type name.
	 */
	protected abstract defineCommand(): CommandDefinition<Shape>;

	/**
	 * Builds the command from a raw payload: one input value per blueprint key.
	 * Validation is **synchronous and immediate** — every property goes through
	 * its own `ValueObject`, so an instance that exists is an instance whose
	 * input was already accepted. Unknown keys are ignored; use
	 * {@link Command.fromJSON} when they must be rejected.
	 *
	 * Also installs the blueprint-derived accessors on the class prototype,
	 * once per class.
	 *
	 * Dependencies never arrive here — they reach the subclass through
	 * {@link Command.execute}'s parameter, which is where all I/O belongs.
	 *
	 * @param payload - The raw construction payload. Keys backed by a rule
	 *   (`default`/`derive`) or by an `undefined`-accepting value-object may be
	 *   omitted.
	 *
	 * @throws `InvalidEntityDefinitionException` — when `defineCommand` is
	 *   declared as a class field instead of a prototype method.
	 * @throws `PropertyNameCollisionException` — when a blueprint key collides
	 *   with an existing member of the command.
	 * @throws `UnprocessableContentException` — when a raw value fails its
	 *   property's validation; the underlying `InvalidPropertyException` is
	 *   preserved as `cause`.
	 */
	public constructor(payload: RawCommandContextOf<Shape>) {
		const { properties, sensitive, source } = readDefinition<Shape>(this);
		const useDefault = (payload as unknown) === Demo;

		installAccessors(
			Object.getPrototypeOf(this) as object,
			properties,
			source,
			"Command",
		);

		this.#sensitive = resolveSensitiveKeys(properties, sensitive);
		this[Source] = source;
		this[Properties] = properties;
		this[Context] = buildContext(
			properties,
			source,
			useDefault ? undefined : (payload as unknown as Record<string, unknown>),
			useDefault,
		);
	}

	/**
	 * Builds the command without data: every value-object falls back to its
	 * declared default. Blueprint rules resolve in demo mode too, so a fixture
	 * stays coherent instead of a bag of unrelated defaults — the same
	 * guarantee `Entity.demo()` gives.
	 *
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `UnprocessableContentException` — when a value-object's default
	 *   does not pass its own schema.
	 */
	public static demo<
		Self extends {
			readonly prototype: { [Properties]: CommandPropertiesShapeBase };
		},
	>(this: Self): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` must be the concrete subclass — see CLAUDE.md "Conventions".
		return Reflect.construct(this as never, [Demo]) as Self["prototype"];
	}

	/**
	 * Builds the command from a payload of untrusted origin — an HTTP request
	 * body, a queue message — strictly: the whole payload is validated against
	 * the blueprint's aggregate schema **before** any value-object is built,
	 * rejecting missing and unexpected keys alike.
	 *
	 * This is the documented entry point at the application boundary, which is
	 * why its failure is a `BadRequestException` (400) rather than the
	 * `InvalidDomainDataException` `Entity.fromJSON` raises: the payload was
	 * the caller's, not a domain invariant's.
	 *
	 * @param data - The serialized command payload.
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `BadRequestException` — when the payload does not match the
	 *   blueprint's aggregate schema (missing or unexpected keys).
	 * @throws `UnprocessableContentException` — when the payload matches the
	 *   schema but a value still fails its property's own validation.
	 */
	public static fromJSON<
		Self extends {
			readonly prototype: { [Properties]: CommandPropertiesShapeBase };
		},
	>(
		this: Self,
		data: SerializedCommand<CommandPropertiesOfClass<Self>>,
	): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` must be the concrete subclass — see CLAUDE.md "Conventions".
		const probe = Object.create(this.prototype) as object;
		const { properties, source } =
			readDefinition<CommandPropertiesShapeBase>(probe);

		if (!SchemaManager.match(modelFor(properties), data))
			throw new BadRequestException(
				source,
				`Command: the payload for "${source}" does not match its blueprint — missing or unexpected keys.`,
			);

		// biome-ignore lint/complexity/noThisInStatic: `this` must be the concrete subclass — see CLAUDE.md "Conventions".
		return Reflect.construct(this as never, [data]) as Self["prototype"];
	}

	/**
	 * The aggregate TypeBox model derived from the blueprint, emitted with
	 * `additionalProperties: false`. Belongs to the blueprint rather than the
	 * instance: it is memoized against the blueprint object's identity, so
	 * every instance of a class shares one model — and therefore one compiled
	 * validator.
	 */
	public get schema(): CommandSchemaOf<Shape> {
		return modelFor(this[Properties]) as unknown as CommandSchemaOf<Shape>;
	}

	/**
	 * Serializes the command to a plain object: one raw value per blueprint
	 * key. Flat by construction — the blueprint holds only value-objects, so
	 * there is no nested level to recurse into.
	 *
	 * **Sensitive keys are replaced here**, unlike in `Entity.toJSON()`. A
	 * command is never persisted, so no round-trip depends on this output —
	 * while `toJSON` is precisely the method a structured logger reaches
	 * through `JSON.stringify(command)`, which is how a plaintext password ends
	 * up in a log file. The replacement comes from the value-object's own
	 * `redactWith`, or from `configureRedaction({ placeholder })`.
	 *
	 * Consequence, stated rather than hidden: **the output does not round-trip
	 * through `fromJSON` when anything was redacted.** That is intended — read
	 * a command's real values through its accessors or `get()`, which are
	 * untouched.
	 *
	 * @returns The serialized payload, sensitive keys replaced.
	 */
	public toJSON(): SerializedCommand<Shape> {
		return Object.fromEntries(
			Object.entries(
				this[Context] as Record<string, ValueObject<unknown, t.TSchema>>,
			).map(([key, vo]) => [
				key,
				redactIfSensitive(this.#sensitive, key, this[Source], vo.value),
			]),
		) as SerializedCommand<Shape>;
	}

	/** @returns The serialized command as a JSON string, sensitive keys replaced. */
	public toString(): string {
		return JSON.stringify(this.toJSON());
	}

	/**
	 * Node's inspect hook, so `console.log(command)` shows the same redacted
	 * view `toJSON` produces rather than the raw `[Context]` value-objects.
	 *
	 * @returns The redacted serialized payload.
	 */
	public [Symbol.for(
		"nodejs.util.inspect.custom",
	)](): SerializedCommand<Shape> {
		return this.toJSON();
	}

	/**
	 * Reads one blueprint key's raw value. Always the wrapped value, never an
	 * instance — a `Command` blueprint holds no nested entity, so reads do not
	 * chain the way `Entity.get` does.
	 *
	 * The unknown-key guard raises the same **domain-layer**
	 * `InvalidPropertyException` `Entity.get` does, deliberately: asking for a
	 * key the blueprint never declared is a bug at the call site, not untrusted
	 * input crossing the command's boundary.
	 *
	 * @param key - A blueprint key.
	 * @returns The key's raw value.
	 *
	 * @throws `InvalidPropertyException` — when the key is outside the blueprint.
	 */
	public get<Key extends CommandDomainKeys<Shape>>(
		key: Key,
	): CommandRawValueOf<Shape[Key]> {
		if (!Object.hasOwn(this[Properties], key))
			throw new InvalidPropertyException(String(key), this[Source]);

		return (this[Context] as Record<string, ValueObject<unknown, t.TSchema>>)[
			key as string
		]!.value as CommandRawValueOf<Shape[Key]>;
	}

	/**
	 * Runs the command's behaviour. **The only place I/O and side effects
	 * belong** — construction is synchronous and already fail-fast, so by the
	 * time this runs the input is known to be valid.
	 *
	 * A `Command` never mutates itself: it orchestrates by calling business
	 * methods on the `Entity` (or entities) it touches, then surfaces whatever
	 * domain events they raised. It also never *publishes* those events —
	 * {@link CommandResult} only hands them to the caller, who decides when and
	 * where they go.
	 *
	 * @param deps - The dependencies the behaviour needs: repositories,
	 *   external services, clocks. Injected here rather than in the
	 *   constructor, so construction stays pure.
	 * @returns The command's result plus the domain events drained from the
	 *   aggregates it touched — use `collectDomainEvents` to gather them.
	 *
	 * @see `collectDomainEvents` in `@roastery/beans/application/command/helpers`
	 *   — the sanctioned way to fill {@link CommandResult.events}.
	 */
	public abstract execute(deps: Deps): Promise<CommandResult<Result>>;
}

/**
 * `BoundEntity`'s counterpart: a `Command` subclass that reads its definition
 * from a static on the class it is constructed as, so `commandOf` has a base
 * whose `defineCommand` is already implemented.
 *
 * Still **abstract** — unlike `BoundEntity`, a `Command` also owes an
 * `execute()`, and that one genuinely must be implemented by the subclass. The
 * point is only to take `defineCommand` off the list, which is what stops
 * `class X extends commandOf(…)` from failing with TS2515 over a member the
 * factory already provides.
 *
 * The definition lives on `constructor.definition` rather than in a closure so
 * `defineCommand` stays pure and prototype-borne: `fromJSON` reads it off a
 * probe built with `Object.create(this.prototype)`.
 *
 * Not exported from any barrel — `commandOf` is the only way to produce one.
 *
 * @typeParam Shape - The blueprint shape.
 * @typeParam Deps - The dependencies `execute()` takes.
 * @typeParam Result - The domain value `execute()` produces.
 *
 * @see `commandOf` in `./helpers/command-of` — the only producer.
 */
export abstract class BoundCommand<
	Shape extends CommandPropertiesShapeBase,
	Deps,
	Result,
> extends Command<Shape, Deps, Result> {
	/**
	 * Reads the definition the factory stamped onto the generated class.
	 *
	 * @returns The blueprint and command-type name bound at factory call time.
	 *
	 * @throws `InvalidEntityDefinitionException` — when the class was produced
	 *   some other way and carries no definition.
	 */
	protected defineCommand(): CommandDefinition<Shape> {
		return readBoundDefinition<Shape>(this, "commandOf");
	}
}
