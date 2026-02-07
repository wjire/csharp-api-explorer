import * as vscode from 'vscode';
import * as path from 'path';
import { VariableConfig } from './models/route';

/**
 * 变量配置管理器
 * 配置文件格式：{ "version:apiversion": "2.0" }
 */
export class ConfigManager {
    private readonly configFileName = 'csharp-api-explorer-variables.json';
    private config: VariableConfig = {};

    constructor(private workspaceRoot: string) { }

    /**
     * 加载变量配置
     */
    async load(): Promise<void> {
        const configPath = this.getConfigFilePath();

        try {
            const uri = vscode.Uri.file(configPath);
            const content = await vscode.workspace.fs.readFile(uri);
            this.config = JSON.parse(content.toString());
        } catch (error) {
            // 文件不存在或解析失败，使用空配置
            this.config = {};
        }
    }

    /**
     * 保存变量配置
     */
    async save(): Promise<void> {
        const configPath = this.getConfigFilePath();
        const content = JSON.stringify(this.config, null, 2);
        const uri = vscode.Uri.file(configPath);

        // 确保 .vscode 目录存在
        const vscodePath = path.dirname(configPath);
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodePath));
        } catch {
            // 目录已存在
        }

        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    }

    /**
     * 获取所有路由变量
     */
    getAll(): VariableConfig {
        return { ...this.config };
    }

    /**
     * 打开配置文件进行编辑
     */
    async openConfigFile(): Promise<void> {
        const configPath = this.getConfigFilePath();
        const uri = vscode.Uri.file(configPath);

        // 如果文件不存在，创建带示例的模板
        try {
            await vscode.workspace.fs.stat(uri);
        } catch {
            // 文件不存在，创建模板
            const template = {
                "version:apiversion": "1.0"
            };
            const content = JSON.stringify(template, null, 2);

            // 确保 .vscode 目录存在
            const vscodePath = path.dirname(configPath);
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodePath));
            } catch {
                // 目录已存在
            }

            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        }

        // 打开文件
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, {
            preview: false,
            viewColumn: vscode.ViewColumn.Active
        });
    }

    /**
     * 替换路由中的变量
     * @param route 原始路由，如: /api/v{version:apiversion}/[controller]
     * @returns 替换后的路由，如: /api/v1.0/[controller]
     */
    replaceRouteVariables(route: string): string {
        let result = route;

        // 遍历所有配置的变量，替换路由中的 {key}
        for (const [key, value] of Object.entries(this.config)) {
            result = result.replace(new RegExp(`\\{${this.escapeRegex(key)}\\}`, 'g'), value);
        }

        return result;
    }

    /**
     * 转义正则表达式特殊字符
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 获取配置文件路径
     */
    private getConfigFilePath(): string {
        return path.join(this.workspaceRoot, '.vscode', this.configFileName);
    }
}
