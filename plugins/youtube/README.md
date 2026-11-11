# youtube

`youtube-transcript` finds a YouTube video from a URL, an ID, a title, a channel name or a photo of the player, and saves its timestamped transcript to a file. The agent summarizes from that file instead of pasting the transcript into chat.

## Requirements

- bash and Python 3.
- `pip install -r skills/youtube-transcript/scripts/requirements.txt`, ideally into a virtual environment. Set `PYTHON` to that environment's interpreter. A `yt-dlp` CLI already on `PATH` is used in place of the package.

YouTube blocks transcript requests from many cloud and datacenter addresses, so the skill works best from a home or office connection.

## Usage

```sh
skills/youtube-transcript/scripts/yt.sh search "<query>"
skills/youtube-transcript/scripts/yt.sh channel @<handle> [n]
skills/youtube-transcript/scripts/yt.sh fetch <id|url> <out_dir>
```

Output shapes and exit codes are in [references/schemas/yt.schema.md](skills/youtube-transcript/references/schemas/yt.schema.md).
