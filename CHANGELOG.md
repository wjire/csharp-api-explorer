# Changelog | 更新日志

记录 C# API Explorer 的所有重要更新。  
All notable changes to this project will be documented in this file.

---

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
