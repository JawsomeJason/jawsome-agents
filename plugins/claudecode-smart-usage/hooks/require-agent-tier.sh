#!/bin/bash
# PreToolUse on Agent: every spawned subagent names its model and effort on purpose,
# instead of silently inheriting the session's. Forks are exempt: they always run on the
# parent's model and effort. The guidance comes from tiers.ts beside this script, or from
# the file the plugin's tiersFile option names.

INPUT=$(cat)
read -r TYPE MODEL EFFORT < <(printf '%s' "$INPUT" | python3 -c '
import json, sys
t = json.load(sys.stdin).get("tool_input", {})
print(t.get("subagent_type") or "-", t.get("model") or "-", t.get("effort") or "-")
' 2>/dev/null)

[ "$TYPE" = fork ] && exit 0
[ "$MODEL" != - ] && [ "$EFFORT" != - ] && exit 0

missing=()
[ "$MODEL" = - ] && missing+=(model)
[ "$EFFORT" = - ] && missing+=(effort)

TIERS="${CLAUDE_PLUGIN_OPTION_TIERSFILE:-$(dirname "$0")/tiers.ts}"
guide=$(python3 - "$TIERS" <<'EOF' 2>/dev/null
import json, sys
s = open(sys.argv[1]).read()
start = s.find("export default")
t = json.loads(s if start < 0 else s[start + len("export default"):])
print("Model tiers (pass both model and effort):")
for m, v in t["models"].items():
    print(f"  {m:<6} + {v['effort']:<6}  {v['when']}")
print("\nEffort levels, if the task calls for a different one:")
for lvl, when in t["efforts"].items():
    print(f"  {lvl:<6}  {when}")
EOF
)
[ -n "$guide" ] || guide="Model tiers: haiku+low trivial, sonnet+high well-specified, opus+medium judgment, fable+high one hard task. (No readable tiers file at $TIERS.)"

cat >&2 <<EOF
Subagent spawn blocked: set ${missing[*]} explicitly. The user asks for a deliberate model
and effort on every subagent (this is that explicit instruction, so pass effort even though
the tool's own note says to leave it unset). A skill or the user naming a model or effort wins.

$guide
EOF
exit 2
