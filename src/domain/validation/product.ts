import { z } from "zod";
import {
  BADGES,
  COLORS,
  FOOTWEAR_SIZES,
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  STOCK_STATUSES,
} from "../catalog";
import { IMAGE_MAX_EDGE, IMAGE_VARIANT_WIDTHS } from "../images";
import { normalizeInstagramHandle } from "../ordering";
import { parseQuantity } from "../stock";
import { formString, jsonField, optionalRupees, parseRupees, requiredRupees, SLUG_RE } from "./common";

export const DEFAULT_COLLAB_HANDLE = "fairycoreforher";

export const productImageSchema = z.object({
  storageKey: z.string().regex(/^products\/[0-9a-f-]{36}$/, "Invalid image reference"),
  // Metadata comes back from our own upload action; still validate strictly so a
  // tampered request can't inject CSS via the placeholder or bogus variants.
  widths: z.array(z.number().int().min(1).max(IMAGE_MAX_EDGE)).min(1).max(IMAGE_VARIANT_WIDTHS.length),
  width: z.number().int().min(1).max(IMAGE_MAX_EDGE),
  height: z.number().int().min(1).max(IMAGE_MAX_EDGE),
  blurDataUrl: z
    .string()
    .max(6000)
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/, "Invalid image placeholder")
    .nullable(),
  alt: z.string().trim().max(200, "Alt text must be 200 characters or fewer"),
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

/** An image the client is tracking, incl. a preview URL that is never sent to the server. */
export interface ProductImageDraft extends ProductImageInput {
  previewUrl: string;
}

export const sizeSchema = z.object({
  label: z.enum(FOOTWEAR_SIZES),
  /** Manual availability; ignored (follows the quantity) when stock is tracked. */
  isAvailable: z.boolean(),
  /** Quantity as typed in the form; "" when stock isn't tracked. */
  quantity: z.string().max(10).default(""),
  /** Quantity the form was loaded with (null for sizes not tracked yet), see rebaseQuantity. */
  base: z.number().int().min(0).nullable().default(null),
});
export type SizeFormValue = z.infer<typeof sizeSchema>;

export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  price: string;
  salePrice: string;
  stockStatus: (typeof STOCK_STATUSES)[number];
  badge: string;
  collab: boolean;
  collabPartner: string;
  colors: string[];
  isVisible: boolean;
  featured: boolean;
  sizes: SizeFormValue[];
  /** Count units in stock (per size for footwear) instead of setting the status by hand. */
  trackStock: boolean;
  /** Quantity for products without sizes, as typed. */
  quantity: string;
  /** Quantity the form was loaded with; null when the product wasn't tracked. */
  quantityBase: number | null;
  images: ProductImageInput[];
}

const QUANTITY_HINT = "Enter a whole number of pairs or pieces (0 if sold out)";

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a product name").max(120, "Name must be 120 characters or fewer"),
    slug: z
      .string()
      .trim()
      .min(1, "Enter a URL slug")
      .max(90, "Slug must be 90 characters or fewer")
      .regex(SLUG_RE, "Use lowercase letters, numbers and single hyphens, for example cherry-red-heels"),
    description: z
      .string()
      .trim()
      .min(1, "Enter a description")
      .max(5000, "Description must be 5000 characters or fewer"),
    categoryId: z.uuid("Choose a category"),
    price: requiredRupees,
    salePrice: optionalRupees,
    stockStatus: z.enum(STOCK_STATUSES),
    badge: z.string().refine((v) => v === "" || (BADGES as readonly string[]).includes(v), "Choose a badge"),
    collab: z.boolean(),
    collabPartner: z.string().trim().max(80),
    colors: z.array(z.enum(COLORS)).max(COLORS.length),
    isVisible: z.boolean(),
    featured: z.boolean(),
    sizes: z.array(sizeSchema).max(FOOTWEAR_SIZES.length),
    trackStock: z.boolean(),
    quantity: z.string().max(10),
    quantityBase: z.number().int().min(0).nullable(),
    images: z.array(productImageSchema).max(MAX_PRODUCT_IMAGES, `Up to ${MAX_PRODUCT_IMAGES} images`),
  })
  .superRefine((v, ctx) => {
    const price = parseRupees(v.price);
    const sale = v.salePrice === "" ? null : parseRupees(v.salePrice);
    if (price !== null && sale !== null && sale >= price) {
      ctx.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "Sale price must be lower than the regular price",
      });
    }
    if (v.isVisible && v.images.length < MIN_PRODUCT_IMAGES) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: `Add at least ${MIN_PRODUCT_IMAGES} images to show this product on the site`,
      });
    }
    if (v.collab && v.collabPartner !== "" && normalizeInstagramHandle(v.collabPartner) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["collabPartner"],
        message: "Enter an Instagram handle using letters, numbers, periods or underscores",
      });
    }
    const labels = v.sizes.map((s) => s.label);
    if (new Set(labels).size !== labels.length) {
      ctx.addIssue({ code: "custom", path: ["sizes"], message: "Duplicate sizes" });
    }
    if (v.trackStock && v.sizes.length > 0) {
      for (const size of v.sizes) {
        if (parseQuantity(size.quantity) === null) {
          ctx.addIssue({ code: "custom", path: [`quantity-${size.label}`], message: QUANTITY_HINT });
        }
      }
    } else if (v.trackStock && parseQuantity(v.quantity) === null) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: QUANTITY_HINT });
    }
  });

