#!/bin/sh
# Installs the AI voice (VieNeu-TTS) for the MC: Python 3.12 and the library in
# vieneu/.venv, the model in vieneu/model. About 1.2 GB, all on this machine.
# Needs uv (https://docs.astral.sh/uv/; on a Mac: brew install uv).
set -e
cd "$(dirname "$0")"
if ! command -v uv >/dev/null 2>&1; then
  echo "Cần uv để cài Python: brew install uv (hoặc xem https://docs.astral.sh/uv/)" >&2
  exit 1
fi
uv venv --python 3.12 --allow-existing .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python worker.py --download > /dev/null
echo "Đã cài giọng AI VieNeu. Khởi động lại server (npm start) để dùng."
