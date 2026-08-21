# Which exception layer, and when to re-tag

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

Reach for the specific domain exception, not the generic one. terroir 0.2.0 ships
`ImmutablePropertyException`, `PropertyNameCollisionException`, `IncompleteIdentityException`,
`InvalidEntityDefinitionException` and `CyclicEntityDefinitionException` — added because *this*
repo was collapsing all five cases into `OperationFailedException`/`InvalidPropertyException`.
Tests assert the class (and the `property`/`source` slots), never a message substring. Every
exception also takes a trailing `ErrorOptions`, so a wrapped failure keeps its `cause`.

## `application/command` reuses domain exceptions for definition-time mistakes

`defineCommand`'s class-field guard reuses `InvalidEntityDefinitionException`, the blueprint-key
collision guard reuses `PropertyNameCollisionException`, and `get()`'s unknown-key guard reuses
`InvalidPropertyException` — the same `domain`-layer exceptions `Entity`/`ValueObject` already use
for the identical class of mistake, because none of these are about untrusted input crossing a
boundary; they're bugs in how the class or the call site is written.

## Input failures are re-tagged at the command's own boundary

A **raw value failing validation during construction** is different: `buildProperty`
(`application/command/helpers/build-context.ts`) `try`/`catch`es the `ValueObject`'s own
`InvalidPropertyException` and re-throws `UnprocessableContentException` (422, from
`@roastery/terroir/exceptions/application`), wrapping the original as `cause` — the property is
still validated by ordinary domain machinery, but the *failure* belongs to the application layer,
since it was the command's input that was wrong, not a domain invariant.

`Command.fromJSON`'s whole-payload schema mismatch (missing/extra keys) throws
`BadRequestException` (400) the same way, replacing what would otherwise be `Entity.fromJSON`'s
`InvalidDomainDataException`.

Both `ApplicationException` subclasses fix `[Layer]` to `"application"` (from
`@roastery/terroir/symbols`, sealed by the abstract base) — the whole point of the split:
error-handling middleware reading `error[Layer]` can tell "this command's own input was invalid"
apart from "a deeper domain invariant broke," which a uniform `domain`-layer exception could not
distinguish.

`DomainRecord.fromJSON` throws `InvalidDomainDataException` — domain-layer, like
`Entity.fromJSON`, **not** `Command.fromJSON`'s `BadRequestException`. A record is domain
modeling, not an application boundary.

## The infra catalog has exactly one consumer

`src/testing/` is the only place reaching terroir's `InfraException` catalog
(`ConflictException`, `ResourceNotFoundException` from `@roastery/terroir/exceptions/infra`) — an
adapter's failures belong to the infra layer, and the in-memory double is the one adapter in the
package.

Note `ConflictException` carries no `property` slot (only `source`/`message`), so a test can
assert the class but not which key collided; the fix, if that ever matters, is asking terroir for
the slot, exactly as the five domain exceptions were added — not subclassing locally.
