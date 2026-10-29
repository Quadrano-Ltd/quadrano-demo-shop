# Preview spike: a never-published container in GTM Preview (FR-023)

Mission `byo-gtm-container-01M64PAZ`, issue #4, "Check before building", item 1.

Container IDs are never written here. In the screenshots they're redacted as
`visitor GTM-****` (the test container) and `shop GTM-****` (the shop's own).

---

## Question

Does GTM Preview (Tag Assistant) connect to a container that has never been
published, when the shop injects that container while the page runs? Does it
stay connected across page navigations? If not, path 2 has to tell visitors to
publish their container.

## Run 1: before the feature exists (2026-10-29)

**Checked by:** the Product Owner.

**Set-up:** a brand-new, empty container in the Product Owner's own GTM account,
never published. Preview was started as the very first action after creating it,
targeting the production demo shop. The bring-your-own menu isn't built yet, so
the shop loaded only its own container, as it does today.

**Observed:**

| Check | Result |
|---|---|
| GTM lets you start Preview on a never-published container | **Yes.** Preview was available immediately after creating the container. |
| Tag Assistant connects to the demo shop | **Yes.** It shows "Connected" to the site. |
| The Tag Assistant session survives page navigations | **Yes.** It stayed connected from the product page to the basket page. |
| The test container runs on the page | **No, as expected.** Tag Assistant reports "Google Tag: GTM-**** not found … verify that the tag is installed on this page" on every page. The shop's own container is the only one found on the page. |
| Tags fire | Not applicable: the test container is empty. |

![Tag Assistant at session start](preview-session-start.png)

![Tag Assistant after navigating to the basket](preview-after-navigation.png)

**What the two container IDs mean:** Tag Assistant shows a chip for the
container being previewed and one for each container it finds on the page.
The test container was **not** added to the page. It was listed because it
was being previewed, and marked "not found" because the page doesn't load it.

## Conclusion so far

- **Settled:** publishing is not needed to *start* Preview, and a Preview session
  on the demo shop persists across navigations.
- **Still open:** whether the never-published container *runs* in Preview once
  the shop itself loads it. This can only be checked once the shop can load a
  visitor's container (FR-006 to FR-008). The usual GTM workflow (install the
  snippet, Preview, publish later) relies on exactly this, so it is expected to
  work.
- **Path 2's visitor instructions (FR-024)** stay provisional until run 2.

## Run 2: with the feature built (to do)

On a preview deployment of the mission branch:

1. Create a fresh, empty, never-published container.
2. Enter its ID in the visitor menu; confirm the banner shows it.
3. Start Preview on the demo shop.
4. Check that Tag Assistant shows the test container as **found** (not "not found"),
   and that the shop's own container is **not** found (FR-001).
5. Navigate across at least three pages; check that it stays found on each.
6. Add a Quadrano Local snippet in a Custom HTML tag, refresh Preview, and use
   the playground: check that the Console shows a ✓ group and a ✗ group (SC-007).

Record the result and redacted screenshots here.
