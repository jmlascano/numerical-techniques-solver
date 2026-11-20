# LU Decomposition Solver — AMAT 105

A step-by-step LU decomposition solver for AMAT 105 (Anton, *Elementary Linear Algebra*, 10th ed.).

**Live site:** https://jmlascano.github.io/numerical-techniques-solver/

## Topics

One tab per slide set, in course order. Each built topic has its own link.

| Tab | Topic | Status | Link |
|---|---|---|---|
| AB1 | Systems of Linear Equations | Planned | |
| B2 | Matrices and Matrix Operations | Planned | |
| B3 | LU Decomposition | Built | `#b3` |
| C | Determinants | Planned | |
| D1 | Real Vector Spaces | Planned | |
| D2 | Coordinates and Bases | Planned | |
| D3 | Row, Column and Null Spaces | Built (default) | `#d3` |
| D4 | Linear Transformations | Planned | |
| E | Eigenvalues and Eigenvectors | Planned | |

**B3, LU Decomposition.** Reduces a square *A* to *U* with leading 1s, using no row interchanges, and lists every row operation with the matrix after it. *L* holds the pivots and the eliminated values, so *A* = *LU*. Then it solves *Ly* = *b* and *Ux* = *y* and checks *LU* = *A* and *Ax* = *b*. It says plainly when a zero pivot stops the method.

**D3, Row, Column and Null Spaces.** For any *m*×*n* matrix (1 to 6 each), it shows the Gauss–Jordan steps to the RREF *R*, then:
- a basis for the row space (the nonzero rows of *R*);
- a basis for the column space (the pivot columns of the original *A*);
- a basis for the null space (free variables, then the general solution in parametric vector form);
- rank, nullity, and rank + nullity = *n*;
- *Av* = 0 for each null space basis vector.

All arithmetic is exact. `fraction.js` uses BigInt numerators and denominators and always reduces, so there are no floating-point values anywhere.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: tab bar and one panel per built topic |
| `style.css` | Styles; tokens are documented in `DESIGN.md` |
| `fraction.js` | Exact rational arithmetic |
| `rowreduce.js` | Row operations, their written form (`R₁ ↔ R₃`, `R₂ → (1/3)R₂`, `R₂ → R₂ − 2R₁`), and Gauss–Jordan elimination |
| `lu.js` | LU decomposition and substitution (B3) |
| `spaces.js` | Row, column and null space, rank and nullity (D3) |
| `render.js` | Shared rendering: matrices, step lists, the input grid |
| `tab-b3.js`, `tab-d3.js` | Input handling and output for each tab |
| `app.js` | Tabs and hash routing |
| `tests.html` | Open it in a browser to run every test case and see pass/fail |

## Run locally

There is no build step and nothing to install. Do either of these:

- Double-click `index.html` (or `tests.html`) to open it in a browser. It works from `file://`.
- Or serve the folder: `python3 -m http.server 8000`, then open http://localhost:8000.

## Tests

Open `tests.html`. It checks:

- **B3**, from AMAT 105 Review & Exercises Problem A: *L*, *U*, the row operations, and both right-hand sides (*b* = [9, 0, −1] → *x* = [1, −1, 2]; *b* = [4, 3, 0] → *x* = [43/52, −53/52, 23/52]), plus zero pivots, a singular matrix, and a non-square matrix.
- **D3 Test 1**, the 4×5 example: RREF, pivot columns 1, 2, 3, all three bases, rank 3, nullity 2.
- **D3 Test 2**, the B3 matrix: RREF = *I*₃, rank 3, null space {0}.
- **D3 Test 3**, the 2×3 zero matrix: rank 0, nullity 3, null space basis *e*₁, *e*₂, *e*₃, empty row and column space bases.
- Fraction arithmetic and input parsing, row interchanges, and 1×1 and 6×6 sizes.
