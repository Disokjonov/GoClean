# Mobile performance and lazy-image QA — 2026-11-12

## Scope and revision

- Website revision tested: `27733131117ccceca300d0c5e01b7ae51d85bd75`
- Pages: `index.html`, `general-cleaning.html`, `furniture-cleaning.html`, `office-cleaning.html`
- No production push, deployment, Worker change, or real lead submission was performed.
- This is controlled local lab data, not CrUX field data. INP was not measured.

## Measurement method

Three cold-cache mobile runs per page, reported as medians:

- Viewport: 390 × 844
- Network: 150 ms latency, 1600 Kbps download, 750 Kbps upload
- CPU slowdown: 4×
- Cache: disabled
- Local static build server; no CDN compression

## Before and after

| Page | LCP element | LCP before | LCP after | Transfer before | Transfer after | Requests | CLS before/after | Long tasks before/after |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage | `h1` | 2720 ms | 2152 ms | 607,646 B | 462,130 B | 27 → 18 | 0.002 → 0.002 | 256 → 127 ms |
| General cleaning | intro `p` | 1744 ms | 1692 ms | 587,899 B | 458,105 B | 25 → 17 | 0.001 → 0.001 | 147 → 137 ms |
| Furniture cleaning | `h1` | 1664 ms | 1472 ms | 444,621 B | 314,827 B | 21 → 13 | 0.0013 → 0.0013 | 72 → 70 ms |
| Office cleaning | hero `img` | 2344 ms | 1592 ms | 523,936 B | 381,944 B | 24 → 16 | 0.0006 → 0.0006 | 133 → 76 ms |

Observed CLS maximum was exactly **0.002**. The measurements show correlation under the stated lab conditions; they are not a production ranking or field-CWV claim.

## Final dedicated lazy-image regression

The corrected Playwright harness used the homepage-specific `#langToggle`; other pages used `#globalLangToggle`. External requests were blocked and `/api/lead` was mocked. The final bounded run exited `0` against the exact revision above.

Passed:

- 8 responsive page checks: four pages × 390 px mobile and 1280 px desktop; no horizontal overflow.
- 8 language checks: UZ → RU → UZ at both widths. The office page also verified reciprocal `/ru/office-cleaning.html` navigation.
- 60 below-fold image checks: every matching main/footer lazy image was individually scrolled into view and verified as loaded with a positive natural width.
- 8 repeated mobile-drawer open/close checks: two opens per page.
- 52 mobile-drawer image checks: visible Home and Business panel images were individually brought into view and verified after repeated opens.
- Real lead requests observed: 0.

Final page/image coverage:

| Page | Mobile lazy images | Desktop lazy images |
| --- | ---: | ---: |
| Homepage | 8 | 8 |
| General cleaning | 8 | 8 |
| Furniture cleaning | 4 | 4 |
| Office cleaning | 10 | 10 |

## Harness/tool failures resolved before the final run

- The stale harness timed out on homepage `#globalLangToggle`; the homepage actually uses `#langToggle`.
- Playwright's default headless-shell executable was unavailable. The final run used the installed `/Applications/Google Chrome.app` executable; no browser was installed.
- An intermediate harness run attempted to scroll hidden Business-panel drawer images and timed out. The final harness explicitly selected Home and Business panels and tested only their visible images.

These were harness/environment failures. They were corrected and were not counted as passed until the final exit-0 run.

## Other verification and limitations

Passed on the same website revision:

- `npm run build`
- `npm run check` — 24 public pages and 14 services validated
- `git diff --check`
- Existing 56 service modal combinations and seven mocked form flows
- Existing office/B2B optional-area, language, Back/Forward, and mock-submit regression suite

Not run or not available:

- CrUX field CWV and real-user INP
- Production performance measurement after deployment
- Real lead/Telegram delivery
- Production deployment of this package

