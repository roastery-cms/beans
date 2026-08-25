# Equality is a per-pillar question, and each pillar answers its own

**Status:** closed. **Origin:** written with the feature, 2026-08-24 (0.6.0).

`beans` shipped `deepEquals` and nothing else, so every consumer wrote the same line at every
boundary: `deepEquals(a.toJSON(), b.toJSON())`. That line is wrong twice over.

It is wrong for an `Entity`, because `toJSON()` carries `createdAt` and `updatedAt` — two reads
of one aggregate taken a second apart compare as different entities, which is the exact opposite
of what identity means. And it is wrong for anything that *holds* an entity: a `DomainRecord`
key, an `arrayOf(...)` item, a nested aggregate three levels down all drag those same timestamps
into an answer that is supposed to be about value.

The package already knew the right answer in each case and simply did not expose it. A value
object is equal by its value, an entity by its `id`, a record by its properties, a wrapper item
by item. Those are three different rules, and a consumer writing one comparator can only pick
one of them.

`deepEquals` stays exactly where it is. It answers a different question — structural equality
over a **DTO** — and `setMany`'s change detection and the in-memory double's filtering are both
asking that one, over raw values that never were domain instances.

## The type check is the class, by exact prototype

Every `equals` opens the same way: same reference, then `typeof other === "object"`, then
`Object.getPrototypeOf(this) === Object.getPrototypeOf(other)`.

`instanceof` was the obvious alternative and it is the wrong one, because it is **asymmetric**.
With `other instanceof this.constructor`, a `DraftPost extends Post` sharing an `id` gives
`post.equals(draft) === true` and `draft.equals(post) === false`. An equality that depends on
which operand you call it on is not an equivalence relation, and every consumer who sorts,
dedupes or memoizes with it eventually finds that out the hard way. Exact prototype is symmetric
by construction, and transitive for free.

The price is stated rather than engineered around, because the package already charges it
everywhere else: **call a class-returning factory once, at module scope.** Two `recordOf`,
`customRecordVO` or `arrayOf` calls with identical arguments mint two classes, and instances of
them are not equal. That is the same rule `propertyMatches` documents for the shape question and
`defineWrapper` documents for its own schema cache — one more consequence, not a new one.

Note this makes `equals` *stricter* than `propertyMatches`, which deliberately accepts a
subclass (`PostAuthorId extends UuidVO` satisfies a blueprint declaring `UuidVO`). The two are
asking different things. `propertyMatches` asks whether a class **satisfies a contract**, where
accepting a domain-vocabulary subclass is the whole point; `equals` asks whether two instances
**are the same thing**, where a subclass is a different kind by definition.

That makes three questions the package asks about a class, with two rulers between them:

| helper | the question | subclass |
| --- | --- | --- |
| `propertyMatches` / `entityHas` / `reshapeTo` | satisfies the contract? | accepted |
| `isBuiltInstance` | is this already one of these? | accepted (`instanceof`) |
| `equals` / `sameStateAs` | are these the same thing? | refused (exact prototype) |

The middle row is the one worth holding on to, because it and the bottom row see the *same value*
at two different moments: a `DraftAuthor extends Author` is adopted into an `Author` key without a
word, and from then on compares equal to nothing. Neither ruler is wrong for its own question —
see [adoption-over-rebuild.md](adoption-over-rebuild.md) for the seam and its price.

## Why `Entity` needs two methods

`equals` answers identity and only identity: same class, same `id`, state irrelevant. That is
the DDD rule, and it is what makes `posts.findById(post.id)` comparable to `post` after either
one has been mutated.

But "did this aggregate change since I read it?" and "do these two carry the same content?" are
real questions too, and they were the ones the hand-written `deepEquals(a.toJSON(), b.toJSON())`
was actually trying to answer. `sameStateAs` answers them properly: one comparison per blueprint
key, with `id`, `createdAt` and `updatedAt` excluded. Folding both into one method would have
meant picking one question and leaving the other to the same broken line.

