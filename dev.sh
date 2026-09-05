#!/usr/bin/env bash

set -euo pipefail

session_name="${CARDS_TMUX_SESSION:-cards}"
detached=false

usage() {
  echo "Usage: $0 [--detached|-d]"
  echo "Set CARDS_TMUX_SESSION to override the tmux session name."
}

case "${1:-}" in
  "") ;;
  --detached|-d) detached=true ;;
  --help|-h)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

if [[ ! "$session_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo "CARDS_TMUX_SESSION may only contain letters, numbers, underscores, and hyphens." >&2
  exit 2
fi

for command in tmux go npm cargo; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 1
  fi
done

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

attach_session() {
  if [[ "$detached" == true ]]; then
    return
  fi

  if [[ -n "${TMUX:-}" ]]; then
    exec tmux switch-client -t "$session_name"
  else
    exec tmux attach-session -t "$session_name"
  fi
}

if tmux has-session -t "$session_name" 2>/dev/null; then
  echo "tmux session '$session_name' is already running."
  attach_session
  exit 0
fi

session_created=false
cleanup() {
  if [[ "$session_created" == true ]]; then
    tmux kill-session -t "$session_name" 2>/dev/null || true
  fi
}
trap cleanup ERR INT TERM

tmux new-session -d -s "$session_name" -n backend -c "$project_root" "exec go run ."
session_created=true
tmux set-option -t "$session_name" remain-on-exit on >/dev/null
tmux new-window -d -t "$session_name:" -n frontend -c "$project_root" "exec npm run dev"
tmux new-window -d -t "$session_name:" -n dice -c "$project_root" "exec cargo run -p cards-dice-service"
tmux select-window -t "$session_name:backend"

session_created=false
trap - ERR INT TERM

echo "Started '$session_name' with tmux windows: backend, frontend, dice."
attach_session
