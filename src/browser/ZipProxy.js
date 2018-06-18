var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var FileErrors;
(function (FileErrors) {
    FileErrors[FileErrors["TypeMismatchError"] = 11] = "TypeMismatchError";
    FileErrors[FileErrors["NotFoundError"] = 1] = "NotFoundError";
})(FileErrors || (FileErrors = {}));
function isFileError(error, requestedError) {
    if (error.name && error.name == FileErrors[requestedError]) {
        return true;
    }
    if (error.code && error.code == requestedError) {
        return true;
    }
    return false;
}
function getFileEntry(path, parentDirectory) {
    return new Promise((resolve, reject) => {
        parentDirectory.getFile(path, {}, resolve, reject);
    });
}
function resolveOrCreateDirectoryEntry(entryUrl) {
    return resolveOrCreateEntry(entryUrl, true);
}
function resolveOrCreateFileEntry(entryUrl) {
    return resolveOrCreateEntry(entryUrl, false);
}
function resolveOrCreateEntry(entryUrl, directory) {
    return __awaiter(this, void 0, void 0, function* () {
        let entry;
        try {
            entry = (yield new Promise((resolve, reject) => {
                window.resolveLocalFileSystemURL(entryUrl, resolve, reject);
            }));
        }
        catch (e) {
            console.error(e);
            console.error(`cannot resolve directory entry at url ${entryUrl}`);
            const fileSystem = yield (entryUrl.indexOf('/temporary/') != -1 ? getFileSystem(FileSystemType.TEMPORARY) : getFileSystem());
            let path = entryUrl;
            if (entryUrl.indexOf('/temporary/') != -1) {
                path = entryUrl.substring(entryUrl.indexOf('/temporary/') + '/temporary/'.length - 1);
            }
            else if (entryUrl.indexOf('/persistent/') != -1) {
                path = entryUrl.substring(entryUrl.indexOf('/persistent/') + '/persistent/'.length - 1);
            }
            entry = yield new Promise((resolve, reject) => {
                if (directory) {
                    fileSystem.root.getDirectory(path, { create: true, exclusive: false }, resolve, reject);
                }
                else {
                    fileSystem.root.getFile(path, { create: true, exclusive: true }, resolve, reject);
                }
            });
        }
        return entry;
    });
}
function getOrCreateDirectoryForPath(parent, pathEntries) {
    return __awaiter(this, void 0, void 0, function* () {
        pathEntries = pathEntries.filter(pathEntry => pathEntry != '');
        return new Promise((resolve, reject) => {
            console.debug('resolving dir path', pathEntries);
            if (pathEntries.length == 0) {
                return resolve(parent);
            }
            // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
            if (pathEntries[0] == '.' || pathEntries[0] == '') {
                pathEntries = pathEntries.slice(1);
            }
            parent.getDirectory(pathEntries[0], { create: true }, (dirEntry) => {
                console.debug('directory ' + pathEntries[0] + ' available, remaining: ' + (pathEntries.length - 1));
                // Recursively add the new subfolder (if we still have another to create).
                if (pathEntries.length > 1) {
                    getOrCreateDirectoryForPath(dirEntry, pathEntries.slice(1))
                        .then(resolve)
                        .catch(reject);
                }
                else {
                    resolve(dirEntry);
                }
            }, reject);
        });
    });
}
function exists(path, parentDirectory) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield getFileEntry(path, parentDirectory);
            return true;
        }
        catch (error) {
            if (isFileError(error, FileErrors.TypeMismatchError)) {
                return true;
            }
            if (isFileError(error, FileErrors.NotFoundError)) {
                return false;
            }
            throw error;
        }
    });
}
var FileSystemType;
(function (FileSystemType) {
    FileSystemType[FileSystemType["TEMPORARY"] = window.TEMPORARY] = "TEMPORARY";
    FileSystemType[FileSystemType["PERSISTENT"] = window.PERSISTENT] = "PERSISTENT";
})(FileSystemType || (FileSystemType = {}));
const fileSystemsCache = {};
function getFileSystem(type = FileSystemType.PERSISTENT) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fileSystemsCache[type]) {
            return fileSystemsCache[type];
        }
        const requestFileSystem = window['webkitRequestFileSystem'] || window.requestFileSystem;
        const storageInfo = navigator['webkitPersistentStorage'] || window['storageInfo'];
        console.debug(`zip plugin - requestFileSystem=${requestFileSystem} - storageInfo=${storageInfo}`);
        // request storage quota
        const requestedBytes = (1000 * 1000000 /* ? x 1Mo */);
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
            requestFileSystem(type, grantedBytes, resolve, reject);
        });
        console.debug('FileSystem ready: ' + fileSystem.name);
        fileSystemsCache[type] = fileSystem;
        return fileSystem;
    });
}
function unzipEntry(entry, outputDirectoryEntry) {
    return __awaiter(this, void 0, void 0, function* () {
        console.debug(`extracting ${entry.filename} to ${outputDirectoryEntry.fullPath}`);
        let isDirectory = entry.filename.charAt(entry.filename.length - 1) == '/';
        let directoryPathEntries = entry.filename.split('/').filter(pathEntry => !!pathEntry);
        if (!isDirectory) {
            directoryPathEntries.splice(directoryPathEntries.length - 1, 1);
        }
        console.log('directoryPathEntries=' + directoryPathEntries.join(', '));
        let targetDirectory = outputDirectoryEntry;
        if (directoryPathEntries.length > 0) {
            targetDirectory = yield getOrCreateDirectoryForPath(outputDirectoryEntry, directoryPathEntries);
        }
        console.log('targetDirectory=' + targetDirectory.fullPath);
        if (!isDirectory) {
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
    });
}
function unzip(zipFileUrl, outputDirectoryUrl, successCallback, errorCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        zip.useWebWorkers = false;
        function onProgress(loaded, total) {
            successCallback({ loaded, total }, { keepCallback: true });
        }
        try {
            if (!zip) {
                throw new Error('zip.js not available, please import it: https://gildas-lormeau.github.io/zip.js');
            }
            console.info(`unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);
            const fileSystem = yield getFileSystem();
            console.debug(`retrieving output directory: ${outputDirectoryUrl}`);
            const outputDirectoryEntry = yield resolveOrCreateDirectoryEntry(outputDirectoryUrl);
            console.debug(`output directory entry: ${outputDirectoryEntry}`);
            console.debug(`retrieving zip file: ${zipFileUrl}`);
            let zipEntry = yield resolveOrCreateFileEntry(zipFileUrl);
            console.debug(`zip file entry: ${zipEntry}`);
            const zipBlob = yield new Promise((resolve, reject) => {
                zipEntry.file(resolve, reject);
            });
            console.info(`open reader on zip: ${zipFileUrl}`);
            zip.createReader(new zip.BlobReader(zipBlob), (zipReader) => {
                console.debug(`reader opened on zip: ${zipFileUrl}`);
                zipReader.getEntries((zipEntries) => __awaiter(this, void 0, void 0, function* () {
                    console.debug(`entries read: ${zipFileUrl}`);
                    onProgress(0, zipEntries.length);
                    try {
                        let i = 0;
                        for (const entry of zipEntries) {
                            yield unzipEntry(entry, outputDirectoryEntry);
                            onProgress(++i, zipEntries.length);
                        }
                        zipReader.close(() => {
                            console.info(`unzip OK from ${zipFileUrl} to ${outputDirectoryUrl}`);
                            successCallback({
                                total: zipEntries.length
                            });
                        });
                    }
                    catch (e) {
                        console.error(e, `error while unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);
                        zipReader.close();
                        errorCallback(e);
                    }
                }));
            }, errorCallback);
        }
        catch (e) {
            console.error(e, `error while unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);
            errorCallback(e);
        }
    });
}
module.exports = {
    unzip: function (successCallback, errorCallback, args) {
        const [zipFileUrl, outputDirectoryUrl] = args;
        unzip(zipFileUrl, outputDirectoryUrl, successCallback, errorCallback);
    }
};
require("cordova/exec/proxy").add("Zip", module.exports);
