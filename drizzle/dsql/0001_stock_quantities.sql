-- Stock quantities (drizzle/0008_stock_quantities.sql). DSQL adds columns
-- bare, sets defaults separately (existing order_items rows stay null, which
-- the app reads as false) and adds CHECKs NOT VALID, then validates them in
-- an async job.
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer;
--> statement-breakpoint
ALTER TABLE product_sizes ADD COLUMN IF NOT EXISTS stock_quantity integer;
--> statement-breakpoint
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS stock_deducted boolean;
--> statement-breakpoint
ALTER TABLE order_items ALTER COLUMN stock_deducted SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE products ADD CONSTRAINT products_stock_quantity_non_negative CHECK (stock_quantity IS NULL OR stock_quantity >= 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE product_sizes ADD CONSTRAINT product_sizes_stock_quantity_non_negative CHECK (stock_quantity IS NULL OR stock_quantity >= 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE ASYNC products VALIDATE CONSTRAINT products_stock_quantity_non_negative;
--> statement-breakpoint
ALTER TABLE ASYNC product_sizes VALIDATE CONSTRAINT product_sizes_stock_quantity_non_negative;
