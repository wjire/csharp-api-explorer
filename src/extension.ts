import * as vscode from 'vscode';
import { ProjectGroupItem, RouteProvider, RouteTreeItem } from './routeProvider';
import { RouteParser } from './routeParser';
import { AliasManager } from './aliasManager';
import { ProjectConfigCache } from './projectConfigCache';
import { lang } from './languageManager';

const activeProjects = new Set<string>();
const debugSessionProjectDirs = new Map<string, string>();

function getProjectDirFromDebugConfiguration(configuration: vscode.DebugConfiguration | undefined): string | undefined {
    if (!configuration) {
        return undefined;
    }

    const path = require('path');

    if (typeof configuration.cwd === 'string' && configuration.cwd.trim()) {
        return configuration.cwd;
    }

    const projectPath = (configuration as any).projectPath;
    if (typeof projectPath === 'string' && projectPath.trim()) {
        return path.dirname(projectPath);
    }

    if (typeof configuration.program === 'string' && configuration.program.trim()) {
        const match = configuration.program.match(/^(.*?)[\\/]bin[\\/]/i);
        if (match && match[1]) {
            return match[1];
        }
    }

    return undefined;
}

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

    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession((session) => {
            const projectDir = getProjectDirFromDebugConfiguration(session.configuration);
            if (!projectDir) {
                return;
            }

            activeProjects.add(projectDir);
            debugSessionProjectDirs.set(session.id, projectDir);
        })
    );

    context.subscriptions.push(
        vscode.debug.onDidTerminateDebugSession((session) => {
            const trackedProjectDir = debugSessionProjectDirs.get(session.id);
            if (trackedProjectDir) {
                activeProjects.delete(trackedProjectDir);
                debugSessionProjectDirs.delete(session.id);
                return;
            }

            const projectDir = getProjectDirFromDebugConfiguration(session.configuration);
            if (projectDir) {
                activeProjects.delete(projectDir);
            }
        })
    );

    // 创建TreeView
    const treeView = vscode.window.createTreeView('csharpApiExplorer.routesList', {
        treeDataProvider: routeProvider,
        showCollapseAll: true  // 启用折叠所有按钮
    });

    let persistentViewMessage: string | undefined;
    let temporaryMessageTimer: NodeJS.Timeout | undefined;

    // 初始化加载
    initialize();

    function setViewMessage(message: string | undefined): void {
        if (temporaryMessageTimer) {
            clearTimeout(temporaryMessageTimer);
            temporaryMessageTimer = undefined;
        }

        persistentViewMessage = message;
        treeView.message = message;
    }

    function setTemporaryViewMessage(message: string, durationMs: number = 2500): void {
        if (temporaryMessageTimer) {
            clearTimeout(temporaryMessageTimer);
        }

        treeView.message = message;
        temporaryMessageTimer = setTimeout(() => {
            temporaryMessageTimer = undefined;
            treeView.message = persistentViewMessage;
        }, durationMs);
    }

    async function initialize() {
        await aliasManager.load();
        await refreshRoutes();
    }

    async function hasDotnetProject(): Promise<boolean> {
        const config = vscode.workspace.getConfiguration('csharpApiExplorer');
        const excludePatterns = config.get<string[]>('excludePatterns', [
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
        ]);

        const projectFiles = await vscode.workspace.findFiles(
            '**/*.csproj',
            `{${excludePatterns.join(',')}}`,
            1
        );

        return projectFiles.length > 0;
    }

    /**
     * 刷新路由
     * @param silent 静默模式，不显示通知（用于自动刷新）
     */
    async function refreshRoutes(silent: boolean = false) {
        const formatErrorMessage = (error: unknown): string => {
            if (error instanceof Error) {
                return error.message;
            }

            return String(error);
        };

        try {
            const dotnetProjectExists = await hasDotnetProject();
            if (!dotnetProjectExists) {
                routeProvider.setRoutes([]);
                setViewMessage(lang.t('route.skipNotDotnet'));
                return;
            }

            if (!silent) {
                setViewMessage(lang.t('route.parsing'));
            }

            await doRefresh();

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
                setViewMessage(lang.t('route.found', routes.length));
            }
        } catch (error) {
            setViewMessage(lang.t('route.parseFailed', formatErrorMessage(error)));
            console.error(lang.t('route.autoRefreshFailed'), error);
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
            // const route = await buildFullRouteUrl(item.routeInfo.projectPath, item.displayRoute);
            const route = item.displayRoute;
            await vscode.env.clipboard.writeText(route);
            setTemporaryViewMessage(lang.t('copy.success', route));
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
                setViewMessage(lang.t('error.cannotOpenFile') + `: ${error}`);
            }
        })
    );

    // 注册命令：启动调试
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.startDebugging', async (item: RouteTreeItem | ProjectGroupItem) => {
            await startProjectDebugging(getProjectPathFromTreeItem(item));
        })
    );

    // 注册命令：运行项目
    context.subscriptions.push(
        vscode.commands.registerCommand('csharpApiExplorer.runProject', async (item: RouteTreeItem | ProjectGroupItem) => {
            await runProject(getProjectPathFromTreeItem(item));
        })
    );

    function getProjectPathFromTreeItem(item: RouteTreeItem | ProjectGroupItem | undefined): string | undefined {
        if (!item) {
            return undefined;
        }

        if (item instanceof RouteTreeItem) {
            return item.routeInfo.projectPath;
        }

        if (item instanceof ProjectGroupItem) {
            return item.projectPath;
        }

        return undefined;
    }

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
            setViewMessage(lang.t('error.noProjectFile'));
            return;
        }

        if (isProjectRunning(projectPath)) {
            return;
        }

        const path = require('path');
        const cp = require('child_process');

        const projectDir = path.dirname(projectPath);
        const projectName = path.basename(projectPath, '.csproj');

        // 创建输出窗口
        const output = vscode.window.createOutputChannel(lang.t('build.outputTitle', projectName));
        output.show(true);
        output.appendLine(lang.t('build.starting', projectName));
        output.appendLine(lang.t('build.projectPath', projectDir));
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
            setViewMessage(lang.t('error.buildFailed'));
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

        const debugName = lang.t('debug.configName', projectName);
        const env = {
            ASPNETCORE_ENVIRONMENT: "Development",
            ...envFromLaunchSettings
        };

        if (!isDebuggerTypeAvailable("dotnet")) {
            setViewMessage(lang.t('error.devKitRequired'));
            return;
        }

        const dotnetDebugConfig: vscode.DebugConfiguration = {
            name: debugName,
            type: "dotnet",
            request: "launch",
            projectPath,
            cwd: projectDir,
            env
        };

        // 指定使用的 launchSettings.json profile，确保调试器使用相同的配置
        if (profileName) {
            dotnetDebugConfig.launchSettingsProfile = profileName;
        }

        // 获取 workspaceFolder（可能为 undefined）
        const workspaceFolder =
            vscode.workspace.getWorkspaceFolder(vscode.Uri.file(projectPath)) ?? undefined;

        // 启动调试：仅支持 dotnet（C# Dev Kit）
        const started = await vscode.debug.startDebugging(workspaceFolder, dotnetDebugConfig);

        if (!started) {
            setViewMessage(lang.t('error.debugStartFailed'));
        }
    }

    /**
     * 运行项目（仅支持 C# Dev Kit 的 dotnet 调试器 noDebug 模式）
     */
    async function runProject(projectPath: string | undefined) {
        if (!projectPath) {
            setViewMessage(lang.t('error.noProjectFile'));
            return;
        }

        if (isProjectRunning(projectPath)) {
            return;
        }

        const path = require("path");
        const projectDir = path.dirname(projectPath);
        const projectName = path.basename(projectPath, ".csproj");

        // 先尝试 C# Dev Kit（dotnet 调试器）无调试运行，失败再回退到 terminal + dotnet run
        const workspaceFolder =
            vscode.workspace.getWorkspaceFolder(vscode.Uri.file(projectPath)) ?? undefined;

        const profileData = getProjectProfile(projectPath);
        const envFromLaunchSettings = profileData?.profile?.environmentVariables ?? {};

        if (!isDebuggerTypeAvailable("dotnet")) {
            setViewMessage(lang.t('error.devKitRequired'));
            return;
        }

        const dotnetRunConfig: vscode.DebugConfiguration = {
            name: lang.t('run.terminalName', projectName),
            type: "dotnet",
            request: "launch",
            noDebug: true,
            projectPath,
            cwd: projectDir,
            env: {
                ASPNETCORE_ENVIRONMENT: "Development",
                ...envFromLaunchSettings
            }
        };

        if (profileData?.profileName) {
            dotnetRunConfig.launchSettingsProfile = profileData.profileName;
        }

        const started = await vscode.debug.startDebugging(workspaceFolder, dotnetRunConfig);
        if (!started) {
            setViewMessage(lang.t('error.debugStartFailed'));
        }
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
     * 判断当前环境是否注册了指定调试器类型
     */
    function isDebuggerTypeAvailable(debuggerType: string): boolean {
        return vscode.extensions.all.some((extension) => {
            const debuggers = extension.packageJSON?.contributes?.debuggers;
            if (!Array.isArray(debuggers)) {
                return false;
            }

            return debuggers.some((debuggerContribution: any) => debuggerContribution?.type === debuggerType);
        });
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
