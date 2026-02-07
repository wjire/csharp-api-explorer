/**
 * 路由信息模型
 */
export interface RouteInfo {
    /** 路由路径，如：/query/aftersale/logistics/cost */
    route: string;

    /** HTTP方法 */
    httpVerb: 'GET' | 'POST' | 'PUT' | 'DELETE';

    /** 控制器名称，如：AftersaleController */
    controller: string;

    /** Action方法名称，如：GetLogisticsCost */
    action: string;

    /** 文件路径 */
    filePath: string;

    /** 行号 */
    lineNumber: number;

    /** 别名（可选） */
    alias?: string;

    /** 项目文件路径（可选），如：D:\Projects\MyApi\MyApi.csproj */
    projectPath?: string;

    /** Action路由部分（可选），只包含action特性上定义的路由，如：logistics/cost */
    actionRoute?: string;
}

/**
 * 别名配置
 */
export interface AliasConfig {
    Route: string;
    HttpVerb: string;
    Alias: string;
}

/**
 * 变量配置（路由变量的 key-value 映射）
 * 例如: { "version:apiversion": "1.0" }
 */
export type VariableConfig = Record<string, string>;
