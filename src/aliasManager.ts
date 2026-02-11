import * as vscode from 'vscode';
import * as path from 'path';
import { AliasConfig } from './models/route';

/**
 * 别名管理器
 */
export class AliasManager {
    private readonly aliasFileName = 'csharp-api-explorer-aliases.json';
    private aliasMap: Map<string, string> = new Map();

    constructor(private workspaceRoot: string) { }

    /**
     * 加载别名配置
     */
    async load(): Promise<void> {
        const aliasPath = this.getAliasFilePath();

        try {
            const uri = vscode.Uri.file(aliasPath);
            const content = await vscode.workspace.fs.readFile(uri);
            const aliases: AliasConfig[] = JSON.parse(content.toString());

            this.aliasMap.clear();
            for (const alias of aliases) {
                const key = this.makeKey(alias.Route, alias.HttpVerb);
                this.aliasMap.set(key, alias.Alias);
            }
        } catch (error) {
            // 文件不存在或解析失败，使用空Map
            this.aliasMap.clear();
        }
    }

    /**
     * 保存别名配置
     */
    async save(): Promise<void> {
        const aliasPath = this.getAliasFilePath();
        const aliases: AliasConfig[] = [];

        this.aliasMap.forEach((alias, key) => {
            const [route, httpVerb] = this.parseKey(key);
            aliases.push({
                Route: route,
                HttpVerb: httpVerb,
                Alias: alias
            });
        });

        const content = JSON.stringify(aliases, null, 2);
        const uri = vscode.Uri.file(aliasPath);

        // 确保 .vscode 目录存在
        const vscodePath = path.dirname(aliasPath);
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(vscodePath));
        } catch {
            // 目录已存在
        }

        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    }

    /**
     * 获取别名
     */
    getAlias(route: string, httpVerb: string): string | undefined {
        const key = this.makeKey(route, httpVerb);
        return this.aliasMap.get(key);
    }

    /**
     * 设置别名
     */
    async setAlias(route: string, httpVerb: string, alias: string): Promise<void> {
        const key = this.makeKey(route, httpVerb);
        this.aliasMap.set(key, alias);
        await this.save();
    }

    /**
     * 清除别名
     */
    async clearAlias(route: string, httpVerb: string): Promise<void> {
        const key = this.makeKey(route, httpVerb);
        this.aliasMap.delete(key);
        await this.save();
    }

    /**
     * 检查是否有别名
     */
    hasAlias(route: string, httpVerb: string): boolean {
        const key = this.makeKey(route, httpVerb);
        return this.aliasMap.has(key);
    }

    /**
     * 获取别名文件路径
     */
    private getAliasFilePath(): string {
        return path.join(this.workspaceRoot, '.vscode', this.aliasFileName);
    }

    /**
     * 生成别名键
     */
    private makeKey(route: string, httpVerb: string): string {
        return `${httpVerb.toLowerCase()}:${route.toLowerCase()}`;
    }

    /**
     * 解析别名键
     */
    private parseKey(key: string): [string, string] {
        const [httpVerb, ...routeParts] = key.split(':');
        return [routeParts.join(':'), httpVerb];
    }
}
