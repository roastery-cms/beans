/**
 * A domain event may carry a payload, declared on the event class as
 * `static readonly payload` in one of three forms:
 *
 *   - a **shape**    → the raising entity, cut down to it by `reshapeTo`
 *   - **`Json`**     → `entity.toJSON()`
 *   - **`SafeJson`** → `entity.toSafeJSON()`
 *
 * Run it:  bun examples/testing-event-payload.ts
 */

import {
	EmailVO,
	IntegerVO,
	PasswordVO,
	SlugVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { emit, onCreate } from "@/domain/entity/decorators";
import { validatePayload } from "@/domain/domain-event/helpers";
import { blueprint, defineDomainEvent, entityOf, reshapeShape } from "@/way";
import { Json, SafeJson } from "@roastery/terroir/symbols";

const show = (label: string, value: unknown): void => {
	console.log(`\n── ${label} ${"─".repeat(Math.max(0, 66 - label.length))}`);
	console.dir(value, { depth: null });
};

// ---------------------------------------------------------------------------
// The aggregate. `secret` is a `PasswordVO`, which declares `sensitive: true`
// — that is what `toSafeJSON()` redacts and `toJSON()` deliberately does not.
// ---------------------------------------------------------------------------

const subscriberProperties = blueprint({
	name: StringVO,
	email: EmailVO,
}).done();

class Subscriber extends entityOf(subscriberProperties, "subscriber") {}

const subscriptionProperties = blueprint({
	plan: SlugVO,
	bagsPerMonth: IntegerVO,
	subscriber: Subscriber,
	secret: PasswordVO,
}).done();

// ---------------------------------------------------------------------------
// Three events, three declarations. Each one is defined once, at module scope.
// ---------------------------------------------------------------------------

/**
 * The shape form. An allowlist of classes: `secret` is simply not named, which
 * is how it stays off the bus. `subscriber` names the nested class rather than
 * an anonymous target, because the same object is both the cut's target *and*
 * the blueprint an arriving payload is validated against.
 */
const subscriptionCard = reshapeShape({
	plan: SlugVO,
	bagsPerMonth: IntegerVO,
	subscriber: Subscriber,
});

const SubscriptionStarted = defineDomainEvent(
	"subscription.started",
	subscriptionCard,
);

/** The whole serialization, root identity included — and nothing redacted. */
const SubscriptionMirrored = defineDomainEvent("subscription.mirrored", Json);

/** The same, redacted. For consumption and audit — it does not round-trip. */
const SubscriptionAudited = defineDomainEvent("subscription.audited", SafeJson);

/** No payload declared at all: the event has no `payload` key whatsoever. */
const SubscriptionPinged = defineDomainEvent("subscription.pinged");

// ---------------------------------------------------------------------------
// Nothing about raising changed. The decorators take no second argument — they
// read the static off the class they already receive — and `raiseEvent` still
// takes the class bare, because the payload comes from the entity and never
// from the constructor.
// ---------------------------------------------------------------------------

@onCreate(SubscriptionStarted)
class Subscription extends entityOf(subscriptionProperties, "subscription") {
	@emit(SubscriptionMirrored)
	public upgrade(bags: number): void {
		this.set("bagsPerMonth", bags);
	}

	/** Public facades for `raiseEvent`, which is protected. */
	public audit(): void {
		this.raiseEvent(SubscriptionAudited);
	}

	public ping(): void {
		this.raiseEvent(SubscriptionPinged);
	}
}

const subscription = new Subscription({
	plan: "Single Origin Monthly",
	bagsPerMonth: 2,
	subscriber: { name: "Ada", email: "ada@roastery.dev" },
	secret: "Sup3r-Secret!",
});

subscription.upgrade(4);
subscription.audit();
subscription.ping();

const [started, mirrored, audited, pinged] = subscription.pullDomainEvents();

// ---------------------------------------------------------------------------
// 1. The shape form — the cut, and what identity survives it.
// ---------------------------------------------------------------------------

show("subscription.started — shape", started);

console.log(`
The root's identity is gone: \`aggregateId\` already carries it, and
\`createdAt\`/\`updatedAt\` describe the entity rather than the event. The
**nested** subscriber keeps its own id, which is what makes the payload
hydratable one level down. And \`secret\` never left — it was not in the shape.

  root id in the payload?    ${"id" in (started?.payload as object)}
  nested subscriber id?      ${"id" in ((started?.payload as { subscriber: object }).subscriber)}
  aggregateId === entity id? ${started?.aggregateId === subscription.id}
  secret leaked?             ${"secret" in (started?.payload as object)}`);

// ---------------------------------------------------------------------------
// 2. Only the shape form validates on arrival.
// ---------------------------------------------------------------------------

const received = JSON.parse(JSON.stringify(started?.payload)) as unknown;

show("what the far side rebuilds", SubscriptionStarted.fromJSON(received));

console.log(`
That is the whole point of a shape: \`.on(SubscriptionStarted, Handler)\` already
hands the consumer this class, so one declaration serves both ends of the bus.

\`validatePayload\` is the same check without an event class in hand:`);

console.log("  valid:", validatePayload(
	subscriptionCard,
	"subscription.started",
	received,
) !== undefined);

try {
	validatePayload(subscriptionCard, "subscription.started", {
		...(received as object),
		bagsPerMonth: "four",
	});
} catch (error) {
	console.log(`  rejected: ${(error as Error).constructor.name}`);
}

// ---------------------------------------------------------------------------
// 3. `Json` — the entity's whole serialization, and nothing redacted.
// ---------------------------------------------------------------------------

show("subscription.mirrored — Json", mirrored);

console.log(`
A directive means *the entity's serialization*, so trimming it would make
\`Json\` a lie about what it carries — the root identity stays, and so does the
secret, in the clear. \`toJSON()\` never redacts, because that is the contract
that makes it round-trip. If that is not what you want on a bus, this is the
wrong form to declare.

  root id kept?    ${"id" in (mirrored?.payload as object)}
  secret in clear? ${(mirrored?.payload as { secret: string }).secret === "Sup3r-Secret!"}`);

// ---------------------------------------------------------------------------
// 4. `SafeJson` — the same, redacted, and one-way.
// ---------------------------------------------------------------------------

show("subscription.audited — SafeJson", audited);

console.log(`
\`secret\` is a \`PasswordVO\`, which declares \`sensitive: true\`, so it comes
back as a placeholder. The price is the round trip: a redacted payload does not
hydrate, so there is no \`fromJSON\` on this class to call.

  secret redacted? ${(audited?.payload as { secret: string }).secret !== "Sup3r-Secret!"}`);

// @ts-expect-error — only the shape form gets `fromJSON`: a directive carries a
// whole serialization and the event class does not know which entity raised it,
// so there is nothing static to check an arrival against.
SubscriptionAudited.fromJSON;

// ---------------------------------------------------------------------------
// 5. No declaration — no key at all. A payload is opt-in.
// ---------------------------------------------------------------------------

show("subscription.pinged — nothing declared", pinged);

console.log(`
  has a payload key? ${pinged !== undefined && "payload" in pinged}`);

// ---------------------------------------------------------------------------
// The one constraint a payload shape adds over a reshape target.
// ---------------------------------------------------------------------------

// @ts-expect-error — a reshape target may nest an *anonymous* target, but a
// payload shape may not: that nested object carries no schema, so it could
// never validate on arrival. Name the class instead — which is what validating
// it requires anyway.
defineDomainEvent("subscription.nested", reshapeShape({
	plan: SlugVO,
	subscriber: { name: StringVO },
}));
