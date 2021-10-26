"use strict";
/*
 * Copyright 2018 Google Inc. All rights reserved.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = __importDefault(require("ava"));
const koa_1 = __importDefault(require("koa"));
const koa_static_1 = __importDefault(require("koa-static"));
const path_1 = __importDefault(require("path"));
const supertest_1 = __importDefault(require("supertest"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const rendertron_1 = require("../rendertron");
const app = new koa_1.default();
app.use(koa_static_1.default(path_1.default.resolve(__dirname, '../../test-resources')));
const testBase = 'http://localhost:1234/';
const rendertron = new rendertron_1.Rendertron();
let server;
ava_1.default.before(async () => {
    server = supertest_1.default(await rendertron.initialize());
    await app.listen(1234);
});
ava_1.default('health check responds correctly', async (t) => {
    const res = await server.get('/_ah/health');
    t.is(res.status, 200);
});
ava_1.default('renders basic script', async (t) => {
    const res = await server.get(`/render/${testBase}basic-script.html`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
});
ava_1.default('renders script after page load event', async (t) => {
    const res = await server.get(`/render/${testBase}script-after-load.html`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('injectedElement') !== -1);
});
ava_1.default('renders HTML docType declaration', async (t) => {
    const res = await server.get(`/render/${testBase}include-doctype.html`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('<!DOCTYPE html>') !== -1);
});
ava_1.default('sets the correct base URL for a subfolder', async (t) => {
    const res = await server.get(`/render/${testBase}subfolder/index.html`);
    const matches = res.text.match('<base href="([^"]+)">');
    const baseUrl = matches ? matches[1] : '';
    t.is(baseUrl, `${testBase}subfolder`);
});
ava_1.default('sets the correct base URL for the root folder', async (t) => {
    const res = await server.get(`/render/${testBase}basic-script.html`);
    const matches = res.text.match('<base href="([^"]+)">');
    const baseUrl = matches ? matches[1] : '';
    t.is(baseUrl, `${testBase}`);
});
ava_1.default('sets the correct base URL for an already defined base as /', async (t) => {
    const res = await server.get(`/render/${testBase}include-base.html`);
    const matches = res.text.match('<base href="([^"]+)">');
    const baseUrl = matches ? matches[1] : '';
    t.is(baseUrl, `${testBase.slice(0, -1)}`);
});
ava_1.default('sets the correct base URL for an already defined base as directory', async (t) => {
    const res = await server.get(`/render/${testBase}include-base-as-directory.html`);
    const matches = res.text.match('<base href="([^"]+)">');
    const baseUrl = matches ? matches[1] : '';
    t.is(baseUrl, `${testBase}dir1`);
});
// This test is failing as the polyfills (shady polyfill & scoping shim) are not
// yet injected properly.
ava_1.default.failing('renders shadow DOM - no polyfill', async (t) => {
    const res = await server.get(`/render/${testBase}shadow-dom-no-polyfill.html?wc-inject-shadydom=true`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('shadow-root-text') !== -1);
});
ava_1.default('renders shadow DOM - polyfill loader', async (t) => {
    const res = await server.get(`/render/${testBase}shadow-dom-polyfill-loader.html?wc-inject-shadydom=true`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('shadow-root-text') !== -1);
});
ava_1.default('renders shadow DOM - polyfill loader - different flag', async (t) => {
    const res = await server.get(`/render/${testBase}shadow-dom-polyfill-loader.html?wc-inject-shadydom`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('shadow-root-text') !== -1);
});
ava_1.default('renders shadow DOM - webcomponents-lite.js polyfill', async (t) => {
    const res = await server.get(`/render/${testBase}shadow-dom-polyfill-all.html?wc-inject-shadydom=true`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('shadow-root-text') !== -1);
});
ava_1.default('script tags and link[rel=import] tags are stripped', async (t) => {
    const res = await server.get(`/render/${testBase}include-script.html?wc-inject-polyfills=true`);
    t.is(res.status, 200);
    t.false(res.text.indexOf('script src') !== -1);
    t.true(res.text.indexOf('injectedElement') !== -1);
    t.false(res.text.indexOf('link rel') !== -1);
    // TODO: Fix the webcomponent behaviour in newer chrome releases
    //t.true(res.text.indexOf('element-text') !== -1);
});
ava_1.default('script tags for JSON-LD are not stripped', async (t) => {
    const res = await server.get(`/render/${testBase}include-json-ld.html`);
    t.is(res.status, 200);
    t.false(res.text.indexOf('script src') !== -1);
    t.true(res.text.indexOf('application/ld+json') !== -1);
    t.false(res.text.indexOf('javascript') !== -1);
});
ava_1.default('server status code should be forwarded', async (t) => {
    const res = await server.get(`/render/${testBase}404`);
    t.is(res.status, 404);
});
ava_1.default('http status code should be able to be set via a meta tag', async (t) => {
    const testFile = 'http-meta-status-code.html';
    const res = await server.get(`/render/${testBase}${testFile}?wc-inject-shadydom=true`);
    t.is(res.status, 400);
});
ava_1.default('http status codes need to be respected from top to bottom', async (t) => {
    const testFile = 'http-meta-status-code-multiple.html';
    const res = await server.get(`/render/${testBase}${testFile}?wc-inject-shadydom=true`);
    t.is(res.status, 401);
});
ava_1.default('screenshot is an image', async (t) => {
    const res = await server.post(`/screenshot/${testBase}basic-script.html`);
    t.is(res.status, 200);
    t.is(res.header['content-type'], 'image/jpeg');
    t.true(res.body.length > 300);
    t.is(res.body.length, parseInt(res.header['content-length']));
});
ava_1.default('screenshot accepts options', async (t) => {
    const res = await server
        .post(`/screenshot/${testBase}basic-script.html`)
        .send({
        clip: { x: 100, y: 100, width: 100, height: 100 },
        path: 'test.jpeg',
    });
    t.is(res.status, 200);
    t.is(res.header['content-type'], 'image/jpeg');
    t.true(res.body.length > 300);
    t.is(res.body.length, parseInt(res.header['content-length']));
});
ava_1.default('invalid url fails', async (t) => {
    const res = await server.get(`/render/abc`);
    t.is(res.status, 403);
});
ava_1.default('unknown url fails', async (t) => {
    const res = await server.get(`/render/http://unknown.blah.com`);
    t.is(res.status, 400);
});
ava_1.default('file url fails', async (t) => {
    const res = await server.get(`/render/file:///dev/fd/0`);
    t.is(res.status, 403);
});
ava_1.default('file url fails for screenshot', async (t) => {
    const res = await server.get(`/screenshot/file:///dev/fd/0`);
    t.is(res.status, 403);
});
ava_1.default('appengine internal url fails', async (t) => {
    const res = await server.get(`/render/http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token`);
    t.is(res.status, 403);
});
ava_1.default('appengine internal url fails for screenshot', async (t) => {
    const res = await server.get(`/screenshot/http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token`);
    t.is(res.status, 403);
});
ava_1.default.failing('explicit render event ends early', async (t) => {
    const res = await server.get(`/render/${testBase}explicit-render-event.html`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('async loaded') !== -1);
});
ava_1.default('whitelist ensures other urls do not get rendered', async (t) => {
    const mockConfig = {
        cache: 'memory',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        reqHeaders: {},
        headers: {},
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [testBase],
        closeBrowser: false,
        restrictedUrlPattern: null,
    };
    const server = supertest_1.default(await new rendertron_1.Rendertron().initialize(mockConfig));
    let res = await server.get(`/render/${testBase}basic-script.html`);
    t.is(res.status, 200);
    res = await server.get(`/render/http://anotherDomain.com`);
    t.is(res.status, 403);
});
ava_1.default('unknown url fails safely on screenshot', async (t) => {
    const res = await server.get(`/render/http://unknown.blah.com`);
    t.is(res.status, 400);
});
ava_1.default('endpont for invalidating memory cache works if configured', async (t) => {
    const mockConfig = {
        cache: 'memory',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        reqHeaders: {},
        headers: {},
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [],
        closeBrowser: false,
        restrictedUrlPattern: null,
    };
    const cached_server = supertest_1.default(await new rendertron_1.Rendertron().initialize(mockConfig));
    const test_url = `${testBase}basic-script.html`;
    await app.listen(1235);
    // Make a request which is not in cache
    let res = await cached_server.get(`/render/${test_url}`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    // Ensure that it is cached
    res = await cached_server.get(`/render/${test_url}`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] != null);
    // Invalidate cache and ensure it is not cached
    res = await cached_server.get(`/invalidate/${test_url}`);
    res = await cached_server.get(`/render/${test_url}`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
});
ava_1.default('endpont for invalidating filesystem cache works if configured', async (t) => {
    const mock_config = {
        cache: 'filesystem',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
            snapshotDir: path_1.default.join(os_1.default.tmpdir(), 'rendertron-test-cache'),
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        reqHeaders: {},
        headers: {},
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [],
        closeBrowser: false,
        restrictedUrlPattern: null,
    };
    const cached_server = supertest_1.default(await new rendertron_1.Rendertron().initialize(mock_config));
    const test_url = `/render/${testBase}basic-script.html`;
    await app.listen(1236);
    // Make a request which is not in cache
    let res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    // Ensure that it is cached
    res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] != null);
    // Invalidate cache and ensure it is not cached
    res = await cached_server.get(`/invalidate/${testBase}basic-script.html`);
    res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    // cleanup cache to prevent future tests failing
    res = await cached_server.get(`/invalidate/${testBase}basic-script.html`);
    fs_1.default.rmdirSync(path_1.default.join(os_1.default.tmpdir(), 'rendertron-test-cache'));
});
ava_1.default('http header should be set via config', async (t) => {
    const mock_config = {
        cache: 'memory',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        reqHeaders: {
            Referer: 'http://example.com/',
        },
        headers: {},
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [],
        closeBrowser: false,
        restrictedUrlPattern: null,
    };
    server = supertest_1.default(await rendertron.initialize(mock_config));
    await app.listen(1237);
    const res = await server.get(`/render/${testBase}request-header.html`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('http://example.com/') !== -1);
});
ava_1.default.serial('endpoint for invalidating all memory cache works if configured', async (t) => {
    const mock_config = {
        cache: 'memory',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        reqHeaders: {
            Referer: 'http://example.com/',
        },
        headers: {},
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [],
        closeBrowser: false,
        restrictedUrlPattern: null,
    };
    const cached_server = supertest_1.default(await new rendertron_1.Rendertron().initialize(mock_config));
    const test_url = `/render/${testBase}basic-script.html`;
    await app.listen(1238);
    // Make a request which is not in cache
    let res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    // Ensure that it is cached
    res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] != null);
    // Invalidate cache and ensure it is not cached
    res = await cached_server.get(`/invalidate`);
    res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
});
ava_1.default.serial('endpoint for invalidating all filesystem cache works if configured', async (t) => {
    const mock_config = {
        cache: 'filesystem',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
            snapshotDir: path_1.default.join(os_1.default.tmpdir(), 'rendertron-test-cache'),
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        headers: {},
        reqHeaders: {
            Referer: 'http://example.com/',
        },
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [],
        closeBrowser: false,
        restrictedUrlPattern: null,
    };
    const cached_server = supertest_1.default(await new rendertron_1.Rendertron().initialize(mock_config));
    const test_url = `/render/${testBase}basic-script.html`;
    await app.listen(1239);
    // Make a request which is not in cache
    let res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    // Ensure that it is cached
    res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] != null);
    // Invalidate cache and ensure it is not cached
    res = await cached_server.get(`/invalidate`);
    res = await cached_server.get(test_url);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    await cached_server.get(`/invalidate`);
    // cleanup cache to prevent future tests failing
    await cached_server.get(`/invalidate/`);
    fs_1.default.rmdirSync(path_1.default.join(os_1.default.tmpdir(), 'rendertron-test-cache'));
});
ava_1.default('unknown timezone fails', async (t) => {
    const res = await server.get(`/render/${testBase}include-date.html?timezoneId=invalid/timezone`);
    t.is(res.status, 400);
});
ava_1.default('known timezone applies', async (t) => {
    // Atlantic/Reykjavik is a timezone where GMT+0 is all-year round without Daylight Saving Time
    const res = await server.get(`/render/${testBase}include-date.html?timezoneId=Atlantic/Reykjavik`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('00:00:00') !== -1);
    const res2 = await server.get(`/render/${testBase}include-date.html?timezoneId=Australia/Perth`);
    t.is(res2.status, 200);
    // Australia/Perth is a timezone where GMT+8 is all-year round without Daylight Saving Time
    t.true(res2.text.indexOf('08:00:00') !== -1);
});
ava_1.default('urls mathing pattern are restricted', async (t) => {
    const mock_config = {
        cache: 'filesystem',
        cacheConfig: {
            cacheDurationMinutes: '120',
            cacheMaxEntries: '50',
            snapshotDir: path_1.default.join(os_1.default.tmpdir(), 'rendertron-test-cache'),
        },
        timeout: 10000,
        port: '3000',
        host: '0.0.0.0',
        width: 1000,
        height: 1000,
        headers: {},
        reqHeaders: {
            Referer: 'http://example.com/',
        },
        puppeteerArgs: ['--no-sandbox'],
        renderOnly: [],
        closeBrowser: false,
        restrictedUrlPattern: '.*(\\.test.html)($|\\?)',
    };
    const cached_server = supertest_1.default(await new rendertron_1.Rendertron().initialize(mock_config));
    await app.listen(1240);
    // Make a restriced request
    let res = await cached_server.get(`/render/${testBase}restrict-test.test.html`);
    t.is(res.status, 400);
    t.is(res.header['x-renderer'], 'rendertron');
    res = await cached_server.get(`/render/${testBase}restrict-test.test.html?hello=world`);
    t.is(res.status, 400);
    t.is(res.header['x-renderer'], 'rendertron');
    // Non restricted calls should pass through
    res = await cached_server.get(`/render/${testBase}basic-script.html`);
    t.is(res.status, 200);
    t.true(res.text.indexOf('document-title') !== -1);
    t.is(res.header['x-renderer'], 'rendertron');
    t.true(res.header['x-rendertron-cached'] == null);
    await cached_server.get(`/invalidate`);
    // cleanup cache to prevent future tests failing
    await cached_server.get(`/invalidate/`);
    fs_1.default.rmdirSync(path_1.default.join(os_1.default.tmpdir(), 'rendertron-test-cache'));
});
//# sourceMappingURL=app-test.js.map