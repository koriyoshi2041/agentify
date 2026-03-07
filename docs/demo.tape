# Agentify Demo — Terminal Recording Script
# Record with: cd /tmp && vhs ~/Desktop/Agentify/docs/demo.tape
# Then: cp /tmp/demo.gif ~/Desktop/Agentify/docs/demo.gif
# Requires: brew install charmbracelet/tap/vhs

Output demo.gif

Set FontSize 15
Set Width 880
Set Height 520
Set Theme "Catppuccin Mocha"
Set Padding 16
Set TypingSpeed 50ms

Type "cd /tmp"
Enter
Sleep 500ms

Type "# Transform any OpenAPI spec into 8 agent interface formats"
Enter
Sleep 600ms

Type "npx -y agentify-cli@0.3.0 transform https://petstore.swagger.io/v2/swagger.json"
Sleep 300ms
Enter
Sleep 35s

Sleep 3s
