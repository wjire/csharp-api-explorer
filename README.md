# C# API Explorer

🔍 **可视化探索、搜索与调试 ASP.NET Core API 路由**  
A powerful VS Code extension for navigating, analyzing, and managing C# Web API endpoints.

---

## ✨ 功能特性 | Features

### 🎯 核心能力 | Core Capabilities

- ⚡ **一键跳转到代码**：点击路由即可跳转到对应的控制器和 Action  
  **One-click navigation**: Instantly jump to the controller and action method behind any API route

- 🔍 **自动解析路由**：扫描工作区 C# 文件，提取 ASP.NET Core 路由信息  
  **Automatic route parsing**: Scans your workspace and extracts ASP.NET Core route definitions

- 🏷️ **别名管理**：为常用路由设置别名，便于识别与跳转  
  **Alias management**: Assign custom aliases to frequently used routes for quick access

- 🌳 **可视化导航**：以树形结构展示所有路由，清晰明了  
  **Visual route tree**: Explore all routes in a structured, collapsible tree view

- 🔎 **搜索过滤**：支持按路径、控制器、Action 名、别名搜索  
  **Search & filter**: Find routes by path, controller, action, or alias

- 🎨 **HTTP 方法着色**：GET / POST / PUT / DELETE 自动高亮  
  **HTTP method coloring**: Automatically color-code routes by method

- 📂 **项目分组**：按项目和控制器分组展示路由结构  
  **Project grouping**: Organize routes by project and controller

- 🚀 **运行与调试**：支持 dotnet run 和调试启动，自动注入环境变量  
  **Run & debug support**: Launch or debug projects with environment variables from launchSettings.json

- 🔧 **路由变量替换**：支持 ASP.NET Core 路由约束变量（如 `{version:apiVersion}`），通过配置文件定义变量值，复制路由时自动替换  
  **Route variable substitution**: Automatically replaces route constraint variables (e.g., `{version:apiVersion}`) with configured values when copying routes

---

## 🎨 UI 特性 | UI Highlights

- 🧭 **Activity Bar 集成**：独立图标与视图，快速访问  
  **Activity Bar integration**: Dedicated icon and view in the VS Code sidebar

- 🧾 **清晰结构**：项目 → 控制器 → 路由，层级分明  
  **Tree structure**: Clean hierarchy from project to controller to route

- 🛠️ **工具栏操作**：搜索、刷新、配置按钮一应俱全  
  **Toolbar actions**: Quick access to search, refresh, and variable configuration

---

## 📷 截图 | Screenshots

![功能截图](https://gitee.com/dankit/csharp-api-explorer/raw/master/resources/image.png)

---

## ⚙️ 配置 | Configuration

### 排除模式 | Exclude Patterns

配置扫描时需要排除的目录模式：  
Configure directory patterns to exclude during route scanning:

```json
{
  "csharpApiExplorer.excludePatterns": [
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
  ]
}
```

### 路由排序 | Route Sorting

- **`csharpApiExplorer.sortAliasFirst`**：有别名的路由是否置顶显示（默认 `false`）  
  **`csharpApiExplorer.sortAliasFirst`**: Place routes with aliases at the top (default: `false`)

- **`csharpApiExplorer.sortByRoutePath`**：是否按路由路径字母顺序排序，否则按文件中定义顺序（默认 `false`）  
  **`csharpApiExplorer.sortByRoutePath`**: Sort routes alphabetically by path, otherwise by file order (default: `false`)

---

### 路由变量配置 | Route Variable Configuration

支持为路由约束变量定义替换值。点击工具栏的 **"变量配置"** 按钮，将在 `.vscode` 目录下创建 `csharp-api-explorer-variables.json` 文件。  
Define substitution values for route constraint variables. Click the **"Variable Configuration"** button in the toolbar to create `csharp-api-explorer-variables.json` in the `.vscode` folder.

**示例场景 | Example Scenario:**

假设你的控制器定义如下：  
Suppose your controller is defined as:

```csharp
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok();
}
```

配置变量替换：  
Configure variable substitution:

```json
{
  "version:apiversion": "1.0"
}
```

**效果 | Result:**

- 原始路由 | Original route: `/api/v{version:apiversion}/test`
- 复制路由结果 | Copied route: `http://localhost:5000/api/v1.0/test`

变量会自动替换为配置的值，便于直接使用！  
Variables are automatically replaced with configured values for instant use!