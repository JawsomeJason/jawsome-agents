# meetings

Ships [Amie](https://amie.so) as an MCP server, so a calendar arrives with the rest of your plugins instead of being hand-added to the user config on every machine.

Once authorized, the agent can read and write calendar events, todos and todo lists, read meeting notes with their transcripts and action items, read Amie pages, and search, label and draft mail on the connected Gmail account.

## Install

```
/plugin install meetings --marketplace JawsomeJason/jawsome-agents
```

## Authorize

Amie signs in with OAuth, and the token lives on the machine — it is not in this plugin. After installing, run `/mcp` in an interactive `claude` terminal and authorize `plugin:meetings:amie` once per machine. Until then the tools are listed but unavailable.

You connect your own Amie account; the plugin carries no credentials and no account of its own.

## Note

If `amie` is also set as a user-level MCP server, you will see two entries (`amie` and `plugin:meetings:amie`), each wanting its own authorization. Drop the user-level one with `claude mcp remove amie`.
