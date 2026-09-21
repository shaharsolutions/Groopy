# Project Guidelines: V2 Exclusive Development

## 1. Background & Context
TikTak supports two operational modes managed via `featureFlags.js`:
- **V2 (New / Modern)**: Multi-board management, dynamic table cells (`renderV2TableCell`), customized project fields, modern modals, and "פרויקט" (Project) terminology (`flags.isV2 === true`).
- **Legacy (Classic)**: Single-board, fixed fields, and "עבודה" (Work) terminology (`flags.isLegacy === true`).

## 2. Core Directive: V2 Target Only
- **All future development, UI improvements, bug fixes, and feature additions must target Version 2 (V2) exclusively.**
- When writing or updating features, apply them inside V2 code paths (e.g. `if (flags.isV2) { ... }`) or within V2-specific components and functions.

## 3. Safeguarding Legacy (Active Client Protection)
- **There is an active client using the Legacy version in production.**
- **DO NOT** delete, break, or inadvertently alter Legacy flows or components.
- **DO NOT** remove the version toggle in settings or user management.
- **DO NOT** force `isV2 = true` globally in `featureFlags.js`—the client must continue to operate seamlessly on `appVersion: 'legacy'`.
- Ensure any modifications to shared services, utility functions, or database queries remain backwards-compatible with Legacy data structures.

## 4. V2 Conventions & Standards
- Terminology: Use project terminology ("פרויקט", "פרויקטים") as resolved by `flags.terms`.
- UI & Layout: Utilize modern cards, board selector navigation, and dynamic column renderers.
- Modals & Forms: Use the V2 compact create modals and board-aware selectors.