/** Validated, normalised product ready for the database. */
export interface ProductInput {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  pricePkr: number;
  salePricePkr: number | null;
  stockStatus: (typeof STOCK_STATUSES)[number];
  badge: (typeof BADGES)[number] | null;
  collabPartner: string | null;
  colors: (typeof COLORS)[number][];
  isVisible: boolean;
  featured: boolean;
  sizes: {
    label: (typeof FOOTWEAR_SIZES)[number];
    isAvailable: boolean;
    /** Null when stock isn't tracked. */
    stockQuantity: number | null;
    stockBase: number | null;
  }[];
  trackStock: boolean;
  /** Products without sizes: the count (null when not tracked). Sized products use their sizes. */
  stockQuantity: number | null;
  stockBase: number | null;
  images: ProductImageInput[];
}

export function toProductInput(
  v: z.infer<typeof productFormSchema>,
  defaultCollabHandle: string,
): ProductInput {
  const collabHandle = v.collab
    ? (normalizeInstagramHandle(v.collabPartner) ??
      normalizeInstagramHandle(defaultCollabHandle) ??
      DEFAULT_COLLAB_HANDLE)
    : null;
  return {
    name: v.name,
    slug: v.slug,
    description: v.description,
    categoryId: v.categoryId,
    pricePkr: parseRupees(v.price) as number,
    salePricePkr: v.salePrice === "" ? null : parseRupees(v.salePrice),
    stockStatus: v.stockStatus,
    badge: v.badge === "" ? null : (v.badge as (typeof BADGES)[number]),
    collabPartner: collabHandle,
    colors: [...new Set(v.colors)],
    isVisible: v.isVisible,
    featured: v.featured,
    sizes: v.sizes.map((s) => ({
      label: s.label,
      isAvailable: s.isAvailable,
      stockQuantity: v.trackStock ? parseQuantity(s.quantity) : null,
      stockBase: v.trackStock ? s.base : null,
    })),
    trackStock: v.trackStock,
    stockQuantity: v.trackStock && v.sizes.length === 0 ? parseQuantity(v.quantity) : null,
    stockBase: v.trackStock && v.sizes.length === 0 ? v.quantityBase : null,
    images: v.images,
  };
}

/** FormData -> the loosely-typed object the schema validates. */
export function productValuesFromFormData(fd: FormData): unknown {
  return {
    name: formString(fd, "name"),
    slug: formString(fd, "slug"),
    description: formString(fd, "description"),
    categoryId: formString(fd, "categoryId"),
    price: formString(fd, "price"),
    salePrice: formString(fd, "salePrice"),
    stockStatus: formString(fd, "stockStatus") || "in_stock",
    badge: formString(fd, "badge"),
    collab: fd.get("collab") === "on",
    collabPartner: formString(fd, "collabPartner"),
    colors: fd.getAll("colors").filter((c): c is string => typeof c === "string"),
    isVisible: fd.get("isVisible") === "on",
    featured: fd.get("featured") === "on",
    sizes: jsonField(fd, "sizes", []),
    trackStock: fd.get("trackStock") === "on",
    quantity: formString(fd, "quantity"),
    quantityBase: baseField(fd.get("quantityBase")),
    images: jsonField(fd, "images", []),
  };
}

function baseField(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d{1,5}$/.test(value)) return null;
  return Number(value);
}
