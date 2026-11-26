# AMAT 105 Linear Algebra Solver

A step-by-step linear algebra solver for AMAT 105 (Anton, *Elementary Linear Algebra*, 10th ed.), with one tab per slide set and exact fractions throughout.

**Demo only.** Created by Jana Mei Lascano for AMAT 105 extra credit.

**Live site:** https://jmlascano.github.io/numerical-techniques-solver/

## Topics

One tab per slide set, in course order. Every topic is built and has its own link; the site opens on the last one.

| Tab | Topic | Status | Link |
|---|---|---|---|
| AB1 | Systems of Linear Equations | Built | `#ab1` |
| B2 | Matrices and Matrix Operations | Built | `#b2` |
| B3 | LU Decomposition | Built | `#b3` |
| C | Determinants | Built | `#c` |
| D1 | Real Vector Spaces | Built | `#d1` |
| D2 | Coordinates and Bases | Built | `#d2` |
| D3 | Row, Column and Null Spaces | Built | `#d3` |
| D4 | Linear Transformations | Built | `#d4` |
| E | Eigenvalues and Eigenvectors | Built | `#e` |
| E2 | Diagonalization and Cayley–Hamilton | Built (default) | `#e2` |

**AB1, Systems of Linear Equations.** Takes the augmented matrix [*A* | *b*] (1 to 6 equations and unknowns), reduces it to row echelon form by Gaussian elimination with one step per row operation, and says whether the system is consistent. An inconsistent system is shown with its 0 = 1 row. Otherwise back-substitution runs equation by equation from the last row up, naming the leading and free variables, and the answer is checked against *A*. Variables are x₁ … xₙ, or x, y, z (w, x, y, z for four unknowns).

**B2, Matrices and Matrix Operations.** One operation at a time: *A* + *B*, *A* − *B*, *kA*, *kA* + *mB*, *AB* (each cᵢⱼ written out on request), *A*ᵀ and tr(*A*), each with a plain reason when the sizes do not allow it. The inverse is found by Gauss–Jordan elimination on [*A* | *I*] and stops if the left side gets a zero row. Elementary matrices use the professor's notation, E₁(c, k), E₂(k, j) and E₃(c, k, j), and an invertible *A* is written as a product of elementary matrices, *A* = E₁⁻¹E₂⁻¹⋯Eₚ⁻¹, with the product checked against *A*.

**B3, LU Decomposition.** Reduces a square *A* to *U* with leading 1s, using no row interchanges, and lists every row operation with the matrix after it. *L* holds the pivots and the eliminated values, so *A* = *LU*. Then it solves *Ly* = *b* and *Ux* = *y* and checks *LU* = *A* and *Ax* = *b*. It says plainly when a zero pivot stops the method.

