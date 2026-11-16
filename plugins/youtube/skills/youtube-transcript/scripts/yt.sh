#!/usr/bin/env bash
# Find a YouTube video and fetch its transcript.
#   yt.sh search "<query>"            top 8 search hits: id | title | channel | duration
#   yt.sh channel <@handle> [n]       the channel's newest n uploads (default 8)
#   yt.sh fetch <id|url> [out_dir]    writes <out_dir>/<id>.txt (default: a new temp dir) with a header and the description
#   yt.sh save <id|url> [notes_dir]   fetch, then write a Markdown note to notes_dir (default $YT_NOTES_DIR);
#                                     a video already saved there is not fetched again
# Missing Python packages install themselves into a private venv under ~/.cache/youtube-transcript;
# set PYTHON to use an interpreter of your own instead.
set -euo pipefail

VENV="${XDG_CACHE_HOME:-${HOME}/.cache}/youtube-transcript/venv"
PY="${PYTHON:-python3}"
if [[ -z "${PYTHON:-}" && -x "${VENV}/bin/python" ]]; then PY="${VENV}/bin/python"; fi

# The yt-dlp CLI when it is on PATH, else the pip package of the same name.
ytdlp() {
  if command -v yt-dlp >/dev/null 2>&1; then
    yt-dlp "$@"
  else
    "${PY}" -m yt_dlp "$@"
  fi
}

# Build the private venv once, quietly, so a missing package never needs an agent's hands.
bootstrap() {
  [[ -z "${PYTHON:-}" ]] || return 1
  echo "installing transcript packages into ${VENV} (one time)" >&2
  if command -v uv >/dev/null 2>&1; then
    uv venv -q "${VENV}" && uv pip install -q --python "${VENV}/bin/python" -r "$(dirname "$0")/requirements.txt"
  else
    python3 -m venv "${VENV}" && "${VENV}/bin/pip" install -q -r "$(dirname "$0")/requirements.txt"
  fi >&2 && PY="${VENV}/bin/python"
}

need() {
  if ! command -v yt-dlp >/dev/null 2>&1 && ! "${PY}" -c 'import yt_dlp' 2>/dev/null; then bootstrap || true; fi
  if [[ "$1" == fetch ]] && ! "${PY}" -c 'import youtube_transcript_api' 2>/dev/null; then bootstrap || true; fi
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
    out_dir="${3:-$(mktemp -d)}"
    mkdir -p "${out_dir}"
    out="${out_dir}/${id}.txt"
    {
      ytdlp -J --skip-download --no-warnings "https://www.youtube.com/watch?v=${id}" | "${PY}" -c '
import json, sys
d = json.load(sys.stdin)
print("# " + d["title"])
print("# %s | %s | %s | %s" % (d.get("channel"), d.get("upload_date"), d.get("duration_string"), d.get("channel_url") or ""))
print("# " + d["webpage_url"])
print()
# Quote the description so its lines never look like header or caption lines.
for line in (d.get("description") or "").strip().splitlines():
    print(f"> {line}".rstrip())
' 2>/dev/null || echo "# ${id}"
      echo
    } >"${out}"
    # A failed fetch leaves no half-written file behind.
    trap 'rm -f "${out}"' ERR
    "${PY}" -W ignore - "${id}" >>"${out}" <<'PY'
import sys
from youtube_transcript_api import YouTubeTranscriptApi

try:
    segments = YouTubeTranscriptApi().fetch(sys.argv[1], languages=["en", "en-US", "en-GB"])
except Exception as e:
    # One line instead of a traceback: the reason is all the agent needs.
    print(f"no transcript: {type(e).__name__}: {str(e).strip().splitlines()[0] if str(e).strip() else ''}", file=sys.stderr)
    sys.exit(4)
print("# captions: " + ("auto-generated" if segments.is_generated else "manual"))
for s in segments:
    text = " ".join(s.text.split())
    print(f"[{int(s.start // 60)}:{int(s.start % 60):02d}] {text}")
PY
    echo "${out} ($(grep -c '^\[' "${out}") caption lines)"
    ;;
  save)
    need fetch
    id="$(video_id "${2:?id or url required}")"
    dir="${3:-${YT_NOTES_DIR:?set YT_NOTES_DIR or pass notes_dir}}"
    hit="$(grep -l "^source: .*watch?v=${id}" "${dir}"/*.md 2>/dev/null | head -1 || true)"
    if [[ -n "${hit}" ]]; then
      echo "${hit} (already saved)"
      exit 0
    fi
    tmp="$(mktemp -d)"
    "$0" fetch "${id}" "${tmp}" >/dev/null
    "${PY}" "$(dirname "$0")/note.py" "${tmp}/${id}.txt" "${dir}"
    ;;
  *)
    sed -n '2,9p' "$0" >&2
    exit 2
    ;;
esac
