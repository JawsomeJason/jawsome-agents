#!/usr/bin/env bats

# Run: bats plugins/smart-usage-claude/tests/require-agent-tier.bats

HOOK="$BATS_TEST_DIRNAME/../hooks/require-agent-tier.sh"

setup() {
  TEST_DIR="$(mktemp -d)"
  unset CLAUDE_PLUGIN_OPTION_TIERSFILE
}

teardown() {
  rm -rf "$TEST_DIR"
}

run_hook() {
  run bash -c "echo \"\$1\" | bash \"\$2\"" -- "$1" "$HOOK"
}

agent_json() { printf '{"tool_input":{"description":"d","prompt":"p"%s}}' "$1"; }

@test "agent tier: blocks a spawn with no model or effort" {
  run_hook "$(agent_json '')"
  [ "$status" -eq 2 ]
  [[ "$output" == *"set model effort explicitly"* ]]
}

@test "agent tier: blocks a spawn with a model but no effort" {
  run_hook "$(agent_json ',"model":"sonnet"')"
  [ "$status" -eq 2 ]
  [[ "$output" == *"set effort explicitly"* ]]
}

@test "agent tier: allows a spawn with model and effort" {
  run_hook "$(agent_json ',"model":"opus","effort":"medium"')"
  [ "$status" -eq 0 ]
}

@test "agent tier: forks are exempt" {
  run_hook "$(agent_json ',"subagent_type":"fork"')"
  [ "$status" -eq 0 ]
}

@test "agent tier: guidance comes from the plugin's tiers.ts" {
  run_hook "$(agent_json '')"
  [[ "$output" == *"sonnet + high"* ]]
  [[ "$output" == *"xhigh   The user hands off"* ]]
}

@test "agent tier: the tiersFile option replaces the guidance" {
  printf '{"efforts":{"low":"Quick asks."},"models":{"mini":{"effort":"low","when":"Lookups."}}}' > "$TEST_DIR/tiers.json"
  CLAUDE_PLUGIN_OPTION_TIERSFILE="$TEST_DIR/tiers.json" run_hook "$(agent_json '')"
  [ "$status" -eq 2 ]
  [[ "$output" == *"mini   + low     Lookups."* ]]
  [[ "$output" != *"sonnet"* ]]
}
