# windows-portproxy.ps1 가 넣은 규칙을 전부 지운다. 관리자 PowerShell 에서 실행.
foreach ($port in 3001, 8081) {
  netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0
  netsh advfirewall firewall delete rule name="oneureodi-$port"
}
