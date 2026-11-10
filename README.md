# Clasick

Landing site for **Clasick** — a private-first resume analyzer that scores your resume against a real job description and shows exactly what to fix.

Live: [clasick.vercel.app](https://clasick.vercel.app)

## What's inside

A static export of the Cloudmorphic design system, extended with a seven-chapter, scroll-driven story:

| Chapter | Section | What it does |
| --- | --- | --- |
| 01 | Opening | Hero, ATS score card, floating product moments |
| 02 | Challenge | The reason good resumes still get filtered |
| 03 | Meet Clasick | Positioning and the score ring |
| 04 | Understand | Sticky scrollytelling through the analysis panels |
| 05 | Improve | Side-by-side before/after resume with an AI suggestion panel |
| 06 | Opportunities | Role matches connected to the skills you already have |
| 07 | Start | Final transformation and call to action |

## Structure

```
index.html                 root entry (redirects to the landing page)
pages/
  landing.html             the seven-chapter landing page
  landing-classic.html     the original exported page, kept for reference
  dashboard.html           product dashboard mock
  editor.html              resume editor mock
  history.html             version history mock
  settings.html            settings mock
  index.html               product shell
  404.html
story/
  story.css                design + motion layer for the landing page
  story.js                 scroll engine (reveals, sticky panels, parallax)
_next/static/              compiled Cloudmorphic tokens, fonts and chunks
media/                     logo, mascot sprites, demo capture
vercel.json                static hosting config
```

## Run locally

Any static file server works. For clean routes, serve the folder root:

```bash
python3 -m http.server 3000
```

Then open <http://localhost:3000/>.

## Deploy

```bash
vercel --prod
```

The `vercel.json` rewrite serves `pages/landing.html` at `/`, while `_next/` and `media/` are served with long-lived cache headers.

## Notes

- The story layer respects `prefers-reduced-motion`: reveals resolve, counters land on final values, and the comparison stacks with all text visible.
- No scroll hijacking — the page uses native scrolling with `IntersectionObserver` and rAF-throttled scroll state.
- The redesigned page is fully static: the original Next.js hydration scripts are intentionally not loaded.
