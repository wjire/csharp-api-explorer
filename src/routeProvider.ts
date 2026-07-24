import * as vscode from 'vscode';
import { AliasManager } from './aliasManager';
import { lang } from './languageManager';
import { RouteInfo } from './models/route';

/**
 * 树节点类型
 */
type TreeNode = TabSwitchItem | FavoriteAliasGroupItem | ProjectGroupItem | ControllerGroupItem | RouteTreeItem;

export type RouteTab = 'favorites' | 'all';

/**
 * 路由TreeView数据提供者
 */
export class RouteProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | null | void> = new vscode.EventEmitter<TreeNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private routes: RouteInfo[] = [];
    private filteredRoutes: RouteInfo[] = [];
    private allSearchText: string = '';
    private favoritesSearchText: string = '';
    private previousAllSearchText: string = '';
    private activeTab: RouteTab = 'favorites';

    // 树节点分组缓存
    private favoriteGroupsCache?: FavoriteAliasGroupItem[];
    private favoriteGroupRoutesCache = new Map<string, RouteInfo[]>();
    private projectGroupsCache?: ProjectGroupItem[];
    private controllerGroupsCache = new Map<string, ControllerGroupItem[]>();

    /**
     * 获取当前搜索文本
     */
    getSearchText(): string {
        return this.activeTab === 'favorites' ? this.favoritesSearchText : this.allSearchText;
    }

    /**
     * 是否正在搜索
     */
    isSearching(): boolean {
        return this.activeTab === 'favorites'
            ? this.favoritesSearchText.trim().length > 0
            : this.allSearchText.trim().length > 0;
    }

    constructor(
        private aliasManager: AliasManager
    ) { }

    /**
     * 设置当前标签页
     */
    setActiveTab(tab: RouteTab): void {
        if (this.activeTab === tab) {
            return;
        }

        this.activeTab = tab;
        this.clearTreeCache();
        this.refresh();
    }

    /**
     * 获取当前标签页
     */
    getActiveTab(): RouteTab {
        return this.activeTab;
    }

    /**
     * 获取当前常用路由数量（有别名）
     */
    getFavoriteRouteCount(): number {
        return this.getFavoriteRoutes().length;
    }

    /**
     * 获取全部标签当前可见数量（受搜索影响）
     */
    getAllVisibleRouteCount(): number {
        return this.filteredRoutes.length;
    }

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
        this.previousAllSearchText = '';
        this.applyAllFilter();
        this.clearTreeCache();
        this.refresh();
    }

    /**
     * 设置搜索文本
     */
    setSearchText(text: string): void {
        const normalizedText = text.toLowerCase();

        if (this.activeTab === 'favorites') {
            this.favoritesSearchText = normalizedText;
            this.clearTreeCache();
            this.refresh();
            return;
        }

        this.allSearchText = normalizedText;
        this.applyAllFilter();
        this.clearTreeCache();
        this.refresh();
    }

    /**
     * 应用过滤（支持增量搜索优化）
     */
    private applyAllFilter(): void {
        if (!this.allSearchText) {
            this.filteredRoutes = [...this.routes];
            this.previousAllSearchText = '';
        } else {
            // 增量搜索优化：如果新搜索词是上次搜索词的扩展，则在已过滤结果中搜索
            const canUseIncremental =
                this.previousAllSearchText &&
                this.allSearchText.startsWith(this.previousAllSearchText) &&
                this.filteredRoutes.length > 0;

            const sourceRoutes = canUseIncremental ? this.filteredRoutes : this.routes;

            this.filteredRoutes = sourceRoutes.filter(route => this.matchesSearch(route, this.allSearchText));

            this.previousAllSearchText = this.allSearchText;
        }

        // 排序：有别名的排在前面
        this.sortRoutes();
    }

    /**
     * 搜索匹配逻辑
     */
    private matchesSearch(route: RouteInfo, searchText: string): boolean {
        const alias = route.alias || '';
        return (
            route.route.toLowerCase().includes(searchText) ||
            route.controller.toLowerCase().includes(searchText) ||
            route.action.toLowerCase().includes(searchText) ||
            alias.toLowerCase().includes(searchText) ||
            route.httpVerb.toLowerCase().includes(searchText)
        );
    }

    /**
     * 清除树节点分组缓存
     */
    private clearTreeCache(): void {
        this.favoriteGroupsCache = undefined;
        this.favoriteGroupRoutesCache.clear();
        this.projectGroupsCache = undefined;
        this.controllerGroupsCache.clear();
    }

    /**
     * 计算常用分组名称：取别名中第一个 -, :, _ 左侧作为分组名
     */
    private getFavoriteGroupName(alias: string): string {
        const trimmedAlias = alias.trim();
        const match = trimmedAlias.match(/[-:_]/);
        if (!match || match.index === undefined) {
            return trimmedAlias;
        }

        const prefix = trimmedAlias.slice(0, match.index).trim();
        return prefix || trimmedAlias;
    }

    /**
     * 获取常用分组节点（带缓存）
     */
    private getFavoriteGroups(): FavoriteAliasGroupItem[] {
        if (this.favoriteGroupsCache) {
            return this.favoriteGroupsCache;
        }

        const groupedRoutes = new Map<string, RouteInfo[]>();
        const favoriteRoutes = this.getFavoriteRoutes();

        for (const route of favoriteRoutes) {
            const alias = route.alias || '';
            const groupName = this.getFavoriteGroupName(alias);
            if (!groupedRoutes.has(groupName)) {
                groupedRoutes.set(groupName, []);
            }
            groupedRoutes.get(groupName)!.push(route);
        }

        const groups: FavoriteAliasGroupItem[] = [];
        for (const [groupName, routes] of groupedRoutes.entries()) {
            this.favoriteGroupRoutesCache.set(groupName, routes);
            groups.push(new FavoriteAliasGroupItem(groupName, routes.length));
        }

        groups.sort((a, b) => a.groupName.localeCompare(b.groupName, undefined, { sensitivity: 'base' }));
        this.favoriteGroupsCache = groups;
        return groups;
    }

    /**
     * 排序路由
     */
    private sortRoutes(): void {
        // 读取排序配置
        const config = vscode.workspace.getConfiguration('csharpApiExplorer');
        const sortAliasFirst = config.get<boolean>('sortAliasFirst', false);
        const sortByRoutePath = config.get<boolean>('sortByRoutePath', false);

        this.filteredRoutes.sort((a, b) => {
            // 1. 如果启用了别名置顶，先按是否有别名排序
            if (sortAliasFirst) {
                const aHasAlias = !!a.alias;
                const bHasAlias = !!b.alias;

                if (aHasAlias !== bHasAlias) {
                    return aHasAlias ? -1 : 1;
                }
            }

            // 2. 根据配置决定后续排序方式
            if (sortByRoutePath) {
                // 按路由路径字母顺序排序
                return a.route.localeCompare(b.route);
            } else {
                // 按文件中的行号排序（控制器中的 action 顺序）
                return a.lineNumber - b.lineNumber;
            }
        });
    }

    /**
     * 获取常用路由（有别名）并按别名排序
     */
    private getFavoriteRoutes(): RouteInfo[] {
        const searchText = this.favoritesSearchText;
        return this.routes
            .filter(route => !!route.alias && route.alias.trim().length > 0)
            .filter(route => !searchText || this.matchesSearch(route, searchText))
            .sort((a, b) => {
                const aAlias = (a.alias || '').toLowerCase();
                const bAlias = (b.alias || '').toLowerCase();
                const aliasCompare = aAlias.localeCompare(bAlias, undefined, { sensitivity: 'base' });
                if (aliasCompare !== 0) {
                    return aliasCompare;
                }

                return a.route.localeCompare(b.route, undefined, { sensitivity: 'base' });
            });
    }

    /**
     * 更新路由别名并重新排序
     */
    updateRouteAlias(route: string, httpVerb: string, alias: string | undefined): void {
        // 在原始路由列表中查找并更新
        for (const routeInfo of this.routes) {
            if (routeInfo.route === route && routeInfo.httpVerb === httpVerb) {
                routeInfo.alias = alias;
            }
        }

        // 在过滤后的路由列表中查找并更新
        for (const filteredRouteInfo of this.filteredRoutes) {
            if (filteredRouteInfo.route === route && filteredRouteInfo.httpVerb === httpVerb) {
                filteredRouteInfo.alias = alias;
            }
        }

        // 重新排序并刷新视图
        this.sortRoutes();
        // 清除树节点缓存
        this.clearTreeCache();
        this.refresh();
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
        if (element instanceof TabSwitchItem) {
            return Promise.resolve([]);
        }

        if (element instanceof FavoriteAliasGroupItem) {
            const groupedRoutes = this.favoriteGroupRoutesCache.get(element.groupName) || [];
            return Promise.resolve(groupedRoutes.map(route => new RouteTreeItem(route)));
        }

        const tabs: TabSwitchItem[] = [
            new TabSwitchItem('favorites', this.activeTab === 'favorites', this.getFavoriteRouteCount()),
            new TabSwitchItem('all', this.activeTab === 'all', this.getAllVisibleRouteCount())
        ];

        if (this.activeTab === 'favorites') {
            if (element) {
                return Promise.resolve([]);
            }

            return Promise.resolve([...tabs, ...this.getFavoriteGroups()]);
        }

        if (!element) {
            // 根节点：返回项目分组
            return Promise.resolve([...tabs, ...this.getProjectGroups()]);
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
                .map(route => new RouteTreeItem(route));
            return Promise.resolve(controllerRoutes);
        }

        // 路由节点没有子节点
        return Promise.resolve([]);
    }

    /**
     * 获取父节点（用于支持reveal方法）
     */
    getParent(element: TreeNode): vscode.ProviderResult<TreeNode> {
        if (element instanceof TabSwitchItem) {
            return null;
        }

        if (this.activeTab === 'favorites') {
            if (element instanceof RouteTreeItem) {
                const alias = element.routeInfo.alias || '';
                const groupName = this.getFavoriteGroupName(alias);
                const favoriteGroups = this.getFavoriteGroups();
                return favoriteGroups.find(group => group.groupName === groupName);
            }

            return null;
        }

        if (element instanceof RouteTreeItem) {
            // 路由节点的父节点是控制器分组
            const projectPath = element.routeInfo.projectPath || 'Unknown';
            const controllerGroups = this.getControllerGroups(projectPath);
            return controllerGroups.find(g => g.controllerName === element.routeInfo.controller);
        }

        if (element instanceof ControllerGroupItem) {
            // 控制器分组的父节点是项目分组
            const projectGroups = this.getProjectGroups();
            return projectGroups.find(g => g.projectPath === element.projectPath);
        }

        // 项目分组没有父节点
        return null;
    }

    /**
     * 获取项目分组（带缓存）
     */
    private getProjectGroups(): ProjectGroupItem[] {
        // 检查缓存
        if (this.projectGroupsCache) {
            return this.projectGroupsCache;
        }

        // 缓存未命中，重新计算
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
        const isSearching = this.allSearchText.trim().length > 0;
        for (const [projectPath, routes] of projectMap.entries()) {
            groups.push(new ProjectGroupItem(projectPath, routes.length, isSearching, this.allSearchText));
        }

        // 按项目名称排序
        groups.sort((a, b) => {
            const aLabel = typeof a.label === 'string' ? a.label : '';
            const bLabel = typeof b.label === 'string' ? b.label : '';
            return aLabel.localeCompare(bLabel);
        });

        // 存入缓存
        this.projectGroupsCache = groups;

        return groups;
    }

    /**
     * 获取控制器分组（带缓存）
     */
    private getControllerGroups(projectPath: string): ControllerGroupItem[] {
        // 检查缓存
        if (this.controllerGroupsCache.has(projectPath)) {
            return this.controllerGroupsCache.get(projectPath)!;
        }

        // 缓存未命中，重新计算
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
        const isSearching = this.allSearchText.trim().length > 0;
        for (const [controllerName, routes] of controllerMap.entries()) {
            groups.push(new ControllerGroupItem(projectPath, controllerName, routes.length, isSearching, this.allSearchText));
        }

        // 按控制器名称排序
        groups.sort((a, b) => {
            const aLabel = typeof a.label === 'string' ? a.label : '';
            const bLabel = typeof b.label === 'string' ? b.label : '';
            return aLabel.localeCompare(bLabel);
        });

        // 存入缓存
        this.controllerGroupsCache.set(projectPath, groups);

        return groups;
    }

    /**
     * 根据路由信息查找TreeItem
     */
    findTreeItem(route: RouteInfo): RouteTreeItem | undefined {
        return new RouteTreeItem(route);
    }

    /**
     * 获取所有需要展开的节点（项目分组和控制器分组）
     */
    async getAllExpandableNodes(): Promise<TreeNode[]> {
        if (this.activeTab === 'favorites') {
            return this.getFavoriteGroups();
        }

        const nodes: TreeNode[] = [];

        // 获取所有项目分组
        const projectGroups = this.getProjectGroups();
        nodes.push(...projectGroups);

        // 获取每个项目下的所有控制器分组
        for (const projectGroup of projectGroups) {
            const controllerGroups = this.getControllerGroups(projectGroup.projectPath);
            nodes.push(...controllerGroups);
        }

        return nodes;
    }
}

