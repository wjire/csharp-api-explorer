import * as vscode from 'vscode';
import { ApiEndpoint, ApiParameter, ParameterSource } from './models/apiEndpoint';
import { LaunchSettingsReader } from './launchSettingsReader';

/**
 * API 端点检测器
 * 检测 C# Controller 中的 API 端点，解析参数信息
 */
export class ApiEndpointDetector {
    // 匹配参数定义：[FromQuery] string name, [FromBody] User user, int id
    private readonly parameterRegex = /(?:\[(?:FromQuery|FromBody|FromHeader|FromRoute)\])?\s*(\w+(?:<[^>]+>)?)\s+(\w+)/g;
    
    // 匹配特性：[FromQuery], [FromBody], [FromHeader], [FromRoute]
    private readonly fromAttributeRegex = /\[From(Query|Body|Header|Route)\]/;

    /**
     * 从文档位置检测 API 端点
     * @param document 当前文档
     * @param position 光标位置（通常是方法定义行）
     * @returns API 端点信息或 null
     */
    async detectApiEndpoint(document: vscode.TextDocument, position: vscode.Position): Promise<ApiEndpoint | null> {
        const text = document.getText();
        const lines = text.split('\n');
        
        // 找到方法定义所在行
        let methodLine = position.line;
        const methodText = lines[methodLine];
        
        // 确认是方法定义
        if (!this.isMethodDefinition(methodText)) {
            return null;
        }

        // 解析方法名
        const methodName = this.extractMethodName(methodText);
        if (!methodName) {
            return null;
        }

        // 向上查找 HTTP 方法特性和 Route 特性
        const { httpMethod, routeTemplate } = this.findHttpAttributeAndRoute(lines, methodLine);
        
        if (!httpMethod) {
            return null; // 不是 API 方法
        }

        // 查找控制器名称和控制器路由
        const { controllerName, controllerRoute } = this.findControllerInfo(lines, methodLine);
        
        if (!controllerName) {
            return null;
        }

        // 构建完整路由
        const fullRoute = this.buildFullRoute(controllerRoute, routeTemplate, controllerName, methodName);

        // 解析参数
        const parameters = this.parseMethodParameters(lines, methodLine, fullRoute);

        // 查找项目文件
        const projectPath = await this.findProjectFile(document.uri.fsPath);

        // 获取 Base URL
        const baseUrl = LaunchSettingsReader.getBaseUrl(projectPath);
        const fullUrl = baseUrl ? `${baseUrl}${fullRoute}` : fullRoute;

        return {
            httpMethod,
            routeTemplate: fullRoute,
            fullUrl,
            controller: controllerName,
            action: methodName,
            filePath: document.uri.fsPath,
            lineNumber: methodLine + 1,
            projectPath,
            parameters
        };
    }

