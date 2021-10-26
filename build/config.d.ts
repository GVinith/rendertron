export declare type Config = {
    cache: 'datastore' | 'memory' | 'filesystem' | null;
    cacheConfig: {
        [key: string]: string;
    };
    timeout: number;
    port: string;
    host: string;
    width: number;
    height: number;
    reqHeaders: {
        [key: string]: string;
    };
    headers: {
        [key: string]: string;
    };
    puppeteerArgs: Array<string>;
    renderOnly: Array<string>;
    closeBrowser: boolean;
    restrictedUrlPattern: string | null;
};
export declare class ConfigManager {
    static config: Config;
    static getConfiguration(): Promise<Config>;
}
