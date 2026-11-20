# ping

Posts pull request review asks to a team chat channel in one fixed format. A script decides every message and the agent sends each one as given, so the format never drifts and nobody gets pinged twice.

The script never calls the chat service. The agent saves the channel history as JSON, the script reads it with the pull request data from `gh` and writes a plan: an ordered list of `send`, `skip`, `hold` and `needs-reply` actions. Each `send` carries the exact arguments for the connector's send-message operation.

## Install

```sh
npx skills add JawsomeJason/jawsome-agents --skill ping
```

Copy `skills/ping/references/config.example.json` to a private path outside any repo, such as `~/.config/jawsome/ping.json`, and fill it in. [Every key](skills/ping/references/config.md) and [why each rule exists](skills/ping/references/rules.md).

## Use

Ask to preview or post review asks. A preview is the default: it prints each action and sends nothing.

## Develop

```sh
node --test 'plugins/ping/tests/*.test.mjs'
```

The decision functions are pure and exported from `scripts/ping.mjs`. Only `fetchPr` calls `gh`.
