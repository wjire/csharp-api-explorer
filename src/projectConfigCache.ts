import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 项目配置缓存管理器
 * 提供两层缓存：
 * 1. Controller 文件路径 → 项目根目录
 * 2. 项目根目录 → Base URL
 */
export class ProjectConfigCache {
    // 第一层缓存：文件路径 → 项目根目录路径
    private projectDirCache = new Map<string, string | undefined>();

    // 第二层缓存：项目根目录 → Base URL
    private baseUrlCache = new Map<string, string | null>();

    // 监听的 launchSettings.json 文件
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.setupFileWatcher();
    }

    /**
     * 设置文件监听器，监听所有 launchSettings.json 的变化
     */
    private setupFileWatcher(): void {
        // 监听所有 Properties/launchSettings.json 文件的变化
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            '**/Properties/launchSettings.json'
        );

        // 文件变化时，清除对应项目的 Base URL 缓存
        this.fileWatcher.onDidChange((uri) => {
            const projectDir = path.dirname(path.dirname(uri.fsPath));
            console.log(`[ProjectConfigCache] launchSettings.json 变化，清除缓存: ${projectDir}`);
            this.baseUrlCache.delete(projectDir);
        });

        // 文件删除时，清除缓存
        this.fileWatcher.onDidDelete((uri) => {
            const projectDir = path.dirname(path.dirname(uri.fsPath));
            console.log(`[ProjectConfigCache] launchSettings.json 删除，清除缓存: ${projectDir}`);
            this.baseUrlCache.delete(projectDir);
        });

        this.disposables.push(this.fileWatcher);
    }

    /**
     * 获取 Controller 文件所属的项目根目录（带缓存）
     * @param controllerFilePath Controller 文件的完整路径
     * @returns 项目根目录路径（包含 .csproj 文件）
     */
    async getProjectDirectory(controllerFilePath: string): Promise<string | undefined> {
        // 检查第一层缓存
        if (this.projectDirCache.has(controllerFilePath)) {
            return this.projectDirCache.get(controllerFilePath);
        }

        // 缓存未命中，执行查找
        const projectPath = await this.findProjectFile(controllerFilePath);
        const projectDir = projectPath ? path.dirname(projectPath) : undefined;

        // 存入缓存
        this.projectDirCache.set(controllerFilePath, projectDir);

        return projectDir;
    }

    /**
     * 获取项目的 Base URL（带缓存）
     * @param projectDir 项目根目录路径
     * @returns Base URL 或 null
     */
    async getBaseUrl(projectDir: string): Promise<string | null> {
        // 检查第二层缓存
        if (this.baseUrlCache.has(projectDir)) {
            return this.baseUrlCache.get(projectDir)!;
        }

        // 缓存未命中，读取 launchSettings.json
        const baseUrl = await this.readBaseUrlFromLaunchSettings(projectDir);

        // 存入缓存
        this.baseUrlCache.set(projectDir, baseUrl);

        return baseUrl;
    }

    /**
     * 通过 Controller 文件路径直接获取 Base URL（组合两层缓存）
     * @param controllerFilePath Controller 文件的完整路径
     * @returns Base URL 或 null
     */
    async getBaseUrlByControllerPath(controllerFilePath: string): Promise<string | null> {
        const projectDir = await this.getProjectDirectory(controllerFilePath);
        if (!projectDir) {
            return null;
        }
        return await this.getBaseUrl(projectDir);
    }

    /**
     * 清空所有缓存（手动刷新时调用）
     */
    clearAllCache(): void {
        console.log('[ProjectConfigCache] 清空所有缓存');
        this.projectDirCache.clear();
        this.baseUrlCache.clear();
    }

    /**
     * 仅清空 Base URL 缓存（保留项目目录缓存）
     */
    clearBaseUrlCache(): void {
        console.log('[ProjectConfigCache] 清空 Base URL 缓存');
        this.baseUrlCache.clear();
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.clearAllCache();
    }

    /**
     * 查找文件所属的 .csproj 项目文件（从 routeParser.ts 迁移过来）
     */
    private async findProjectFile(filePath: string): Promise<string | undefined> {
        let currentDir = path.dirname(filePath);

        // 最多向上查找 10 层
        for (let i = 0; i < 10; i++) {
            try {
                const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(currentDir));
                const csprojFile = files.find(([name, type]) =>
                    type === vscode.FileType.File && name.endsWith('.csproj')
                );

                if (csprojFile) {
                    return path.join(currentDir, csprojFile[0]);
                }

                // 向上一级目录
                const parentDir = path.dirname(currentDir);
                if (parentDir === currentDir) {
                    break; // 已到达根目录
                }
                currentDir = parentDir;
            } catch (error) {
                console.error(`[ProjectConfigCache] 查找项目文件失败: ${error}`);
                break;
            }
        }

        return undefined;
    }

    /**
     * 从 launchSettings.json 读取 Base URL
     */
    private async readBaseUrlFromLaunchSettings(projectDir: string): Promise<string | null> {
        const launchSettingsPath = path.join(projectDir, 'Properties', 'launchSettings.json');

        try {
            const uri = vscode.Uri.file(launchSettingsPath);
            const content = await vscode.workspace.fs.readFile(uri);
            let jsonContent = Buffer.from(content).toString('utf8');

            // 去除 BOM 头
            if (jsonContent.charCodeAt(0) === 0xFEFF) {
                jsonContent = jsonContent.slice(1);
            }

            const json = JSON.parse(jsonContent);
            const profiles = json.profiles ?? {};

            // 查找 commandName = "Project" 的 profile
            const projectProfile = Object.values(profiles).find(
                (p: any) => p.commandName === "Project"
            ) as any;

            if (!projectProfile?.applicationUrl) {
                return null;
            }

            // 解析 applicationUrl
            const urls: string[] = projectProfile.applicationUrl
                .split(';')
                .map((u: string) => u.trim())
                .filter((u: string) => u.length > 0);

            if (urls.length === 0) {
                return null;
            }

            // 优先选择 http，其次 https
            const httpUrl = urls.find(u => u.startsWith('http://'));
            const httpsUrl = urls.find(u => u.startsWith('https://'));
            const chosen = httpUrl ?? httpsUrl;

            if (!chosen) {
                return null;
            }

            // 规范化 URL（替换通配地址为 localhost）
            const url = new URL(chosen);
            if (url.hostname === '0.0.0.0' || url.hostname === '*') {
                url.hostname = 'localhost';
            }

            return url.toString().replace(/\/$/, ''); // 移除末尾斜杠
        } catch (error) {
            // 文件不存在或解析失败
            return null;
        }
    }

    /**
     * 获取缓存统计信息（用于调试）
     */
    getStats() {
        return {
            projectDirCacheSize: this.projectDirCache.size,
            baseUrlCacheSize: this.baseUrlCache.size
        };
    }
}
