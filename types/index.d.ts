// Type definitions for Apache Cordova Zip plugin
// Project: https://github.com/MobileChromeApps/cordova-plugin-zip
// Definitions by: lgrignon <https://github.com/lgrignon>

declare const enum CordovaZipPluginUnzipResult {
    Success = 0,
    Failure = -1
}

interface CordovaZipPluginUnzipProgressEvent {
    /**
     * Total zip size in Bytes
     */
    total: number;
    /**
     * Loaded zip size in Bytes
     */
    loaded: number;
}

interface CordovaZipPlugin {
    unzip(
        sourceZip: string,
        destinationDir: string,
        onSuccess: (status: CordovaZipPluginUnzipResult, errorMessage?: string) => void): void;
    unzip(
        sourceZip: string,
        destinationDir: string,
        onSuccess: (status: CordovaZipPluginUnzipResult, errorMessage?: string) => void,
        progressCallback: (event: CordovaZipPluginUnzipProgressEvent) => void): void;
}

declare var zip: CordovaZipPlugin;