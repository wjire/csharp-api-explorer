# Changelog | 更新日志

记录 C# API Explorer 的所有重要更新。  
All notable changes to this project will be documented in this file.

---

## [1.0.5] - 2026-02-09

### 📝 文档更新 | Documentation

- 📖 **功能描述优化**：调整 README 中的功能描述，避免误导  
  **Feature description refinement**: Updated README to clarify extension capabilities
  
  - 标题由"调试"改为"管理"，更准确反映插件定位为路由管理工具  
    Changed title from "debug" to "manage" to better reflect the extension's role as a route management tool
  
  - 明确"项目启动"功能是指以调试模式启动项目，而非调试路由本身  
    Clarified that "project launch" refers to starting projects in debug mode, not debugging routes themselves

---

## [1.0.4] - 2026-02-09

### ✨ 新功能 | New Features

- ⚙️ **路由排序配置**：新增可配置的路由排序选项  
  **Route sorting configuration**: Added configurable route sorting options
  
  - `sortAliasFirst`（默认 `false`）：有别名的路由是否置顶  
    `sortAliasFirst` (default `false`): Whether routes with aliases should be placed at the top
  
  - `sortByRoutePath`（默认 `false`）：是否按路由路径字母顺序排序  
    `sortByRoutePath` (default `false`): Whether to sort routes by path alphabetically
  
  - 当两个配置都为 `false` 时，路由按文件中的 action 顺序显示  
    When both are `false`, routes are displayed in the order they appear in the controller file

### ⚡ 性能优化 | Performance Improvements

- 🚀 **项目文件缓存**：实现两级缓存机制，大幅提升路由扫描性能  
  **Project file caching**: Implemented two-tier caching mechanism to significantly improve route scanning performance
  
  - 第一层缓存：Controller 文件路径 → 项目根目录（避免重复的文件系统查找）  
    First-tier cache: Controller file path → Project root directory (avoid redundant file system lookups)
  
  - 第二层缓存：项目根目录 → Base URL（避免重复读取 launchSettings.json）  
    Second-tier cache: Project root directory → Base URL (avoid redundant launchSettings.json reads)
  
  - 自动监听 `launchSettings.json` 文件变化，配置变更时自动失效对应缓存  
    Automatically watch `launchSettings.json` file changes, invalidate cache when configuration changes

- ⚡ **树节点分组缓存**：缓存项目和控制器分组结果，优化树视图展开性能  
  **Tree node grouping cache**: Cache project and controller grouping results to optimize tree view expansion
  
  - 延迟缓存策略：仅在首次展开时计算，后续访问直接返回缓存结果  
    Lazy caching strategy: Calculate only on first expansion, return cached results for subsequent access
  
  - 数据变化时自动清除缓存（搜索、刷新、修改别名）  
    Automatically clear cache when data changes (search, refresh, alias modification)

---

## [1.0.3] - 2026-02-08

### 🐛 修复 | Bug Fixes

