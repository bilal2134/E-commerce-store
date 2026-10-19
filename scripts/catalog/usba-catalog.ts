/**
 * USBA's real catalogue (owner photos, 2026-10-20), imported by
 * scripts/import-catalog.ts. One entry per product; `photo` is the 1-based
 * position of the file in its folder (sorted by name), `extra` adds further
 * photos of the same item. Names, colours and descriptions were written from
 * the photos only: no materials or claims the photos don't show.
 *
 * Owner rules: prices per folder, shoes in EU 35–42, 10 in stock per shoe
 * size and per other item.
 */
import type { Color } from "../../src/domain/catalog";

export interface CatalogCategory {
  folder: string;
  slug: string;
  pricePkr: number;
  sized: boolean;
}

export interface CatalogItem {
  category: string;
  photo: number;
  extra?: number[];
  name: string;
  colors: Color[];
  description: string;
  /** Homepage featured order (1 = first). */
  featured?: number;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { folder: "Heels 5999", slug: "heels", pricePkr: 5999, sized: true },
  { folder: "Pumps & flats price 2999", slug: "flats", pricePkr: 2999, sized: true },
  { folder: "Sneakers price 5500", slug: "sneakers", pricePkr: 5500, sized: true },
  { folder: "Bags price 2499", slug: "bags", pricePkr: 2499, sized: false },
  { folder: "Tees price 2499", slug: "tees", pricePkr: 2499, sized: false },
  { folder: "Hoodies 3999", slug: "hoodies", pricePkr: 3999, sized: false },
  { folder: "Watches price 1999", slug: "watches", pricePkr: 1999, sized: false },
];

/** Homepage banner: the cherry patent Mary Janes (matches the brand colour). */
export const BANNER = { category: "heels", photo: 4, alt: "Cherry patent Mary Jane slingbacks" };

/** Curated Instagram grid on the homepage (links to the profile). */
export const INSTAGRAM_PICKS: { category: string; photo: number; alt: string }[] = [
  { category: "hoodies", photo: 12, alt: "Red spider half-zip hoodie" },
  { category: "bags", photo: 9, alt: "White polka dot hobo bag" },
  { category: "watches", photo: 11, alt: "Gold watch with a leopard strap" },
  { category: "sneakers", photo: 1, alt: "Leopard panel retro sneakers" },
  { category: "tees", photo: 16, alt: "Starry Night art tee" },
  { category: "flats", photo: 27, alt: "Blue hibiscus slides" },
];

const H = "heels";
const F = "flats";
const S = "sneakers";
const B = "bags";
const T = "tees";
const D = "hoodies";
const W = "watches";

