# 폰(같은 와이파이) -> 윈도우 LAN IP -> WSL 로 3001(API), 8081(Expo) 포트를 전달하고 방화벽을 연다.
# 관리자 PowerShell 에서:  powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu-24.04\home\taehwan\workspace\oneureodi\scripts\windows-portproxy.ps1
# WSL 의 IP 는 재부팅마다 바뀔 수 있다. 안 되면 WSL 에서 `hostname -I` 로 확인해 다시 실행한다.
param([string]$Wsl = "172.22.7.212")

foreach ($port in 3001, 8081) {
  netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
  netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$Wsl
  netsh advfirewall firewall delete rule name="oneureodi-$port" | Out-Null
  netsh advfirewall firewall add rule name="oneureodi-$port" dir=in action=allow protocol=TCP localport=$port
}
Write-Host "--- 현재 포트 전달 규칙"
netsh interface portproxy show v4tov4