- 🔧 **支持多特性在同一行**：正确识别在同一行用逗号分隔的多个特性  
  **Support multiple attributes on the same line**: Correctly recognize multiple attributes separated by commas on the same line
  
  - 支持 `[Route("list"), HttpGet]` 写法（特性顺序无关）  
    Support `[Route("list"), HttpGet]` syntax (attribute order doesn't matter)
  
  - 改进正则表达式以支持逗号分隔的特性  
    Improved regex patterns to support comma-separated attributes

### ✨ 改进 | Improvements

- 🎨 **新增 ANY HTTP 动词支持**：新增 `ANY` 类型表示接受所有 HTTP 动词的路由  
  **Added ANY HTTP verb support**: New `ANY` type for routes that accept all HTTP verbs
  
- 🎨 为 `[ANY]` 类型路由添加紫色标识色  
  Added purple color indicator for `[ANY]` type routes

---

## [1.0.2] - 2026-02-08

### 🐛 修复 | Bug Fixes

- 🔧 **修复 [action] 占位符处理**：正确支持带有 `[Route("[controller]/[action]")]` 的控制器  
  **Fixed [action] placeholder handling**: Properly support controllers with `[Route("[controller]/[action]")]`
  
  - 控制器路由包含 `[action]` 时，Action 方法名会自动替换占位符（去除 Async 后缀并转为小写）  
    When controller route contains `[action]`, action method names automatically replace the placeholder (removing Async suffix and converting to lowercase)
  
  - 没有显式 HTTP 特性的方法会被标记为 `[ANY]`，表示接受所有 HTTP 动词  
    Methods without explicit HTTP attributes are marked as `[ANY]`, accepting all HTTP verbs
  
  - 示例：`GetAsync()` → `/controller/get [ANY]`，`PostAsync()` → `/controller/post [ANY]`  
    Example: `GetAsync()` → `/controller/get [ANY]`, `PostAsync()` → `/controller/post [ANY]`

## [1.0.1] - 2026-02-08

### 🌍 国际化改进 | Internationalization

- 📝 所有命令和右键菜单标题现在支持中英双语显示（格式：中文 (English)）  
  All command and context menu titles now display in both Chinese and English (format: 中文 (English))

- 🌐 改进后的菜单包括：刷新路由、搜索路由、设置别名、复制路由、启动调试、运行项目等  
  Improved menus include: Refresh Routes, Search Routes, Set Alias, Copy Route, Start Debugging, Run Project, etc.

- 🤝 提升国际用户友好度，使非中文用户也能理解各项功能  
  Enhanced accessibility for international users who can now understand all features

---

## [1.0.0] - 2026-02-07

### ✨ 重大更新 | Major Update

- 🔁 插件重命名：从 **API Navigator** 更名为 **C# API Explorer**  
  Renamed extension from **API Navigator** to **C# API Explorer**

- 🧭 命名体系重构：统一所有内部 ID、命令、配置项前缀为 `csharpApiExplorer`  
  Unified all internal IDs, commands, and configuration prefixes to `csharpApiExplorer`

- 📁 配置文件重命名：  
  Renamed config files:
  - `.vscode/api-navigator-aliases.json` → `.vscode/csharp-api-explorer-aliases.json`
  - `.vscode/api-navigator-variables.json` → `.vscode/csharp-api-explorer-variables.json`

- 🌐 更新扩展名称、描述、关键词与 README，支持中英文双语  
  Updated extension name, description, keywords, and README for bilingual support

---

### 🚀 新功能 | New Features

- 🧠 **路由解析引擎**：自动提取 ASP.NET Core 控制器中的路由信息  
  **Route parsing engine**: Automatically extracts routes from ASP.NET Core controllers

- 🏷️ **别名支持**：为路由设置自定义别名，便于识别与跳转  
  **Alias support**: Assign custom aliases to routes for faster navigation

- 🔍 **搜索功能**：支持按路径、控制器、Action 名、别名过滤  
  **Search bar**: Filter routes by path, controller, action, or alias

- 🎨 **HTTP 方法着色**：GET / POST / PUT / DELETE 自动高亮显示  
  **HTTP method coloring**: Visual distinction for GET, POST, PUT, DELETE

- 📂 **项目与控制器分组**：按项目和控制器组织路由结构  
  **Project & controller grouping**: Organize routes by project and controller

- ⚙️ **变量配置支持**：在 `.vscode/csharp-api-explorer-variables.json` 中定义 baseUrl、version 等变量  
  **Variable configuration**: Define base URLs and placeholders in `.vscode/csharp-api-explorer-variables.json`

- 🛠️ **运行与调试支持**：一键运行或调试项目，自动读取 launchSettings.json 中的环境变量  
  **Run & Debug support**: One-click launch or debug with environment variables from `launchSettings.json`

---

### 💄 界面优化 | UI Improvements

- 🧭 新增 Activity Bar 图标与独立视图  
  Added Activity Bar icon and dedicated view

- 🧰 工具栏按钮：搜索、刷新、变量配置  
  Toolbar buttons: Search, Refresh, Configure

- 📑 支持扁平与分组视图切换  
  Flat and grouped route views

- 📌 有别名的路由优先排序显示  
  Routes with aliases are prioritized in sorting

---

### 🧹 命名与结构重构 | Cleanup & Refactor

- 重命名所有 `apiNavigator.*` 标识符为 `csharpApiExplorer.*`  
  Renamed all `apiNavigator.*` identifiers to `csharpApiExplorer.*`

- 更新配置项结构与默认值  
  Updated configuration schema and default values

- 优化内部代码结构与命名一致性  
  Improved internal code structure and naming consistency

---

## [0.0.1] - 初始版本 | Initial Release

- 支持基本的 ASP.NET Core 路由解析与跳转  
  Basic route parsing and navigation for ASP.NET Core APIs

- 路由树视图：按项目与控制器分组展示  
  Tree view of routes grouped by project and controller

- 支持手动刷新与基础搜索功能  
  Manual refresh and basic search support