export const CATALOG: CatalogItem[] = [
  /* Heels */
  {
    category: H,
    photo: 1,
    name: "Chocolate Cap-Toe Mary Jane Slingbacks",
    colors: ["brown"],
    description:
      "Square-toe slingbacks with a glossy cap toe, a Mary Jane strap with a round gold button and a low block heel.",
  },
  {
    category: H,
    photo: 2,
    name: "Wine Velvet Cap-Toe Mary Janes",
    colors: ["red"],
    description:
      "Wine-red Mary Jane slingbacks: a soft velvet-look upper, a patent cap toe, a gold button strap and a low block heel.",
  },
  {
    category: H,
    photo: 3,
    name: "Black Cap-Toe Mary Jane Slingbacks",
    colors: ["black"],
    description:
      "Black square-toe slingbacks with a patent cap toe, a thin Mary Jane strap with a gold button and a low block heel.",
  },
  {
    category: H,
    photo: 4,
    name: "Cherry Patent Mary Jane Slingbacks",
    colors: ["red"],
    description:
      "High-shine cherry slingbacks with a square toe, a buckled Mary Jane strap and a low block heel.",
    featured: 1,
  },
  {
    category: H,
    photo: 5,
    name: "Cognac Croc-Effect Stiletto Slingbacks",
    colors: ["brown"],
    description:
      "Pointed slingbacks in a cognac croc-effect finish, with a gold buckle detail and a slim stiletto heel.",
  },
  {
    category: H,
    photo: 7,
    name: "Ivory Cap-Toe Block-Heel Slingbacks",
    colors: ["cream", "white"],
    description:
      "Ivory square-toe slingbacks with a patent cap toe, a gold button strap and a low block heel.",
  },
  {
    category: H,
    photo: 8,
    name: "Wine Patent Double-Strap Block Heels",
    colors: ["red"],
    description: "Pointed patent heels in deep wine with two buckled straps and a tall flared block heel.",
  },
  {
    category: H,
    photo: 9,
    name: "Nude Patent Pointed Slingbacks",
    colors: ["cream"],
    description: "Pointed nude slingbacks with a gold bar on the strap and a sculpted block heel.",
  },
  {
    category: H,
    photo: 10,
    name: "Rose Nude Square-Toe Slingbacks",
    colors: ["pink"],
    description: "Soft rose patent slingbacks with a square toe, a crossed strap and a low block heel.",
  },
  {
    category: H,
    photo: 11,
    name: "Chocolate Patent Kitten-Heel Slingbacks",
    colors: ["brown", "gold"],
    description:
      "Pointed chocolate patent slingbacks with a slim gold bar across the toe and a curved kitten heel.",
  },
  {
    category: H,
    photo: 12,
    name: "Black and White Two-Tone Mary Janes",
    colors: ["black", "white"],
    description:
      "Two-tone Mary Janes: white with a black cap toe, a gold button strap and a black block heel.",
  },
  {
    category: H,
    photo: 13,
    name: "Burgundy Pointed Block-Heel Slingbacks",
    colors: ["red"],
    description: "Pointed burgundy slingbacks with a gold-trimmed strap and a flared block heel.",
  },
  {
    category: H,
    photo: 14,
    name: "Gold Crystal Mesh Stilettos",
    colors: ["gold"],
    description: "Pointed mesh stilettos scattered with crystals, with a metallic gold ankle strap and heel.",
  },

  /* Flats & sandals */
  {
    category: F,
    photo: 1,
    name: "Camel Mesh Mary Jane Flats",
    colors: ["brown"],
    description: "Square-toe mesh flats in camel with a soft Mary Jane strap.",
  },
  {
    category: F,
    photo: 2,
    name: "Mocha Lace Bow Ballet Flats",
    colors: ["brown"],
    description: "Mocha lace ballet flats with a small bow at the toe.",
  },
  {
    category: F,
    photo: 3,
    name: "Black Lace Bow Ballet Flats",
    colors: ["black"],
    description: "Sheer black lace ballet flats with a bow at the toe and a cushioned insole.",
  },
  {
    category: F,
    photo: 4,
    name: "White Fishnet Mary Jane Flats",
    colors: ["white"],
    description: "White fishnet flats with a square toe and an elastic Mary Jane strap.",
  },
  {
    category: F,
    photo: 5,
    name: "Black Sequin Mesh Mary Jane Flats",
    colors: ["black"],
    description: "Black mesh Mary Janes with tiny sequins and an elastic strap.",
  },
  {
    category: F,
    photo: 6,
    name: "White Lace Mary Jane Flats",
    colors: ["white"],
    description: "White lace flats with a square toe and a satin-look Mary Jane strap.",
  },
  {
    category: F,
    photo: 7,
    name: "Sunshine Yellow H-Strap Slides",
    colors: ["yellow"],
    description: "Bright yellow flat slides with a cut-out H strap and a square toe.",
  },
  {
    category: F,
    photo: 8,
    name: "Wine H-Strap Slides",
    colors: ["red"],
    description: "Wine-red flat slides with a cut-out H strap and a square toe.",
  },
  {
    category: F,
    photo: 9,
    name: "Lilac H-Strap Slides",
    colors: ["purple"],
    description: "Glossy lilac flat slides with a cut-out H strap and a square toe.",
  },
  {
    category: F,
    photo: 10,
    name: "Cobalt H-Strap Slides",
    colors: ["blue"],
    description: "Cobalt blue flat slides with a cut-out H strap and a square toe.",
  },
  {
    category: F,
    photo: 11,
    name: "Python-Print Slides",
    colors: ["cream", "black"],
    description: "Flat slides with one wide python-print band and a square toe.",
  },
  {
    category: F,
    photo: 12,
    name: "Wine Strappy Toe-Loop Slides",
    colors: ["red"],
    description: "Wine flat slides with crossed thin straps and a toe loop.",
  },
  {
    category: F,
    photo: 13,
    name: "White Lace-Up Gladiator Sandals",
    colors: ["white"],
    description: "Flat white sandals with thin straps that wrap and tie up the leg.",
  },
  {
    category: F,
    photo: 14,
    name: "Mocha Woven Slides",
    colors: ["brown"],
    description: "Mocha flat slides with a woven cross-over strap and a square toe.",
  },
  {
    category: F,
    photo: 15,
    name: "Black Polka Dot Mesh Mary Janes",
    colors: ["black"],
    description: "Black polka dot mesh flats with a buckled Mary Jane strap.",
  },
  {
    category: F,
    photo: 16,
    name: "White Fishnet Strap Flats",
    colors: ["white"],
    description: "White fishnet flats with an elastic strap and a rounded toe.",
  },
  {
    category: F,
    photo: 17,
    name: "Nude Butterfly Toe-Post Sandals",
    colors: ["cream"],
    description: "Nude flat sandals with a thin toe post and a pearly butterfly at the front.",
  },
  {
    category: F,
    photo: 18,
    name: "Black Medallion Cut-Out Sandals",
    colors: ["black"],
    description: "Black flat thong sandals with a round cut-out medallion strap.",
  },
  {
    category: F,
    photo: 19,
    name: "Blush Patent H-Strap Slides",
    colors: ["pink"],
    description: "Glossy blush-pink flat slides with a cut-out H strap and a square toe.",
  },
  {
    category: F,
    photo: 20,
    name: "Cream Strappy Toe-Loop Slides",
    colors: ["cream"],
    description: "Cream flat slides with crossed thin straps and a toe loop.",
  },
  {
    category: F,
    photo: 21,
    name: "Black Knotted Strappy Slides",
    colors: ["black"],
    description: "Black flat slides with thin knotted straps and a square toe.",
  },
  {
    category: F,
    photo: 22,
    name: "Sage Thong Sandals",
    colors: ["green"],
    description: "Minimal sage-green flat thong sandals with a slim sole.",
  },
  {
    category: F,
    photo: 23,
    name: "Lime Lace-Up Gladiator Sandals",
    colors: ["green"],
    description: "Lime-green flat sandals with thin straps that wrap and tie up the leg.",
  },
  {
    category: F,
    photo: 24,
    name: "Sage Orchid Flip-Flops",
    colors: ["green", "white"],
    description: "Sage-green flip-flops topped with a white orchid flower.",
  },
  {
    category: F,
    photo: 25,
    name: "Pink Blossom Flip-Flops",
    colors: ["pink"],
    description: "Pink flip-flops with small blossoms along the straps.",
  },
  {
    category: F,
    photo: 26,
    name: "Champagne Knotted Toe-Loop Slides",
    colors: ["gold", "cream"],
    description: "Champagne flat slides with knotted thin straps and a toe loop.",
  },
  {
    category: F,
    photo: 27,
    name: "Blue Hibiscus Slides",
    colors: ["blue"],
    description: "Sky-blue flat slides topped with a large hibiscus flower.",
    featured: 7,
  },
  {
    category: F,
    photo: 28,
    name: "Sky Blue Knotted Toe-Loop Slides",
    colors: ["blue"],
    description: "Sky-blue flat slides with knotted thin straps and a toe loop.",
  },

  /* Sneakers */
  {
    category: S,
    photo: 1,
    name: "Leopard Panel Retro Sneakers",
    colors: ["cream", "brown"],
    description: "Cream retro low-tops with leopard-print side panels, white laces and a gum sole.",
  },
  {
    category: S,
    photo: 2,
    name: "Grey and Black Stripe Retro Sneakers",
    colors: ["cream", "black"],
    description: "Cream and grey retro low-tops with black side stripes and a gum sole.",
  },
  {
    category: S,
    photo: 3,
    name: "Chocolate and Pink Retro Sneakers",
    colors: ["brown", "pink"],
    description: "Chocolate suede-look low-tops with a pink side stripe and pink laces.",
    featured: 3,
  },
  {
    category: S,
    photo: 4,
    name: "Pink Bow Retro Sneakers",
    colors: ["pink", "white"],
    description: "Pink and white low-tops with a white side stripe and a little bow at the heel.",
  },
  {
    category: S,
    photo: 5,
    name: "Pink Double-Strap Mary Jane Sneakers",
    colors: ["pink"],
    description: "Pink Mary Jane sneakers with two buckled straps and a gum sole.",
  },
  {
    category: S,
    photo: 6,
    name: "Black and White Retro Sneakers",
    colors: ["black", "white"],
    description: "Black suede-look low-tops with a white side stripe and black laces.",
  },

  /* Bags */
  {
    category: B,
    photo: 1,
    name: "Navy Flap Mini Tote",
    colors: ["blue", "brown"],
    description: "Navy mini tote with a brown flap, top handle and a detachable crossbody strap.",
  },
  {
    category: B,
    photo: 2,
    name: "Cream Flap Mini Tote",
    colors: ["cream", "brown"],
    description: "Cream mini tote with a brown flap, top handle and a detachable crossbody strap.",
  },
  {
    category: B,
    photo: 3,
    name: "Powder Blue Quilted Vanity Bag",
    colors: ["blue"],
    description: "Quilted powder-blue vanity bag with a printed scarf on the handle and a chain strap.",
    featured: 2,
  },
  {
    category: B,
    photo: 4,
    name: "Blush Flap Mini Crossbody",
    colors: ["pink", "brown"],
    description: "Blush mini bag with a brown flap, two top handles and a crossbody strap.",
  },
  {
    category: B,
    photo: 5,
    name: "Black Flap Mini Tote",
    colors: ["black", "brown"],
    description: "Black mini tote with a brown flap, top handle and a detachable crossbody strap.",
  },
  {
    category: B,
    photo: 6,
    name: "Denim Mini Bag with Bear Charm",
    colors: ["blue", "brown"],
    description: "Denim mini bag with tan handles, a crossbody strap and a fluffy bear charm.",
  },
  {
    category: B,
    photo: 7,
    name: "Black Polka Dot Shoulder Bag",
    colors: ["black", "white"],
    description: "Soft black polka dot shoulder bag with an adjustable strap.",
  },
  {
    category: B,
    photo: 8,
    name: "Chocolate Patent Mini Crossbody",
    colors: ["brown", "gold"],
    description: "Glossy chocolate mini crossbody with a gold twist clasp and a thin strap.",
  },
  {
    category: B,
    photo: 9,
    name: "White Polka Dot Hobo Bag",
    colors: ["white", "black"],
    description: "Slouchy white polka dot hobo bag with a shoulder strap.",
  },
  {
    category: B,
    photo: 10,
    name: "Black Polka Dot Bow Baguette",
    colors: ["black", "white"],
    description: "Black polka dot baguette bag with a lace bow and ribbon ties.",
  },
  {
    category: B,
    photo: 11,
    name: "Black Fringe Studded Crossbody",
    colors: ["black"],
    description: "Black crossbody bag with long fringe and a studded top band.",
  },
  {
    category: B,
    photo: 12,
    name: "White Polka Dot Baguette",
    colors: ["white", "black", "gold"],
    description: "Structured white polka dot baguette with a gold twist clasp and a shoulder strap.",
    featured: 8,
  },
  {
    category: B,
    photo: 13,
    name: "Brown Woven Hobo Bag",
    colors: ["brown"],
    description: "Slouchy brown hobo bag with a woven texture.",
  },
  {
    category: B,
    photo: 14,
    name: "Black Studded Hobo Bag",
    colors: ["black", "silver"],
    description: "Black hobo bag dotted with silver studs.",
  },
  {
    category: B,
    photo: 15,
    name: "Black Woven Slouch Bag",
    colors: ["black"],
    description: "Roomy black slouch bag with a woven texture.",
  },
  {
    category: B,
    photo: 16,
    name: "Burgundy Slouch Hobo Bag",
    colors: ["red", "brown"],
    description: "Smooth burgundy hobo bag with a wide shoulder strap.",
  },
  {
    category: B,
    photo: 17,
    name: "Brown Charm Tote",
    colors: ["brown"],
    description: "Brown shoulder tote with long handles and a charm on the side.",
  },
  {
    category: B,
    photo: 18,
    name: "Chocolate Crescent Shoulder Bag",
    colors: ["brown"],
    description: "Chocolate crescent-shaped shoulder bag with a short strap.",
  },

  /* Tees */
  {
    category: T,
    photo: 1,
    name: "Cream Star 23 Jersey Tee",
    colors: ["cream", "red"],
    description: "Oversized cream jersey-style tee with a red 23, stars and striped sleeves.",
  },
  {
    category: T,
    photo: 2,
    extra: [19],
    name: "Vintage Car Raglan Tee",
    colors: ["black", "white"],
    description: "Grey raglan tee with black sleeves and a vintage car graphic.",
  },
  {
    category: T,
    photo: 3,
    name: "King 66 Jersey Tee",
    colors: ["white", "red"],
    description: "Oversized white jersey-style tee with a burgundy 66 and striped sleeves.",
  },
  {
    category: T,
    photo: 4,
    name: "Black V-Neck Star Logo Tee",
    colors: ["black", "pink"],
    description: "Black oversized V-neck tee with pink script lettering and pink trim.",
  },
  {
    category: T,
    photo: 5,
    name: "Mocha Collegiate Raglan Tee",
    colors: ["brown"],
    description: "Mocha raglan tee with darker sleeves and a collegiate print.",
  },
  {
    category: T,
    photo: 6,
    name: "Striped Bow Tee",
    colors: ["brown", "white"],
    description: "Brown and white striped tee with a small bow on the chest.",
  },
  {
    category: T,
    photo: 8,
    name: "Olive Wow Wow Cat Raglan Tee",
    colors: ["green", "black"],
    description: "Olive raglan tee with black sleeves and a black cat graphic.",
  },
  {
    category: T,
    photo: 10,
    name: "Sleepy Panda Raglan Tee",
    colors: ["cream", "brown"],
    description: "Cream raglan tee with brown sleeves and a small sleepy panda print.",
  },
  {
    category: T,
    photo: 12,
    name: "Sushi Cat Tee",
    colors: ["brown"],
    description: "Brown oversized tee with a black cat and sushi print and paw prints on the sleeves.",
  },
  {
    category: T,
    photo: 14,
    name: "Plum Striped Oversized Tee",
    colors: ["purple", "white"],
    description: "Oversized plum tee with thin white stripes.",
  },
  {
    category: T,
    photo: 15,
    extra: [18],
    name: "Simple Joy Orchid Tee",
    colors: ["cream", "pink"],
    description: "Cream oversized tee with a large pink orchid print and script lettering.",
    featured: 5,
  },
  {
    category: T,
    photo: 16,
    name: "Starry Night Art Tee",
    colors: ["cream", "blue"],
    description: "Cream tee with a Starry Night art print on the back.",
  },
  {
    category: T,
    photo: 17,
    name: "Pink V-Neck Star Logo Tee",
    colors: ["pink", "black"],
    description: "Pink oversized V-neck tee with black script lettering and black trim.",
  },
  {
    category: T,
    photo: 20,
    name: "Leopard Raglan Tee",
    colors: ["brown", "black"],
    description: "Leopard-print raglan tee with black sleeves.",
  },
  {
    category: T,
    photo: 21,
    name: "Navy 23 Varsity Tee",
    colors: ["cream", "blue"],
    description: "Cream varsity tee with a navy 23 and striped sleeves.",
  },
  {
    category: T,
    photo: 22,
    name: "Kitten Print Oversized Tee",
    colors: ["cream"],
    description: "Cream oversized tee with a large kitten print.",
  },
  {
    category: T,
    photo: 23,
    name: "Black Pink Lily Tee",
    colors: ["black", "pink"],
    description: "Black oversized tee with a pink lily print.",
  },
  {
    category: T,
    photo: 24,
    name: "Phone Doodle Raglan Tee",
    colors: ["white", "green", "multicolor"],
    description: "White raglan tee with striped and star sleeves and a doodle graphic.",
  },
  {
    category: T,
    photo: 25,
    name: "Black Leopard Graphic Tee",
    colors: ["black", "gold"],
    description: "Black oversized tee with a large leopard graphic.",
  },
  {
    category: T,
    photo: 26,
    name: "I Hate People Cat Tee",
    colors: ["black"],
    description: "Washed charcoal tee with a cat mugshot graphic.",
  },
  {
    category: T,
    photo: 27,
    name: "Purple Tenma Dream Tee",
    colors: ["purple"],
    description: "Purple tee with cream script lettering and piping.",
  },
  {
    category: T,
    photo: 28,
    name: "Matcha Latte Tee",
    colors: ["green"],
    description: "Matcha-green tee with a matcha latte graphic.",
  },
  {
    category: T,
    photo: 29,
    name: "Courageous 24 Mesh Jersey",
    colors: ["white", "blue"],
    description: "Oversized white mesh jersey with a navy 24 and stars.",
  },

  /* Hoodies */
  {
    category: D,
    photo: 1,
    name: "White Spider Web Zip Hoodie",
    colors: ["white", "red", "black"],
    description: "Cropped white zip hoodie with a black spider and red web on the back.",
    featured: 4,
  },
  {
    category: D,
    photo: 2,
    name: "Black Spider Half-Zip Hoodie",
    colors: ["black", "white"],
    description: "Black half-zip hoodie with a white spider on the chest and back.",
  },
  {
    category: D,
    photo: 3,
    name: "Wine Spider Web Zip Hoodie",
    colors: ["red"],
    description: "Cropped wine zip hoodie with a spider and web graphic on the back.",
  },
  {
    category: D,
    photo: 4,
    name: "Black Silver Wings Half-Zip",
    colors: ["black", "silver"],
    description: "Black half-zip sweatshirt with a silver gothic wings graphic.",
  },
  {
    category: D,
    photo: 5,
    name: "Black Gothic Wings Zip Hoodie",
    colors: ["black"],
    description: "Fitted black zip hoodie with a gothic wings graphic on the back.",
  },
  {
    category: D,
    photo: 6,
    name: "Black Thorn Wings Half-Zip",
    colors: ["black"],
    description: "Black half-zip sweatshirt with a grey thorn wings graphic.",
  },
  {
    category: D,
    photo: 7,
    name: "Olive Princess 23 Half-Zip",
    colors: ["green", "white"],
    description: "Olive half-zip sweatshirt with a white 23 and a crest.",
  },
  {
    category: D,
    photo: 8,
    name: "Brown Vintage Car Half-Zip",
    colors: ["brown"],
    description: "Brown half-zip sweatshirt with a vintage car graphic.",
  },
  {
    category: D,
    photo: 9,
    name: "Wine Vintage Car Half-Zip",
    colors: ["red"],
    description: "Wine half-zip sweatshirt with a vintage car graphic and sleeve details.",
  },
  {
    category: D,
    photo: 10,
    name: "Wine Spider Half-Zip",
    colors: ["red", "white"],
    description: "Wine half-zip sweatshirt with a white spider and web graphic.",
  },
  {
    category: D,
    photo: 11,
    name: "California Varsity Half-Zip",
    colors: ["cream", "black", "red"],
    description: "Cream and black varsity half-zip with California lettering and a red 23.",
  },
  {
    category: D,
    photo: 12,
    name: "Red Spider Half-Zip Hoodie",
    colors: ["red", "white"],
    description: "Red half-zip hoodie with a white spider on the chest and back.",
  },

  /* Watches */
  {
    category: W,
    photo: 1,
    name: "Silver Square Watch with Pink Dial",
    colors: ["silver", "pink"],
    description: "Silver link-bracelet watch with a square case and a soft pink dial.",
  },
  {
    category: W,
    photo: 2,
    name: "Gold Oval Watch with Garnet Dial",
    colors: ["gold", "red"],
    description: "Gold oval watch with a garnet-red dial on a stretch bracelet.",
  },
  {
    category: W,
    photo: 3,
    name: "Gold Serpent Watch",
    colors: ["gold", "white"],
    description: "Gold watch with a rounded triangle case, white dial and Roman numerals.",
  },
  {
    category: W,
    photo: 4,
    name: "Gold Roman Oval Watch with Burgundy Dial",
    colors: ["gold", "red"],
    description: "Gold oval watch with a burgundy sunray dial and Roman numerals.",
  },
  {
    category: W,
    photo: 5,
    name: "Gold Watch with Emerald Dial",
    colors: ["gold", "green"],
    description: "Gold watch with an emerald-green dial on a stretch bracelet.",
  },
  {
    category: W,
    photo: 6,
    name: "Gold Pebble Bracelet Watch",
    colors: ["gold"],
    description: "Petite gold watch on a bracelet of polished gold pebbles.",
  },
  {
    category: W,
    photo: 7,
    name: "Gold Octagon Watch with Ruby Dial",
    colors: ["gold", "red"],
    description: "Gold watch with an octagonal case and a ruby-red dial.",
    featured: 6,
  },
  {
    category: W,
    photo: 8,
    name: "Gold Oval Champagne Watch",
    colors: ["gold"],
    description: "Gold oval watch with a champagne dial on a stretch bracelet.",
  },
  {
    category: W,
    photo: 9,
    name: "Silver Bangle Watch with Roman Dial",
    colors: ["silver", "white"],
    description: "Silver bangle watch with an oval case, white dial and Roman numerals.",
  },
  {
    category: W,
    photo: 10,
    name: "Silver Tank Watch",
    colors: ["silver"],
    description: "Silver watch with a rectangular case and a link bracelet.",
  },
  {
    category: W,
    photo: 11,
    name: "Gold Leopard Strap Watch",
    colors: ["gold", "red", "brown"],
    description: "Gold watch with a red dial, Roman numerals and a leopard-print strap.",
  },
  {
    category: W,
    photo: 12,
    name: "Gold Chain Watch with Plum Dial",
    colors: ["gold", "red"],
    description: "Petite gold watch with a plum dial on a chain bracelet.",
  },
  {
    category: W,
    photo: 13,
    name: "Two-Tone Square Watch with Wine Dial",
    colors: ["silver", "gold", "red"],
    description: "Square two-tone watch with a wine dial on a link bracelet.",
  },
  {
    category: W,
    photo: 14,
    name: "Silver Crystal Watch with Pink Dial",
    colors: ["silver", "pink"],
    description: "Silver oval watch with a crystal bezel and a pink dial.",
  },
  {
    category: W,
    photo: 15,
    name: "Silver Fluted Square Watch",
    colors: ["silver"],
    description: "Silver square watch with a fluted bezel and a link bracelet.",
  },
  {
    category: W,
    photo: 16,
    name: "Silver Crystal Oval Watch",
    colors: ["silver"],
    description: "Silver oval watch with a crystal bezel on a wave-link bracelet.",
  },
  {
    category: W,
    photo: 17,
    name: "Gold Cushion Watch",
    colors: ["gold"],
    description: "Gold watch with a cushion-shaped case and a stretch bracelet.",
  },
  {
    category: W,
    photo: 18,
    name: "Silver Retro Cuff Watch",
    colors: ["silver"],
    description: "Chunky silver retro watch with an oval dial on a stretch bracelet.",
  },
  {
    category: W,
    photo: 19,
    name: "Silver Rectangle Link Watch",
    colors: ["silver"],
    description: "Slim silver rectangular watch on a chunky link bracelet.",
  },
  {
    category: W,
    photo: 20,
    name: "Gold Round Roman Watch",
    colors: ["gold", "white"],
    description: "Gold round watch with a white dial and Roman numerals.",
  },
  {
    category: W,
    photo: 21,
    name: "Silver Pebble Watch with Brown Dial",
    colors: ["silver", "brown"],
    description: "Silver watch with a brown dial on a polished pebble bracelet.",
  },
  {
    category: W,
    photo: 22,
    name: "Gold Rectangle Watch with Brown Dial",
    colors: ["gold", "brown"],
    description: "Bold gold rectangular watch with an oval brown dial.",
  },
  {
    category: W,
    photo: 23,
    name: "Two-Tone Crystal Oval Watch",
    colors: ["silver", "gold"],
    description: "Two-tone oval watch with a crystal bezel on a link bracelet.",
  },
  {
    category: W,
    photo: 24,
    name: "Gold Statement Watch with Brown Strap",
    colors: ["gold", "brown"],
    description: "Sculpted gold statement watch on a brown strap.",
  },
];
