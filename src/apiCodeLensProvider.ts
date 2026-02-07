import * as vscode from 'vscode';
import { ApiEndpointDetector } from './apiEndpointDetector';

/**
 * API CodeLens 提供者
 * 在 C# Controller 的 Action 方法上显示 "🚀 Test API" 按钮
 */
export class ApiCodeLensProvider implements vscode.CodeLensProvider {
    private detector: ApiEndpointDetector;

    // HTTP 方法特性的正则表达式
    private readonly httpMethodRegex = /\[(HttpGet|HttpPost|HttpPut|HttpDelete)(?:\s*\(.*?\))?\]/;

    constructor(detector: ApiEndpointDetector) {
        this.detector = detector;
    }

    /**
     * 提供 CodeLens
     */
    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        // 只处理 C# 文件
        if (document.languageId !== 'csharp') {
            return codeLenses;
        }

        // 只处理 Controller 文件
        const fileName = document.fileName.split(/[\\/]/).pop() || '';
        if (!fileName.endsWith('Controller.cs')) {
            return codeLenses;
        }

        const text = document.getText();
        const lines = text.split('\n');

        // 查找所有 Action 方法
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 检查是否是方法定义行
            if (!this.isMethodDefinition(line)) {
                continue;
            }

            // 检查前面几行是否有 HTTP 方法特性
            const hasHttpAttribute = this.hasHttpMethodAttribute(lines, i);
            if (!hasHttpAttribute) {
                continue;
            }

            // 创建 CodeLens
            const range = new vscode.Range(i, 0, i, 0);
            const codeLens = new vscode.CodeLens(range);
            codeLenses.push(codeLens);
        }

        return codeLenses;
    }

    /**
     * 解析 CodeLens（添加命令）
     */
    async resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens> {
        // 获取文档
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return codeLens;
        }

        const document = editor.document;
        const position = codeLens.range.start;

        // 检测 API 端点
        const apiEndpoint = await this.detector.detectApiEndpoint(document, position);

        if (!apiEndpoint) {
            return codeLens;
        }

        // 设置命令
        codeLens.command = {
            title: '🚀 Test API',
            command: 'csharpApiExplorer.testApi',
            arguments: [apiEndpoint]
        };

        return codeLens;
    }

    /**
     * 判断是否是方法定义行
     */
    private isMethodDefinition(line: string): boolean {
        const methodRegex = /(?:public|private|protected|internal)\s+(?:async\s+)?(?:Task<)?[\w<>]+(?:>)?\s+\w+\s*\(/;
        return methodRegex.test(line);
    }

    /**
     * 检查前面几行是否有 HTTP 方法特性
     */
    private hasHttpMethodAttribute(lines: string[], methodLine: number): boolean {
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
            if (this.httpMethodRegex.test(line)) {
                return true;
            }
        }

        return false;
    }
}
