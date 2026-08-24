import {
    BooleanVO,
    DateTimeVO,
    EmailVO,
    PasswordVO,
    PositiveIntegerVO,
    SlugVO,
    StringVO,
    UrlVO,
} from "@/domain/collections/value-objects";
import {
    customEnumVO,
    customNumberVO,
    customObjectVO,
    customRecordVO,
} from "@/domain/collections/value-objects/custom";
import { SchemaVO } from "@/domain/collections/value-objects";
import type {
    RawContextOf,
    RuledBlueprint,
    SetHandlersOf,
} from "@/domain/entity/types";
import {
    blueprint,
    defineDomainEvent,
    defineUseCase,
    entityOf,
    type RepositoryOf,
    commands,
    defineEventHandler,
    transactional,
} from "@/way";
import { ResourceNotFoundException } from "@roastery/terroir/exceptions/application";
import { Source } from "@roastery/terroir/symbols";
import { inMemoryRepositoryOf, inMemoryTransactionOf } from "@/testing";
import { emit } from "@/domain/entity/decorators";
import {
    OptionalBooleanVO,
    OptionalSlugVO,
    OptionalStringVO,
} from "@/domain/collections/value-objects/optional";
import { NodeEventEmitterAdapter } from "@/node";
import type { DomainEvent } from "@/domain";
import type { WithSiblingCommands } from "@/application/command/types";
import type { InputValuesOf } from "@/domain/entity/types/input-values-of.type";
import type { TransactionBoundary } from "@/application/commands/types";

const postTagProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    hidden: BooleanVO,
}).with({ hidden: { default: false }, slug: { derive: (ctx) => ctx.name } });

const PostTagWasRenamedEvent = defineDomainEvent("post-tag-was-renamed");

class PostTag extends entityOf(postTagProperties, "post-tag", {
    unique: ["slug"],
}) {
    @emit(PostTagWasRenamedEvent)
    rename(value: string): void {
        this.set("name", value);
    }

    reslug(value: string): void {
        this.set("slug", value);
    }

    changeVisibility(value: boolean): void {
        this.set("hidden", value);
    }
}

type IPostTagRepository = RepositoryOf<
    typeof PostTag,
    | "findById"
    | "findBySlug"
    | "findMany"
    | "findManyByIds"
    | "count"
    | "create"
    | "update"
>;

const postTagRepository = inMemoryRepositoryOf(PostTag, {
    read: ["findById", "findBySlug", "findMany", "findManyByIds", "count"],
    write: ["create", "update"],
});

// `CreatePostTagUseCase` is `@transactional`; this is what gives the marker
// teeth here — a create that fails leaves no row behind.
const transactionalRunner = inMemoryTransactionOf(postTagRepository);

type PostTagDependencies = {
    postTagRepository: IPostTagRepository;
};

const createPostTagProperties = blueprint({ name: StringVO }).done();

@transactional
class CreatePostTagUseCase extends defineUseCase<
    typeof createPostTagProperties,
    PostTagDependencies,
    PostTag
>(createPostTagProperties, "create-post-tag") {
    protected override async handle(
        deps: PostTagDependencies,
    ): Promise<PostTag> {
        const newPostTag = new PostTag({ name: this.get("name") });
        await deps.postTagRepository.create(newPostTag);
        return newPostTag;
    }
}

const findPostTagBySlugProperties = blueprint({ slug: SlugVO }).done();

class FindPostTagBySlug extends defineUseCase<
    typeof findPostTagBySlugProperties,
    PostTagDependencies,
    PostTag
>(findPostTagBySlugProperties, "find-post-tag-by-slug") {
    protected override async handle(
        deps: PostTagDependencies,
    ): Promise<PostTag> {
        const targetPostTag = await deps.postTagRepository.findBySlug(
            this.get("slug"),
        );

        if (!targetPostTag) throw new ResourceNotFoundException(this[Source]);

        return targetPostTag;
    }
}

const updatePostTagBySlugProperties = blueprint({
    name: OptionalStringVO,
    slug: SlugVO,
    newSlug: OptionalSlugVO,
    hidden: OptionalBooleanVO,
}).done();

type UpdatePostTagDependencies = PostTagDependencies;
type UpdatePostTagSiblings = { findPostTagBySlug: typeof FindPostTagBySlug };

// Se por algum acaso, tiver um onSet para uma propriedade X, e eu usar o set, mas mantendo o valor tradicional, ele vai checar?

class UpdatePostTagBySlug extends defineUseCase<
    typeof updatePostTagBySlugProperties,
    UpdatePostTagDependencies,
    PostTag,
    UpdatePostTagSiblings
>(updatePostTagBySlugProperties, "update-post-tag-by-slug") {
    protected override async handle(
        deps: WithSiblingCommands<
            UpdatePostTagDependencies,
            UpdatePostTagSiblings
        >,
    ): Promise<PostTag> {
        const { result: targetPostTag } = await deps.commands.findPostTagBySlug(
            { slug: this.get("slug") },
        );

        const newSlug = this.get("newSlug");
        const name = this.get("name");
        const hidden = this.get("hidden");

        if (name !== undefined) targetPostTag.rename(name);
        if (newSlug !== undefined) targetPostTag.reslug(newSlug);
        if (hidden !== undefined) targetPostTag.changeVisibility(hidden);

        await deps.postTagRepository.update(targetPostTag);

        return targetPostTag;
    }
}

