import * as Koa from 'koa';
import { Config } from './config';
declare type CacheContent = {
    saved: Date;
    expires: Date;
    response: string;
    payload: string;
};
export declare class FilesystemCache {
    private config;
    private cacheConfig;
    constructor(config: Config);
    hashCode: (s: string) => string;
    getDir: (key: string) => string;
    clearCache(key: string): Promise<void>;
    clearAllCacheHandler(): (ctx: Koa.Context) => Promise<void>;
    private handleClearAllCacheRequest;
    clearAllCache(): Promise<unknown>;
    private sortFilesByModDate;
    cacheContent(key: string, ctx: Koa.Context): void;
    getCachedContent(ctx: Koa.Context, key: string): CacheContent | null;
    invalidateHandler(): (ctx: Koa.Context, url: string) => Promise<void>;
    sanitizeKey(key: string): string;
    private handleInvalidateRequest;
    /**
     * Returns middleware function.
     */
    middleware(): (ctx: Koa.Context, next: () => Promise<unknown>) => Promise<void>;
}
export {};
