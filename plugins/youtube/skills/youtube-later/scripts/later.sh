#!/usr/bin/env bash
# Read the "Later" playlist (not Watch Later) through gog, read-only.
#   later.sh list              every video, newest save first: n, id, title, channel, added (tab-separated)
#   later.sh find "<words>"    the 5 best title/channel matches, best first, same columns
# Env: LATER_ACCOUNT (default: the gog account alias "youtube"), LATER_TITLE (default Later).
# Exit 2 = auth needed, 4 = playlist not found.
set -euo pipefail

ACCOUNT="${LATER_ACCOUNT:-youtube}"
TITLE="${LATER_TITLE:-Later}"
HERE="$(cd "$(dirname "$0")" && pwd)"

gogyt() {
  local out
  if ! out="$(gog yt "$@" -a "${ACCOUNT}" --readonly --no-input -j 2>&1)"; then
    if grep -q 'auth_required\|invalid_grant' <<<"${out}"; then
      echo "auth needed: gog auth add <email> --services youtube --readonly (account: ${ACCOUNT})" >&2
      exit 2
    fi
    echo "${out}" >&2
    exit 1
  fi
  printf '%s\n' "${out}"
}

# Every page of a gog list command, one JSON document per line.
pages() {
  local token="" doc
  while :; do
    # Bash drops set -e inside $(...), so each failure has to exit by hand.
    doc="$(gogyt "$@" --max 50 ${token:+--page "${token}"} | tr -d '\n')" || exit $?
    printf '%s\n' "${doc}"
    token="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1]).get("nextPageToken") or "")' "${doc}")"
    [[ -n "${token}" ]] || break
  done
}

playlist_id() {
  local id
  id="$(pages playlists list --mine | python3 "${HERE}/later.py" playlist "${TITLE}")" || exit $?
  [[ -n "${id}" ]] || { echo "no playlist titled \"${TITLE}\" on ${ACCOUNT}" >&2; exit 4; }
  echo "${id}"
}

# The id is assigned first: a failed $(...) used as an argument would not stop the script.
case "${1:-}" in
  list)
    id="$(playlist_id)"
    pages playlists items list --playlist-id "${id}" | python3 "${HERE}/later.py" list ;;
  find)
    words="${2:?words required}"
    id="$(playlist_id)"
    pages playlists items list --playlist-id "${id}" | python3 "${HERE}/later.py" find "${words}" ;;
  *) sed -n '2,5p' "$0" >&2; exit 64 ;;
esac
