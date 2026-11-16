# later.sh output

`later.sh` calls `later.py` to turn the gog CLI's JSON pages into plain text rows, so an agent without gog can write the same output by hand.

## list

One line per video in playlist order, fields split by a tab. Deleted and private videos, which have no channel, are left out, so the position can skip a number:

```text
<position from 1>	<11-char id>	<title>	<channel>	<date added YYYY-MM-DD>
```

An empty playlist prints `(empty)`.

## find

The same row shape, at most 5 rows, best match first. A row's score is how many of the given words appear in its title or channel, case-insensitive; ties keep playlist order. When no row shares a word, it prints `(no match)`.

## Exit codes

- `0`: success.
- `1`: gog failed for another reason; its message goes to stderr.
- `2`: the token is missing or expired; stderr gives the `gog auth add` command.
- `4`: no playlist on the account has the title in LATER_TITLE (default `Later`).
- `64`: unknown command; usage goes to stderr.

## By hand

Open the playlist on the YouTube site and copy each video's title and channel into the row shape, taking the id from the `v=` part of its link.
