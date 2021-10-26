/*
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const koa_compress_1 = __importDefault(require("koa-compress"));
const supertest_1 = __importDefault(require("supertest"));
const koa_route_1 = __importDefault(require("koa-route"));
const filesystem_cache_1 = require("../filesystem-cache");
const config_1 = require("../config");
const ava_1 = __importDefault(require("ava"));
const config = config_1.ConfigManager.config;
const app = new koa_1.default();
const server = supertest_1.default(app.listen());
const cache = new filesystem_cache_1.FilesystemCache(config);
app.use(koa_route_1.default.get('/compressed', koa_compress_1.default()));
app.use(cache.middleware());
let handlerCalledCount = 0;
ava_1.default.before(async () => {
    await cache.clearAllCache();
});
app.use(koa_route_1.default.get('/', (ctx) => {
    handlerCalledCount++;
    ctx.body = `Called ${handlerCalledCount} times`;
}));
const promiseTimeout = function (timeout) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
};
ava_1.default('caches content and serves same content on cache hit', async (t) => {
    const previousCount = handlerCalledCount;
    let res = await server.get('/?basictest');
    t.is(res.status, 200);
    t.is(res.text, 'Called ' + (previousCount + 1) + ' times');
    // Workaround for race condition with writing to datastore.
    await promiseTimeout(2000);
    res = await server.get('/?basictest');
    t.is(res.status, 200);
    t.is(res.text, 'Called ' + (previousCount + 1) + ' times');
    t.truthy(res.header['x-rendertron-cached']);
    t.true(new Date(res.header['x-rendertron-cached']) <= new Date());
    res = await server.get('/?basictest');
    t.is(res.status, 200);
    t.is(res.text, 'Called ' + (previousCount + 1) + ' times');
});
app.use(koa_route_1.default.get('/set-header', (ctx) => {
    ctx.set('my-header', 'header-value');
    ctx.body = 'set-header-payload';
}));
ava_1.default('caches headers', async (t) => {
    let res = await server.get('/set-header');
    t.is(res.status, 200);
    t.is(res.header['my-header'], 'header-value');
    t.is(res.text, 'set-header-payload');
    // Workaround for race condition with writing to datastore.
    await promiseTimeout(500);
    res = await server.get('/set-header');
    t.is(res.status, 200);
    t.is(res.header['my-header'], 'header-value');
    t.is(res.text, 'set-header-payload');
});
app.use(koa_route_1.default.get('/compressed', (ctx) => {
    ctx.set('Content-Type', 'text/html');
    ctx.body = new Array(1025).join('x');
}));
ava_1.default('compression preserved', async (t) => {
    const expectedBody = new Array(1025).join('x');
    let res = await server
        .get('/compressed')
        .set('Accept-Encoding', 'gzip, deflate');
    t.is(res.status, 200);
    t.is(res.header['content-encoding'], 'gzip');
    t.is(res.text, expectedBody);
    // Workaround for race condition with writing to datastore.
    await promiseTimeout(500);
    res = await server.get('/compressed').set('Accept-Encoding', 'gzip, deflate');
    t.is(res.status, 200);
    t.is(res.header['content-encoding'], 'gzip');
    t.is(res.text, expectedBody);
});
let statusCallCount = 0;
app.use(koa_route_1.default.get('/status/:status', (ctx, status) => {
    // Every second call sends a different status.
    if (statusCallCount % 2 === 0) {
        ctx.status = Number(status);
    }
    else {
        ctx.status = 401;
    }
    statusCallCount++;
}));
ava_1.default('original status is preserved', async (t) => {
    let res = await server.get('/status/400');
    t.is(res.status, 400);
    // Non 200 status code should not be cached.
    res = await server.get('/status/400');
    t.is(res.status, 401);
});
ava_1.default('cache entry can be removed', async (t) => {
    let res = await server.get('/?cacheremovetest');
    t.is(res.status, 200);
    t.falsy(res.header['x-rendertron-cached']);
    t.false(new Date(res.header['x-rendertron-cached']) <= new Date());
    res = await server.get('/?cacheremovetest');
    t.is(res.status, 200);
    t.truthy(res.header['x-rendertron-cached']);
    t.true(new Date(res.header['x-rendertron-cached']) <= new Date());
    const key = cache.hashCode('/?cacheremovetest');
    cache.clearCache(key);
    res = await server.get('/?cacheremovetest');
    t.is(res.status, 200);
    t.falsy(res.header['x-rendertron-cached']);
    t.false(new Date(res.header['x-rendertron-cached']) <= new Date());
    res = await server.get('/?cacheremovetest');
    t.is(res.status, 200);
    t.truthy(res.header['x-rendertron-cached']);
    t.true(new Date(res.header['x-rendertron-cached']) <= new Date());
});
ava_1.default('refreshCache refreshes cache', async (t) => {
    let content = 'content';
    app.use(koa_route_1.default.get('/refreshTest', (ctx) => {
        ctx.body = content;
    }));
    let res = await server.get('/refreshTest');
    t.is(res.status, 200);
    t.is(res.text, 'content');
    // Workaround for race condition with writing to datastore.
    await promiseTimeout(500);
    res = await server.get('/refreshTest');
    t.truthy(res.header['x-rendertron-cached']);
    t.is(res.text, 'content');
    content = 'updated content';
    res = await server.get('/refreshTest?refreshCache=true');
    t.is(res.status, 200);
    t.is(res.text, 'updated content');
    t.is(res.header['x-rendertron-cached'], undefined);
});
ava_1.default.serial('clear all filesystem cache entries', async (t) => {
    app.use(koa_route_1.default.get('/clear-all-cache', (ctx) => {
        ctx.body = 'Foo';
    }));
    await server.get('/clear-all-cache?cachedResult1');
    await server.get('/clear-all-cache?cachedResult2');
    let res = await server.get('/clear-all-cache?cachedResult1');
    t.is(res.status, 200);
    t.truthy(res.header['x-rendertron-cached']);
    t.true(new Date(res.header['x-rendertron-cached']) <= new Date());
    res = await server.get('/clear-all-cache?cachedResult2');
    t.is(res.status, 200);
    t.truthy(res.header['x-rendertron-cached']);
    t.true(new Date(res.header['x-rendertron-cached']) <= new Date());
    cache.clearAllCache();
    await promiseTimeout(500);
    res = await server.get('/clear-all-cache?cachedResult1');
    t.is(res.status, 200);
    t.falsy(res.header['x-rendertron-cached']);
    t.false(new Date(res.header['x-rendertron-cached']) <= new Date());
    res = await server.get('/clear-all-cache?cachedResult2');
    t.is(res.status, 200);
    t.falsy(res.header['x-rendertron-cached']);
    t.false(new Date(res.header['x-rendertron-cached']) <= new Date());
});
//# sourceMappingURL=filesystem-cache-test.js.map