const PostTagRenameEvent = defineEventHandler<
    typeof PostTagWasRenamedEvent,
    UpdatePostTagDependencies,
    UpdatePostTagSiblings
>(
    async (
        event: DomainEvent,
        deps: WithSiblingCommands<
            UpdatePostTagDependencies,
            UpdatePostTagSiblings
        >,
    ) => {
        console.log(event);
        console.log(deps.commands.findPostTagBySlug);
        console.log("oi");
    },
    "",
);

const registry = commands(
    {
        createPostTag: CreatePostTagUseCase,
        findPostTagBySlug: FindPostTagBySlug,
        updatePostTagBySlug: UpdatePostTagBySlug,
    },
    {
        emitter: new NodeEventEmitterAdapter(),
        transaction: (work) => transactionalRunner.run(work),
    },
).withDependencies({ postTagRepository });
// .on(PostTagWasRenamedEvent, PostTagRenameEvent);

// console.log(
//     await postTagRepository.findMany({
//         page: 1,
//         perPage: 4000,
//         direction: "asc",
//         orderBy: "id",
//     }),
// );
//
await registry.createPostTag({ name: "meme" });

const { result: renamed } = await registry.updatePostTagBySlug({
    slug: "meme",
    name: "meme redux",
});

console.log(renamed.toJSON());

// const postTag = new PostTag({ name: "meme" });
// const postTag2 = new PostTag({ name: "meme" });

// console.log(
//     await postTagRepository.findMany({
//         page: 1,
//         perPage: await postTagRepository.count(),
//         direction: "asc",
//         orderBy: "id",
//     }),
// );

// await postTagRepository.create(postTag);

// console.log(
//     await postTagRepository.findMany({
//         page: 1,
//         perPage: await postTagRepository.count(),
//         direction: "asc",
//         orderBy: "id",
//     }),
// );

// await postTagRepository.create(postTag2);

// console.log(
//     await postTagRepository.findMany({
//         page: 1,
//         perPage: await postTagRepository.count(),
//         direction: "asc",
//         orderBy: "id",
//     }),
// );

// const postTypeProperties = blueprint({
//     name: StringVO,
//     slug: SlugVO,
//     shape: SchemaVO,
//     isHighlighted: BooleanVO,
// }).with({
//     slug: { derive: (ctx) => ctx.name },
//     isHighlighted: { default: false },
// });

// class PostType extends entityOf(postTypeProperties, "post-type") {
//     rename(value: string): void {
//         this.set("name", value);
//     }

//     reslug(value: string): void {
//         this.set("slug", value);
//     }

//     setHighlightTo(value: boolean): void {
//         this.set("isHighlighted", value);
//     }
// }
// // TODO: Criar um arrayOf que vai receber um tipo de entidade, e dá pra deixar compatível com o blueprint.

// const postProperties = blueprint({
//     name: StringVO,
//     slug: SlugVO,
//     description: StringVO,
//     cover: UrlVO,
//     type: PostType,
//     tag: PostTag,
//     content: StringVO,
//     info: customRecordVO(),
// }).with({ slug: { derive: (ctx) => ctx.name } });

// class Post extends entityOf(postProperties, "post") {
//     constructor(context: RawContextOf<typeof postProperties>) {
//         super(context);

//         // TODO: Criar um método abstrato de onUpdate, que vai retornar um objeto de propriedades que quando um desses campos for alterado, ele realiza uma operação de validação.

//         if (!SchemaVO.match(this.type.shape, this.info))
//             throw new InvalidPropertyException("info", this[Source]);
//     }

//     protected onUpdate(
//         key: keyof ContextOf<typeof postProperties>,
//     ): Partial<
//         Record<keyof ContextOf<typeof postProperties>, (value: unknown) => void>
//     > {
//         return {
//             info: (value: unknown) => {
//                 if (!SchemaVO.match(this.type.shape, value))
//                     throw new InvalidPropertyException("info", this[Source]);
//             },
//         };
//     }
// }

// // const postTag = new PostTag({ name: "Rock N' Roll" });
// // const postType = new PostType({
// //     name: "Review",
// //     shape: SchemaManager.serialize(t.Object({ author: t.String() })),
// // });
// // const post = new Post({
// //     cover: "https://github.com/hoyasumii",
// //     content: "Testing 1",
// //     description: "Testing 2",
// //     info: {
// //         author: "Alan Reis",
// //     },
// //     name: "Testing 0",
// //     tag: postTag.toJSON(),
// //     type: postType.toJSON(),
// // });

// // console.log(post);

// // const birthdayProperties = blueprint({
// //     day: customNumberVO({ options: { minimum: 1, maximum: 31 } }),
// //     month: customNumberVO({ options: { minimum: 1, maximum: 12 } }),
// //     year: customNumberVO({
// //         options: { minimum: 0, maximum: new Date().getFullYear() - 18 },
// //     }),
// // }).done();

// // class Birthday extends entityOf(birthdayProperties, "birthday") {}

// // const userProperties = blueprint({
// //     username: StringVO,
// //     slug: StringVO,
// //     name: StringVO,
// //     birthday: Birthday,
// //     email: EmailVO,
// //     password: PasswordVO,
// //     role: customEnumVO(["user", "admin"]),
// // }).with({ role: { default: "user" }, slug: { derive: (ctx) => ctx.username } });
