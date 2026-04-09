param(
    [string]$Distro = "podman-machine-default"
)

$ErrorActionPreference = "Stop"

$linuxScript = @'
set -eu

if [ -d /home/codex ] && id codex >/dev/null 2>&1; then
  chown -R codex:codex /home/codex
  chmod 700 /home/codex
fi

if [ -d /tmp/phantomjs-2.1.1 ]; then
  rm -rf /tmp/phantomjs-2.1.1
fi

rm -rf /root/.cache/puppeteer

# Keep the scan bounded to avoid walking virtual filesystems forever.
find / \
  \( -path /proc -o -path /sys -o -path /dev -o -path /run -o -path /mnt -o -path /tmp \) -prune \
  -o -type d -name '*cv2*' -exec rm -rf {} + 2>/dev/null || true

find /usr/share/doc /etc -xtype l -print0 2>/dev/null | xargs -0 -r rm -f

if getent passwd ubuntu >/dev/null 2>&1; then
  usermod -L ubuntu
  passwd -l ubuntu || true
fi

mkdir -p /opt/container_cleanup
if [ -f /container_info.json ]; then
  mv /container_info.json /opt/container_cleanup/container_info.json
  chmod 600 /opt/container_cleanup/container_info.json
fi

printf '{\n'
printf '  "codex_home_exists": "'
if [ -d /home/codex ]; then
  ls -ld /home/codex
else
  printf 'not found'
fi
printf '",\n'

printf '  "phantomjs_tmp": "'
phantom_tmp=$(ls -1 /tmp 2>/dev/null | grep phantomjs || true)
if [ -n "$phantom_tmp" ]; then
  printf '%s' "$phantom_tmp"
else
  printf 'removed'
fi
printf '",\n'

printf '  "dangling_symlinks_remaining": "'
remaining=$(find /usr/share/doc /etc -xtype l 2>/dev/null | tr '\n' ';')
if [ -n "$remaining" ]; then
  printf '%s' "$remaining"
else
  printf 'none'
fi
printf '",\n'

printf '  "ubuntu_user_status": "'
ubuntu_status=$(getent passwd ubuntu 2>/dev/null || true)
if [ -n "$ubuntu_status" ]; then
  printf '%s' "$ubuntu_status"
else
  printf 'ubuntu user locked or removed'
fi
printf '",\n'

printf '  "container_info_location": "'
if [ -f /opt/container_cleanup/container_info.json ]; then
  ls -l /opt/container_cleanup/container_info.json
else
  printf 'not found'
fi
printf '",\n'

printf '  "cv2_matches_remaining": "'
cv2_count=$(find / \
  \( -path /proc -o -path /sys -o -path /dev -o -path /run -o -path /mnt -o -path /tmp \) -prune \
  -o -type d -name '*cv2*' -print 2>/dev/null | wc -l | tr -d ' ')
printf '%s' "$cv2_count"
printf '"\n'
printf '}\n'
'@

$bytes = [System.Text.Encoding]::UTF8.GetBytes($linuxScript)
$base64 = [Convert]::ToBase64String($bytes)

$command = @(
    "wsl.exe"
    "-d", $Distro
    "-u", "root"
    "--cd", "/"
    "env", "-i", "PATH=/usr/sbin:/usr/bin:/sbin:/bin"
    "/bin/sh", "-c", "printf '%s' '$base64' | base64 -d | /bin/sh"
)

& $command[0] $command[1..($command.Length - 1)]
