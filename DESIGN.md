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
| Inputs and size select | Black border | Accent border + outline | Tint fill | Invalid: 2px black border + tint, `aria-invalid` |

All buttons and inputs are at least 48px tall.

## Motion

None. The one exception: after Solve, the page scrolls to the solution (smoothly unless the user prefers reduced motion).

## Layout

- Max width 960px. Input first, then the solution, in this order: row operations → L and U → forward substitution → back substitution → x → check.
- At 480px and below, Solve goes full width, cell width stays 48px, and the `b` column moves below `A` when it does not fit beside it.
- Wide matrices scroll inside their own box. The page itself never scrolls sideways (checked at 375px with a 5×5 matrix).
