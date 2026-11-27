# Ads & Monetization

There are two independent ad systems. Keep them separate when debugging revenue.

## 1. Placements (`/admin/ad-placements`)

Eight first-class slots are rendered across the public site:

| Slot | Surface |
|------|---------|
| `blog_listing` | Journal listing |
| `article_footer` | Blog post and case-study detail |
| `store_listing` | Digital store catalogue |
| `product_detail` | Product detail |
| `search_results` | Search results |
| `offerings` | Service list and detail |
| `home_footer` | Landing page, above the footer |
| `more_hub` | `/more`, below case studies |

Each row is one placement. Providers are `adsense`, `sponsor`, `affiliate` and `custom`.
Sponsor links are validated client-side and normalised again before they reach the DOM;
protocol-relative and backslash tricks are rejected.

- Public reads are limited to active rows; `starts_at` / `ends_at` are enforced in the browser.
- One placement per slot per view, chosen by weight. A session sees at most 8 ads total.
- Impressions are counted only when the unit is actually visible. When Google marks a unit
  `data-ad-status="unfilled"`, only the empty `<ins>` is hidden; the labelled box stays and
  shows a quiet "Sponsored space" fallback instead of flashing away. The gateway player uses
  the same pattern with "Ad unavailable".
- The AdSense runtime is requested only when a slot is within 300px of the viewport, so it
  never competes with the page's LCP. `ADSENSE_ENABLED=false` disables it entirely.
- `/admin/ad-placements` shows total impressions, clicks and CTR; the test-mode switch is
  browser-local (`na_adtest` cookie) and never affects visitors.

Required database objects: `ad_placements`, `record_ad_event`, and the two new slots in the
check constraint. Run `supabase/migrations/20261202000000_extend_and_harden_ads.sql` on an
existing database; fresh installs get everything from `supabase-schema.sql`.

## 2. Gateway ads (`/admin/ads`)

`dev_ads` powers the optional "Watch Dev Ads" unlock on the home page. Google entries render
an AdSense unit; YouTube entries render landscape or Short embeds. The countdown pauses while
the tab is hidden, and a parent re-render cannot restart it. View increments only apply to
active ads through `increment_ad_view_count`.

## Compliance checklist

- `public/ads.txt` must declare the same publisher as `ADSENSE_CLIENT` / the page meta tag.
- Every unit is labelled "Advertisement" or the sponsor type; external links are
  `rel="sponsored noopener noreferrer"`.
- `/search`, `/admin`, `/library` and other private routes stay out of the sitemap and are
  noindex; ads never enter indexable content as copy.
- Content and ad density must stay within Google's policy: keep at most one placement per
  listed slot and rely on the session caps rather than stacking units.

## Verification

```bash
npm run test:ads   # 50 source, SEO and database guards
npm test           # full chain, includes test:ads
```
