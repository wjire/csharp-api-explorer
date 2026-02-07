import * as vscode from 'vscode';
import { RouteInfo } from './models/route';
import { AliasManager } from './aliasManager';
import { ConfigManager } from './configManager';

/**
 * 树节点类型
 */
type TreeNode = ProjectGroupItem | ControllerGroupItem | RouteTreeItem;

/**
 * 路由TreeView数据提供者
 */
export class RouteProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | null | void> = new vscode.EventEmitter<TreeNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private routes: RouteInfo[] = [];
    private filteredRoutes: RouteInfo[] = [];
    private searchText: string = '';

    /**
     * 获取当前搜索文本
     */
    getSearchText(): string {
        return this.searchText;
    }

    /**
     * 是否正在搜索
     */
    isSearching(): boolean {
        return this.searchText.trim().length > 0;
    }

    constructor(
        private aliasManager: AliasManager,
        private configManager: ConfigManager
    ) { }

    /**
     * 刷新视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 设置路由数据
     */
    setRoutes(routes: RouteInfo[]): void {
        this.routes = routes;
        this.applyFilter();
    }

    /**
     * 设置搜索文本
     */
    setSearchText(text: string): void {
        this.searchText = text.toLowerCase();
        this.applyFilter();
    }

    /**
     * 应用过滤
     */
    private applyFilter(): void {
        if (!this.searchText) {
            this.filteredRoutes = [...this.routes];
        } else {
            this.filteredRoutes = this.routes.filter(route => {
                const alias = route.alias || '';
                return (
                    route.route.toLowerCase().includes(this.searchText) ||
                    route.controller.toLowerCase().includes(this.searchText) ||
                    route.action.toLowerCase().includes(this.searchText) ||
                    alias.toLowerCase().includes(this.searchText) ||
                    route.httpVerb.toLowerCase().includes(this.searchText)
                );
            });
        }

        // 排序：有别名的排在前面
        this.sortRoutes();
        this.refresh();
    }

    /**
     * 排序路由
     */
    private sortRoutes(): void {
        const config = vscode.workspace.getConfiguration('apiNavigator');
        const sortBy = config.get<string>('sortBy', 'route');

        this.filteredRoutes.sort((a, b) => {
            // 首先按是否有别名排序
            const aHasAlias = !!a.alias;
            const bHasAlias = !!b.alias;

            if (aHasAlias !== bHasAlias) {
                return aHasAlias ? -1 : 1;
            }

            // 然后按指定字段排序
            switch (sortBy) {
                case 'controller':
                    return a.controller.localeCompare(b.controller);
                case 'httpVerb':
                    return a.httpVerb.localeCompare(b.httpVerb);
                case 'route':
                default:
                    return a.route.localeCompare(b.route);
            }
        });
    }

    /**
     * 获取树节点
     */
    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子节点
     */
    getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            // 根节点：返回项目分组
            return Promise.resolve(this.getProjectGroups());
        }

        if (element instanceof ProjectGroupItem) {
            // 项目分组节点：返回该项目下的控制器分组
            return Promise.resolve(this.getControllerGroups(element.projectPath));
        }

        if (element instanceof ControllerGroupItem) {
            // 控制器分组节点：返回该控制器下的路由
            const controllerRoutes = this.filteredRoutes
                .filter(route =>
                    route.projectPath === element.projectPath &&
                    route.controller === element.controllerName
                )
                .map(route => new RouteTreeItem(route, this.configManager));
            return Promise.resolve(controllerRoutes);
        }

        // 路由节点没有子节点
        return Promise.resolve([]);
    }

    /**
     * 获取项目分组
     */
    private getProjectGroups(): ProjectGroupItem[] {
        // 按项目路径分组
        const projectMap = new Map<string, RouteInfo[]>();

        for (const route of this.filteredRoutes) {
            const projectPath = route.projectPath || 'Unknown';
            if (!projectMap.has(projectPath)) {
                projectMap.set(projectPath, []);
            }
            projectMap.get(projectPath)!.push(route);
        }

        // 创建项目分组节点
        const groups: ProjectGroupItem[] = [];
        const isSearching = this.isSearching();
        for (const [projectPath, routes] of projectMap.entries()) {
            groups.push(new ProjectGroupItem(projectPath, routes.length, isSearching, this.searchText));
        }

        // 按项目名称排序
        groups.sort((a, b) => {
            const aLabel = typeof a.label === 'string' ? a.label : '';
            const bLabel = typeof b.label === 'string' ? b.label : '';
            return aLabel.localeCompare(bLabel);
        });

        return groups;
    }

    /**
     * 获取控制器分组
     */
    private getControllerGroups(projectPath: string): ControllerGroupItem[] {
        // 获取该项目下的所有路由
        const projectRoutes = this.filteredRoutes.filter(
            route => route.projectPath === projectPath
        );

        // 按控制器分组
        const controllerMap = new Map<string, RouteInfo[]>();
        for (const route of projectRoutes) {
            const controllerName = route.controller;
            if (!controllerMap.has(controllerName)) {
                controllerMap.set(controllerName, []);
            }
            controllerMap.get(controllerName)!.push(route);
        }

        // 创建控制器分组节点
        const groups: ControllerGroupItem[] = [];
        const isSearching = this.isSearching();
        for (const [controllerName, routes] of controllerMap.entries()) {
            groups.push(new ControllerGroupItem(projectPath, controllerName, routes.length, isSearching, this.searchText));
        }

        // 按控制器名称排序
        groups.sort((a, b) => {
            const aLabel = typeof a.label === 'string' ? a.label : '';
            const bLabel = typeof b.label === 'string' ? b.label : '';
            return aLabel.localeCompare(bLabel);
        });

        return groups;
    }

    /**
     * 根据路由信息查找TreeItem
     */
    findTreeItem(route: RouteInfo): RouteTreeItem | undefined {
        return new RouteTreeItem(route, this.configManager);
    }
}

