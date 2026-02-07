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

- 🚀 **API 测试功能**：在 Action 方法上显示测试按钮，快速测试 API  
  **API Testing**: Test API endpoints directly from CodeLens with an integrated test panel

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

## 🧪 API 测试功能 | API Testing

### 特性 | Features

- 🚀 **CodeLens 集成**：在 C# Controller 的 Action 方法上显示 "🚀 Test API" 按钮
  **CodeLens integration**: Shows "🚀 Test API" button on Controller Action methods

- 🎯 **自动检测**：自动识别 HTTP Method（GET/POST/PUT/DELETE）和路由路径
  **Auto-detection**: Automatically detects HTTP methods and route paths

- 🔐 **认证支持**：支持 Bearer Token 认证
  **Authentication**: Bearer Token authentication support

- 📝 **参数识别**：自动识别 Query、Body、Header 和 Path 参数
  **Parameter detection**: Automatically identifies Query, Body, Header, and Path parameters

- 📊 **响应显示**：显示 HTTP 状态码、响应头和格式化的 JSON 响应
  **Response display**: Shows status code, headers, and formatted JSON response

- ⚡ **快速测试**：一键发送请求，实时查看结果
  **Quick testing**: Send requests with one click and see results instantly

### 使用方法 | Usage

1. 打开包含 C# Controller 的文件
   Open a file containing a C# Controller

2. 在 Action 方法上方会显示 "🚀 Test API" 按钮
   The "🚀 Test API" button will appear above Action methods

3. 点击按钮打开测试面板
   Click the button to open the test panel

4. 填写必要的参数（Token、Headers、Query、Body）
   Fill in necessary parameters (Token, Headers, Query, Body)

5. 点击 "Send" 发送请求
   Click "Send" to make the request

6. 查看响应结果
   View the response

### 测试面板 | Test Panel

测试面板包含以下标签页：
The test panel includes the following tabs:

- **Auth**: Bearer Token 认证
  Bearer Token authentication

- **Headers**: 自定义 HTTP 头
  Custom HTTP headers

- **Query**: URL 查询参数
  URL query parameters

- **Body**: JSON 请求体（POST/PUT 请求）
  JSON request body (for POST/PUT requests)

---

## ⚙️ 配置 | Configuration

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
