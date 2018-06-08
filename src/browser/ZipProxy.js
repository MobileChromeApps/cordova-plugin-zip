var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getFileSystem() {
    return __awaiter(this, void 0, void 0, function* () {
        const requestFileSystem = window['webkitRequestFileSystem'] || window.requestFileSystem;
        const storageInfo = navigator['webkitPersistentStorage'] || window['storageInfo'];
        console.debug(`zip plugin - requestFileSystem=${requestFileSystem} - storageInfo=${storageInfo}`);
        // request storage quota
        const requestedBytes = (this.nbMegaBytes * 1000000 /* ? x 1Mo */);
        let grantedBytes = 0;
        if (storageInfo != null) {
            grantedBytes = yield new Promise((resolve, reject) => {
                storageInfo.requestQuota(requestedBytes, resolve, reject);
            });
        }
        console.debug('granted bytes: ' + grantedBytes);
        // request file system
        if (!requestFileSystem) {
            throw new Error('cannot access filesystem API');
        }
        const fileSystem = yield new Promise((resolve, reject) => {
            requestFileSystem(window.PERSISTENT, grantedBytes, resolve, reject);
        });
        console.debug('FileSystem ready: ' + fileSystem.name);
        return fileSystem;
    });
}
// file:///synchros/2018-06-08/12H44-46.472-DEMO%202014-4/up.zip
function unzip(zipFilePath, outputDirectoryPath, successCallback, errorCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!zip) {
                throw new Error('zip.js not available, please import it: https://gildas-lormeau.github.io/zip.js');
            }
            console.info(`unzipping ${zipFilePath} to ${outputDirectoryPath}`);
            const fileSystem = yield getFileSystem();
            console.debug(`retrieving output directory: ${outputDirectoryPath}`);
            const outputDirectoryEntry = yield new Promise((resolve, reject) => {
                fileSystem.root.getDirectory(outputDirectoryPath, { create: true, exclusive: false }, resolve, reject);
            });
            console.debug(`output directory entry: ${outputDirectoryEntry}`);
            const zipEntry = yield new Promise((resolve, reject) => {
                fileSystem.root.getFile(zipFilePath, {}, resolve, reject);
            });
            const zipBlob = yield new Promise((resolve, reject) => {
                zipEntry.file(resolve, reject);
            });
            console.info(`open reader on zip: ${zipFilePath}`);
            zip.createReader(new zip.BlobReader(zipBlob), (zipReader) => {
                console.debug(`reader opened on zip: ${zipFilePath}`);
                zipReader.getEntries((zipEntries) => __awaiter(this, void 0, void 0, function* () {
                    console.debug(`entries read: ${zipFilePath}`);
                    successCallback({
                        loaded: 0,
                        total: zipEntries.length
                    });
                    try {
                        let i = 0;
                        for (const entry of zipEntries) {
                            console.debug(`extracting ${entry.filename} to ${outputDirectoryPath}`);
                            let isDirectory = entry.filename.charAt(entry.filename.length - 1) == '/';
                            if (isDirectory) {
                                console.debug('add directory: ' + entry.filename);
                                yield new Promise((resolve, reject) => {
                                    outputDirectoryEntry.getDirectory(entry.filename, { create: true }, resolve, reject);
                                });
                            }
                            else {
                                console.debug('adding file (get file): ' + entry.filename);
                                const targetFileEntry = yield new Promise((resolve, reject) => {
                                    outputDirectoryEntry.getFile(entry.filename, { create: true, exclusive: false }, resolve, reject);
                                });
                                console.debug('adding file (write file): ' + entry.filename);
                                yield new Promise((resolve, reject) => {
                                    entry.getData(new zip.FileWriter(targetFileEntry), resolve, (progress, total) => {
                                        console.debug(`${entry.filename}: ${progress} / ${total}`);
                                    });
                                });
                                console.debug('added file: ' + entry.filename);
                            }
                            successCallback({
                                loaded: ++i,
                                total: zipEntries.length
                            });
                        }
                        console.info(`unzip OK from ${zipFilePath} to ${outputDirectoryPath}`);
                        successCallback({
                            total: zipEntries.length
                        });
                    }
                    catch (e) {
                        console.error(e, `error while unzipping ${zipFilePath} to ${outputDirectoryPath}`);
                        errorCallback(e);
                    }
                }));
            }, errorCallback);
        }
        catch (e) {
            console.error(e, `error while unzipping ${zipFilePath} to ${outputDirectoryPath}`);
            errorCallback(e);
        }
    });
}
module.exports = {
    unzip: function (successCallback, errorCallback, args) {
        const [zipFilePath, outputDirectoryPath] = args;
        unzip(zipFilePath, outputDirectoryPath, successCallback, errorCallback);
    }
};
require("cordova/exec/proxy").add("Zip", module.exports);
