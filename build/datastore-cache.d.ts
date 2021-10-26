/// <reference types="node" />
import Koa from 'koa';
import { entity } from '@google-cloud/datastore/build/src/entity';
export declare class DatastoreCache {
    private datastore;
    private config;
    clearCache(): Promise<void>;
    cacheContent(key: object, headers: Record<string, string>, payload: Buffer): Promise<void>;
    removeEntry(key: string): Promise<void>;
    getCachedContent(ctx: Koa.Context, key: entity.Key): Promise<import("@google-cloud/datastore/build/src/request").GetResponse | null>;
    /**
     * Returns middleware function.
     */
    middleware(): (ctx: Koa.Context, next: () => Promise<unknown>) => Promise<void>;
    invalidateHandler(): (ctx: Koa.Context, url: string) => Promise<void>;
    private handleInvalidateRequest;
    clearAllCacheHandler(): (ctx: Koa.Context) => Promise<void>;
    private handleClearAllCacheRequest;
}
