---
name: ping
description: Posts pull request review asks to a team chat channel in one fixed format, reusing earlier threads and never pinging twice. A script decides every message from pull request data and channel history, and the agent sends each one verbatim. Use when asked to ping, post or ask for reviews on pull requests, to re-ping after changes, or to preview pings. Previews by default and sends only when asked to post.
compatibility: Requires Node.js 20 or later and the gh CLI signed in to the code host. Needs a chat connector with read-channel, read-thread and send-message operations.
---

# Ping

A review ask posted by hand drifts in format, lands outside its thread and pings twice. The script decides and words every message, so the agent only fetches and sends. [Why each rule exists](references/rules.md).

Set up once: copy [config.example.json](references/config.example.json) to a private path outside any repo and fill it in. [Every key](references/config.md).

1. Pick the mode. Preview unless the request clearly says to post. A preview sends nothing and passes `--dry-run`.
2. Fetch the channel history from the chat connector. Read the channel with the oldest bound set to 90 days ago, paging until it is covered. Then read the thread of every message that has replies.
3. Save it as one JSON array of messages. Each message keeps `ts`, `user`, `text` and `thread_ts`, plus a `replies` array of the same shape for its thread. Do not edit the text.
4. Run `node scripts/ping.mjs --history <file> [--config <file>] [--pr <ref>]... [--dry-run]`. A `<ref>` is a pull request URL or `repo#number`. With no `--pr` it takes the user's open pull requests in the configured repos. It writes the plan, prints a preview and prints the plan path. [Plan shape](references/schemas/ping.schema.json).
5. Show the preview. Preview mode ends here.
6. Post mode: go through `actions` in order.
   - `send`: call the connector's send-message operation with `args` exactly as given. Add nothing and edit nothing. If it has `threadTsFrom`, first set `args.thread_ts` to the timestamp the send for that action id returned.
   - `skip`: send nothing and report the reason.
   - `hold`: send nothing and report that the hours rule held it.
   - `needs-reply`: read the thread at `thread_ts`, write a short answer to `question` (mention `changed` if it is not empty), and send it as a reply in that thread with `args` shaped like the other sends: same channel, `thread_ts`, and no broadcast. This is the only text you write.
7. Report each link the connector returns.

Never post without a plan from step 4, and never send a `send` action twice.
