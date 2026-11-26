# Design tokens

All tokens live in `:root` in [style.css](style.css). Change them there, not inline.

## Color (three colors, plus tints of black)

| Token | Value | Use | Contrast on white |
|---|---|---|---|
| `--ink` | `#111` | Text, matrix brackets, error border | 18.9:1 |
| `--paper` | `#fff` | Background, text on the Solve button | n/a |
| `--accent` | `#1d4ed8` | Solve button, focus ring, links, the row changed in each step, the "Solution x" heading | 6.7:1 (white on accent: 6.7:1) |
| `--ink-muted` | `#4d4d4d` | Secondary text (hints, step numbers, L notes) | 8.5:1 |
| `--line` | `#767676` | Input and secondary-button borders | 4.5:1 |
| `--line-soft` | `#d4d4d4` | Dividers and card borders (never text) | decorative |
| `--tint` / `--tint-strong` | black at 5% / 10% | Hover fill, skipped steps, invalid cells, disabled fill | decorative |

There is no red. Errors are shown with a thick black border and fill on the bad cell, plus a bold message in a box with a black left border.

## Type

- One family: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Sizes: 15px (`--text-sm`), 17px body (`--text`), 20px (`--text-lg`), 28px headings (`--text-xl`, 24px on phones).
- `font-variant-numeric: tabular-nums` on every matrix, input, step, and result.
- No italics. `<var>` and `<cite>` are set upright and semibold.
- A true minus sign (−, U+2212) is used in displayed output. Input accepts `-` or `−`.

## Space

8px scale: `--s1` 8, `--s2` 16, `--s3` 24, `--s4` 32, `--s6` 48, `--s8` 64. Page gutter is 16px.

## Radius

- Inputs and buttons: 4px (`--r`).
- Input panel and step cards: 8px with 16 to 24px padding. Nothing inside them has a radius that would need nesting (inner = outer − padding would be ≤ 0, so inner content is square).

## Controls and states

| Element | Hover | Focus (keyboard) | Disabled | Other |
|---|---|---|---|---|
| Solve (primary, the only accent button) | Underlined label + inset white ring | 3px accent outline, 2px offset | Gray fill, muted text, `not-allowed` cursor (when any entry of A is empty, with a note saying how many) | Active: thicker ring |
| Secondary buttons (Load example, Clear) | Black border + light tint | Same outline | Same as Solve | |
| Inputs and size selects | Black border | Accent border + outline | Tint fill | Invalid: 2px black border + tint, `aria-invalid` |
| Topic, built (a link) | Light tint + black edge bar | Same outline | n/a | Active: accent text + 3px accent bar on the left edge (bottom edge in the phone row), `aria-current="page"`, never a filled pill |
| Topic, planned | n/a | Not focusable | Always: muted text, "Planned" label, `not-allowed` cursor, `aria-disabled` | Not a link |

Each tab has exactly one primary button:

| Topic | Primary button |
|---|---|
| Systems of Linear Equations | Solve |
| Matrices and Matrix Operations | Compute |
| LU Decomposition | Solve |
| Determinants | Find determinant |
| Real Vector Spaces | Check |
| Coordinates and Bases | Compute |
| Row, Column and Null Spaces | Find bases |
| Linear Transformations | Compute |

All buttons and inputs are at least 48px tall.

## Motion

None. The one exception: after Solve, the page scrolls to the solution (smoothly unless the user prefers reduced motion).

## Layout

- Topic list: one entry per slide set, in course order (Systems of Linear Equations → … → Eigenvalues and Eigenvectors → Diagonalization and Cayley–Hamilton), with no slide codes shown. Wider than 800px it is a 232px side column to the left of the content that stays in view while scrolling (sticky). At 800px and below it becomes a row above the content that scrolls sideways inside itself, with 168px entries so the next one peeks in; the active topic is centered in that row.
- Routing: `#ab1`, `#b2`, `#b3`, `#c`, `#d1`, `#d2`, `#d3`, `#d4`. An unknown or planned hash falls back to the default, D3.
- Pivot columns (D3) use the same accent bold as the changed row in each step.
- Equations that hold several matrices, such as the parametric vector form, wrap on a phone, and a coefficient always stays with its vector ("+ t [v]").
- Max width 1200px (side column + content). In each tab, the input comes first, then the solution.
  - Systems of Linear Equations order: [A | b] → Gaussian elimination steps → row echelon form → consistency (the 0 = 1 row in blue, or the leading and free variables) → back-substitution → the solution or solution set → check.
  - Matrices and Matrix Operations: an operation select shows only the inputs that operation needs. Order: inputs → the rule → the result; AB adds a closed "Show how each entry is computed" disclosure; A⁻¹ shows [A | I] → Gauss–Jordan steps → [I | A⁻¹] → A⁻¹ → AA⁻¹ = I; the elementary-product decomposition shows the steps with Eᵢ notes → the inverses → A = E₁⁻¹⋯Eₚ⁻¹ multiplied out and checked. "Load example" loads the first test case for the chosen operation.
  - B3 order: row operations → L and U → forward substitution → back substitution → x → check.
  - Determinants order: depends on the method. Definition: the table of permutations → the sum. Cofactors: A with the chosen row or column in blue → each cofactor with its minor worked out (nested for 4 × 4) → the sum. Adjoint: cofactors → C → adj(A) → A·adj(A) = det(A)I → A⁻¹ and AA⁻¹ = I. Each ends with "The determinant".
  - Real Vector Spaces, Coordinates and Bases, Linear Transformations: a "Question" or "Task" select shows only the inputs that task needs; vectors (bases, images) are entered as the columns of a grid. Order: the matrix to reduce → its row operations → R (pivot columns in blue when they matter) → the conclusion, in a failure block when the answer is "no" → the answer block → a check.
  - Notation without subscript letters: [v](B) is the coordinate vector of v relative to B, P(B′→B) the transition matrix from B′ to B, and [T](B′, B) the matrix of T relative to B and B′. Each panel's intro defines it, and every matrix is labeled with both bases.
  - D3 order: Gauss–Jordan steps → R and the pivot columns → row space → column space → null space → rank, nullity and the Dimension Theorem → Av = 0.
- At 480px and below, Solve goes full width, cell width stays 48px, and the `b` column moves below `A` when it does not fit beside it.
- Undefined operations (sizes that do not match, a singular matrix) are shown as a "Not defined" or "A is singular" block with the existing failure style (2px black top border, bold text), never as a crash.
- Wide matrices scroll inside their own box. The page itself never scrolls sideways (checked at 375px with a 5×5 B3 matrix and a 6×6 D3 matrix).

## Added CSS (for the remaining topics)

These classes were added; nothing that existed before was changed.

| Class | Use |
|---|---|
| `.m-cell.is-aug` | The vertical bar of an augmented matrix [A \| b] or [A \| I]: 2px `--ink` left border, 16px gap. Set with `Render.matrix(M, { augment: n })`. |
| `.disclosure` | A native `<details>` closed by default. The summary is accent-colored, semibold, at least 48px tall, underlined on hover, with the standard focus ring. |
| `.data-table` | A plain table (the permutation terms of a determinant): 1px `--line-soft` row rules, tabular numerals, numbers right-aligned (`.num`). It scrolls inside its own box. |
| `.field-wide` | A field whose select has long option text (the operation and elementary-matrix type selects). It may shrink to the available width on phones; the native picker still shows the full text. |
| `[hidden]` | `display: none !important`, so the `hidden` attribute always wins over rules such as `.field { display: flex }`. |