/**
 * 常用分组节点
 */
export class FavoriteAliasGroupItem extends vscode.TreeItem {
    constructor(
        public readonly groupName: string,
        public readonly routeCount: number
    ) {
        super(groupName, vscode.TreeItemCollapsibleState.Expanded);

        this.description = `${routeCount}`;
        this.tooltip = '';
        this.contextValue = 'favoriteGroup';
        this.iconPath = new vscode.ThemeIcon('folder-library');
    }
}

/**
 * 顶部标签切换节点（伪标签）
 */
export class TabSwitchItem extends vscode.TreeItem {
    constructor(
        public readonly tab: RouteTab,
        isActive: boolean,
        routeCount: number
    ) {
        const title = tab === 'favorites' ? lang.t('tab.favorites') : lang.t('tab.all');
        const marker = isActive ? '◉' : '○';
        super(`${marker} ${title}`, vscode.TreeItemCollapsibleState.None);

        this.description = `${routeCount}`;
        this.tooltip = '';
        this.contextValue = 'tabSwitch';
        this.command = {
            command: tab === 'favorites' ? 'csharpApiExplorer.switchToFavorites' : 'csharpApiExplorer.switchToAll',
            title: title
        };
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
        const projectName = projectPath === 'Unknown'
            ? lang.t('treeview.unknownProject')
            : ProjectGroupItem.getProjectName(projectPath);

        // 搜索时自动展开，否则折叠
        const state = isSearching
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.Collapsed;
        super(projectName, state);

        // 描述显示路由数量和搜索状态
        if (isSearching) {
            this.description = lang.t('search.result', searchText, routeCount);
        } else {
            this.description = lang.t('treeview.routesCount', routeCount);
        }

        // 使用 VS Code 原生主题图标，跟随当前主题和图标主题
        this.iconPath = new vscode.ThemeIcon('repo');

        // 设置上下文值（可用于右键菜单）
        this.contextValue = 'projectGroup';

        // 禁用 tooltip
        this.tooltip = '';
    }

    private static getProjectName(projectPath: string): string {
        const normalizedPath = projectPath.replace(/\\/g, '/');
        const fileName = normalizedPath.split('/').pop() || projectPath;
        return fileName.replace(/\.csproj$/i, '');
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
        this.description = `${routeCount}`;

        // 使用 VS Code 原生主题图标，跟随当前主题和图标主题
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
        public readonly routeInfo: RouteInfo
    ) {
        // 使用解析后的路由（已自动处理 ApiVersion）
        const displayRoute = routeInfo.route.toLowerCase();

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
            command: 'csharpApiExplorer.gotoDefinition',
            title: '跳转到定义 (Go to Definition)',
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
            case 'ANY':
                return new vscode.ThemeColor('charts.purple');
            default:
                return new vscode.ThemeColor('charts.blue');
        }
    }
}
