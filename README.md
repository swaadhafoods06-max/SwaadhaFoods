# Swaadha

Next.js App Router + TypeScript + Supabase. A homemade-food storefront, customer accounts and cart checkout, plus a complete kitchen management workspace.

## Run locally

Requires Node.js 20.9+ and npm (or pnpm).

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Storefront routes: `/`, `/products`, `/our-story`, `/contact`, `/account`. Kitchen management: `/admin`.

## Connect Supabase

1. Create a Supabase project in your account.
2. For a new database, run `supabase/schema.sql` once in the SQL editor.
3. Run `supabase/002-admin-and-orders.sql`, then `supabase/003-commerce-and-shipping.sql`. Existing installations apply only the migrations they have not yet run. It adds categories, customer orders, sub-admin roles, validated order functions, and aggregate reporting. Existing admins become owners.
4. Copy the project URL and **public anon key** from Project Settings → API into `.env.local`. Never put a service-role or secret key in a NEXT_PUBLIC variable.
5. Create your owner email/password user in Authentication → Users, then run:

```sql
insert into public.admins(user_id,name,email,role,permissions)
values ('YOUR-AUTH-USER-UUID','Your name','owner@example.com','owner','{}');
```

6. Enable email/password registration and email confirmations in Supabase Authentication for customer accounts. Configure Site URL and allowed redirect URLs to your local and production origins. Set up production email delivery in Supabase before public launch.
7. Restart the site. Sign in at `/admin`, create categories, and add your actual products and HTTPS image URLs. Public Supabase Storage image URLs work. Hide products/categories rather than deleting them.
8. Run `supabase/006-sub-admin-pos-access.sql` so sub-admins can be given the POS Billing tab. To add a sub-admin, open **Sub-admins & access**, enter their name, email and a password (or generate one), and choose tabs. A confirmed login is created and they can sign into `/admin` right away; share the password privately. If the person already has a Swaadha account, leave the password blank to keep theirs. Owners can reset a sub-admin's password from the edit dialog. Creating accounts and resetting passwords needs `SUPABASE_SERVICE_ROLE_KEY` on the server.

No credentials or live Supabase project are provisioned by this repository.

## Admin tabs

- **Dashboard:** date-filtered order activity, order value, pending orders, current active catalog, and shortcuts.
- **Categories:** create/edit names and descriptions; show/hide categories. Hiding a category hides its products. Renames cascade to products, while order snapshots remain unchanged.
- **Products:** searchable product listing, add/edit products, prices, pack sizes, categories, and visibility.
- **Orders:** search by order/customer, filter status, inspect items/contact/address, and update status.
- **Analytics & reports:** date-filtered daily order activity, status breakdown, most-requested products, spreadsheet-compatible CSV export and print/Save as PDF layout.
- **Sub-admins & access:** owner-only tab grants and revocation. Customer accounts remain intact when staff access is removed.

Permissions are enforced by database policies and RPC checks. A staff member with only product permission cannot read all customer orders or manage the team. Dashboard/report access grants aggregate activity, not raw customer addresses. Owners have all tabs. Owner roles must be provisioned or changed in the SQL editor. Revoking a permission takes effect on database requests, even if an old browser tab is still open.

## Customer accounts and orders

Customers register/sign in at `/account`, browse product detail pages, add products to `/cart`, and place COD orders with their delivery details. The account page lists their orders, invoices, and saved tracking links. All live access uses Supabase policies; customers can read only their own orders.

The old order-request builder and its bypass endpoint are retired by migration 003. Checkout, inventory, invoices and shipping setup are detailed below. WhatsApp enquiries remain a separate channel and are not automatically imported as orders.

## Demo mode

Without Supabase environment variables, `/admin` offers a complete, explicitly labeled sample workspace. Category/product/team changes and order status changes persist in this browser under `swaadha-admin-demo-v2`; the demo storefront reads this same local menu. The sample data is not a real business record. There is no simulated customer sign-in or fake order submission. `/account` and checkout explain the required Supabase connection. Cart and wishlist still work locally.

The storefront contains labeled sample products/prices and AI-generated illustrative food imagery. Actual brand logos were supplied by the owner. Optimized WebP assets and original PNGs are in `public/images/`; generation prompts and provenance are in `public/images/GENERATION.md`. Replace illustrations with actual product photos and verify all ingredient, allergen and natural/chemical-free claims before launch.

## Verify and deploy

```sh
npm run typecheck
npm test
npm run build
npm start
```

