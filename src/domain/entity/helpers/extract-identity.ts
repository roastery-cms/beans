import { IncompleteIdentityException } from "@roastery/terroir/exceptions/domain";
import type { IRawEntity } from "../types";

/**
 * Builds the exception both half-identity branches throw.
 *
 * `IncompleteIdentityException` has no `property` slot — the identity is one
 * unit, and it is the whole unit that is incomplete — so the missing key goes
 * into the message, which is the only place it survives.
 *
 * @param missing - The identity field the payload left out.
 * @param source - Entity-type name, used as the `source` of the exception.
 * @returns The exception to throw.
 */
function incompleteIdentity(
	missing: string,
	source: string,
): IncompleteIdentityException {
	return new IncompleteIdentityException(
		source,
		`Entity: the identity of ${source} is incomplete — "${missing}" is missing. Pass id and createdAt together, or neither.`,
	);
}

/**
 * Pulls the identity fields out of a raw construction payload, enforcing the
 * all-or-nothing rule at runtime (the type-level twin lives in
 * `IdentityInput`): either none of `id`/`createdAt`/`updatedAt` is present —
 * the caller should generate a fresh identity — or `id` **and** `createdAt`
 * come together, with `updatedAt` still optional.
 *
 * @param source - Entity-type name, used as the `source` of the exception.
 * @param raw - The raw payload handed to the entity constructor, if any.
 * @returns The identity fields when the payload carries them, or `undefined`
 *   when it carries none.
 *
 * @throws `IncompleteIdentityException` — naming the missing key, when the
 *   payload brings only half an identity.
 */
export function extractIdentity(
	source: string,
	raw?: Record<string, unknown>,
): IRawEntity | undefined {
	const { id, createdAt, updatedAt } = (raw ?? {}) as Partial<IRawEntity>;

	if (id === undefined && createdAt === undefined && updatedAt === undefined)
		return undefined;

	if (id === undefined) throw incompleteIdentity("id", source);

	if (createdAt === undefined) throw incompleteIdentity("createdAt", source);

	return { id, createdAt, updatedAt };
}
