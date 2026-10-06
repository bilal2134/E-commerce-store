/**
 * DEVELOPMENT / TEST SAMPLE DATA — NOT REAL CATALOGUE CONTENT.
 *
 * Category structure follows Requirements §11.1. Product names are taken
 * from the "L3 Examples" column; prices, colours, stock states and
 * descriptions are invented placeholders so every storefront state (sale,
 * preorder, out of stock, collab, badges, sizes) can be exercised. The owner
 * replaces all of this through the admin panel before launch.
 */
import type { Badge, Color, StockStatus } from "../src/domain/catalog";

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  children: { slug: string; name: string; description: string }[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    slug: "footwear",
    name: "Footwear",
    description: "Heels, sneakers, flats, sandals and boots.",
    children: [
      { slug: "heels", name: "Heels & Pumps", description: "Statement heels and pumps." },
      { slug: "sneakers", name: "Sneakers", description: "Everyday sneakers with a playful twist." },
      { slug: "flats", name: "Flats & Sandals", description: "Mary Janes, flats and sandals." },
      { slug: "boots", name: "Boots", description: "Block-heel boots." },
    ],
  },
  {
    slug: "bags",
    name: "Bags & Clutches",
    description: "Mini bags, clutches, shoulder bags and wallets.",
    children: [
      { slug: "clutches", name: "Mini Bags & Clutches", description: "Mini bags and evening clutches." },
      { slug: "shoulder-bags", name: "Shoulder Bags", description: "Structured and soft shoulder bags." },
      { slug: "wallets", name: "Wallets", description: "Wallets and card holders." },
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Phone cases, jewellery, bag charms and watches.",
    children: [
      { slug: "phone-cases", name: "Phone Cases", description: "Phone cases and matching sets." },
      { slug: "jewellery", name: "Jewellery", description: "Necklaces, bracelets, rings and ear cuffs." },
      { slug: "bag-charms", name: "Bag Charms & Keychains", description: "Charms and keychains." },
      { slug: "watches", name: "Watches", description: "Watches." },
    ],
  },
  {
    slug: "clothing",
    name: "Clothing",
    description: "Tops, jackets and coats, dresses and sets.",
    children: [
      { slug: "tops", name: "Tops", description: "Tops, vests and polos." },
      {
        slug: "jackets",
        name: "Jackets & Coats",
        description: "Fur jackets, varsity jackets and tracksuits.",
      },
      { slug: "dresses", name: "Dresses & Sets", description: "Dresses, maxis, sets and pyjamas." },
    ],
  },
];

export interface SeedProduct {
  name: string;
  category: string;
  price: number;
  sale?: number;
  stock?: StockStatus;
  badge?: Badge;
  collab?: boolean;
  colors: Color[];
  featured?: number;
  hidden?: boolean;
  /** Sizes that are sold out (footwear only). */
  soldOutSizes?: string[];
  /** Sample counts: per size for footwear (default SEED_STOCK_PER_SIZE), else one count (default SEED_STOCK). */
  stockCounts?: Partial<Record<string, number>>;
  stockCount?: number;
  description?: string;
  /** Days before seeding the product was "created" (for Newest ordering). */
  ageDays: number;
}

/** Sample stock counts (preorder items aren't counted). */
export const SEED_STOCK_PER_SIZE = 6;
export const SEED_STOCK = 12;

