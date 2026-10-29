# Rung examples

Examples for each rung in `SKILL.md` section 4. They use a TypeScript and ESLint stack because it is common; the same reasoning holds for any typed language and linter.

## Type system

- A required parameter instead of an optional one the caller must remember to pass.
- A union of literal types instead of a free string.
- A branded type, so a raw `string` cannot stand in for a `UserId`.
- `satisfies`, so an object literal is checked against a shape without widening it.

## Existing lint rule

Prefer the narrow restriction rules before a raw syntax selector, because they give better messages and survive parser changes. In ESLint that order is `no-restricted-imports`, `no-restricted-properties` and `no-restricted-globals`, then `no-restricted-syntax`.

## Lint traps that make a rule silently miss

- ESLint flat config does not merge `no-restricted-syntax` across blocks. A later block matching the same files replaces the whole array, so keep every entry for a glob together.
- `` styled(X)`css` `` is a `TaggedTemplateExpression`, and `styled(X)({...})` is a `CallExpression`. A selector written for one misses the other.
- A quoted object key is a `Literal` (`key.value`), an unquoted one an `Identifier` (`key.name`).

## Custom lint rule

Write it in the repo's local lint plugin when one exists. Give it a rule-tester case for one valid and one invalid snippet, so a parser upgrade that breaks the selector fails a test instead of passing silently.

## Commit hook

Run the hook's tool on a sample message instead of committing:

```sh
echo "bad message" | npx --no -- commitlint
```
