!macro customInstall
  IfFileExists "$INSTDIR\resources\vcredist_x64.exe" 0 +3
  ExecWait '"$INSTDIR\resources\vcredist_x64.exe" /install /quiet /norestart'
!macroend
