#!/usr/bin/env bash
# Find a YouTube video and fetch its transcript.
#   yt.sh search "<query>"            top 8 search hits: id | title | channel | duration
#   yt.sh channel <@handle> [n]       the channel's newest n uploads (default 8)
#   yt.sh fetch <id|url> <out_dir>    writes <out_dir>/<id>.txt with a metadata header
# Set PYTHON to the interpreter that has scripts/requirements.txt installed (default python3).
set -euo pipefail

PY="${PYTHON:-python3}"

# The yt-dlp CLI when it is on PATH, else the pip package of the same name.
ytdlp() {
  if command -v yt-dlp >/dev/null 2>&1; then
    yt-dlp "$@"
  else
    "${PY}" -m yt_dlp "$@"
  fi
}

need() {
  if ! command -v yt-dlp >/dev/null 2>&1 && ! "${PY}" -c 'import yt_dlp' 2>/dev/null; then
    echo "missing: yt-dlp (pip install -r $(dirname "$0")/requirements.txt)" >&2
    exit 3
  fi
  if [[ "$1" == fetch ]] && ! "${PY}" -c 'import youtube_transcript_api' 2>/dev/null; then
    echo "missing: youtube-transcript-api for ${PY} (pip install -r $(dirname "$0")/requirements.txt)" >&2
    exit 3
  fi
}

video_id() {
  local arg="$1"
  if [[ "${arg}" =~ ^[A-Za-z0-9_-]{11}$ ]]; then
    echo "${arg}"
  else
    ytdlp --print id --skip-download --no-warnings "${arg}" | head -1
  fi
}

case "${1:-}" in
  search)
    need search
    ytdlp "ytsearch8:${2:?query required}" --flat-playlist --no-warnings \
      --print "%(id)s | %(title)s | %(channel)s | %(duration_string)s"
    ;;
  channel)
    need channel
    ytdlp "https://www.youtube.com/${2:?@handle required}/videos" --flat-playlist --no-warnings \
      --playlist-end "${3:-8}" --print "%(id)s | %(title)s | %(duration_string)s"
    ;;
  fetch)
    need fetch
    id="$(video_id "${2:?id or url required}")"
    out_dir="${3:?out_dir required}"
    mkdir -p "${out_dir}"
    out="${out_dir}/${id}.txt"
    {
      ytdlp --skip-download --no-warnings \
        --print "# %(title)s" --print "# %(channel)s | %(upload_date)s | %(duration_string)s" \
        --print "# %(webpage_url)s" "https://www.youtube.com/watch?v=${id}" || echo "# ${id}"
      echo
    } >"${out}"
    "${PY}" -W ignore - "${id}" >>"${out}" <<'PY'
import sys
from youtube_transcript_api import YouTubeTranscriptApi

segments = YouTubeTranscriptApi().fetch(sys.argv[1], languages=["en", "en-US", "en-GB"])
for s in segments:
    text = " ".join(s.text.split())
    print(f"[{int(s.start // 60)}:{int(s.start % 60):02d}] {text}")
PY
    echo "${out} ($(grep -c '^\[' "${out}") caption lines)"
    ;;
  *)
    sed -n '2,6p' "$0" >&2
    exit 2
    ;;
esac
