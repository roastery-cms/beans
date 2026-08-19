import {
    BooleanVO,
    SlugVO,
    StringVO,
} from "@/domain/collections/value-objects";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { onCreate, onError } from "@/domain/entity/decorators";
import {
    blueprint,
    defineDomainEvent,
    defineEventHandler,
    defineUseCase,
    entityOf,
    eventedRegistry,
} from "@/way";
import { NodeEventEmitterAdapter } from "@/testing";

const postTagProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    hidden: BooleanVO,
}).with({ hidden: { default: false }, slug: { derive: (ctx) => ctx.name } });

const CreatePostTagEvent = defineDomainEvent("create-post-tag");

@onCreate(CreatePostTagEvent)
class PostTag extends entityOf(postTagProperties, "post-tag") {
    rename(value: string) {
        this.set("name", value);
    }

    reslug(value: string) {
        this.set("slug", value);
    }

    changeVisibility(value: boolean) {
        this.set("hidden", value);
    }
}

// const postTag = new PostTag({ name: "Rock n' Roll" });
// postTag.set(key, value)

// const postTagEvents = postTag.pullDomainEvents();

// console.log({
//     entity: postTag.toJSON(),
//     events: postTagEvents,
//     entityIdIsEqualThanEventAggregateId:
//         postTag.id === postTagEvents[0]?.aggregateId,
// });

const createPostTagProperties = blueprint({ name: StringVO }).done();

class CreatePostTag extends defineUseCase<
    typeof createPostTagProperties,
    {},
    PostTag
>(createPostTagProperties, "create-post-tag") {
    public override async handle(deps: {}): Promise<PostTag> {
        return new PostTag({ name: this.get("name") });
    }
}

const CreatePostTagHandler = defineEventHandler<typeof CreatePostTagEvent>(
    async (event) => {
        console.log(`post tag created: ${event.name}->${event.aggregateId}`);
    },
);

// Node's `emit(name, ...args): boolean` is a different shape entirely from
// `IEventEmitter` (synchronous, positional, never `await`ed), so it needs a
// translation. That translation ships: `NodeEventEmitterAdapter` forwards the
// event as the sole listener argument, keyed by its name, and its `inner`
// emitter is public — which is how you subscribe.
const emitter = new NodeEventEmitterAdapter();

emitter.inner.on("create-post-tag", (event: IDomainEvent) =>
    console.log(`published: ${event.name}`),
);

const postTagRegistry = eventedRegistry(
    { createPostTag: CreatePostTag },
    emitter,
)
    .withDependencies({})
    .on(CreatePostTagEvent, CreatePostTagHandler);

console.log("1");
postTagRegistry.get("createPostTag")({ name: "Alan" });
console.log("3");
