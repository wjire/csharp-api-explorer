import * as vscode from 'vscode';

/**
 * 语言类型
 */
type Language = 'zh-cn' | 'en';

/**
 * 文本键类型
 */
type TextKey = keyof typeof TEXT_MAP['zh-cn'];

/**
 * 中英文文本映射
 */
const TEXT_MAP = {
    'zh-cn': {
        // 通用
        'extension.activated': 'C# API Explorer 插件已激活',
        'extension.deactivated': 'C# API Explorer 插件已停用',
        'error.noWorkspace': '请先打开一个工作区',
        'error.noProjectFile': '无法找到项目文件',
        'error.cannotOpenFile': '无法打开文件',
        'error.buildFailed': '构建失败，无法启动调试',
        'error.debugStartFailed': '启动调试失败',
        'error.devKitRequired': '此功能仅支持 C# Dev Kit，请先安装并启用 C# Dev Kit 扩展',

        // 路由相关
        'route.parsing': '正在解析路由...',
        'route.found': '找到 {0} 个路由',
        'route.foundFavorites': '常用 {0} 个路由',
        'route.parseFailed': '解析路由失败: {0}',
        'route.autoRefreshFailed': '自动刷新路由失败:',
        'route.skipNotDotnet': '当前工作区不是 .NET 项目（未检测到 .csproj），已跳过路由扫描',

        // 搜索
        'search.prompt': '搜索路由',
        'search.placeholder': '输入路由路径、控制器、Action或别名',
        'search.result': '🔍 "{0}" - {1} 个路由',

        // 标签
        'tab.favorites': '常用',
        'tab.all': '全部',

        // 别名
        'alias.setPrompt': '设置别名',
        'alias.placeholder': '输入别名，如：创建用户',

        // 复制
        'copy.success': '已复制: {0}',

        // 跳转
        'goto.title': '跳转到定义',

        // 构建
        'build.starting': '开始构建项目: {0}',
        'build.projectPath': '项目路径: {0}',
        'build.targetFramework': '目标框架: {0}',
        'build.separator': '----------------------------------------',
        'build.success': '\n构建成功 ✓',
        'build.failed': '\n构建失败 ✗',
        'build.outputTitle': 'Build: {0}',

        // 运行
        'run.terminalName': 'Run: {0}',

        // 调试
        'debug.configName': 'Debug: {0}',

        // 配置
        'config.reloaded': '配置文件已更新，重新加载配置',

        // 日志
        'log.detectFrameworkFailed': '检测目标框架失败:',

        // TreeView 节点
        'treeview.unknownProject': '未知项目',
        'treeview.routesCount': '{0} 个路由',
    },
    'en': {
        // Common
        'extension.activated': 'C# API Explorer activated',
        'extension.deactivated': 'C# API Explorer deactivated',
        'error.noWorkspace': 'Please open a workspace first',
        'error.noProjectFile': 'Cannot find project file',
        'error.cannotOpenFile': 'Cannot open file',
        'error.buildFailed': 'Build failed, cannot start debugging',
        'error.debugStartFailed': 'Failed to start debugging',
        'error.devKitRequired': 'This feature requires C# Dev Kit. Please install and enable the extension first',

        // Route
        'route.parsing': 'Parsing routes...',
        'route.found': 'Found {0} routes',
        'route.foundFavorites': 'Favorites: {0} routes',
        'route.parseFailed': 'Failed to parse routes: {0}',
        'route.autoRefreshFailed': 'Auto refresh routes failed:',
        'route.skipNotDotnet': 'Current workspace is not a .NET project (no .csproj detected), route scanning skipped',

        // Search
        'search.prompt': 'Search Routes',
        'search.placeholder': 'Enter route path, controller, action or alias',
        'search.result': '🔍 "{0}" - {1} routes',

        // Tabs
        'tab.favorites': 'Favorites',
        'tab.all': 'All',

        // Alias
        'alias.setPrompt': 'Set Alias',
        'alias.placeholder': 'Enter alias, e.g.: Cart-Shipping-SingleStore',

        // Copy
        'copy.success': 'Copied: {0}',

        // Goto
        'goto.title': 'Go to Definition',

        // Build
        'build.starting': 'Building project: {0}',
        'build.projectPath': 'Project path: {0}',
        'build.targetFramework': 'Target framework: {0}',
        'build.separator': '----------------------------------------',
        'build.success': '\nBuild succeeded ✓',
        'build.failed': '\nBuild failed ✗',
        'build.outputTitle': 'Build: {0}',

        // Run
        'run.terminalName': 'Run: {0}',

        // Debug
        'debug.configName': 'Debug: {0}',

        // Config
        'config.reloaded': 'Config file updated, reloading...',

        // Log
        'log.detectFrameworkFailed': 'Failed to detect target framework:',

        // TreeView nodes
        'treeview.unknownProject': 'Unknown Project',
        'treeview.routesCount': '{0} routes',
    }
};

/**
 * 语言管理器
 * 根据 VSCode 语言环境自动选择中文或英文
 */
export class LanguageManager {
    private static instance: LanguageManager;
    private currentLanguage: Language;

    private constructor() {
        // 获取 VSCode 语言环境
        const vscodeLanguage = vscode.env.language.toLowerCase();

        // 判断是否为中文环境
        this.currentLanguage = vscodeLanguage.startsWith('zh') ? 'zh-cn' : 'en';
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): LanguageManager {
        if (!LanguageManager.instance) {
            LanguageManager.instance = new LanguageManager();
        }
        return LanguageManager.instance;
    }

    /**
     * 获取当前语言
     */
    public getCurrentLanguage(): Language {
        return this.currentLanguage;
    }

    /**
     * 获取文本
     * @param key 文本键
     * @param args 格式化参数（替换 {0}, {1}, ...）
     */
    public getText(key: TextKey, ...args: any[]): string {
        let text = TEXT_MAP[this.currentLanguage][key] || key;

        // 替换占位符 {0}, {1}, ...
        args.forEach((arg, index) => {
            text = text.replace(`{${index}}`, String(arg));
        });

        return text;
    }

    /**
     * 简写方法：快速获取文本
     */
    public t(key: TextKey, ...args: any[]): string {
        return this.getText(key, ...args);
    }
}

/**
 * 导出单例实例
 */
export const lang = LanguageManager.getInstance();
