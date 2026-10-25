#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "用法: $0 /绝对路径/笔记库"
  exit 1
fi
command -v node >/dev/null
command -v systemctl >/dev/null
reader_vault=$(realpath "$1")
reader_node=$(command -v node)
reader_plugin="$reader_vault/.obsidian/plugins/lan-reader"
[[ -f "$reader_plugin/daemon.cjs" ]] || { echo '请先安装包含 daemon.cjs 的插件构建'; exit 1; }
mkdir -p "$HOME/.config/systemd/user"
python3 - "$reader_vault" "$reader_node" "$HOME/.config/systemd/user/lan-reader.service" <<'PY'
import sys
from pathlib import Path
vault,node,unit=sys.argv[1:]
def quote(value):
    if any(c in value for c in '\n\r\x00'): raise ValueError('路径包含无效字符')
    return '"'+value.replace('\\','\\\\').replace('"','\\"').replace('%','%%')+'"'
Path(unit).write_text('[Unit]\nDescription=LAN Reader background service\nAfter=network.target\n\n[Service]\nType=simple\nExecStart='+quote(node)+' '+quote(vault+'/.obsidian/plugins/lan-reader/daemon.cjs')+' '+quote(vault)+'\nRestart=on-failure\nRestartSec=3\nNoNewPrivileges=true\nUMask=0077\n\n[Install]\nWantedBy=default.target\n')
PY
systemctl --user daemon-reload
systemctl --user enable --now lan-reader.service
printf '%s\n' '后台服务已安装。插件设置中可启停与控制自启。' '若需未登录时开机运行，执行 loginctl enable-linger "$USER"（系统可能要求授权）。'
