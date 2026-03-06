# Agentify Demo — Terminal Recording Script
# Record with: vhs docs/demo.tape
# Requires: brew install charmbracelet/tap/vhs

Output docs/demo.gif

Set FontSize 15
Set Width 880
Set Height 520
Set Theme "Catppuccin Mocha"
Set Padding 16
Set TypingSpeed 50ms

Type "# Transform any OpenAPI spec into an MCP Server"
Enter
Sleep 600ms

Type "npx agentify-cli@0.2.0 transform https://petstore.swagger.io/v2/swagger.json"
Sleep 300ms
Enter
Sleep 25s

Sleep 3s
