# note.py output

`yt.sh save` calls `note.py <fetch file> <notes dir>`. It reads a file in the `fetch` shape from [yt.schema.md](yt.schema.md), writes the note that schema's `save` section shows, and prints `<note path> (<count> caption lines)`.

`note.py --test` runs a self-check on a sample fetch file and prints `ok`.

## Exit codes

- `0`: the note was written.
- `64`: wrong arguments; usage goes to stderr.
- Any other non-zero code is a Python error, such as an unreadable fetch file or a notes folder that cannot be written.
