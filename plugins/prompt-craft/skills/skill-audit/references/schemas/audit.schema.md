# Audit output

`scripts/audit.mjs --json` prints one object:

```json
{
  "skills": [
    {
      "path": "<absolute folder of the skill>",
      "name": "<frontmatter name, or the folder name>",
      "bodyLines": 0,
      "descriptionChars": 0,
      "findings": [
        {
          "id": "<rule id>",
          "severity": "fail | warn",
          "message": "<what is wrong>"
        }
      ]
    }
  ]
}
```

## Finding ids

| id | Severity | Meaning |
| --- | --- | --- |
| `frontmatter` | fail | No frontmatter block. |
| `name` | fail | `name` is missing or differs from the folder. |
| `description` | fail | No description. |
| `description-long` | fail | Over 1024 characters. |
| `description-short` | warn | Under 120 characters, too thin to trigger on. |
| `no-when` | warn | Never says when to use the skill. |
| `no-triggers` | warn | Has no "Triggers include" phrases. |
| `monolith` | warn | Body over 500 lines, or more than 10 `##` sections. |
| `no-scripts` | warn | 15 or more lines of code in the body and no `scripts/` folder. |
| `risky-flag` | warn | Mentions a risky verb and sets no `disable-model-invocation`. |
| `no-lessons` | warn | No word about learning, findings or lessons. |

The script exits `1` when any finding is a fail, `2` on a usage error and `0` otherwise.
