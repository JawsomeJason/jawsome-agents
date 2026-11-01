# ADR-0001: `extends` chains replace numbered layers

Status: accepted.

## Decision

A playbook file names its parents in `extends`, and those chains set the order files apply in. Folders under the config dir say where a file is active and never its order. A file's quotes see only what its ancestors wrote, so the result does not depend on the order siblings are read in.

## Why

Numbered layer folders ordered files by location, so a rule's position said nothing about what it depended on, and moving a file changed the result. Chains state the dependency in the file, and `playbook check` can prove each quote still anchors.

## Consequences

- Every stem is unique, because a stem is how a file is named in `extends`.
- Two siblings that replace the same words fail `check`, and one must extend the other.
- A file whose parent exists only in another context is dormant, not broken.
