import * as vscode from 'vscode';
import { RouteInfo } from './models/route';

/**
 * C# 路由解析器
 */
export class RouteParser {
    // 匹配 Controller 类（支持访问修饰符和多行定义）
    private readonly controllerRegex = /(?:public|private|protected|internal)?\s*(?:static|abstract|sealed)?\s*class\s+(\w+Controller)\s*(?::\s*[\w<>,\s]+)?\s*(?:\{|$)/gm;

    // 匹配 Controller 上的 Route 特性
    private readonly controllerRouteRegex = /\[Route\s*\(\s*"([^"]+)"\s*\)\s*\]/g;

    // 匹配 HTTP 方法特性（支持无括号、空括号、带路径、多特性逗号分隔）
    private readonly httpMethodRegex = /\b(HttpGet|HttpPost|HttpPut|HttpDelete)(?:\s*\(\s*(?:"([^"]*)")?\s*\))?(?=\s*[,\]])/g;

    // 匹配 Route 特性（支持多特性逗号分隔）
    private readonly routeRegex = /\bRoute\s*\(\s*"([^"]+)"\s*\)(?=\s*[,\]])/g;

    // 匹配方法定义
    private readonly methodRegex = /(?:public|private|protected|internal)\s+(?:async\s+)?(?:Task<)?[\w<>]+(?:>)?\s+(\w+)\s*\(/g;

    /**
     * 解析工作区中的所有 C# 文件
     */
    async parseWorkspace(): Promise<RouteInfo[]> {
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

        // 查找所有 C# 文件
        const files = await vscode.workspace.findFiles(
            '**/*.cs',
            `{${excludePatterns.join(',')}}`
        );

        const routes: RouteInfo[] = [];

        for (const file of files) {
            const fileRoutes = await this.parseFile(file);
            routes.push(...fileRoutes);
        }

        return routes;
    }

    /**
     * 解析单个 C# 文件（公开方法，支持增量更新）
     */
    async parseFile(uri: vscode.Uri): Promise<RouteInfo[]> {
        const routes: RouteInfo[] = [];

        // 优化1：文件名过滤 - 只处理以 Controller.cs 结尾的文件
        const fileName = uri.fsPath.split(/[\\/]/).pop() || '';
        if (!fileName.endsWith('Controller.cs')) {
            return routes;
        }

        // 查找该文件所属的 .csproj 项目文件
        const projectPath = await this.findProjectFile(uri.fsPath);

        // 过滤测试、示例和基类文件
        const filePath = uri.fsPath.toLowerCase();
        if (
            // filePath.includes('test') ||
            // filePath.includes('mock') ||
            // filePath.includes('sample') ||
            // filePath.includes('example') ||
            fileName.toLowerCase().includes('basecontroller') ||
            fileName.toLowerCase().includes('controllerbase')) {
            return routes;
        }

        // 直接读取文件内容，避免触发 Language Server
        const fileBuffer = await vscode.workspace.fs.readFile(uri);
        const content = Buffer.from(fileBuffer).toString('utf8');

        // 优化2：快速检查 - 文件中必须包含 HTTP 方法特性
        if (!content.includes('[Http') && !content.includes('[Route')) {
            return routes;
        }

        // 按行分割内容
        const lines = content.split('\n');

        // 查找所有 Controller
        const controllers = this.findControllers(content, lines);

        for (const controller of controllers) {
            const controllerRoutes = this.parseController(
                controller,
                lines,
                uri.fsPath,
                projectPath
            );
            routes.push(...controllerRoutes);
        }

        return routes;
    }

    /**
     * 查找所有 Controller
     */
    private findControllers(content: string, lines: string[]): Array<{
        name: string;
        lineNumber: number;
        baseRoute?: string;
    }> {
        const controllers: Array<{
            name: string;
            lineNumber: number;
            baseRoute?: string;
        }> = [];

        // 重置正则表达式
        this.controllerRegex.lastIndex = 0;

        let match;
        while ((match = this.controllerRegex.exec(content)) !== null) {
            const controllerName = match[1];

            // 找到控制器所在的行号
            const lineNumber = this.getLineNumber(content, match.index);

            // 查找控制器上的 Route 特性
            const baseRoute = this.findControllerRoute(lines, lineNumber);

            // 只添加以 Controller 结尾的类
            if (controllerName.endsWith('Controller')) {
                controllers.push({
                    name: controllerName,
                    lineNumber,
                    baseRoute
                });
            }
        }

        return controllers;
    }

    /**
     * 查找 Controller 上的 Route 特性
     */
    private findControllerRoute(lines: string[], controllerLineNumber: number): string | undefined {
        // 向上查找最多10行
        const startLine = Math.max(0, controllerLineNumber - 10);

        for (let i = controllerLineNumber - 1; i >= startLine; i--) {
            const line = lines[i];
            this.controllerRouteRegex.lastIndex = 0;
            const match = this.controllerRouteRegex.exec(line);

            if (match) {
                return match[1];
            }
        }

        return undefined;
    }

    /**
     * 解析 Controller 中的所有路由
     */
    private parseController(
        controller: { name: string; lineNumber: number; baseRoute?: string },
        lines: string[],
        filePath: string,
        projectPath?: string
    ): RouteInfo[] {
        const routes: RouteInfo[] = [];

        // 查找 Controller 类的结束位置
        const endLine = this.findControllerEndLine(lines, controller.lineNumber);

        // 在 Controller 范围内查找所有 Action
        for (let i = controller.lineNumber; i < endLine && i < lines.length; i++) {
            const route = this.parseAction(
                lines,
                i,
                controller.name,
                controller.baseRoute,
                filePath,
                projectPath
            );

            if (route) {
                routes.push(route);
            }
        }

        return routes;
    }

    /**
     * 解析 Action 方法
     */
    private parseAction(
        lines: string[],
        lineIndex: number,
        controllerName: string,
        baseRoute: string | undefined,
        filePath: string,
        projectPath?: string
    ): RouteInfo | null {
        const line = lines[lineIndex];

        // 跳过注释行
        if (this.isCommentLine(line)) {
            return null;
        }

        // 检查是否是方法定义行
        this.methodRegex.lastIndex = 0;
        const methodMatch = this.methodRegex.exec(line);

        if (!methodMatch) {
            return null;
        }

        const actionName = methodMatch[1];

        // 向上查找最多5行，寻找 HTTP 方法特性和 Route 特性
        const startLine = Math.max(0, lineIndex - 5);
        let httpVerb: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'ANY' = 'ANY'; // 默认 ANY（接受所有动词）
        let actionRoute = '';
        let foundHttpAttribute = false;

        // 从方法定义行的上一行开始向上查找特性
        for (let i = lineIndex - 1; i >= startLine; i--) {
            const attrLine = lines[i];

            // 跳过注释行
            if (this.isCommentLine(attrLine)) {
                continue;
            }

            // 如果遇到 class 定义，停止扫描（避免扫描到控制器级别的特性）
            if (/\bclass\b/.test(attrLine)) {
                break;
            }

            // 1. 检查 HTTP 方法特性（确定谓词）- 支持同一行多个特性
            this.httpMethodRegex.lastIndex = 0;
            let httpMatch;
            while ((httpMatch = this.httpMethodRegex.exec(attrLine)) !== null) {
                foundHttpAttribute = true;
                httpVerb = httpMatch[1].replace('Http', '').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE';

                // 如果 HTTP 方法特性中有路径，使用它（如 [HttpGet("api/test")]）
                if (httpMatch[2] && !actionRoute) {
                    actionRoute = httpMatch[2];
                }
            }

            // 2. 检查 Route 特性（确定路由）- 支持同一行多个特性
            this.routeRegex.lastIndex = 0;
            let routeMatch;
            while ((routeMatch = this.routeRegex.exec(attrLine)) !== null) {
                if (!actionRoute) {
                    actionRoute = routeMatch[1];
                }
            }
        }

        // 检查控制器路由是否包含 [action] 占位符
        const hasActionPlaceholder = baseRoute?.includes('[action]');

        // 判断是否是有效的 Action 方法
        if (!foundHttpAttribute && !actionRoute) {
            // 如果既没有 HTTP 特性，也没有 Route 特性
            // 只有当控制器路由包含 [action] 时，这个方法才是有效的 Action
            if (!hasActionPlaceholder) {
                return null;
            }
            // 有 [action] 占位符，方法有效，httpVerb = 'ANY'
        }

        // 重要：httpVerb 为 'ANY' 的前提条件是：
        // 1. 控制器路由包含 [action]，且方法没有显式 HTTP 特性
        // 2. 或者方法有 [Route] 特性但没有 HTTP 特性
        // 满足以上条件时，该方法接受所有 HTTP 动词

        // 构建完整路由
        const fullRoute = this.buildFullRoute(baseRoute, actionRoute, controllerName, actionName);

        return {
            route: fullRoute,
            httpVerb,
            controller: controllerName,
            action: actionName,
            filePath,
            lineNumber: lineIndex + 1, // 转换为1基索引
            projectPath, // 添加项目文件路径
            actionRoute: actionRoute || undefined // 保存action路由部分
        };
    }

    /**
     * 构建完整路由路径
     * 规则：baseRoute + actionRoute，确保以 / 开头
     */
    private buildFullRoute(
        baseRoute: string | undefined,
        actionRoute: string,
        controllerName: string,
        actionName: string
    ): string {
        let route = '';

        // 1. 处理基础路由（控制器上的 Route）
        if (baseRoute) {
            route = baseRoute;

            // 替换 [controller] 占位符 - 去掉 Controller 后缀，转换为小写（ASP.NET Core 约定）
            const controllerShortName = controllerName.replace(/Controller$/, '').toLowerCase();
            route = route.replace(/\[controller\]/gi, controllerShortName);

            // 替换 [action] 占位符 - 去掉 Async 后缀，转换为小写（ASP.NET Core 约定）
            const actionShortName = actionName.replace(/Async$/i, '').toLowerCase();
            route = route.replace(/\[action\]/gi, actionShortName);
        }

        // 2. 拼接 Action 路由
        if (actionRoute) {
            if (route) {
                // 有 baseRoute，拼接
                route = `${route}/${actionRoute}`;
            } else {
                // 没有 baseRoute（控制器没有 [Route]），直接使用 actionRoute
                route = actionRoute;
            }
        }

        // 3. 确保路由以 / 开头
        if (route && !route.startsWith('/')) {
            route = '/' + route;
        }

        // 4. 如果什么都没有，返回 /
        return route || '/';
    }

    /**
     * 查找 Controller 类的结束行
     */
    private findControllerEndLine(lines: string[], startLine: number): number {
        let braceCount = 0;
        let foundOpenBrace = false;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];

            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpenBrace = true;
                } else if (char === '}') {
                    braceCount--;
                    if (foundOpenBrace && braceCount === 0) {
                        return i;
                    }
                }
            }
        }

        return lines.length;
    }

    /**
     * 获取字符位置对应的行号
     */
    private getLineNumber(content: string, index: number): number {
        const lines = content.substring(0, index).split('\n');
        return lines.length - 1;
    }

    /**
     * 检查是否是注释行
     */
    private isCommentLine(line: string): boolean {
        const trimmed = line.trim();
        // 检查单行注释 // 或 ///
        return trimmed.startsWith('//');
    }

    /**
     * 查找文件所属的 .csproj 项目文件
     * 从当前文件夹向上递归查找
     */
    private async findProjectFile(filePath: string): Promise<string | undefined> {
        const path = require('path');
        let currentDir = path.dirname(filePath);

        // 最多向上查找10层
        for (let i = 0; i < 10; i++) {
            try {
                // 查找当前目录下的 .csproj 文件
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
                    // 已经到达根目录
                    break;
                }
                currentDir = parentDir;
            } catch (error) {
                console.error(`查找项目文件失败: ${error}`);
                break;
            }
        }

        return undefined;
    }
}