Deploy on a Next.js-compatible host, add both environment variables and rebuild. Apply SQL migrations before enabling accounts. Configure Supabase auth URLs and email delivery for the production domain. The database permission and live auth/order workflows require validation against your configured Supabase project; the local demo does not exercise database policies.

Official references: https://nextjs.org/docs/app/getting-started/installation and https://supabase.com/docs/guides/database/postgres/row-level-security.

## Cart checkout, stock, invoices and Shiprocket

Apply `supabase/003-commerce-and-shipping.sql` after the first two migrations, then restart the site. Existing products start with **zero stock**; set the actual number of available packs in Admin → Products. Add SKU, full description, ingredients, allergen information, shelf life, storage and net weight. Blank food details are displayed as needing kitchen confirmation; the app does not invent them.

- Product detail URLs: `/products/<product-id>`. Product cards link to the detail page and have Add to cart / Wishlist actions.
- `/wishlist` and `/cart` persist browser-local selections. Customers sign in and place an order at checkout; the account page now shows orders rather than an order-request builder.
- Checkout supports **cash on delivery**, with any separately agreed delivery charge disclosed by the kitchen. This is not an online card-payment integration. Product prices are recalculated from the database and stock is reserved atomically using row locks. Duplicate lines are merged; per-product quantity is limited to 100. Repeated submissions use the same checkout key to avoid duplicate orders.
- Cancelling an unshipped, unexported order restores its reserved stock once. Cancelled orders cannot reopen. Resolve exported/uncertain Shiprocket shipments in Shiprocket before cancellation. Product editing checks the stock value originally loaded so concurrent checkouts cannot be silently overwritten by a stale editor.
- Order detail and listing views have downloadable **invoice PDFs**. Customers can download their own invoices from `/account`. They are order invoices, not GST tax invoices or payment receipts. Actual tax registration/HSN/GST configuration is not included. A rendered sample invoice is in `output/pdf/swaadha-sample-invoice.pdf`. The current PDF font supports Latin text; use English/transliterated delivery details for these PDFs.

### Shiprocket server configuration

Set these on the server only (never use a NEXT_PUBLIC prefix):

```text
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-key
SHIPROCKET_EMAIL=your-shiprocket-api-user-email
SHIPROCKET_PASSWORD=your-shiprocket-api-user-password
SHIPROCKET_PICKUP_LOCATION=the-exact-registered-pickup-location
```

The public browser key remains the anon key. The service key never enters client components. The server verifies the signed-in user's `orders` tab access before reading an order or calling Shiprocket. A configured Shiprocket account/API user and registered pickup address are required; nothing is booked automatically.

Admin → Orders → View → **Shiprocket delivery**:

1. Confirm a new COD checkout order with complete delivery details.
2. Enter the actual packed length/breadth/height (cm) and weight (kg). Default measurements are editable examples, not a weight calculation.
3. Click **Create Shiprocket order** to create the provider's order and shipment IDs. This transmits the recipient and order details to Shiprocket.
4. Assign courier/AWB and schedule pickup in the Shiprocket dashboard. Postage, fees, courier assignment and pickup purchase are not performed by this website.
5. Use **Sync tracking** to save the courier, AWB and tracking link; use **Get label** after courier assignment to retrieve the shipping label. The customer account displays the saved tracking link.

Creation is serialized in the database. Timeouts or ambiguous provider responses mark the shipment `needs_review` and block duplicate creation. Reconcile such an order in Shiprocket before an owner repairs its provider IDs/state in the database. No automatic retry of uncertain creation occurs. Demo mode shows setup guidance and does not simulate live shipments.

Primary API documentation: https://apidocs.shiprocket.in/?version=latest and https://www.postman.com/shiprocketdev/shiprocket-dev-s-public-workspace/documentation/qu05zax/shiprocket-api.

Verification includes production builds, reporting and invoice tests, rendered PDF review, and browser checks of product details, cart totals, wishlist, stock fields and mobile layouts. Live database transactions/authentication and Shiprocket calls still need validation with your own configured accounts.
# Swaadha

## Header and login popup

The storefront header stays at the top while scrolling. Signed-out visitors see **Login / Register**, opening an accessible modal with both forms. **My account** and the header checkout shortcut appear after authentication. Cart sign-in opens the same modal and preserves the saved cart. The modal closes after a successful session; checkout login continues to `/cart`. Escape, the close button, and clicking the backdrop dismiss the popup. Live login/registration require Supabase configuration; no demo session is fabricated.
