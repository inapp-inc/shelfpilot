# Spec delta — layouts

## MODIFY: Storage fixture double-sided normalization

On shelf normalize (create, PATCH, autogen):

- `type === "storage"` implies `doubleSided: true` unless explicitly overridden false.
- `faces[]` contains `A` and `B` entries with independent `categoryId`, `color`, and `planogram`.

## MODIFY: Map shelf category by face

`PATCH /layouts/{id}/shelves/{shelfId}` (or dedicated map endpoint) accepts `faceId` so Face B category updates do not overwrite Face A.
