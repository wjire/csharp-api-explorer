# API Navigator For C#

⚡ **一键跳转到 API 代码** - 在 VSCode 中快速导航和管理 C# ASP.NET API 路由。直接点击路由即可跳转到对应的控制器和 Action 代码位置。

## 功能特性

### 🎯 核心功能

- **⚡ 一键跳转到代码**：点击路由直接跳转到对应的控制器和 Action 代码位置，加速开发流程
- **自动解析路由**：扫描工作区中的 C# 文件，自动提取 API 路由信息
- **智能别名**：为常用路由设置别名，配合跳转功能快速访问
- **可视化导航**：在侧边栏以树形结构展示所有路由，清晰明了
- **搜索过滤**：快速搜索路由、控制器、Action 或别名
- **颜色标记**：根据 HTTP 方法自动着色（GET/POST/PUT/DELETE）
  
### 功能截图

![功能截图](https://gitee.com/dankit/vscode-api-navigator/raw/master/resources/image.png)

### 🎨 UI 特性

- **Activity Bar 集成**：在活动栏中拥有独立图标和视图
- **扁平化列表**：清晰的扁平结构，易于浏览
- **智能排序**：有别名的路由自动排在前面
- **工具栏按钮**：搜索、刷新、变量配置

### ⚙️ 配置功能

- **变量管理**：配置 baseUrl、version 等全局变量
- **手动刷新**：点击工具栏刷新按钮更新路由列表
- **排除模式**：自定义要排除的文件夹（如 bin、obj）
- **排序方式**：按路由路径、控制器或 HTTP 方法排序

## 使用方法

### 1. 激活扩展

打开包含 C# 项目的工作区，扩展会自动激活并开始解析路由。

### 2. 查看路由

点击左侧活动栏的 API Navigator 图标，查看所有解析到的路由。

### 3. 设置别名

右键点击任何路由 → 选择"设置别名" → 输入别名

### 4. ⚡ 一键跳转到代码

**最快速的方式** - 单击任何路由即可立即跳转到对应的控制器和 Action 代码位置，无需手动搜索。

也可以右键点击路由，选择"跳转到定义"。

### 5. 搜索路由

点击工具栏的搜索图标，输入关键字过滤路由。

### 6. 配置变量

点击工具栏的设置图标，配置 Base URL 和其他变量。

## 支持的特性标记

扩展可以识别以下 C# 特性：

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
## 不支持的特性

不支持路由特性定义在基类的控制器

## 配置项

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

### 配置说明

- **excludePatterns**: 要排除的文件模式
- **sortBy**: 路由排序方式（`route`/`controller`/`httpVerb`）

## 快捷键

暂无默认快捷键，您可以在 VSCode 快捷键设置中自定义。

## 数据存储

- **别名配置**：`.vscode/api-navigator-aliases.json`
- **变量配置**：`.vscode/api-navigator-variables.json`

## 反馈与贡献

如有问题或建议，欢迎提交 Issue 或 Pull Request。

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 调试
按 F5 启动扩展开发主机
```

## 许可证

MIT

---

**Enjoy! 🚀**
