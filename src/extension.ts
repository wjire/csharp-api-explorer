import * as vscode from 'vscode';
import { RouteProvider, RouteTreeItem } from './routeProvider';
import { RouteParser } from './routeParser';
import { AliasManager } from './aliasManager';
import { ProjectConfigCache } from './projectConfigCache';
import { lang } from './languageManager';

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
    // 获取工作区根目录
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage(lang.t('error.noWorkspace'));
        return;
    }

    // 初始化管理器
    const projectConfigCache = new ProjectConfigCache();
    const aliasManager = new AliasManager(workspaceRoot);
    const routeParser = new RouteParser(projectConfigCache);
    const routeProvider = new RouteProvider(aliasManager);

    // 创建TreeView
    const treeView = vscode.window.createTreeView('csharpApiExplorer.routesList', {
        treeDataProvider: routeProvider,
        showCollapseAll: true  // 启用折叠所有按钮
    });

    // 初始化加载
    initialize();

    async function initialize() {
        await aliasManager.load();
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
                // 手动刷新时清空缓存
                if (!silent) {
                    routeParser.clearCache();
                }

                const routes = await routeParser.parseWorkspace();

                // 重新加载别名文件（保证手动编辑的文件生效）
                await aliasManager.load();

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

    // 注册命令：刷新
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.refresh', async () => {
            routeProvider.setSearchText(''); // 清空搜索条件
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

    // 注册命令：展开所有
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.expandAll', async () => {
            const nodes = await routeProvider.getAllExpandableNodes();
            for (const node of nodes) {
                await treeView.reveal(node, { select: false, focus: false, expand: true });
            }
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
                // 只更新别名并重新排序，不需要重新扫描文件
                routeProvider.updateRouteAlias(
                    item.routeInfo.route,
                    item.routeInfo.httpVerb,
                    alias.trim()
                );
            }
        })
    );

    // 注册命令：清除别名
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.clearAlias', async (item: RouteTreeItem) => {
            await aliasManager.clearAlias(item.routeInfo.route, item.routeInfo.httpVerb);
            // 只更新别名并重新排序，不需要重新扫描文件
            routeProvider.updateRouteAlias(
                item.routeInfo.route,
                item.routeInfo.httpVerb,
                undefined
            );
        })
    );

    // 注册命令：复制路由
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.copyRoute', async (item: RouteTreeItem) => {
            // 复制替换变量后的路由
            const route = await buildFullRouteUrl(item.routeInfo.projectPath, item.displayRoute);
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
    async function buildFullRouteUrl(projectPath: string | undefined, routePath: string) {
        if (!projectPath) {
            return routePath;
        }

        const path = require('path');
        const projectDir = path.dirname(projectPath);
        const baseUrl = await projectConfigCache.getBaseUrl(projectDir);

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

        // 读取 launchSettings.json 获取 profile 配置
        const profileData = getProjectProfile(projectPath);
        let envFromLaunchSettings: Record<string, string> = {};
        let profileName: string | undefined = undefined;

        if (profileData) {
            profileName = profileData.profileName;
            envFromLaunchSettings = profileData.profile.environmentVariables ?? {};
        }

        // 构造动态调试配置
        const debugConfig: any = {
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

        // 指定使用的 launchSettings.json profile，确保调试器使用相同的配置
        if (profileName) {
            debugConfig.launchSettingsProfile = profileName;
        }

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
        const profileData = getProjectProfile(projectPath);
        const envFromLaunchSettings = profileData?.profile?.environmentVariables ?? {};

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
     * @returns { profileName: string, profile: any } | null
     */
    function getProjectProfile(projectPath: string | undefined): { profileName: string, profile: any } | null {
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

            // 找到第一个 commandName = "Project" 的 profile
            for (const [profileName, profileConfig] of Object.entries(profiles)) {
                const p = profileConfig as any;
                if (p.commandName === "Project") {
                    return { profileName, profile: p };
                }
            }

            return null;
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

    // 添加到订阅列表
    context.subscriptions.push(treeView);
    context.subscriptions.push(projectConfigCache);
}

/**
 * 插件停用
 */
export function deactivate() {
}
