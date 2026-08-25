import { StringVO, UrlVO } from "@/domain/collections/value-objects";
import {
    arrayOf,
    blueprint,
    entityOf,
    optionalOf,
    recordOf,
    reshapeShape,
    reshapeTo,
} from "@/way";

const addressProperties = blueprint({
    state: StringVO,
    city: StringVO,
    street: StringVO,
    neighbourhood: StringVO,
    number: StringVO,
}).done();

class Address extends recordOf(addressProperties, "address") {}

const address = Address.demo();

// A target made of classes only — the original form, still valid.
const softAddressProperties = reshapeShape({
    street: StringVO,
    neighbourhood: StringVO,
    number: StringVO,
});

console.log(reshapeTo(softAddressProperties, address));

// ---------------------------------------------------------------------------
// A key may nest a target instead of naming a class, and a nested one adopts
// the source's multiplicity.
// ---------------------------------------------------------------------------

const authorProperties = blueprint({
    name: StringVO,
    bio: StringVO,
    avatar: UrlVO,
}).done();

class Author extends entityOf(authorProperties, "author") {}

const postProperties = blueprint({
    title: StringVO,
    body: StringVO,
    author: Author,
    contributors: arrayOf(Author),
    editor: optionalOf(Author),
    shippedTo: Address,
}).done();

class Post extends entityOf(postProperties, "post") {}

const post = new Post({
    title: "Reshaping aggregates",
    body: "…the whole body…",
    author: { name: "Ada", bio: "Countess", avatar: "https://ada.dev/a.png" },
    contributors: [
        {
            name: "Grace",
            bio: "Rear Admiral",
            avatar: "https://grace.dev/a.png",
        },
        {
            name: "Alan",
            bio: "Mathematician",
            avatar: "https://alan.dev/a.png",
        },
    ],
    shippedTo: address.toJSON(),
});

const nameOnly = reshapeShape({ name: StringVO });

console.log(
    reshapeTo(
        nameOnly,
        new Author({
            avatar: "https://google.com",
            bio: "sdad",
            name: "testing",
        }),
    ),
);

type A = typeof nameOnly;

const postCard = reshapeShape({
    title: StringVO,
    author: nameOnly, // source: Author            -> one object
    contributors: nameOnly, // source: arrayOf(Author)   -> an array
    editor: nameOnly, // source: optionalOf(Author)-> the object or undefined
    shippedTo: reshapeShape({ city: StringVO, state: StringVO }), // a record: no identity
});
