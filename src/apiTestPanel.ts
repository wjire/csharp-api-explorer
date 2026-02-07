import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ApiEndpoint, ParameterSource } from './models/apiEndpoint';

/**
 * API 测试面板
 * 管理 WebView 面板，处理 API 测试请求
 */
export class ApiTestPanel {
    public static currentPanel: ApiTestPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];

    /**
     * 创建或显示测试面板
     */
    public static createOrShow(extensionUri: vscode.Uri, apiEndpoint: ApiEndpoint) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 如果面板已存在，显示它
        if (ApiTestPanel.currentPanel) {
            ApiTestPanel.currentPanel.panel.reveal(column);
            ApiTestPanel.currentPanel.updateApiEndpoint(apiEndpoint);
            return;
        }

        // 创建新面板
        const panel = vscode.window.createWebviewPanel(
            'apiTestPanel',
            '🚀 API Test',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'out', 'webview')
                ]
            }
        );

        ApiTestPanel.currentPanel = new ApiTestPanel(panel, extensionUri, apiEndpoint);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        apiEndpoint: ApiEndpoint
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        // 设置 HTML 内容
        this.updateHtmlContent(apiEndpoint);

        // 监听面板关闭事件
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // 处理来自 WebView 的消息
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    /**
     * 更新 API 端点
     */
    private updateApiEndpoint(apiEndpoint: ApiEndpoint) {
        this.panel.webview.postMessage({
            type: 'updateApiEndpoint',
            data: apiEndpoint
        });
    }

    /**
     * 处理来自 WebView 的消息
     */
    private async handleMessage(message: any) {
        switch (message.type) {
            case 'sendRequest':
                await this.sendHttpRequest(message.data);
                break;
        }
    }

    /**
     * 发送 HTTP 请求
     */
    private async sendHttpRequest(requestData: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body?: string;
    }) {
        const startTime = Date.now();

        try {
            const https = require('https');
            const http = require('http');
            const urlModule = require('url');

            const parsedUrl = urlModule.parse(requestData.url);
            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            // 准备请求选项
            const options: any = {
                method: requestData.method,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.path,
                headers: {
                    'Content-Type': 'application/json',
                    ...requestData.headers
                }
            };

            // 如果有 body，设置 Content-Length
            if (requestData.body) {
                options.headers['Content-Length'] = Buffer.byteLength(requestData.body);
            }

            // 发送请求
            const response = await new Promise<{
                statusCode: number;
                headers: Record<string, string>;
                body: string;
            }>((resolve, reject) => {
                const req = httpModule.request(options, (res: any) => {
                    let body = '';

                    res.on('data', (chunk: any) => {
                        body += chunk;
                    });

                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body
                        });
                    });
                });

                req.on('error', (error: Error) => {
                    reject(error);
                });

                // 写入 body
                if (requestData.body) {
                    req.write(requestData.body);
                }

                req.end();
            });

            const duration = Date.now() - startTime;

            // 发送响应到 WebView
            this.panel.webview.postMessage({
                type: 'requestComplete',
                data: {
                    success: true,
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: response.body,
                    duration
                }
            });

        } catch (error: any) {
            const duration = Date.now() - startTime;

            // 发送错误到 WebView
            this.panel.webview.postMessage({
                type: 'requestComplete',
                data: {
                    success: false,
                    error: error.message,
                    duration
                }
            });
        }
    }

    /**
     * 更新 HTML 内容
     */
    private updateHtmlContent(apiEndpoint: ApiEndpoint) {
        this.panel.webview.html = this.getHtmlContent(apiEndpoint);
    }

    /**
     * 获取 HTML 内容
     */
    private getHtmlContent(apiEndpoint: ApiEndpoint): string {
        // 准备参数数据
        const headerParams = apiEndpoint.parameters.filter(p => p.source === ParameterSource.Header);
        const queryParams = apiEndpoint.parameters.filter(p => p.source === ParameterSource.Query);
        const pathParams = apiEndpoint.parameters.filter(p => p.source === ParameterSource.Path);

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            height: 100vh;
            overflow: hidden;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .main-content {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        .left-panel {
            flex: 0 0 50%;
            overflow-y: auto;
            border-right: 1px solid var(--vscode-panel-border);
        }

        .right-panel {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .request-section {
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }

        .url-section {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            align-items: center;
        }

        .http-method {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 4px;
            font-weight: bold;
            min-width: 80px;
            text-align: center;
        }

        .http-method.GET { background-color: #61affe; }
        .http-method.POST { background-color: #49cc90; }
        .http-method.PUT { background-color: #fca130; }
        .http-method.DELETE { background-color: #f93e3e; }

        .url-input {
            flex: 1;
            padding: 8px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: monospace;
        }

        .send-button {
            padding: 8px 24px;
            background-color: #49cc90;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .send-button:hover {
            background-color: #3eb878;
        }

        .send-button:active {
            background-color: #2fa866;
        }

        .tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 15px;
        }

        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .tab:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .tab.active {
            border-bottom-color: var(--vscode-button-background);
            color: var(--vscode-button-background);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .param-list {
            margin-bottom: 10px;
        }

        .param-row {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: center;
        }

        .param-input {
            flex: 1;
            padding: 6px 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }

        .param-label {
            width: 100px;
            font-weight: bold;
        }

        .remove-button {
            padding: 6px 12px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .add-button {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .body-editor {
            width: 100%;
            min-height: 200px;
            padding: 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            resize: vertical;
        }

        .response-section {
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        #responseContent {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .status-bar {
            display: flex;
            gap: 30px;
            padding: 23px;
            padding-bottom: 0;
            margin-bottom: 10px;
            background-color: var(--vscode-editor-background);
            font-size: 0.95em;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .status-label {
            color: var(--vscode-descriptionForeground);
        }

        .status-value {
            font-weight: 500;
        }

        .status-value.success {
            color: #49cc90;
        }

        .status-value.error {
            color: #f93e3e;
        }

        .status-value.info {
            color: #61affe;
        }

        .response-tabs {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 15px;
            background-color: var(--vscode-editor-background);
        }

        .response-tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            font-weight: 500;
        }

        .response-tab:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .response-tab.active {
            border-bottom-color: var(--vscode-button-background);
            color: var(--vscode-button-background);
        }

        .response-tab-badge {
            margin-left: 6px;
            padding: 2px 6px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 10px;
            font-size: 0.85em;
        }

        .response-content {
            flex: 1;
            overflow-y: auto;
        }

        .response-tab-panel {
            display: none;
            height: 100%;
        }

        .response-tab-panel.active {
            display: block;
        }

        .response-body {
            display: flex;
            background-color: var(--vscode-editor-background);
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            height: 100%;
            overflow: auto;
        }

        .line-numbers {
            background-color: var(--vscode-editorGutter-background);
            color: var(--vscode-editorLineNumber-foreground);
            padding: 20px 10px 20px 16px;
            text-align: right;
            user-select: none;
            border-right: 1px solid var(--vscode-panel-border);
            min-width: 50px;
            flex-shrink: 0;
        }

        .line-numbers .line-number {
            display: block;
        }

        .code-wrapper {
            flex: 1;
            overflow: auto;
        }

        .code-content {
            margin: 0;
            padding: 20px;
            background-color: transparent;
            color: var(--vscode-editor-foreground);
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            overflow: visible;
            white-space: pre;
            user-select: text;
            cursor: text;
        }

        .code-content code {
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
            color: inherit;
            white-space: pre;
            user-select: text;
        }

        .response-headers {
            padding: 20px;
        }

        .header-item {
            display: flex;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header-key {
            flex: 0 0 200px;
            font-weight: 500;
            color: var(--vscode-symbolIcon-variableForeground);
        }

        .header-value {
            flex: 1;
            color: var(--vscode-foreground);
            word-break: break-all;
        }

        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
        }

        .sended-state {
            text-align: left;
            color: var(--vscode-descriptionForeground);
            padding: 6px;
        }

        .token-input {
            width: 100%;
            padding: 8px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: monospace;
        }

        .hint {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-content">
            <div class="left-panel">
                <div class="request-section">
                    <div class="url-section">
                        <div class="http-method ${apiEndpoint.httpMethod}">${apiEndpoint.httpMethod}</div>
                        <input type="text" class="url-input" id="urlInput" value="${apiEndpoint.fullUrl || apiEndpoint.routeTemplate}" />
                        <button class="send-button" id="sendButton">Send</button>
                    </div>

                    <div class="tabs">
                        <div class="tab active" data-tab="headers">Headers</div>
                        <div class="tab" data-tab="auth">Auth</div>
                        <div class="tab" data-tab="query">Query</div>
                        <div class="tab" data-tab="body">Body</div>
                    </div>

                    <div id="authTab" class="tab-content">
                        <div class="param-row">
                            <span class="param-label">Bearer Token:</span>
                            <input type="text" class="token-input" id="tokenInput" placeholder="Enter your bearer token" />
                        </div>
                        <div class="hint">Enter a Bearer token for authentication (optional)</div>
                    </div>

                    <div id="headersTab" class="tab-content active">
                        <div class="param-list" id="headersList">
                            ${headerParams.map(p => `
                                <div class="param-row">
                                    <input type="text" class="param-input" placeholder="Key" value="${p.name}" />
                                    <input type="text" class="param-input" placeholder="Value" />
                                    <button class="remove-button" onclick="removeRow(this)">Remove</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="add-button" onclick="addHeaderRow()">Add Header</button>
                    </div>

                    <div id="queryTab" class="tab-content">
                        <div class="param-list" id="queryList">
                            ${queryParams.map(p => `
                                <div class="param-row">
                                    <input type="text" class="param-input" placeholder="Key" value="${p.name}" />
                                    <input type="text" class="param-input" placeholder="Value" />
                                    <button class="remove-button" onclick="removeRow(this)">Remove</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="add-button" onclick="addQueryRow()">Add Query Parameter</button>
                    </div>

                    <div id="bodyTab" class="tab-content">
                        <textarea class="body-editor" id="bodyEditor" placeholder="Enter JSON body here..."></textarea>
                        <div class="hint">Enter raw JSON for the request body</div>
                    </div>
                </div>
            </div>

            <div class="right-panel">
                <div class="response-section">
                    <div id="responseContent">
                        <!-- Empty State -->
                        <div id="emptyState" class="empty-state">
                            <p>No response yet. Click "Send" to make a request.</p>
                        </div>
                        
                        <!-- Response Display (initially hidden) -->
                        <div id="responseDisplay" style="display: none; height: 100%; flex-direction: column;">
                            <div class="status-bar">
                                <div class="status-item">
                                    <span class="status-label">Status:</span>
                                    <span class="status-value" id="statusValue"></span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Size:</span>
                                    <span class="status-value info" id="sizeValue"></span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Time:</span>
                                    <span class="status-value" id="timeValue"></span>
                                </div>
                            </div>
                            <div class="response-tabs">
                                <div class="response-tab active" data-response-tab="body">Response</div>
                                <div class="response-tab" data-response-tab="headers">
                                    Headers
                                    <span class="response-tab-badge" id="headerCount">0</span>
                                </div>
                            </div>
                            <div class="response-content">
                                <div class="response-tab-panel active" id="bodyPanel">
                                    <div class="response-body">
                                        <div class="line-numbers" id="lineNumbers"></div>
                                        <div class="code-wrapper">
                                            <pre class="code-content"><code id="responseBody"></code></pre>
                                        </div>
                                    </div>
                                </div>
                                <div class="response-tab-panel" id="headersPanel">
                                    <div class="response-headers" id="responseHeaders"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Error State (initially hidden) -->
                        <div id="errorState" style="display: none;">
                            <div class="status-bar">
                                <div class="status-item">
                                    <span class="status-label">Status:</span>
                                    <span class="status-value error">Error</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Time:</span>
                                    <span class="status-value" id="errorTime"></span>
                                </div>
                            </div>
                            <div class="response-body" style="color: var(--vscode-errorForeground); padding: 20px;" id="errorMessage"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Update tab styles
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update content
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tabName + 'Tab').classList.add('active');
            });
        });

        // Response tab switching (for static response display)
        document.querySelectorAll('.response-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.responseTab;
                
                // Update tab styles
                document.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content
                document.querySelectorAll('.response-tab-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(tabName + 'Panel').classList.add('active');
            });
        });

        // Add header row
        function addHeaderRow() {
            const list = document.getElementById('headersList');
            const row = document.createElement('div');
            row.className = 'param-row';
            row.innerHTML = \`
                <input type="text" class="param-input" placeholder="Key" />
                <input type="text" class="param-input" placeholder="Value" />
                <button class="remove-button" onclick="removeRow(this)">Remove</button>
            \`;
            list.appendChild(row);
        }

        // Add query row
        function addQueryRow() {
            const list = document.getElementById('queryList');
            const row = document.createElement('div');
            row.className = 'param-row';
            row.innerHTML = \`
                <input type="text" class="param-input" placeholder="Key" />
                <input type="text" class="param-input" placeholder="Value" />
                <button class="remove-button" onclick="removeRow(this)">Remove</button>
            \`;
            list.appendChild(row);
        }

        // Remove row
        function removeRow(button) {
            button.parentElement.remove();
        }

        // Send request
        document.getElementById('sendButton').addEventListener('click', async () => {
            const method = '${apiEndpoint.httpMethod}';
            const url = document.getElementById('urlInput').value;
            const token = document.getElementById('tokenInput').value;
            
            // Collect headers
            const headers = {};
            document.querySelectorAll('#headersList .param-row').forEach(row => {
                const inputs = row.querySelectorAll('.param-input');
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                if (key) {
                    headers[key] = value;
                }
            });

            // Add bearer token if provided
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            // Collect query parameters and append to URL
            const queryParams = [];
            document.querySelectorAll('#queryList .param-row').forEach(row => {
                const inputs = row.querySelectorAll('.param-input');
                const key = inputs[0].value.trim();
                const value = inputs[1].value.trim();
                if (key) {
                    queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                }
            });

            let finalUrl = url;
            if (queryParams.length > 0) {
                const separator = url.includes('?') ? '&' : '?';
                finalUrl = url + separator + queryParams.join('&');
            }

            // Get body
            let body = undefined;
            if (method === 'POST' || method === 'PUT') {
                const bodyText = document.getElementById('bodyEditor').value.trim();
                if (bodyText) {
                    body = bodyText;
                }
            }

            // Show loading state
            showLoadingState();

            // Send message to extension
            vscode.postMessage({
                type: 'sendRequest',
                data: {
                    method,
                    url: finalUrl,
                    headers,
                    body
                }
            });
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'requestComplete') {
                displayResponse(message.data);
            } else if (message.type === 'updateApiEndpoint') {
                updateApiEndpoint(message.data);
            }
        });

        // Helper function to show loading state
        function showLoadingState() {
            document.getElementById('emptyState').style.display = 'flex';
            document.getElementById('emptyState').innerHTML = '<p>Sending request...</p>';
            document.getElementById('responseDisplay').style.display = 'none';
            document.getElementById('errorState').style.display = 'none';
        }

        function displayResponse(data) {
            // Escape HTML helper
            const escapeHtml = (text) => {
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };
            
            if (data.success) {
                // Hide empty and error states
                document.getElementById('emptyState').style.display = 'none';
                document.getElementById('errorState').style.display = 'none';
                
                // Show response display
                const responseDisplay = document.getElementById('responseDisplay');
                responseDisplay.style.display = 'flex';

                // Update status
                const statusClass = data.statusCode >= 200 && data.statusCode < 300 ? 'success' : 'error';
                const statusText = data.statusCode >= 200 && data.statusCode < 300 ? '200 OK' : data.statusCode + ' Error';
                const statusValue = document.getElementById('statusValue');
                statusValue.textContent = statusText;
                statusValue.className = 'status-value ' + statusClass;
                
                // Update size
                const bodySize = new Blob([data.body]).size;
                document.getElementById('sizeValue').textContent = bodySize + ' Bytes';
                
                // Update time
                document.getElementById('timeValue').textContent = data.duration + ' ms';
                
                // Try to format JSON
                let formattedBody = data.body;
                try {
                    const jsonObj = JSON.parse(data.body);
                    formattedBody = JSON.stringify(jsonObj, null, 2);
                } catch {
                    // Not JSON, keep as is
                }

                // Generate line numbers
                const lines = formattedBody.split('\\n');
                const lineNumbers = lines.map((_, i) => '<span class="line-number">' + (i + 1) + '</span>').join('');
                document.getElementById('lineNumbers').innerHTML = lineNumbers;
                
                // Update response body
                const escapedBody = escapeHtml(formattedBody);
                document.getElementById('responseBody').innerHTML = escapedBody;
                
                // Update headers
                const headerCount = Object.keys(data.headers || {}).length;
                document.getElementById('headerCount').textContent = headerCount;
                
                const headersHtml = Object.entries(data.headers || {}).map(([key, value]) => \`
                    <div class="header-item">
                        <div class="header-key">\${escapeHtml(key)}:</div>
                        <div class="header-value">\${escapeHtml(String(value))}</div>
                    </div>
                \`).join('');
                document.getElementById('responseHeaders').innerHTML = headersHtml;
                
                // Reset to body tab
                document.querySelectorAll('.response-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-response-tab="body"]').classList.add('active');
                document.querySelectorAll('.response-tab-panel').forEach(p => p.classList.remove('active'));
                document.getElementById('bodyPanel').classList.add('active');
                
            } else {
                // Show error state
                document.getElementById('emptyState').style.display = 'none';
                document.getElementById('responseDisplay').style.display = 'none';
                document.getElementById('errorState').style.display = 'block';
                
                document.getElementById('errorTime').textContent = data.duration + ' ms';
                document.getElementById('errorMessage').textContent = data.error;
            }
        }

        function updateApiEndpoint(apiEndpoint) {
            document.getElementById('urlInput').value = apiEndpoint.fullUrl || apiEndpoint.routeTemplate;
        }            
    </script>
</body>
</html>`;
    }

    /**
     * 释放资源
     */
    public dispose() {
        ApiTestPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
