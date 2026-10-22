# Kostaraa Application Typography

This document defines the frontend typography hierarchy for the Kostaraa workspace. New frontend screens should use these semantic roles instead of choosing one-off sizes or weights.

## Font family

```css
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

## Core hierarchy

| Role | Desktop | Mobile | Usage |
| --- | --- | --- | --- |
| Page title | 32px / 700 | 28px / 700 | One primary heading per page |
| Section title | 18px / 700 | 18px / 700 | Major cards and page sections |
| Modal title | 24px / 700 | 22px / 700 | Dialog heading |
| Primary financial result | 24px / 700 | 22px / 700 | The most important calculated value |
| Standard financial value | 20px / 700 | 19px / 700 | Totals and major supporting results |
| List item name | 14px / 600 | 14px / 600 | Primary identifier in a table or list row |
| Repeated table value | 14px / 400 | 14px / 400 | Unit costs and other scannable row values |
| Subheading | 16px / 600 | 16px / 600 | Small content-group heading |
| Control text | 14px / 500 | 16px / 500 for form inputs | Inputs and selects |
| Button text | 14px / 600 | 14px / 600 | Primary and secondary actions |
| Field label | 13px / 600 | 13px / 600 | Form and control labels |
| Body text | 14px / 400 | 14px / 400 | Default readable copy |
| Supporting text | 12px / 400 | 12px / 400 | Descriptions, categories, and hints |
| Micro label | 11px / 600 | 11px / 600 | Table headings, eyebrows, and compact metadata |

Sizes are written as `font-size / font-weight`.

## Casing and emphasis

- Use Title Case for page titles, named sections, result labels, and card titles.
- Use sentence case for instructional headings, labels, actions, descriptions, hints, and validation messages.
- Reserve uppercase for short table headings and eyebrow labels only.
- Use weight 700 for headings and important numeric values.
- Use weight 600 for labels and actions.
- Use weight 500 for control values or secondary emphasis.
- Use weight 400 for body and supporting copy.
- Do not use weights above 700 in workspace interfaces.

## Financial hierarchy

- Only one value in a result group should use the primary 24px treatment.
- Related totals use 20px.
- Repeated values in inventory rows use 14px / 400 so they remain easy to scan without competing with totals.
- Labels must remain quieter than their values.
- Currency values should use consistent weight and tabular alignment where practical.

## Inventory reference hierarchy

Inventory is the current reference implementation for workspace text hierarchy. Preserve this relationship when aligning other frontend pages: large type identifies the page or modal, medium weight identifies the item or action, and repeated data remains visually quiet.

Audited against the frontend implementation on October 19, 2026.

### Color roles

| Role | Value | Usage |
| --- | --- | --- |
| Ink | `#172b4d` | Page titles, material names, control values, and primary data |
| Body | `#40536f` | Labels and secondary interface text |
| Muted | `#687991` | Units, hints, pagination, and supporting information |
| Action | `#1765e8` | Interactive actions and focus states |
| Danger | `#b53443` | Destructive actions and errors |

### Page and measurement controls

| Element | Desktop | Mobile | Line height | Notes |
| --- | --- | --- | --- | --- |
| Inventory page title | 32px / 700 | 28px / 700 | 1.15 | `-.02em` letter spacing |
| Measurement section title | 18px / 700 | 18px / 700 | 1.3 | Sentence case |
| Field label | 13px / 600 | 13px / 600 | 1.4 | Business category and dialog labels |
| Select and search value | 14px / 500 | 16px / 500 | 1.4 | Mobile inputs remain at least 16px |
| Header and control buttons | 14px / 600 | 14px / 600 | 1.35 | Download, upload, add, pagination |
| Alert message | 13px / 500 | 13px / 500 | 1.45 | Success, error, loading, and import states |
| Tooltip copy | 12px / 400 | 12px / 400 | 1.5 | Supplementary explanation only |

### Inventory table and bulk actions

| Element | Size / weight | Line height | Notes |
| --- | --- | --- | --- |
| Table heading | 11px / 600 | 1.35 | Uppercase with `.06em` letter spacing |
| Selection status | 13px / 400 | Default | Count becomes 600 for emphasis |
| Bulk action | 13px / 600 | Default | Deselect and delete actions |
| Material name | 14px / 600 | 1.4 | Primary row identifier |
| Unit-cost amount | 14px / 400 | 1.3 | Same ink color as the material name, lower emphasis |
| Unit suffix | 12px / 400 | Default | Muted `per g`, `per pcs`, and similar units |
| Overflow-menu action | 13px / 500 | Default | Edit, Duplicate, and Delete |
| Pagination summary | 13px / 400 | Default | Range and total count |
| Pagination page indicator | 12px / 500 | Default | Current page metadata |

### Material dialog

| Element | Desktop | Mobile | Line height | Notes |
| --- | --- | --- | --- | --- |
| Dialog title | 24px / 700 | 22px / 700 | 1.2 | `-.02em` letter spacing |
| Field label | 13px / 600 | 13px / 600 | 1.4 | Keep labels above controls |
| Input and select value | 14px / 500 | 16px / 500 | 1.4 | Primary form entry text |
| Optional label and hint | 11px / 400 | 11px / 400 | 1.45 | Muted supporting information |
| Validation message | 11px / 600 | 11px / 600 | 1.45 | Danger color |
| Currency prefix | 12px / 600 | 12px / 600 | Default | Supporting prefix inside money inputs |
| Dialog action | 14px / 600 | 14px / 600 | 1.35 | Cancel, add, save, and delete |

### Inventory emphasis rules

- Use 700 only for page, section, modal, and empty-state headings.
- Use 600 for material names, labels, and explicit actions.
- Use 500 for editable values and overflow-menu commands.
- Use 400 for repeated costs, units, hints, and pagination metadata.
- Keep row amounts the same color as material names; hierarchy comes from weight, not decorative color.
- Uppercase is limited to short table headings. Eyebrows are not currently used on Inventory.
- Do not reintroduce category text beneath material names unless the information becomes necessary for row-level decisions.

## Implementation

- Calculator rules: `src/features/workspace/styles/calculator-typography-unified.css`
- Inventory rules: `src/features/costing/styles/inventory.css`

When a global utility conflicts with a feature’s semantic typography, use a feature-specific class rather than increasing generic utility sizes.
