# Harvey Year in Review MMXXVI — prototypes

Static site, no build step. Every version is a plain HTML page:

- **V1** `index.html` / `classic.html`: the 3D hardbound book on the desk
- **V2** `scroll.html`: the scroll-driven prologue, chapter paintings behind the open book
- **V3** `v3.html`: the continuous read, chapter sheets sliding over one another
- **V4** `v4.html`: the screen is the book
- **V5** `v5.html`: the book with redline, tear-off and notes
- **V6** `v6.html`: the latest — light landing, drawn monogram intro, StPageFlip page turns,
  backgrounds A–E, Panel / Margin index, Tray / Desk tools, hold-and-drag tear-off

Pages are the Figma spreads exported as images in `spreads/`. Fonts are in `fonts/`.
V6 loads the page-turn library (page-flip 2.0.7, MIT) from jsDelivr.
