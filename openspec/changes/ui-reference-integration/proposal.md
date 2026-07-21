# Proposal: Integrate ui/ShelfPilot.dc.html as visual SoT

## Why

A high-fidelity Claude Design Canvas prototype now exists at `ui/ShelfPilot.dc.html`. The React app in `codebase/web` was a functional MVP chrome and must be rebuilt to match this reference while remaining wired to the mock API.

## What changes

- Gaps / FSD / UI prompt updated to cite `ui/ShelfPilot.dc.html`
- OpenSpec UI fidelity requirements
- `codebase/web` visual rebuild against the DC HTML (login, shell, dashboard, editor, products, analytics, admin)
- Seed richer vertical catalog data aligned with the prototype

## Out of scope

- Replacing mock API with production auth
- Running the `.dc.html` runtime itself (requires Design Canvas `support.js`; we port to React)
