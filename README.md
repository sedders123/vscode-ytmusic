# vscode-ytmusic

Connecting VS Code with the [YouTube Music Desktop Player](https://ytmdesktop.app/)

## Features

- See what song is currently playing
- Play / Pause
- Skip / Rewind
- Thumbsup / Thumbsdown
- Cycle Repeat Mode
- Playback controls in the Status Bar

![Plaback controls added to the status bar](https://user-images.githubusercontent.com/1496834/153911404-39ac8346-e67d-49f9-a567-5d27d875aa69.png)

## Requirements

- [YTMDesktop App](https://ytmdesktop.app/)

## Installation

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sedders123.vscode-ytmusic) or by searching for "vscode-ytmusic" in the Extensions view.
2. In the Youtube Music Desktop Player, go to Settings > Integrations and enable "Companion Server" then enable "Enable companion authorization"
3. In VS Code click the "Authenticate with YTMDP" button in the status bar and allow the connection in the Youtube Music Desktop Player app.

## Building

Run `vsce package` to build the extension.

## Acknowledgements

This project was based on [vscode-gmusic](https://github.com/nickthegroot/vscode-gmusic) by Nick DeGroot.
