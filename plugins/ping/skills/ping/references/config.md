# Ping config

A JSON file outside the repo. The script reads its path from `--config`, then `PING_CONFIG`, then `~/.config/jawsome/ping.json`. [config.example.json](config.example.json) shows every key with fake values.

- `channel`: id of the channel the asks go to. Required.
- `user`: chat id of the person pinging. The script treats only this user's messages as earlier pings. Required.
- `repos`: `org/repo` names. A bare `repo#12` argument resolves against them, and a run with no pull request argument lists the user's open pull requests in each. Required.
- `reviewers`: map from a code-host login, or a team slug, to a chat user id. Pending review requests that map here produce the SME line. Unmapped requests are ignored.
- `ticketRegex`: finds a ticket key in the pull request title or branch name. Optional.
- `ticketBaseUrl`: a link prefix for the key. Optional. Without it the key is plain text.
- `timezone`: an IANA zone. It decides what "today" means for the one-ask-per-day rule and for working hours. Defaults to UTC.
- `hours`: `start`, `end` and `weekdays`. Outside them every send becomes a `hold`. Optional.
- `planFile`: where the script writes the plan. Defaults to `ping-plan.json` beside the config.
