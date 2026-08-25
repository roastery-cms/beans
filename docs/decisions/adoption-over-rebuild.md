# An already-built instance is adopted, not rebuilt

**Status:** closed. **Origin:** written with the fix, 2026-08-25 (0.6.0).

Every build site used to reach for `new` unconditionally. Hand a parent an instance it already
had — `new Post({ author })`, `post.set("author", author)`, an item appended through
`post.set("tags", ...)` — and it constructed a *second* object from the first.

That is where it went wrong, and the reason nobody caught it explains the shape of the fix.
Accessors are installed on the **prototype**, `enumerable: false`, so reading an instance as raw
input reads almost nothing: the identity fields survive, and every blueprint key comes back
`undefined`. The constructor then filled those keys with the blueprint's own defaults. What came
back was an object carrying the original `id` and none of the original state — and any event the
instance had buffered went with the instance that was discarded. Three build sites, three
silences.

The type system had already accepted the instance at that boundary: a built entity satisfies its
own input form structurally, which is why `post.set("author", author)` type-checks. The runtime
was the half that disagreed. `isBuiltInstance` (`shared/helpers/is-built-instance.ts`) is the
runtime catching up — one test before `new`, at `Entity`'s and `DomainRecord`'s `buildProperty`
and at the wrapper's `buildItem`.

A **serialized** payload still rebuilds, and still mints an identity when it carries none. That
is the whole contract, and it is what keeps `fromJSON` and the repository doubles working:
`toJSON()` is a DTO, and a DTO is exactly the thing that has no instance to adopt.

## Value objects are excluded, and the discriminant lives at the call sites

The raw input of a value-object key **is its wrapped value**, never the instance: a title key
takes `"primeiro"`, not `new StringVO(...)`. There is nothing to adopt, so the three call sites
test `isValueObjectClass` first and `isBuiltInstance` never sees the case. Keeping that
discriminant at the call sites rather than inside the helper is deliberate — the helper answers
one question, and the pillar decides whether the question applies.

## Why `instanceof`, and not the exact prototype

`isBuiltInstance` accepts a subclass. That is the same ruler `propertyMatches` and `entityHas`
already hold up to a blueprint key: a `PostAuthorId extends UuidVO` satisfies a key declaring
`UuidVO`, and a `DraftAuthor extends Author` satisfies one declaring `Author`. Domain vocabulary
lives in those subclasses; refusing them at the door would make the runtime stricter than the
type system, which accepts them, and stricter than the shape helpers, which exist to accept
them.

## The price is aliasing

The same instance can now sit in two parents, and mutating it shows in both. That is a real
change in meaning and it was chosen with eyes open: the alternative on offer was two copies
sharing one `id` and diverging over time, which is the worse of the two failures and the harder
one to see.

## Adoption accepts a subclass; equality refuses one

The two decisions are correct in isolation and they point opposite ways, so the seam is worth
naming. `isBuiltInstance` asks *is this already one of these?* and answers with `instanceof`.
`equals` asks *are these the same thing?* and answers with the exact prototype, because anything
looser is asymmetric — see [equality-per-pillar.md](equality-per-pillar.md).

Put together:

```ts
class DraftAuthor extends Author {}

const draft = new DraftAuthor({ name: "alan" });
const post = new Post({ title: "primeiro", author: draft });

post.get("author") === draft;                 // true — adopted, no complaint
draft.equals(new Author(draft.toJSON()));     // false — and false the other way too
```

So a key adopted legitimately can make `post.sameStateAs(other)` answer `false` against a pair
rebuilt from the same `toJSON()`, permanently, with nothing having objected at either moment.
The answer is not to move one of the two rulers — each is right for its own question — but to
know that a subclass crossing the adoption boundary leaves the equality one behind.
`entity.spec.ts` pins it.

## See also

- [equality-per-pillar.md](equality-per-pillar.md) — the other half of the seam, and why
  `equals` takes the exact prototype.
- [module-cycles-and-file-layout.md](module-cycles-and-file-layout.md) — why `isBuiltInstance`
  is in `shared/helpers` and imported by direct path at all three sites.
