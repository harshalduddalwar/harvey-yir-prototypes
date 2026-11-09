# Harvey 2026 Year in Review: scroll prototypes

Four static desktop prototypes: three scroll-driven, one click-through. No build step: plain HTML, CSS and JavaScript.

| Folder | Prototype | Entry |
|---|---|---|
| `a-scroll-story/` | A: octagon reveal, pinned chapters, horizontal timeline | `index.html` + `app.js` |
| `b-cover-zoom/` | B: cover zoom into a long editorial page | `index.html` + `app.js` |
| `c-open-book/` | C: open book with a fixed spine | `index.html` (script inline) |
| `d-click-through/` | D: prototype A as a click-through report (no vertical scroll) | `index.html` + `slides.js` |

Each folder holds its own `img/` and `fonts/`. A, B and C: smooth scrolling uses [Lenis](https://github.com/darkroomengineering/lenis) 1.1.13 from the jsDelivr CDN.

## Run locally

Open a terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000. Opening the files directly (`file://`) blocks the fonts, so use a local server.

## Publish on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)`. The site appears at `https://<user>.github.io/<repo>/`.

## Asset notes

- Fonts: Harvey Serif (regular, italic) and Harvey Sans Diatype (variable).
- Images come from the Harvey Figma files; text marked "to come" is placeholder.

## Prototype D controls

Click or tap the right side (or →, space) to go forward, the left side (or ←) to go back. Swipe on touch screens; one wheel gesture moves one slide. ↺ returns to the first slide, ▶ (or P) toggles autoplay. Each slide has its own link: `d-click-through/#1` … `#23`.