**C, Determinants.** Three methods: by definition (every permutation with its inversions, sign and elementary product; up to 4 × 4), cofactor expansion along any row or column (written out down to 2 × 2 up to 4 × 4; for 5 × 5 and 6 × 6 the minors' determinants are given as numbers), and the adjoint (cofactor matrix, adj(*A*), *A*·adj(*A*) = det(*A*)*I*, and *A*⁻¹ = (1/det *A*)·adj(*A*) when det *A* ≠ 0).

**D1, Real Vector Spaces.** In ℝⁿ, with the vectors entered as columns: is *w* a linear combination of *v*₁, …, *v*ₖ (the coefficients, or the 0 = 1 row that rules it out); do they span ℝⁿ (by rank, with a standard vector outside the span when they do not); are they linearly independent (a whole-number relation when they are not, solved for the last vector it involves, and Thm 4.13 when *k* > *n*). Function spaces (the Wronskian) are not covered.

**D2, Coordinates and Bases.** Is *S* a basis for ℝⁿ (Thm 4.22); coordinates [*x*](B) of a vector and the vector from its coordinates; reduce a spanning set or extend an independent set to a basis by row reducing [*S* | *e*₁ … *e*ₙ] (Thm 4.23); change of basis with Anton's convention, where P(B′→B) has the columns [*u*′ⱼ](B), [*v*](B) = P(B′→B)[*v*](B′), both transition matrices come from row reducing [B | B′] and [B′ | B], and converted coordinates are checked by converting back.

**D3, Row, Column and Null Spaces.** For any *m*×*n* matrix (1 to 6 each), it shows the Gauss–Jordan steps to the RREF *R*, then:
- a basis for the row space (the nonzero rows of *R*);
- a basis for the column space (the pivot columns of the original *A*);
- a basis for the null space (free variables, then the general solution in parametric vector form);
- rank, nullity, and rank + nullity = *n*;
- *Av* = 0 for each null space basis vector.

**D4, Linear Transformations.** T: ℝⁿ → ℝᵐ entered by its standard matrix (polynomials and matrices as coordinate vectors): T from the images of a basis (Thm 4.36) with its standard matrix; kernel and range with rank(T) + nullity(T) = *n* (Thm 4.40) and whether T is one-to-one, onto or an isomorphism; [T](B′, B) from [B′ | T(*u*₁) … T(*u*ₙ)] and the 3-step indirect computation of T(*x*) for an *x* you enter; T₂ ∘ T₁ as A₂A₁; T⁻¹ as A⁻¹ when T is bijective.

**E, Eigenvalues and Eigenvectors.** λIₙ − *A*, det(λIₙ − *A*) by cofactor expansion along row 1, and the characteristic polynomial factored exactly: the rational root test with its candidates and values, synthetic division tables, and the quadratic formula, which can give eigenvalues *a* ± *b*√*d*. Eigenvalues are listed largest first with their algebraic multiplicity (Thm 5.3 is noted for triangular *A*). Each eigenspace comes from row reducing (λ*I* − *A*)*x* = 0, over exact surds when needed, with its dimension and the check *Av* = λ*v*. Complex roots are written exactly (for example 2 ± *i*) and marked as not real. A factor with no rational roots and degree 3 or more is reported plainly instead of with decimals. Also: the eigenvalues of *A*ᵏ (Thm 5.4) and invertibility (Thm 5.6).

**E2, Diagonalization and Cayley–Hamilton.** A Part select chooses one of two:
- *Diagonalization* follows the slides' procedure: the eigenspace bases, then *P* and *D* (eigenvalues largest first), *P*⁻¹ by Gauss–Jordan (steps behind "Show steps"), and checks that *P*⁻¹*AP* = *D* and *AP* = *PD*. It says when *A* is not diagonalizable, with a table of multiplicities. *A*ᵏ = *PD*ᵏ*P*⁻¹ is checked against direct multiplication.
- *Cayley–Hamilton* finds p(λ) and *Q*(λ) = adj(λ*I* − *A*) = *Q*₀ + *Q*₁λ + ⋯, checks *Q*(λ)(λ*I* − *A*) = p(λ)*I*, verifies p(*A*) = 0 term by term, writes *A*ᵏ as a combination of *I*, *A*, …, *A*ⁿ⁻¹ by using the characteristic equation repeatedly, and finds *A*⁻¹ = −(1/*c*₀)(*c*₁*I* + ⋯ + *A*ⁿ⁻¹).

All arithmetic is exact. `fraction.js` uses BigInt numerators and denominators and always reduces, so there are no floating-point values anywhere.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: tab bar and one panel per built topic |
| `style.css` | Styles; tokens are documented in `DESIGN.md` |
| `fraction.js` | Exact rational arithmetic |
| `rowreduce.js` | Row operations, their written form (`R₁ ↔ R₃`, `R₂ → (1/3)R₂`, `R₂ → R₂ − 2R₁`), and Gauss–Jordan elimination, over any exact number type (Fraction or Surd) |
| `surd.js` | Exact numbers a + b√d (for eigenvalues such as 2 ± √3) |
| `matrix.js` | Shared matrix helpers: products, transpose, identity, cofactor determinant, cofactor matrix, adjoint (entries may be numbers or polynomials) |
| `poly.js` | Polynomials in λ: arithmetic, synthetic division, factoring over ℚ (rational root test and quadratic formula) |
| `systems.js` | Gaussian elimination, consistency, back-substitution (AB1) |
| `matops.js` | Matrix arithmetic, inverse by Gauss–Jordan, elementary matrices (B2) |
| `lu.js` | LU decomposition and substitution (B3) |
| `vectorspaces.js` | Linear combinations, span, independence (D1); bases, coordinates, reduce/extend, change of basis (D2) |
| `eigen.js` | Characteristic polynomial, eigenvalues, eigenspaces, powers, invertibility (E) |
| `diagonalization.js` | Diagonalization, Aᵏ = PDᵏP⁻¹, and Cayley–Hamilton (E2) |
| `lintrans.js` | Linear transformations: basis images, kernel and range, matrices relative to bases, composition, inverse (D4) |
| `determinants.js` | Determinants by definition, cofactor expansion and the adjoint (C) |
| `spaces.js` | Row, column and null space, rank and nullity (D3) |
| `render.js` | Shared rendering: matrices, step lists, disclosures, tables, the input grid |
| `tab-ab1.js`, `tab-b2.js`, `tab-b3.js`, `tab-c.js`, `tab-d1.js`, `tab-d2.js`, `tab-d3.js`, `tab-d4.js`, `tab-e.js`, `tab-e2.js` | Input handling and output for each tab |
| `app.js` | Tabs and hash routing |
| `tests.html` | Open it in a browser to run every test case and see pass/fail |

## Releasing an update

`index.html` and `tests.html` load every script and the stylesheet with a version query, such as `style.css?v=2`. Raise the number in both files whenever you change a `.js` or `.css` file. GitHub Pages lets browsers cache files for 10 minutes, and without a new version number a visitor can get the new page with old scripts.

## Run locally

There is no build step and nothing to install. Do either of these:

- Double-click `index.html` (or `tests.html`) to open it in a browser. It works from `file://`.
- Or serve the folder: `python3 -m http.server 8000`, then open http://localhost:8000.

## Tests

The tests are for development only. The live site does not link to them, and `tests.html` asks search engines not to index it. Open `tests.html` locally (double-click it, or go to http://localhost:8000/tests.html). It checks:

- **AB1**: Problem A (unique, *x* = (1, −1, 2)), Problem Set 1 A (4 × 4, (*w*, *x*, *y*, *z*) = (1, 2, 3, 4)), an inconsistent system (row [0 0 | 1]), and infinitely many solutions (*x* = 5 + *y* − 2*z*).
- **B2**: the Anton §1.3 sums, scalar multiples, products, trace and transpose; 2*B* − *C* undefined; the inverses of the Problem A and PS1 matrices; E₁(2,2), E₂(1,3), E₃(−2,1,2); the Problem A matrix as a product of elementary matrices.
- **C**: det = 52 (Problem A) and 17 (PS1 4 × 4) by all three methods, adj of the Problem A matrix, a singular matrix (det 0, no inverse), and the size limits.
- **D1**: *w* = (9, 2, 7) = −3*u* + 2*v*; *z* = (4, −1, 8) is not a combination; (1,1,2), (1,0,1), (2,1,3) do not span ℝ³; *v*₁ + *v*₂ − 2*v*₃ = 0 for {(1,−2,3), (5,6,−1), (3,2,1)}.
- **D2**: (5, −1, 9) → (1, −1, 2) and (−1, 3, 2) → (11, 31, 7); extending {(−1,2,3), (1,−2,−2)} with *e*₁; both change-of-basis examples (ℝ² and ℝ³), including conversion and back.
- **D4**: T(2, −3, 5) = (9, 23) and its standard matrix; Anton Example 2's [T](B′, B); T(*p*) = *x*·*p*(*x*) from P₂ to P₃; kernel and range of the D3 Test 1 matrix; composition and inverse.
- **E**: the five eigenvalue cases, including the surd eigenvalues 2 ± √3 with exact eigenvectors, the triangular matrix and its A⁹, class problem 6 (no rational roots, det = −17), and complex roots shown as 2 ± *i*.
- **E2**: diagonalization (D = diag(2, 2, 1); a non-diagonalizable matrix; A²⁵ = A; the surd case with P⁻¹AP = D exactly) and the Cayley–Hamilton illustration (Q(λ), p(A) = 0, A⁴ = 145A + 54I, A⁻¹ = (1/2)(A − 5I), and the 3 × 3 check).
- **B3**, from AMAT 105 Review & Exercises Problem A: *L*, *U*, the row operations, and both right-hand sides (*b* = [9, 0, −1] → *x* = [1, −1, 2]; *b* = [4, 3, 0] → *x* = [43/52, −53/52, 23/52]), plus zero pivots, a singular matrix, and a non-square matrix.
- **D3 Test 1**, the 4×5 example: RREF, pivot columns 1, 2, 3, all three bases, rank 3, nullity 2.
- **D3 Test 2**, the B3 matrix: RREF = *I*₃, rank 3, null space {0}.
- **D3 Test 3**, the 2×3 zero matrix: rank 0, nullity 3, null space basis *e*₁, *e*₂, *e*₃, empty row and column space bases.
- Fraction arithmetic and input parsing, row interchanges, and 1×1 and 6×6 sizes.
- The shared exact arithmetic: Surd (a + b√d), Poly (factoring over ℚ), and matrix determinants and adjoints with polynomial entries.
