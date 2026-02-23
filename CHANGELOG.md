# Changelog | 更新日志

记录 C# API Explorer 的所有重要更新。  
All notable changes to this project will be documented in this file.

---

## [1.0.15] - 2026-02-23

### ✨ 优化 | Improvements

- 更新 README.
  Updated README。  

---

## [1.0.14] - 2026-02-18

### ✨ 优化 | Improvements

- 🎨 **View 图标主题适配**：项目层与控制器层图标支持浅色/深色主题自动切换。  
  **Theme-aware view icons**: Project and controller level icons now switch automatically for light/dark themes.

- 💬 **提示体验优化**：路由解析与常用操作提示改为在 View 内显示，减少右下角通知打扰；临时提示支持自动恢复。  
  **Message UX improvements**: Route parsing and common operation feedback now display in-view instead of toasts, with temporary message auto-restore.

- 🚫 **非 .NET 工作区行为优化**：未检测到 `.csproj` 时跳过路由扫描。  
  **Non-.NET workspace behavior**: Skip route scanning when no `.csproj` is detected.

---

## [1.0.13] - 2026-02-16

### ⚠️ 行为调整 | Behavior Changes

- 🔒 **启动调试 / 运行项目改为仅支持 C# Dev Kit**：`Start Debugging` 与 `Run Project` 统一使用 C# Dev Kit 的 `dotnet` 调试器，不再回退 `coreclr` 或 `dotnet run` 终端方案  
  **Debug/Run now C# Dev Kit only**: `Start Debugging` and `Run Project` now both use the C# Dev Kit `dotnet` debugger, with no fallback to `coreclr` or terminal `dotnet run`

- 🧹 **简化启动逻辑**：移除回退分支与相关兼容代码，降低维护复杂度，行为更一致  
  **Simplified startup logic**: Removed fallback branches and related compatibility code for lower maintenance complexity and more consistent behavior

- 📝 **文档更新**：README 增加 C# Dev Kit 依赖说明  
  **Documentation update**: README now explicitly states the C# Dev Kit requirement

---

## [1.0.12] - 2026-02-14

### ✨ 优化 | Improvements

- 🧭 **项目节点右键菜单增强**：在路由树中选中项目节点时，右键菜单新增"启动调试"和"运行项目"两项能力（此前仅路由节点支持）  
  **Enhanced project node context menu**: Added "Start Debugging" and "Run Project" actions when right-clicking project nodes in the route tree (previously available only on route nodes)

  - 现在可直接在项目层级启动调试或运行项目，无需先展开并选择具体路由  
    You can now start debugging or run a project directly at the project level without expanding and selecting a specific route

---

## [1.0.11] - 2026-02-12

### 🐛 Bug 修复 | Bug Fixes

- 🔧 **修复可空返回类型方法无法解析问题**：修复带有可空泛型返回值（如 `Task<long?>`、`Task<int?>` 等）的 Action 方法无法被识别的问题  
  **Fixed nullable return type method parsing issue**: Fixed issue where Action methods with nullable generic return types (e.g., `Task<long?>`, `Task<int?>`) could not be recognized

---

## [1.0.10] - 2026-02-11

### ✨ 优化 | Improvements

- 📋 **优化复制路由功能**：修改复制路由命令，直接使用显示路由而非构建完整路由  
  **Optimized copy route functionality**: Modified copy route command to use displayed route directly instead of building full route
  
  - 修改前：复制路由时会构建完整的 URL（包含 BaseUrl + 路由路径）  
    Before: Copying route would build complete URL (BaseUrl + route path)
  
  - 修改后：复制路由时直接使用显示的路由路径（不包含 BaseUrl）  
    After: Copying route now uses displayed route path directly (without BaseUrl)
  
  - 影响：复制出的路由更简洁，便于在文档或代码中直接使用相对路径  
    Impact: Copied routes are more concise, easier to use as relative paths in documentation or code

---

## [1.0.9] - 2026-02-11

### ✨ 优化 | Improvements

- 🔡 **路由统一使用小写**：所有解析的路由统一转为小写，符合 ASP.NET Core 约定  
  **Standardized routes to lowercase**: All parsed routes are now converted to lowercase, following ASP.NET Core conventions
  
  - ASP.NET Core 路由本身是大小写不敏感的，但约定使用小写路由  
    ASP.NET Core routing is case-insensitive, but lowercase routes are the convention
  
  - 在 `routeParser.buildFullRoute()` 方法的最后统一将构建好的路由转为小写  
    Convert the built route to lowercase at the end of `routeParser.buildFullRoute()` method
  
  - 影响：避免项目中路由大小写混乱，存储、显示、匹配都使用统一的小写格式  
    Impact: Prevents case inconsistency issues throughout the project. Storage, display, and matching all use uniform lowercase format

---

## [1.0.8] - 2026-02-11

### 🐛 Bug 修复 | Bug Fixes