export const SEED_PRODUCTS: SeedProduct[] = [
  // Heels & Pumps
  {
    name: "Cherry Red Trendy Heels",
    category: "heels",
    price: 2499,
    sale: 1999,
    stockCounts: { "37": 2, "38": 3 },
    badge: "new_arrival",
    colors: ["red"],
    featured: 1,
    description:
      "Patent cherry red heels with a buckle strap. A glossy finish that works from day to evening.",
    ageDays: 2,
  },
  {
    name: "Diva Heels",
    category: "heels",
    price: 2799,
    badge: "bestseller",
    colors: ["black"],
    featured: 3,
    ageDays: 20,
  },
  {
    name: "Silver Butterfly Heels",
    category: "heels",
    price: 2999,
    badge: "trending",
    colors: ["silver"],
    featured: 5,
    ageDays: 6,
  },
  {
    name: "Purple Satin Heels",
    category: "heels",
    price: 2599,
    stock: "preorder",
    colors: ["purple"],
    ageDays: 1,
  },
  {
    name: "Blush Bow Pumps",
    category: "heels",
    price: 2299,
    colors: ["pink"],
    soldOutSizes: ["36", "41"],
    ageDays: 30,
  },
  {
    name: "Leopard Heels",
    category: "heels",
    price: 2899,
    collab: true,
    badge: "collab",
    colors: ["brown", "cream"],
    featured: 2,
    ageDays: 4,
  },
  {
    name: "Rhinestone Heels",
    category: "heels",
    price: 3299,
    collab: true,
    badge: "collab",
    colors: ["silver"],
    ageDays: 9,
  },

  // Sneakers
  {
    name: "Blue Star Sneakers",
    category: "sneakers",
    price: 2199,
    badge: "bestseller",
    colors: ["blue", "white"],
    featured: 4,
    ageDays: 40,
  },
  {
    name: "Cherry Red Sneakers",
    category: "sneakers",
    price: 2199,
    sale: 1799,
    colors: ["red", "white"],
    ageDays: 25,
  },
  { name: "Brown Sneakers", category: "sneakers", price: 1999, colors: ["brown"], ageDays: 35 },
  {
    name: "Pink Bow Sneakers",
    category: "sneakers",
    price: 2299,
    badge: "new_arrival",
    colors: ["pink", "white"],
    ageDays: 3,
  },
  {
    name: "Black & Pink Sneakers",
    category: "sneakers",
    price: 2299,
    stock: "out_of_stock",
    colors: ["black", "pink"],
    ageDays: 50,
  },

  // Flats & Sandals
  {
    name: "Mary Jane Flats",
    category: "flats",
    price: 1799,
    badge: "trending",
    colors: ["black"],
    ageDays: 12,
  },
  { name: "Pink Floral Sandals", category: "flats", price: 1699, sale: 1399, colors: ["pink"], ageDays: 28 },
  { name: "Black Sparkle Flats", category: "flats", price: 1899, colors: ["black", "silver"], ageDays: 16 },
  { name: "Fairy Heels", category: "flats", price: 2099, colors: ["pink", "gold"], ageDays: 8 },
  {
    name: "Pink Collab Sandals",
    category: "flats",
    price: 1999,
    collab: true,
    badge: "collab",
    colors: ["pink"],
    ageDays: 5,
  },

  // Boots
  { name: "White Block Heel Boots", category: "boots", price: 3499, colors: ["white"], ageDays: 60 },

  // Mini bags & clutches
  {
    name: "Golden Shell Clutch",
    stockCount: 3,
    category: "clutches",
    price: 2499,
    badge: "bestseller",
    colors: ["gold"],
    featured: 6,
    ageDays: 22,
  },
  { name: "Butterfly Rhinestone Bag", category: "clutches", price: 2799, colors: ["silver"], ageDays: 14 },
  {
    name: "Silver Metallic Mini Bag",
    category: "clutches",
    price: 2299,
    sale: 1899,
    colors: ["silver"],
    ageDays: 33,
  },
  {
    name: "Butterfly Collab Bag",
    category: "clutches",
    price: 2699,
    collab: true,
    badge: "collab",
    colors: ["purple", "silver"],
    ageDays: 7,
  },
  {
    name: "Gold Collab Bag",
    category: "clutches",
    price: 2599,
    collab: true,
    badge: "collab",
    colors: ["gold"],
    ageDays: 10,
  },
  {
    name: "Rhinestone Clutch",
    category: "clutches",
    price: 2899,
    collab: true,
    badge: "collab",
    stock: "preorder",
    colors: ["silver"],
    ageDays: 2,
  },

  // Shoulder bags
  {
    name: "Brown Leather Shoulder Bag",
    category: "shoulder-bags",
    price: 2999,
    colors: ["brown"],
    ageDays: 45,
  },
  {
    name: "Red Structured Bag",
    category: "shoulder-bags",
    price: 2799,
    badge: "trending",
    colors: ["red"],
    ageDays: 11,
  },
  { name: "Pink Mini Shoulder Bag", category: "shoulder-bags", price: 2199, colors: ["pink"], ageDays: 19 },

  // Wallets
  {
    name: "Cherry Kiss Wallet",
    category: "wallets",
    price: 1499,
    badge: "bestseller",
    colors: ["red"],
    ageDays: 38,
  },
  { name: "Ruby Flame Wallet", category: "wallets", price: 1599, colors: ["red"], ageDays: 26 },
  {
    name: "Purple Wallet Set",
    category: "wallets",
    price: 1799,
    sale: 1499,
    colors: ["purple"],
    ageDays: 31,
  },
  {
    name: "Strawberry Wallet",
    category: "wallets",
    price: 1499,
    stock: "out_of_stock",
    colors: ["pink", "red"],
    ageDays: 55,
  },

  // Phone cases
  {
    name: "Cherry Phone Case Set",
    category: "phone-cases",
    price: 1499,
    badge: "collab",
    collab: true,
    colors: ["red", "pink"],
    ageDays: 13,
  },
  { name: "Butterfly Phone Case", category: "phone-cases", price: 1299, colors: ["purple"], ageDays: 21 },
  {
    name: "Powerpuff Phone Case",
    category: "phone-cases",
    price: 1399,
    badge: "trending",
    colors: ["pink", "multicolor"],
    ageDays: 9,
  },
  {
    name: "Floral Clear Phone Case",
    category: "phone-cases",
    price: 1199,
    colors: ["multicolor"],
    ageDays: 42,
  },

  // Jewellery
  {
    name: "Pearl Drop Necklace",
    category: "jewellery",
    price: 1599,
    badge: "buy_2_get_1",
    colors: ["gold", "cream"],
    ageDays: 17,
  },
  {
    name: "Charm Bracelet",
    category: "jewellery",
    price: 1299,
    badge: "buy_2_get_1",
    colors: ["gold"],
    ageDays: 23,
  },
  { name: "Heart Stack Rings", category: "jewellery", price: 999, colors: ["silver"], ageDays: 29 },
  { name: "Star Ear Cuffs", category: "jewellery", price: 899, colors: ["gold"], ageDays: 15 },

  // Bag charms
  { name: "Cherry Bag Charm", category: "bag-charms", price: 799, colors: ["red"], ageDays: 18 },
  { name: "Shell Keychain", category: "bag-charms", price: 699, colors: ["cream", "gold"], ageDays: 27 },
  { name: "Star Travel Charm", category: "bag-charms", price: 749, colors: ["gold"], ageDays: 36 },

  // Watches
  { name: "Gold Serpentine Watch", category: "watches", price: 3999, colors: ["gold"], ageDays: 48 },

  // Tops
  {
    name: "Jellyfish Top",
    category: "tops",
    price: 2199,
    collab: true,
    badge: "viral",
    colors: ["pink", "white"],
    ageDays: 6,
  },
  { name: "Corset Vest", category: "tops", price: 2499, colors: ["black"], ageDays: 24 },
  { name: "Cropped Polo", category: "tops", price: 1899, colors: ["white", "blue"], ageDays: 32 },

  // Jackets & coats
  { name: "Pink Fur Jacket", category: "jackets", price: 4499, sale: 3799, colors: ["pink"], ageDays: 70 },
  { name: "Varsity Jacket", category: "jackets", price: 4299, colors: ["red", "cream"], ageDays: 44 },
  {
    name: "Brown Tracksuit",
    category: "jackets",
    price: 3999,
    stock: "preorder",
    colors: ["brown"],
    ageDays: 3,
  },

  // Dresses & sets
  {
    name: "Coquette Set",
    category: "dresses",
    price: 3499,
    badge: "new_arrival",
    colors: ["pink", "white"],
    ageDays: 1,
  },
  { name: "Satin Maxi Dress", category: "dresses", price: 3999, colors: ["purple"], ageDays: 37 },
  {
    name: "Pink Pyjama Set",
    category: "dresses",
    price: 2499,
    collab: true,
    badge: "collab",
    colors: ["pink"],
    ageDays: 8,
  },

  // Hidden (tests visibility rules)
  { name: "Draft Sample Heels", category: "heels", price: 2599, hidden: true, colors: ["black"], ageDays: 0 },
];

/** Standard EU→UK/US women's conversions; owner must verify against USBA's lasts. */
export const SEED_SIZE_CHART = [
  { eu: "36", uk: "3", us: "5.5", footLengthCm: "22.5–23" },
  { eu: "37", uk: "4", us: "6.5", footLengthCm: "23–23.5" },
  { eu: "38", uk: "5", us: "7.5", footLengthCm: "23.5–24" },
  { eu: "39", uk: "6", us: "8.5", footLengthCm: "24.5–25" },
  { eu: "40", uk: "6.5", us: "9", footLengthCm: "25–25.5" },
  { eu: "41", uk: "7.5", us: "10", footLengthCm: "25.5–26" },
];
