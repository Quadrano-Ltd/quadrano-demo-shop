# Quickstart: On-page results mirror

How to run and check this mission. Commands run from the repository root.

## Run it

```
pnpm install
pnpm dev
```

- View off (the default): open `http://localhost:5173/`.
- View on by link: open `http://localhost:5173/?results=on`.
- View on by switch: open the Demo menu and turn on **Show Quadrano's output on this page**.

To see results locally you need Quadrano on the page. Either set `VITE_GTM_CONTAINER_ID` in a gitignored `.env.local`, or use the offline build:

```
pnpm exec vite build --mode offline
pnpm exec vite preview --outDir dist-offline
```

Then paste a snippet into the Offline mode panel, reload, and open the page with `?results=on`.

## Check it

```
pnpm gates            # lint, build, no-secrets, provenance
pnpm verify:results   # the Console lint rule still fires outside the capture file
pnpm test:e2e         # includes the Results suites, on the shop-container path and offline
```

## By hand, on a desktop browser

1. Open `/` with no parameter. In the Console, `console.log` shows as native code.
2. Open `/?results=on`, open the Demo menu and press each of the 7 playground buttons.
3. For each press, compare the new top row with the Console group for that push.
4. Go to the basket page. The view is still on and Results starts empty.
5. Turn the switch off. The page reloads without `?results` and step 1 holds again.

## Device check (FR-017, Product Owner)

On one real iPhone and one real Android phone, against production or a preview deployment:

1. Scan a QR code for `https://<host>/?results=on`.
2. Open the Demo menu and press a playground button.
3. Confirm a row appears, expand it, and read the problem lines and the pushed object.
4. Record device, browser, date, the address used and the outcome in `docs/release-checks.md`.

The mission reaches `main` before Thu 19 Nov 2026 only with this record (C-004).

## Page speed (NFR-004)

Run Lighthouse mobile (Slow 4G) on each page with the view off and record LCP in `docs/release-checks.md`. Each must be at most 2 s.
