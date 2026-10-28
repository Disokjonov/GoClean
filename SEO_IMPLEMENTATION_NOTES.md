# SEO foundation notes

This branch adds a bounded SEO baseline without changing public URLs, DNS, hosting, or deployment.

## Decisions in this branch

- The intended canonical host is `https://go-clean.uz`, which is already configured and verified in Render.
- Marketing/content pages are indexable. Checkout, business lead, and demo-auth pages are `noindex`.
- `auth.html` remains available for internal prototype review but is `noindex,nofollow`. No public navigation currently links to it.
- Service query URLs remain unchanged to preserve current links and indexed paths.
- No structured data was added because legal business name, complete address/service area, opening hours, and evidence for public ratings were not confirmed.
- No `hreflang` was added because Uzbek and Russian currently share one URL and the Russian copy is produced in the browser.

## Query-string service limitation

`service.html?slug=...` is one static HTML file. Render serves the same server HTML for every slug; JavaScript changes the title, H1, description, and canonical after load. This branch adds correct runtime metadata for known slugs and `noindex,follow` for unknown slugs, but it is an interim solution.

Recommended next migration:

1. Generate one static HTML file per service at build time, such as `/services/furniture-cleaning.html`.
2. Keep the existing query URLs working during migration and map each one to its matching static URL with a single permanent redirect when the redirect mechanism is confirmed.
3. Return a real 404 page/status for unknown slugs instead of the current soft-404 fallback to General cleaning.
4. Update internal links and sitemap only after redirects are tested.

## Language-route limitation

The UZ/RU toggle currently changes DOM text and `lang` using JavaScript/localStorage. Search engines do not receive durable, independently crawlable language URLs.

Recommended next migration:

- Generate `/uz/...` and `/ru/...` static routes from one content source.
- Add self-canonicals and reciprocal `hreflang="uz"`, `hreflang="ru"`, and `x-default` only after both route sets exist.
- Preserve current URLs with a deliberate redirect/canonical plan; do not add hreflang pointing multiple languages to the same URL.

## Owner confirmation required

Verify before publishing or marking up these claims:

- `4.9` rating and its review source/count;
- `12 000+` completed orders;
- `180+` verified specialists;
- `98%` satisfied clients;
- `6+` years of experience;
- free re-cleaning/24-hour guarantee terms;
- exact legal business name, public address/service area, and opening hours.

FAQ content can remain visible if accurate, but this branch makes no FAQ rich-result promise and adds no FAQ structured data.

## Deployment gate

Before pushing this branch:

1. Restore the domain’s DNS routing to Render and verify the canonical host works.
2. Review descriptions and owner-dependent claims.
3. Run `npm run build`, `npm run check`, and a browser smoke test.
4. Confirm `robots.txt` and `sitemap.xml` return `200` on the production domain.
5. Submit the sitemap in Search Console only after DNS propagation and redirect verification.
