"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rendertron = void 0;
const koa_1 = __importDefault(require("koa"));
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const koa_compress_1 = __importDefault(require("koa-compress"));
const koa_route_1 = __importDefault(require("koa-route"));
const koa_send_1 = __importDefault(require("koa-send"));
const koa_logger_1 = __importDefault(require("koa-logger"));
const path_1 = __importDefault(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const url_1 = __importDefault(require("url"));
const renderer_1 = require("./renderer");
const config_1 = require("./config");
/**
 * Rendertron rendering service. This runs the server which routes rendering
 * requests through to the renderer.
 */
class Rendertron {
    constructor() {
        this.app = new koa_1.default();
        this.config = config_1.ConfigManager.config;
        this.port = process.env.PORT || null;
        this.host = process.env.HOST || null;
    }
    async createRenderer(config) {
        const browser = await puppeteer_1.default.launch({ args: config.puppeteerArgs });
        browser.on('disconnected', () => {
            this.createRenderer(config);
        });
        this.renderer = new renderer_1.Renderer(browser, config);
    }
    async initialize(config) {
        // Load config
        this.config = config || (await config_1.ConfigManager.getConfiguration());
        this.port = this.port || this.config.port;
        this.host = this.host || this.config.host;
        await this.createRenderer(this.config);
        this.app.use(koa_logger_1.default());
        this.app.use(koa_compress_1.default());
        this.app.use(koa_bodyparser_1.default());
        this.app.use(koa_route_1.default.get('/', async (ctx) => {
            await koa_send_1.default(ctx, 'index.html', {
                root: path_1.default.resolve(__dirname, '../src'),
            });
        }));
        this.app.use(koa_route_1.default.get('/_ah/health', (ctx) => (ctx.body = 'OK')));
        // Optionally enable cache for rendering requests.
        if (this.config.cache === 'datastore') {
            const { DatastoreCache } = await Promise.resolve().then(() => __importStar(require('./datastore-cache')));
            const datastoreCache = new DatastoreCache();
            this.app.use(koa_route_1.default.get('/invalidate/:url(.*)', datastoreCache.invalidateHandler()));
            this.app.use(koa_route_1.default.get('/invalidate/', datastoreCache.clearAllCacheHandler()));
            this.app.use(datastoreCache.middleware());
        }
        else if (this.config.cache === 'memory') {
            const { MemoryCache } = await Promise.resolve().then(() => __importStar(require('./memory-cache')));
            const memoryCache = new MemoryCache();
            this.app.use(koa_route_1.default.get('/invalidate/:url(.*)', memoryCache.invalidateHandler()));
            this.app.use(koa_route_1.default.get('/invalidate/', memoryCache.clearAllCacheHandler()));
            this.app.use(memoryCache.middleware());
        }
        else if (this.config.cache === 'filesystem') {
            const { FilesystemCache } = await Promise.resolve().then(() => __importStar(require('./filesystem-cache')));
            const filesystemCache = new FilesystemCache(this.config);
            this.app.use(koa_route_1.default.get('/invalidate/:url(.*)', filesystemCache.invalidateHandler()));
            this.app.use(koa_route_1.default.get('/invalidate/', filesystemCache.clearAllCacheHandler()));
            this.app.use(new FilesystemCache(this.config).middleware());
        }
        this.app.use(koa_route_1.default.get('/render/:url(.*)', this.handleRenderRequest.bind(this)));
        this.app.use(koa_route_1.default.get('/screenshot/:url(.*)', this.handleScreenshotRequest.bind(this)));
        this.app.use(koa_route_1.default.post('/screenshot/:url(.*)', this.handleScreenshotRequest.bind(this)));
        return this.app.listen(+this.port, this.host, () => {
            console.log(`Listening on port ${this.port}`);
        });
    }
    /**
     * Checks whether or not the URL is valid. For example, we don't want to allow
     * the requester to read the file system via Chrome.
     */
    restricted(href) {
        const parsedUrl = url_1.default.parse(href);
        const protocol = parsedUrl.protocol || '';
        if (!protocol.match(/^https?/)) {
            return true;
        }
        if (parsedUrl.hostname && parsedUrl.hostname.match(/\.internal$/)) {
            return true;
        }
        if (!this.config.renderOnly.length) {
            return false;
        }
        for (let i = 0; i < this.config.renderOnly.length; i++) {
            if (href.startsWith(this.config.renderOnly[i])) {
                return false;
            }
        }
        return true;
    }
    async handleRenderRequest(ctx, url) {
        if (!this.renderer) {
            throw new Error('No renderer initalized yet.');
        }
        if (this.restricted(url)) {
            ctx.status = 403;
            return;
        }
        const mobileVersion = 'mobile' in ctx.query ? true : false;
        const serialized = await this.renderer.serialize(url, mobileVersion, ctx.query.timezoneId);
        for (const key in this.config.headers) {
            ctx.set(key, this.config.headers[key]);
        }
        // Mark the response as coming from Rendertron.
        ctx.set('x-renderer', 'rendertron');
        // Add custom headers to the response like 'Location'
        serialized.customHeaders.forEach((value, key) => ctx.set(key, value));
        ctx.status = serialized.status;
        ctx.body = serialized.content;
    }
    async handleScreenshotRequest(ctx, url) {
        if (!this.renderer) {
            throw new Error('No renderer initalized yet.');
        }
        if (this.restricted(url)) {
            ctx.status = 403;
            return;
        }
        const dimensions = {
            width: Number(ctx.query['width']) || this.config.width,
            height: Number(ctx.query['height']) || this.config.height,
        };
        const mobileVersion = 'mobile' in ctx.query ? true : false;
        try {
            const img = await this.renderer.screenshot(url, mobileVersion, dimensions, ctx.query.timezoneId);
            for (const key in this.config.headers) {
                ctx.set(key, this.config.headers[key]);
            }
            ctx.set('Content-Type', 'image/jpeg');
            ctx.set('Content-Length', img.length.toString());
            ctx.body = img;
        }
        catch (error) {
            const err = error;
            ctx.status = err.type === 'Forbidden' ? 403 : 500;
        }
    }
}
exports.Rendertron = Rendertron;
async function logUncaughtError(error) {
    console.error('Uncaught exception');
    console.error(error);
    process.exit(1);
}
// The type for the unhandleRejection handler is set to contain Promise<any>,
// so we disable that linter rule for the next line
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
async function logUnhandledRejection(reason, _) {
    console.error('Unhandled rejection');
    console.error(reason);
    process.exit(1);
}
// Start rendertron if not running inside tests.
if (!module.parent) {
    const rendertron = new Rendertron();
    rendertron.initialize();
    process.on('uncaughtException', logUncaughtError);
    process.on('unhandledRejection', logUnhandledRejection);
}
//# sourceMappingURL=rendertron.js.map