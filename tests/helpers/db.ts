import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";
import type { Database } from "@/server/db/client";
import { TEST_DATABASE_URL } from "./test-db-url";

export { schema };

let sqlClient: postgres.Sql | undefined;
let database: Database | undefined;

export function testSql(): postgres.Sql {
  sqlClient ??= postgres(TEST_DATABASE_URL, { max: 4, onnotice: () => {} });
  return sqlClient;
}

export function testDb(): Database {
  database ??= drizzle(testSql(), { schema, casing: "snake_case" });
  return database;
}

export async function closeDb(): Promise<void> {
  await sqlClient?.end();
  sqlClient = undefined;
  database = undefined;
}

/** Empties every table, restores the site_settings singleton and resets code sequences. */
export async function resetDb(): Promise<void> {
  const sql = testSql();
  await sql.unsafe(`
    truncate table order_status_events, order_items, orders, reviews, product_images,
      product_sizes, products, categories, admin_sessions, admin_users, rate_limits,
      site_settings restart identity cascade;
    alter sequence product_code_seq restart with 1;
    alter sequence order_code_seq restart with 1;
    insert into site_settings (id) values (1);
  `);
}

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function insertCategory(
  db: Database,
  over: Partial<typeof schema.categories.$inferInsert> = {},
) {
  const slug = over.slug ?? `cat-${uniq()}`;
  const [row] = await db
    .insert(schema.categories)
    .values({ slug, name: slug, ...over })
    .returning();
  return row!;
}

export async function insertProduct(
  db: Database,
  categoryId: string,
  over: Partial<typeof schema.products.$inferInsert> = {},
) {
  const slug = over.slug ?? `prod-${uniq()}`;
  const [row] = await db
    .insert(schema.products)
    .values({ slug, name: slug, description: "desc", categoryId, pricePkr: 2000, isVisible: true, ...over })
    .returning();
  return row!;
}

export async function insertImage(
  db: Database,
  productId: string,
  position: number,
  over: Partial<typeof schema.productImages.$inferInsert> = {},
) {
  const [row] = await db
    .insert(schema.productImages)
    .values({
      productId,
      position,
      storageKey: `products/${uniq()}`,
      widths: [320, 640],
      width: 800,
      height: 1000,
      ...over,
    })
    .returning();
  return row!;
}
