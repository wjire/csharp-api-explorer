import * as vscode from 'vscode';
import { RouteProvider, RouteTreeItem } from './routeProvider';
import { RouteParser } from './routeParser';
import { AliasManager } from './aliasManager';
import { ConfigManager } from './configManager';
import { lang } from './languageManager';
import { ApiEndpointDetector } from './apiEndpointDetector';
import { ApiCodeLensProvider } from './apiCodeLensProvider';
import { ApiTestPanel } from './apiTestPanel';

const activeProjects = new Set<string>();

vscode.debug.onDidTerminateDebugSession(session => {
    const cfg = session.configuration;
    if (cfg?.cwd) {
        activeProjects.delete(cfg.cwd);
    }
});

/**
 * 插件激活入口
 */
export function activate(context: vscode.ExtensionContext) {
    console.log(lang.t('extension.activated'));

    // 获取工作区根目录
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage(lang.t('error.noWorkspace'));
        return;
    }

    // 初始化管理器
    const aliasManager = new AliasManager(workspaceRoot);
    const configManager = new ConfigManager(workspaceRoot);
    const routeParser = new RouteParser();
    const routeProvider = new RouteProvider(aliasManager, configManager);

    // 初始化 API 测试相关组件
    const apiDetector = new ApiEndpointDetector();
    const apiCodeLensProvider = new ApiCodeLensProvider(apiDetector);

    // 注册 CodeLens Provider
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('csharp', apiCodeLensProvider)
    );

    // 注册 API 测试命令
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.testApi', (apiInfo) => {
            ApiTestPanel.createOrShow(context.extensionUri, apiInfo);
        })
    );

    // 创建TreeView
    const treeView = vscode.window.createTreeView('csharpApiExplorer.routesList', {
        treeDataProvider: routeProvider,
        showCollapseAll: true  // 启用折叠所有按钮
    });

    // 初始化加载
    initialize();

    async function initialize() {
        await aliasManager.load();
        await configManager.load();
        await refreshRoutes();
    }

    /**
     * 刷新路由
     * @param silent 静默模式，不显示通知（用于自动刷新）
     */
    async function refreshRoutes(silent: boolean = false) {
        try {
            if (!silent) {
                // 手动刷新时显示进度通知
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: lang.t('route.parsing'),
                    cancellable: false
                }, async () => {
                    await doRefresh();
                });
            } else {
                // 自动刷新时静默执行
                await doRefresh();
            }

            async function doRefresh() {
                const routes = await routeParser.parseWorkspace();

                // 添加别名信息
                for (const route of routes) {
                    const alias = aliasManager.getAlias(route.route, route.httpVerb);
                    if (alias) {
                        route.alias = alias;
                    }
                }

                routeProvider.setRoutes(routes);

                if (!silent) {
                    vscode.window.showInformationMessage(lang.t('route.found', routes.length));
                }
            }
        } catch (error) {
            if (!silent) {
                vscode.window.showErrorMessage(lang.t('route.parseFailed', error));
            } else {
                console.error(lang.t('route.autoRefreshFailed'), error);
            }
        }
    }

    // 注册命令：变量配置
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.config', async () => {
            await configManager.openConfigFile();
        })
    );

    // 注册命令：刷新
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.refresh', async () => {
            await refreshRoutes();
        })
    );

    // 注册命令：搜索
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.search', async () => {
            const searchText = await vscode.window.showInputBox({
                prompt: lang.t('search.prompt'),
                placeHolder: lang.t('search.placeholder')
            });

            if (searchText !== undefined) {
                const trimmedText = searchText.trim();
                routeProvider.setSearchText(trimmedText);
            }
        })
    );

    // 注册命令：清除搜索
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.clearSearch', () => {
            routeProvider.setSearchText('');
        })
    );

    // 注册命令：设置别名
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.setAlias', async (item: RouteTreeItem) => {
            const alias = await vscode.window.showInputBox({
                prompt: lang.t('alias.setPrompt'),
                value: item.routeInfo.alias || '',
                placeHolder: lang.t('alias.placeholder')
            });

            if (alias !== undefined && alias.trim()) {
                await aliasManager.setAlias(
                    item.routeInfo.route,
                    item.routeInfo.httpVerb,
                    alias.trim()
                );
                await refreshRoutes();
            }
        })
    );

    // 注册命令：清除别名
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.clearAlias', async (item: RouteTreeItem) => {
            await aliasManager.clearAlias(item.routeInfo.route, item.routeInfo.httpVerb);
            await refreshRoutes();
        })
    );

    // 注册命令：复制路由
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.copyRoute', async (item: RouteTreeItem) => {
            // 复制替换变量后的路由
            const route = buildFullRouteUrl(item.routeInfo.projectPath, item.displayRoute);
            await vscode.env.clipboard.writeText(route);
            vscode.window.showInformationMessage(lang.t('copy.success', route));
        })
    );

    // 注册命令：跳转到定义（用于点击路由项）
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.gotoDefinition', async (item: RouteTreeItem) => {
            try {
                const document = await vscode.workspace.openTextDocument(item.routeInfo.filePath);
                const position = new vscode.Position(item.routeInfo.lineNumber - 1, 0);
                await vscode.window.showTextDocument(document, {
                    selection: new vscode.Range(position, position)
                });
            } catch (error) {
                vscode.window.showErrorMessage(lang.t('error.cannotOpenFile') + `: ${error}`);
            }
        })
    );

    // 注册命令：启动调试
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.startDebugging', async (item: RouteTreeItem) => {
            await startProjectDebugging(item.routeInfo.projectPath);
        })
    );

    // 注册命令：运行项目
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.runProject', async (item: RouteTreeItem) => {
            await runProject(item.routeInfo.projectPath);
        })
    );

    /**
     * 构建完整的路由 URL（包含基础地址）
     */
    function buildFullRouteUrl(projectPath: string | undefined, routePath: string) {
        const projectProfile = getProjectProfile(projectPath);

        if (!projectProfile) {
            return routePath; // fallback
        }

        const baseUrl = getBaseUrlFromLaunchSettings(projectProfile);

        if (!baseUrl) {
            return routePath; // fallback
        }

        return `${baseUrl}${routePath}`;
    }

    /**
     * 启动项目调试（使用项目的 launch.json）
     */
    async function startProjectDebugging(projectPath: string | undefined) {
        if (!projectPath) {
            vscode.window.showErrorMessage(lang.t('error.noProjectFile'));
            return;
        }

        if (isProjectRunning(projectPath)) {
            return;
        }

        const path = require('path');
        const cp = require('child_process');

        const projectDir = path.dirname(projectPath);
        const projectName = path.basename(projectPath, '.csproj');

        // 自动检测 target framework
        const tfm = await detectTargetFramework(projectPath);

        // 创建输出窗口
        const output = vscode.window.createOutputChannel(lang.t('build.outputTitle', projectName));
        output.show(true);
        output.appendLine(lang.t('build.starting', projectName));
        output.appendLine(lang.t('build.projectPath', projectDir));
        output.appendLine(lang.t('build.targetFramework', tfm));
        output.appendLine(lang.t('build.separator'));

        // 执行 dotnet build
        const buildResult = await new Promise<boolean>((resolve) => {
            const p = cp.spawn("dotnet", ["build", projectDir], { shell: true });

            p.stdout.on("data", (data: Buffer) => output.append(data.toString()));
            p.stderr.on("data", (data: Buffer) => output.append(data.toString()));

            p.on("exit", (code: number | null) => {
                if (code === 0) {
                    output.appendLine(lang.t('build.success'));
                    resolve(true);
                } else {
                    output.appendLine(lang.t('build.failed'));
                    resolve(false);
                }
            });
        });

        if (!buildResult) {
            vscode.window.showErrorMessage(lang.t('error.buildFailed'));
            return;
        }

        // 读取 launchSettings.json 获取环境变量
        var projectProfile = getProjectProfile(projectPath);
        let envFromLaunchSettings: Record<string, string> = {};
        if (projectProfile?.environmentVariables) {
            envFromLaunchSettings = projectProfile.environmentVariables;
        }

        // 构造动态调试配置
        const debugConfig = {
            name: lang.t('debug.configName', projectName),
            type: "coreclr",
            request: "launch",
            program: `${projectDir}/bin/Debug/${tfm}/${projectName}.dll`,
            cwd: projectDir,
            env: {
                ASPNETCORE_ENVIRONMENT: "Development", // 默认值
                ...envFromLaunchSettings               // launchSettings.json 覆盖
            },
            console: "integratedTerminal",
            stopAtEntry: false
        };

        // 获取 workspaceFolder（可能为 undefined）
        const workspaceFolder =
            vscode.workspace.getWorkspaceFolder(vscode.Uri.file(projectPath)) ?? undefined;

        // 启动调试
        const started = await vscode.debug.startDebugging(workspaceFolder, debugConfig);

        if (!started) {
            vscode.window.showErrorMessage(lang.t('error.debugStartFailed'));
        } else {
            activeProjects.add(projectDir); // 记录该项目正在调试
        }
    }

    /**
     * 使用 VS Code Terminal API 启动 dotnet run（带环境变量）
     */
    async function runProject(projectPath: string | undefined) {
        if (!projectPath) {
            vscode.window.showErrorMessage(lang.t('error.noProjectFile'));
            return;
        }

        const path = require("path");
        const projectDir = path.dirname(projectPath);
        const projectName = path.basename(projectPath, ".csproj");

        // 读取 launchSettings.json 的环境变量
        const profile = getProjectProfile(projectPath);
        const envFromLaunchSettings = profile?.environmentVariables ?? {};

        // 创建带环境变量的终端（每次都创建新的）
        const terminal = vscode.window.createTerminal({
            name: lang.t('run.terminalName', projectName),
            cwd: projectDir,
            env: {
                ASPNETCORE_ENVIRONMENT: "Development",
                ...envFromLaunchSettings
            }
        });

        terminal.show();
        terminal.sendText(`dotnet run --project "${projectPath}"`);
    }

    /**
     * 检测项目的目标框架版本
     */
    async function detectTargetFramework(projectPath: string): Promise<string> {
        try {
            // 读取 .csproj 文件
            const csprojContent = await vscode.workspace.fs.readFile(vscode.Uri.file(projectPath));
            const content = csprojContent.toString();

            // 匹配 <TargetFramework>net6.0</TargetFramework> 或 <TargetFramework>net10.0</TargetFramework>
            const match = content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/i);
            if (match && match[1]) {
                return match[1];
            }

            // 如果没找到，尝试匹配 <TargetFrameworks>（多目标）
            const multiMatch = content.match(/<TargetFrameworks>([^<]+)<\/TargetFrameworks>/i);
            if (multiMatch && multiMatch[1]) {
                // 取第一个目标框架
                const frameworks = multiMatch[1].split(';');
                if (frameworks.length > 0) {
                    return frameworks[0].trim();
                }
            }
        } catch (error) {
            console.error(lang.t('log.detectFrameworkFailed'), error);
        }

        // 默认返回 net8.0（最新的 LTS 版本）
        return 'net8.0';
    }

    /**
     * 判断某个项目是否已经在运行
     */
    function isProjectRunning(projectPath: string): boolean {
        const path = require("path");
        const projectDir = path.dirname(projectPath);

        return activeProjects.has(projectDir);
    }

    /**
     * 从 launchSettings.json 中获取 Project Profile
     */
    function getProjectProfile(projectPath: string | undefined) {
        const path = require("path");
        const fs = require("fs");

        const projectDir = path.dirname(projectPath);
        const launchSettingsPath = path.join(projectDir, "Properties", "launchSettings.json");

        if (!fs.existsSync(launchSettingsPath)) {
            return null;
        }

        try {
            let content = fs.readFileSync(launchSettingsPath, "utf8");

            // 去除 BOM 头（如果有）
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
            }

            // 解析 JSON
            const json = JSON.parse(content);
            const profiles = json.profiles ?? {};

            // 找到 commandName = "Project" 的 profile
            const projectProfile = Object.values(profiles).find(
                (p: any) => p.commandName === "Project"
            ) as any;

            return projectProfile ?? null;
        } catch {
            return null;
        }
    }

    /**
     * 从 Project Profile 中获取基础 URL
     */
    function getBaseUrlFromLaunchSettings(projectProfile: any): string | null {
        const raw = projectProfile?.applicationUrl;
        if (!raw) return null;

        const urls: string[] = raw.split(";")
            .map((u: string) => u.trim())
            .filter((u: string) => u.length > 0);

        if (urls.length === 0) return null;

        const httpUrl = urls.find(u => u.startsWith("http://"));
        const httpsUrl = urls.find(u => u.startsWith("https://"));
        const chosen = httpUrl ?? httpsUrl ?? null;

        if (!chosen) return null;

        try {
            const url = new URL(chosen);

            // localhost → 保留
            if (url.hostname === "localhost") {
                return url.toString().replace(/\/$/, "");
            }

            // 真实 IP → 保留
            if (isRealIPv4(url.hostname)) {
                return url.toString().replace(/\/$/, "");
            }

            // 其他奇怪写法 → 一律替换成 localhost
            url.hostname = "localhost";
            return url.toString().replace(/\/$/, "");

        } catch {
            return null;
        }
    }

    /**
     * 是否是一个真实的 IPv4 地址（排除通配地址和无效格式）
     */
    function isRealIPv4(host: string): boolean {
        // 排除通配地址
        if (host === "0.0.0.0") return false;

        const parts = host.split(".");
        if (parts.length !== 4) return false;

        return parts.every(p => {
            const n = Number(p);
            return n >= 0 && n <= 255 && /^\d+$/.test(p);
        });
    }

    // 监听配置文件变化
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            // 监听路由变量配置文件的变化
            if (document.fileName.endsWith('csharp-api-explorer-variables.json')) {
                console.log(lang.t('config.reloaded'));
                await configManager.load();
                routeProvider.refresh();
            }
        })
    );

    // 添加到订阅列表
    context.subscriptions.push(treeView);
}

/**
 * 插件停用
 */
export function deactivate() {
    console.log(lang.t('extension.deactivated'));
}