/**
 * 项目分组节点
 */
export class ProjectGroupItem extends vscode.TreeItem {
    constructor(
        public readonly projectPath: string,
        public readonly routeCount: number,
        isSearching: boolean = false,
        searchText: string = ''
    ) {
        const path = require('path');
        const projectName = projectPath === 'Unknown'
            ? '未知项目'
            : path.basename(projectPath, '.csproj');

        // 搜索时自动展开，否则保持展开
        super(projectName, vscode.TreeItemCollapsibleState.Expanded);

        // 描述显示路由数量和搜索状态
        if (isSearching) {
            this.description = `🔍 "${searchText}" - ${routeCount} 个`;
        } else {
            this.description = `${routeCount} 个路由`;
        }

        // 使用文件夹图标
        this.iconPath = new vscode.ThemeIcon('folder');

        // 设置上下文值（可用于右键菜单）
        this.contextValue = 'projectGroup';

        // 禁用 tooltip
        this.tooltip = '';
    }
}

/**
 * 控制器分组节点
 */
export class ControllerGroupItem extends vscode.TreeItem {
    constructor(
        public readonly projectPath: string,
        public readonly controllerName: string,
        public readonly routeCount: number,
        isSearching: boolean = false,
        searchText: string = ''
    ) {
        // 去掉 Controller 后缀，显示更简洁
        const displayName = controllerName.replace(/Controller$/, '');

        // 搜索时自动展开，否则折叠
        const state = isSearching
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
        super(displayName, state);

        // 描述显示路由数量（搜索时不重复显示搜索关键词）
        this.description = `${routeCount} 个`;

        // 使用文件图标
        this.iconPath = new vscode.ThemeIcon('symbol-class');

        // 设置上下文值（可用于右键菜单）
        this.contextValue = 'controllerGroup';

        // 禁用 tooltip
        this.tooltip = '';
    }
}

/**
 * 路由树节点
 */
export class RouteTreeItem extends vscode.TreeItem {
    public readonly displayRoute: string;

    constructor(
        public readonly routeInfo: RouteInfo,
        private configManager?: ConfigManager
    ) {
        // 替换路由中的变量
        const originalRoute = routeInfo.route.toLowerCase();
        const displayRoute = configManager
            ? configManager.replaceRouteVariables(originalRoute)
            : originalRoute;

        // 优先显示action路由部分，如果没有则显示完整路由
        let shortRoute = displayRoute;
        if (routeInfo.actionRoute) {
            // 只显示action部分
            const actionPart = routeInfo.actionRoute.toLowerCase();
            shortRoute = actionPart.startsWith('/') ? actionPart : '/' + actionPart;
        }

        // 别名在左边，路由在右边（灰色）
        const label = routeInfo.alias || shortRoute;
        super(label, vscode.TreeItemCollapsibleState.None);

        this.displayRoute = displayRoute;

        // 如果有别名，路由显示在右边灰色区域（显示简短版本）
        if (routeInfo.alias) {
            this.description = shortRoute;
        }

        // tooltip显示完整路径（包含HTTP方法）
        this.tooltip = `[${routeInfo.httpVerb}] ${displayRoute}`;

        // 使用彩色圆点图标
        this.iconPath = new vscode.ThemeIcon(
            'circle-filled',
            this.getMethodColor()
        );

        // 设置上下文值，用于右键菜单
        this.contextValue = 'route';

        // 设置点击命令，跳转到文件
        this.command = {
            command: 'apiNavigator.gotoDefinition',
            title: '跳转到定义',
            arguments: [this]
        };
    }

    /**
     * 获取方法对应的颜色
     */
    private getMethodColor(): vscode.ThemeColor {
        switch (this.routeInfo.httpVerb) {
            case 'GET':
                return new vscode.ThemeColor('charts.blue');
            case 'POST':
                return new vscode.ThemeColor('charts.green');
            case 'PUT':
                return new vscode.ThemeColor('charts.orange');
            case 'DELETE':
                return new vscode.ThemeColor('charts.red');
            default:
                return new vscode.ThemeColor('charts.blue');
        }
    }
}
