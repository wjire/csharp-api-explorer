# API Navigator For C#

⚡ **One-Click Jump to API Code** - Quickly navigate and manage C# ASP.NET API routes in VSCode. Click any route to jump directly to the corresponding controller and Action code location.

## Features

### 🎯 Core Functionality

- **⚡ One-Click Jump to Code**: Click any route to instantly jump to the corresponding controller and Action code location, accelerating your development workflow
- **Auto Route Parsing**: Scans C# files in your workspace and automatically extracts API route information
- **Smart Aliases**: Set aliases for frequently used routes and access them quickly with jump functionality
- **Visual Navigation**: Display all routes in a tree structure in the sidebar for clear browsing
- **Search & Filter**: Quickly search routes, controllers, Actions, or aliases
- **Color Coding**: Automatically color-code by HTTP method (GET/POST/PUT/DELETE)
  
### Screenshots

![Screenshots](https://gitee.com/dankit/vscode-api-navigator/raw/master/resources/image.png)

### 🎨 UI Features

- **Activity Bar Integration**: Dedicated icon and sidebar view in VSCode's activity bar
- **Flat List Layout**: Clean and flat structure for easy browsing
- **Smart Sorting**: Routes with aliases automatically appear at the top
- **Toolbar Buttons**: Search, refresh, and variable configuration controls

### ⚙️ Configuration Features

- **Variable Management**: Configure global variables like baseUrl and version
- **Manual Refresh**: Click the toolbar refresh button to update the route list
- **Exclude Patterns**: Customize folders to exclude (e.g., bin, obj)
- **Sort Options**: Sort routes by path, controller, or HTTP method

## Usage

### 1. Activate the Extension

Open a workspace containing a C# project, and the extension will automatically activate and begin parsing routes.

### 2. View Routes

Click the API Navigator icon in the left activity bar to view all parsed routes.

### 3. Set Aliases

Right-click any route → Select "Set Alias" → Enter your alias

### 4. ⚡ One-Click Jump to Code

**The fastest way** - Click any route to instantly jump to the corresponding controller and Action code location without manual searching.

You can also right-click a route and select "Go to Definition".

### 5. Search Routes

Click the search icon in the toolbar to filter routes by keywords.

### 6. Configure Variables

Click the settings icon in the toolbar to configure Base URL and other variables.

## Supported Attribute Markers

The extension can recognize the following C# attributes:

```csharp
[HttpGet]
[HttpPost]
[HttpPut]
[HttpDelete]
[HttpGet("api/users")]
[HttpPost("api/users")]
[Route("api/[controller]")]
[Route("api/[controller]/[action]")]
```

## Unsupported Features

Routes defined on base class controllers are not supported.

## Configuration Options

```json
{
  "apiNavigator.excludePatterns": [
      "**/bin/**",
      "**/obj/**",
      "**/node_modules/**",
      "**/.vs/**",
      "**/.git/**",
      "**/.github/**",
      "**/.idea/**",
      "**/.vscode/**",
      "**/dist/**",
      "**/out/**",
      "**/build/**",
      "**/wwwroot/lib/**"
  ],
  "apiNavigator.sortBy": "route"
}
```

### Configuration Explanation

- **excludePatterns**: File patterns to exclude from scanning
- **sortBy**: Route sorting method (`route`/`controller`/`httpVerb`)

## Keyboard Shortcuts

No default keyboard shortcuts. You can customize shortcuts in VSCode's keyboard settings.

## Data Storage

- **Aliases Configuration**: `.vscode/api-navigator-aliases.json`
- **Variables Configuration**: `.vscode/api-navigator-variables.json`

## Feedback & Contribution

Issues and Pull Requests are welcome!

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Debug
Press F5 to start the extension development host
```

## License

MIT

---

**Enjoy! 🚀**
