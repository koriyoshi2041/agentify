# Agentify Demo — Terminal Recording Script
# Record with: vhs docs/demo.tape
# Requires: brew install charmbracelet/tap/vhs ffmpeg ttyd

Output docs/demo.gif

Set FontSize 16
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 60ms

# Title
Type "# Agentify — Agent Interface Compiler"
Enter
Sleep 1s

# Show the one-liner
Type "npx @agentify/cli transform https://petstore.swagger.io/v2/swagger.json"
Sleep 500ms
Enter
Sleep 8s

# Show generated files
Type "ls petstore-mcp-server/"
Enter
Sleep 2s

Type "cat petstore-mcp-server/package.json | head -20"
Enter
Sleep 3s

# Done
Sleep 2s
