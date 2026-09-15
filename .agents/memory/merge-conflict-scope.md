---
name: Merge conflict variable scope
description: When resolving merge conflicts, verify that variables used in the incoming change are actually in scope
---

# Merge conflict variable scope

## Rule

When a merge conflict resolves to a remote change that introduces a new variable reference, verify that variable is defined in the same scope before accepting the remote version.

## Example

In `ProductDetail.tsx`, the remote change introduced:

```tsx
{total > 0 && <span>({total} reviews)</span>}
```

`total` was defined only inside the nested `ReviewsSection` component, not in the parent product detail scope where the rating badge lives. Accepting the remote version blindly produced a TypeScript error (`Cannot find name 'total'`).

**How to apply:**
1. After resolving any conflict, run `pnpm run typecheck`.
2. If the incoming change references an undefined variable, either use the existing parent-scope variable (e.g. `stats?.total`) or declare the needed variable in the parent scope.
3. Prefer the existing local pattern if it is already correct and the remote change is just a partial refactor that forgot scope.
