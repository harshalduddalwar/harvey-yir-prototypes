# Harvey 2026 Year in Review: scroll prototypes

Three static, scroll-driven desktop prototypes. No build step: plain HTML, CSS and JavaScript.

| Folder | Prototype | Entry |
|---|---|---|
| `a-scroll-story/` | A: octagon reveal, pinned chapters, horizontal timeline | `index.html` + `app.js` |
| `b-cover-zoom/` | B: cover zoom into a long editorial page | `index.html` + `app.js` |
| `c-open-book/` | C: open book with a fixed spine | `index.html` (script inline) |

Each folder holds its own `img/` and `fonts/`. Smooth scrolling uses [Lenis](https://github.com/darkroomengineering/lenis) 1.1.13 from the jsDelivr CDN.

## Run locally

Open a terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000. Opening the files directly (`file://`) blocks the fonts, so use a local server.

## Publish on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)`. The site appears at `https://<user>.github.io/<repo>/`.

## Asset notes

- Fonts: Harvey Serif (regular, italic) and Harvey Sans Diatype (variable).
- Images come from the Harvey Figma files; text marked "to come" is placeholder.
