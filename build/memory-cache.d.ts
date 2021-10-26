/// <reference types="node" />
import Koa from 'koa';
declare type CacheEntry = {
    saved: Date;
    expires: Date;
    headers: string;
    payload: string;
};
export declare class MemoryCache {
    private store;
    private config;
    clearCache(): Promise<void>;
    cacheContent(key: string, headers: {
        [key: string]: string;
    }, payload: Buffer): void;
    getCachedContent(ctx: Koa.Context, key: string): CacheEntry | null | undefined;
    removeEntry(key: string): void;
    sanitizeKey(key: string): string;
    middleware(): (ctx: Koa.Context, next: () => Promise<unknown>) => Promise<void>;
    invalidateHandler(): (ctx: Koa.Context, url: string) => Promise<void>;
    private handleInvalidateRequest;
    private handleRequest;
    clearAllCacheHandler(): (ctx: Koa.Context) => Promise<void>;
    private handleClearAllCacheRequest;
}
export {};