- 🔄 **修复手动编辑别名文件不生效问题**：修复手动修改 `csharp-api-explorer-aliases.json` 后刷新路由不生效的问题  
  **Fixed manual alias file edit not taking effect**: Fixed issue where manually editing `csharp-api-explorer-aliases.json` followed by route refresh didn't apply changes
  
  - 问题：别名文件仅在插件激活时加载一次，手动修改文件后内存中的别名数据未更新，导致刷新路由时看不到修改  
    Issue: Alias file was only loaded once during extension activation. Manual file edits didn't update in-memory alias data, so route refresh didn't show changes
  
  - 修复：在刷新路由时重新加载别名文件（`aliasManager.load()`），确保手动编辑的内容立即生效  
    Fix: Reload alias file during route refresh (`aliasManager.load()`), ensuring manual edits take effect immediately
  
  - 影响：现在可以直接编辑 `.vscode/csharp-api-explorer-aliases.json` 文件，点击刷新按钮后别名立即生效，无需重启 VS Code  
    Impact: You can now directly edit `.vscode/csharp-api-explorer-aliases.json` file and see changes immediately after clicking refresh, without restarting VS Code

---

## [1.0.7] - 2026-02-10

### 🐛 Bug 修复 | Bug Fixes

- 🔧 **修复调试配置混淆问题**：修复启动调试时 launchSettings.json 配置读取不一致的严重 BUG  
  **Fixed debug configuration confusion**: Fixed critical bug where launchSettings.json configuration was inconsistently read during debug startup
  
  - 问题：调试时监听端点和环境变量来自不同的 profile（例如监听端口来自 https profile，但环境变量来自 http profile）  
    Issue: During debugging, listening endpoints and environment variables came from different profiles (e.g., ports from https profile, but env vars from http profile)
  
  - 修复：在调试配置中添加 `launchSettingsProfile` 属性，明确指定使用哪个 profile，确保所有配置（端口、环境变量等）来自同一个 profile  
    Fix: Added `launchSettingsProfile` property in debug configuration to explicitly specify which profile to use, ensuring all configurations (ports, env vars, etc.) come from the same profile
  
  - 影响：确保 "启动项目" 和 "调试项目" 使用相同的配置，避免配置混乱  
    Impact: Ensures "Run Project" and "Debug Project" use the same configuration, avoiding configuration confusion

## [1.0.6] - 2026-02-10

### ✨ 新功能 | New Features

- 🔧 **ApiVersion 自动解析**：自动识别 `[ApiVersion]` 特性并替换路由中的版本占位符  
  **ApiVersion auto-parsing**: Automatically recognize `[ApiVersion]` attributes and replace version placeholders in routes
  
  - 支持 ASP.NET Core 官方的 API 版本管理方式（`Microsoft.AspNetCore.Mvc.Versioning`）  
    Support official ASP.NET Core API versioning approach (`Microsoft.AspNetCore.Mvc.Versioning`)
  
  - 自动从 `[ApiVersion("x.x")]` 特性提取版本号  
    Automatically extract version number from `[ApiVersion("x.x")]` attribute
  
  - 替换路由中的 `{xxx:apiVersion}` 占位符（如 `{version:apiVersion}`, `{v:apiVersion}` 等）  
    Replace `{xxx:apiVersion}` placeholders in routes (e.g., `{version:apiVersion}`, `{v:apiVersion}`, etc.)
  
  - 支持配置默认版本：当控制器没有 `[ApiVersion]` 特性时，可通过 `defaultApiVersion` 配置项设置默认版本号（默认 `1.0`，与 ASP.NET Core 官方保持一致）  
    Support default version configuration: When a controller has no `[ApiVersion]` attribute, use `defaultApiVersion` setting as fallback (default: `1.0`, same as ASP.NET Core official default)
  
  - 示例：`[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/[controller]")]` → `/api/v1.0/controller`  
    Example: `[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/[controller]")]` → `/api/v1.0/controller`

### 🗑️ 移除功能 | Removed Features

- ❌ **移除手动变量配置**：移除了 `csharp-api-explorer-variables.json` 配置文件和"变量配置"按钮  
  **Removed manual variable configuration**: Removed `csharp-api-explorer-variables.json` config file and "Variable Configuration" button
  
  - 原因：ASP.NET Core 不支持自定义静态占位符，仅支持框架预定义的占位符  
    Reason: ASP.NET Core doesn't support custom static placeholders, only framework-defined placeholders
  
  - 路由参数（如 `{id}`, `{name}`）是运行时参数，无法静态替换  
    Route parameters (like `{id}`, `{name}`) are runtime parameters and cannot be statically replaced
  
  - API 版本现在通过 `[ApiVersion]` 特性自动解析，无需手动配置  
    API versions are now automatically parsed from `[ApiVersion]` attributes without manual configuration

### 📝 文档更新 | Documentation

- 📖 更新 README，说明 ApiVersion 自动解析功能  
  Updated README to explain ApiVersion auto-parsing feature

- 📖 移除了手动变量配置的说明文档  
  Removed manual variable configuration documentation

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

- 🛠️ **运行与调试支持**：一键运行或调试项目
  **Run & Debug support**: One-click launch or debug

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
