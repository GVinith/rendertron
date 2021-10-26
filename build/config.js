/*
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 not
 * use this file except in compliance with the License. You may obtain a copy
 of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 under
 * the License.
 */
'use strict';
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fse = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const CONFIG_PATH = path.resolve(__dirname, '../config.json');
class ConfigManager {
    static async getConfiguration() {
        // Load config.json if it exists.
        if (fse.pathExistsSync(CONFIG_PATH)) {
            const configJson = await fse.readJson(CONFIG_PATH);
            // merge cacheConfig
            const cacheConfig = Object.assign(ConfigManager.config.cacheConfig, configJson.cacheConfig);
            ConfigManager.config = Object.assign(ConfigManager.config, configJson);
            ConfigManager.config.cacheConfig = cacheConfig;
        }
        return ConfigManager.config;
    }
}
exports.ConfigManager = ConfigManager;
ConfigManager.config = {
    cache: null,
    cacheConfig: {
        snapshotDir: path.join(os.tmpdir(), 'rendertron'),
        cacheDurationMinutes: (60 * 24).toString(),
        cacheMaxEntries: '100',
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
    restrictedUrlPattern: null
};
//# sourceMappingURL=config.js.map