    /**
     * 判断是否是方法定义行
     */
    private isMethodDefinition(line: string): boolean {
        const methodRegex = /(?:public|private|protected|internal)\s+(?:async\s+)?(?:Task<)?[\w<>]+(?:>)?\s+\w+\s*\(/;
        return methodRegex.test(line);
    }

    /**
     * 提取方法名
     */
    private extractMethodName(line: string): string | null {
        const methodRegex = /(?:public|private|protected|internal)\s+(?:async\s+)?(?:Task<)?[\w<>]+(?:>)?\s+(\w+)\s*\(/;
        const match = methodRegex.exec(line);
        return match ? match[1] : null;
    }

    /**
     * 查找 HTTP 方法特性和路由
     */
    private findHttpAttributeAndRoute(lines: string[], methodLine: number): { 
        httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | null; 
        routeTemplate: string 
    } {
        let httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | null = null;
        let routeTemplate = '';

        // 向上查找最多 10 行
        const startLine = Math.max(0, methodLine - 10);

        for (let i = methodLine - 1; i >= startLine; i--) {
            const line = lines[i].trim();

            // 跳过注释
            if (line.startsWith('//')) {
                continue;
            }

            // 遇到 class 定义停止
            if (/\bclass\b/.test(line)) {
                break;
            }

            // 检查 HTTP 方法特性
            const httpMatch = line.match(/\[(HttpGet|HttpPost|HttpPut|HttpDelete)(?:\s*\(\s*"([^"]*)"\s*\))?\]/);
            if (httpMatch) {
                httpMethod = httpMatch[1].replace('Http', '').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE';
                if (httpMatch[2]) {
                    routeTemplate = httpMatch[2];
                }
            }

            // 检查 Route 特性
            const routeMatch = line.match(/\[Route\s*\(\s*"([^"]+)"\s*\)\]/);
            if (routeMatch && !routeTemplate) {
                routeTemplate = routeMatch[1];
            }
        }

        return { httpMethod, routeTemplate };
    }

    /**
     * 查找控制器信息
     */
    private findControllerInfo(lines: string[], methodLine: number): { 
        controllerName: string | null; 
        controllerRoute: string | null 
    } {
        let controllerName: string | null = null;
        let controllerRoute: string | null = null;

        // 向上查找控制器定义
        for (let i = methodLine; i >= 0; i--) {
            const line = lines[i];

            // 查找控制器类定义
            const controllerMatch = line.match(/(?:public|private|protected|internal)?\s*(?:static|abstract|sealed)?\s*class\s+(\w+Controller)/);
            if (controllerMatch) {
                controllerName = controllerMatch[1];

                // 在控制器定义前查找 Route 特性
                for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
                    const attrLine = lines[j].trim();
                    const routeMatch = attrLine.match(/\[Route\s*\(\s*"([^"]+)"\s*\)\]/);
                    if (routeMatch) {
                        controllerRoute = routeMatch[1];
                        break;
                    }
                }
                break;
            }
        }

        return { controllerName, controllerRoute };
    }

    /**
     * 构建完整路由
     */
    private buildFullRoute(
        controllerRoute: string | null, 
        actionRoute: string, 
        controllerName: string, 
        actionName: string
    ): string {
        let route = '';

        // 处理控制器路由
        if (controllerRoute) {
            route = controllerRoute;
            
            // 替换 [controller] 占位符
            const controllerShortName = controllerName.replace(/Controller$/, '').toLowerCase();
            route = route.replace(/\[controller\]/gi, controllerShortName);
            
            // 替换 [action] 占位符
            const actionShortName = actionName.replace(/Async$/i, '').toLowerCase();
            route = route.replace(/\[action\]/gi, actionShortName);
        }

        // 拼接 Action 路由
        if (actionRoute) {
            if (route) {
                route = `${route}/${actionRoute}`;
            } else {
                route = actionRoute;
            }
        }

        // 确保以 / 开头
        if (route && !route.startsWith('/')) {
            route = '/' + route;
        }

        return route || '/';
    }

    /**
     * 解析方法参数
     */
    private parseMethodParameters(lines: string[], methodLine: number, routeTemplate: string): ApiParameter[] {
        const parameters: ApiParameter[] = [];

        // 提取路由中的路径参数 {id}, {name} 等
        const pathParams = this.extractPathParameters(routeTemplate);

        // 找到方法签名（可能跨多行）
        let methodSignature = this.getMethodSignature(lines, methodLine);

        // 解析参数
        this.parameterRegex.lastIndex = 0;
        let match;
        
        while ((match = this.parameterRegex.exec(methodSignature)) !== null) {
            const paramType = match[1];
            const paramName = match[2];

            // 确定参数来源
            let source: ParameterSource;
            
            // 检查参数前是否有 [From*] 特性
            const beforeParam = methodSignature.substring(0, match.index);
            const fromAttrMatch = this.fromAttributeRegex.exec(beforeParam.split(',').pop() || '');
            
            if (fromAttrMatch) {
                const attr = fromAttrMatch[1];
                if (attr === 'Query') source = ParameterSource.Query;
                else if (attr === 'Body') source = ParameterSource.Body;
                else if (attr === 'Header') source = ParameterSource.Header;
                else if (attr === 'Route') source = ParameterSource.Path;
                else source = ParameterSource.Query; // 默认
            } else if (pathParams.includes(paramName.toLowerCase())) {
                // 如果参数名在路由模板中，则是路径参数
                source = ParameterSource.Path;
            } else if (paramType.toLowerCase() === 'cancellationtoken') {
                // 跳过 CancellationToken
                continue;
            } else {
                // 根据 HTTP 方法推断
                // GET/DELETE 默认 Query，POST/PUT 默认 Body
                const lastHttpMatch = methodSignature.match(/\[(HttpGet|HttpPost|HttpPut|HttpDelete)/);
                if (lastHttpMatch) {
                    const method = lastHttpMatch[1];
                    source = (method === 'HttpGet' || method === 'HttpDelete') 
                        ? ParameterSource.Query 
                        : ParameterSource.Body;
                } else {
                    source = ParameterSource.Query;
                }
            }

            parameters.push({
                name: paramName,
                type: paramType,
                source,
                required: true // 简化处理，都标记为必需
            });
        }

        return parameters;
    }

    /**
     * 提取路由模板中的路径参数
     */
    private extractPathParameters(routeTemplate: string): string[] {
        const pathParams: string[] = [];
        const regex = /\{(\w+)(?::\w+)?\}/g;
        let match;

        while ((match = regex.exec(routeTemplate)) !== null) {
            pathParams.push(match[1].toLowerCase());
        }

        return pathParams;
    }

    /**
     * 获取完整的方法签名（可能跨多行）
     */
    private getMethodSignature(lines: string[], startLine: number): string {
        let signature = '';
        let braceCount = 0;
        let foundOpen = false;

        // 向上查找特性
        for (let i = Math.max(0, startLine - 10); i <= startLine; i++) {
            signature += lines[i] + ' ';
        }

        // 向下查找到方法签名结束
        for (let i = startLine + 1; i < lines.length && i < startLine + 10; i++) {
            const line = lines[i];
            signature += line + ' ';

            for (const char of line) {
                if (char === '(') {
                    foundOpen = true;
                    braceCount++;
                } else if (char === ')') {
                    braceCount--;
                    if (foundOpen && braceCount === 0) {
                        return signature;
                    }
                }
            }
        }

        return signature;
    }

    /**
     * 查找项目文件
     */
    private async findProjectFile(filePath: string): Promise<string | undefined> {
        const path = require('path');
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

                const parentDir = path.dirname(currentDir);
                if (parentDir === currentDir) {
                    break;
                }
                currentDir = parentDir;
            } catch (error) {
                break;
            }
        }

        return undefined;
    }
}
