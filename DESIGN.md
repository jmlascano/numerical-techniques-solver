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

Each tab has exactly one primary button: "Solve" (B3) or "Find bases" (D3).

All buttons and inputs are at least 48px tall.

## Motion

None. The one exception: after Solve, the page scrolls to the solution (smoothly unless the user prefers reduced motion).

## Layout

- Topic list: one entry per slide set, in course order (Systems of Linear Equations → … → Eigenvalues and Eigenvectors), with no slide codes shown. Wider than 800px it is a 232px side column to the left of the content that stays in view while scrolling (sticky). At 800px and below it becomes a row above the content that scrolls sideways inside itself, with 168px entries so the next one peeks in; the active topic is centered in that row.
- Routing: `#b3`, `#d3`. An unknown or planned hash falls back to the default, D3.
- Pivot columns (D3) use the same accent bold as the changed row in each step.
- Equations that hold several matrices, such as the parametric vector form, wrap on a phone, and a coefficient always stays with its vector ("+ t [v]").
- Max width 1200px (side column + content). In each tab, the input comes first, then the solution.
  - B3 order: row operations → L and U → forward substitution → back substitution → x → check.
  - D3 order: Gauss–Jordan steps → R and the pivot columns → row space → column space → null space → rank, nullity and the Dimension Theorem → Av = 0.
- At 480px and below, Solve goes full width, cell width stays 48px, and the `b` column moves below `A` when it does not fit beside it.
- Wide matrices scroll inside their own box. The page itself never scrolls sideways (checked at 375px with a 5×5 B3 matrix and a 6×6 D3 matrix).
