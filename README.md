# LU Decomposition Solver — AMAT 105

A step-by-step LU decomposition solver for AMAT 105 (Anton, *Elementary Linear Algebra*, 10th ed.).

**Live site:** https://jmlascano.github.io/numerical-techniques-solver/

## What it does

1. Takes a square matrix *A* (2×2 to 5×5) and, optionally, a vector *b*. Entries may be integers, decimals, or fractions such as `-3/4`.
2. Reduces *A* to row echelon form *U* with leading 1s, using no row interchanges. It lists every row operation (for example `R₂ → R₂ − (1/2)R₁`) and the matrix after each one.
3. Builds *L*, which holds each pivot on its diagonal and each eliminated value below it, so that *A* = *LU*.
4. Solves *Ly* = *b* by forward substitution and *Ux* = *y* by back substitution, showing each line of work.
5. Checks the answer by multiplying out *LU* and *Ax* on the page.

All arithmetic is exact. `fraction.js` uses BigInt numerators and denominators and always reduces, so there are no floating-point values anywhere.

If a pivot is 0, the solver stops and says so. It also says whether *A* is singular, or invertible but in need of a row exchange (*PA* = *LU*, which is outside this method).

## Files

| File | Purpose |
|---|---|
| `index.html` | The page |
| `style.css` | Styles; tokens are documented in `DESIGN.md` |
| `fraction.js` | Exact rational arithmetic |
| `lu.js` | Decomposition and substitution; returns every step |
| `app.js` | Input handling and rendering |
| `tests.html` | Open it in a browser to run the test cases and see pass/fail |

## Run locally

There is no build step and nothing to install. Do either of these:

- Double-click `index.html` (or `tests.html`) to open it in a browser. It works from `file://`.
- Or serve the folder: `python3 -m http.server 8000`, then open http://localhost:8000.

## Tests

Open `tests.html`. It checks AMAT 105 Review & Exercises Problem A:

- *L* = [[2, 0, 0], [1, −5/2, 0], [3, 7/2, −52/5]]; *U* = [[1, −1/2, 3/2], [0, 1, 7/5], [0, 0, 1]]
- *b* = [9, 0, −1] → *y* = [9/2, 9/5, 2], *x* = [1, −1, 2]
- *b* = [4, 3, 0] → *y* = [2, −2/5, 23/52], *x* = [43/52, −53/52, 23/52]

It also checks fraction arithmetic and parsing, zero pivots, a singular matrix, a non-square matrix, and a 5×5 matrix with fractional entries.

## Planned

Gaussian elimination, inverses by elimination, elementary matrices, and determinants (by definition, by cofactor expansion, and by the adjoint).