A `DomainRecord` has exactly one of those questions, so it has exactly one method. `equals`
there *is* `Entity.sameStateAs`'s body — record is entity minus identity, and this is one more
place where that shows up as a shared implementation rather than a coincidence.

## Every property answers with its own rule

`Entity.sameStateAs`, `DomainRecord.equals` and a wrapper's `equals` all go through one shared
step, `propertyEquals` (`shared/helpers/property-equals.ts`), which does nothing but call the
property's own `equals`. So a value-object key compares by value, a nested record recurses, a
wrapper goes item by item — and a **nested entity compares by its `id`**.

That last one is a decision, not a fallout. What a post holds under `author` is a reference to
an author, and renaming that author does not change the post. `post.sameStateAs(other)` stays
`true`; ask `post.author` itself when the question is about the author's state. Recursing into
the nested entity's state instead would make "has this post changed?" answer `true` for a change
that belongs to a different aggregate — and would put `createdAt`/`updatedAt` back in the answer
at every level below the root, which is the bug this whole feature exists to remove.

`propertyEquals` is shared rather than duplicated for the reason `propertyMatches` and
`cycleError` are: two consumers ask the question, and two copies would only guarantee that a fix
to one silently misses the other.

## A wrapper compares by its items, not by `toJSON`

The generated wrapper class takes **two** guards, and each buys something the other does not.
`other instanceof Wrapper`, against the class that very `defineWrapper` call minted, is what makes
`#items` readable: it is a true JS private field, legible only from instances of the class that
declares it, so without that guard a container from a *different* `arrayOf(Tag)` call would throw
a `TypeError` instead of answering `false`. The exact prototype check is the second, and it is
what makes this the same "exact class" rule as everywhere else — `instanceof` on its own would
accept a subclass of the minted container, which is precisely what the three bases refuse.

Order is part of the answer. A wrapper is a sequence — `deepEquals` already compares arrays
order-sensitively, `toJSON` preserves order, and a set-like wrapper was never part of the
contract.

## Why `Command` is left out

A command is an input DTO on its way to a use case, not a domain value. It has no identity to
compare, its `toJSON()` redacts (unlike the two domain pillars', which must round-trip), and
"are these two commands the same?" is not a question a domain asks — a registry dispatches
them, it does not deduplicate them.

And it costs the command nothing, which is worth stating because sharing `installAccessors` looks
like it should. The test there is `key in prototype`, and the three pillars are three unrelated
prototype chains: a member reserves its name only where it is declared. `Command.prototype` has
`schema`, `toJSON`, `get` and `execute`; it has no `equals`, so a command blueprint may still name
one. That is also why no per-pillar reserved-name list is needed — the list that would drift is
the one the prototype already keeps.

## The breaking part

`equals` becomes a reserved blueprint key in `Entity` and `DomainRecord`; `sameStateAs` in
`Entity` only. `installAccessors` tests `key in prototype`, so the reservation is automatic,
needs no list to maintain, and reaches exactly the pillars that declare the member — a blueprint
declaring either throws `PropertyNameCollisionException` at construction, atomically, the same
way `schema`, `toJSON`, `get` and `id` already did.

## See also

- [record-is-entity-minus-identity.md](record-is-entity-minus-identity.md) — why the record's
  `equals` and the entity's `sameStateAs` are the same body.
- [module-cycles-and-file-layout.md](module-cycles-and-file-layout.md) — why `value-object.ts`
  imports `deepEquals` by direct path and never through `entity/helpers`' barrel.
- [redaction-asymmetry.md](redaction-asymmetry.md) — why `equals` reads the real value and not
  `toSafeJSON`'s.
- [adoption-over-rebuild.md](adoption-over-rebuild.md) — the other ruler, and why adoption accepts
  a subclass this one refuses.
