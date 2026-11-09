# Development

Install Node.js 20.12.2+.

```powershell
npm install
npm run check
npm test
$env:HA_URL = "https://home.example"
$env:HA_TOKEN = "<your-long-lived-token>"
npm run build:plugin
```

The environment variables must be available to the Ulanzi Studio process, not just the terminal running the build. Do not put them in source files. Close the shell after testing if it contains secrets in its environment.

Install the built directory `com.ulanzi.smarthomepro.ulanziPlugin` into `%APPDATA%\Ulanzi\UlanziDeck\Plugins\` and restart Studio. The Studio/hardware validation remains pending.

The build command copies runtime source inside the plugin package and installs production dependencies. Do not distribute the source checkout folder directly as an installable package.

Only Home Assistant actions are implemented so far. Configure one action, click Refresh devices, choose an entity, and select a supported command. State changes are not shown optimistically: Ulanzi updates when Home Assistant confirms a state event.

The credentials mechanism is deliberately temporary. Do not publish a release before replacing it with a secure vault, checking SDK resource compatibility, adding packaging verification, and completing the hardware test checklist.
