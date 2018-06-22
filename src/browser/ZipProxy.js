var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class CordovaPluginFileUtils {
    static isFileError(error, requestedError) {
        if (error.name && error.name == CordovaPluginFileUtils.FileErrors[requestedError]) {
            return true;
        }
        if (error.code && error.code == requestedError) {
            return true;
        }
        return false;
    }
    static getFileEntry(path, parentDirectory) {
        return new Promise((resolve, reject) => {
            parentDirectory.getFile(path, {}, resolve, reject);
        });
    }
    static resolveOrCreateDirectoryEntry(entryUrl) {
        return CordovaPluginFileUtils.resolveOrCreateEntry(entryUrl, true);
    }
    static resolveOrCreateFileEntry(entryUrl) {
        return CordovaPluginFileUtils.resolveOrCreateEntry(entryUrl, false);
    }
    static resolveOrCreateEntry(entryUrl, directory) {
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
                let fileSystem;
                if (entryUrl.indexOf('/temporary/') != -1) {
                    fileSystem = yield CordovaPluginFileUtils.getFileSystem(CordovaPluginFileUtils.FileSystemType.TEMPORARY);
                }
                else {
                    fileSystem = yield CordovaPluginFileUtils.getFileSystem();
                }
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
    static getOrCreateChildDirectory(parent, childDirPath) {
        let folders = childDirPath.split('/');
        return CordovaPluginFileUtils.getOrCreateDirectoryForPath(parent, folders.filter(folder => folder != ''));
    }
    static getOrCreateDirectoryForPath(parent, pathEntries) {
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
                        CordovaPluginFileUtils.getOrCreateDirectoryForPath(dirEntry, pathEntries.slice(1))
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
    static getParent(entry) {
        return new Promise((resolve, reject) => {
            entry.getParent(entry => resolve(entry), reject);
        });
    }
    static exists(path, parentDirectory) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield CordovaPluginFileUtils.getFileEntry(path, parentDirectory);
                return true;
            }
            catch (error) {
                if (CordovaPluginFileUtils.isFileError(error, CordovaPluginFileUtils.FileErrors.TypeMismatchError)) {
                    return true;
                }
                if (CordovaPluginFileUtils.isFileError(error, CordovaPluginFileUtils.FileErrors.NotFoundError)) {
                    return false;
                }
                throw error;
            }
        });
    }
    static getFileSystem(type = CordovaPluginFileUtils.FileSystemType.PERSISTENT) {
        return __awaiter(this, void 0, void 0, function* () {
            if (CordovaPluginFileUtils.fileSystemsCache[type]) {
                return CordovaPluginFileUtils.fileSystemsCache[type];
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
            CordovaPluginFileUtils.fileSystemsCache[type] = fileSystem;
            return fileSystem;
        });
    }
    static listDirectoryContent(dir, recursive = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const contentAvailable = new Promise((resolve, reject) => {
                let dirReader = dir.createReader();
                let entries = [];
                let readEntries = () => {
                    dirReader.readEntries((results) => {
                        if (!results.length) {
                            resolve(entries);
                        }
                        else {
                            entries = entries.concat(results);
                            readEntries();
                        }
                    }, reject);
                };
                readEntries();
            });
            const content = yield contentAvailable;
            if (recursive) {
                const recursiveChildren = [];
                for (const directChild of content) {
                    if (directChild.isDirectory) {
                        recursiveChildren.push(...(yield CordovaPluginFileUtils.listDirectoryContent(directChild)));
                    }
                }
                content.push(...recursiveChildren);
            }
            return content;
        });
    }
    static getRelativePath(baseDirectory, file) {
        return file.fullPath //
            .replace(new RegExp('^/?/?' + baseDirectory.fullPath + '/?', 'g'), '') // removes //basePath/
            .replace(/\/$/g, ''); // removes trailing /
    }
    static copyDirectoryWithOverwrite(sourceDirectory, targetDirectory, move = false, onProgress) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield CordovaPluginFileUtils.listDirectoryContent(sourceDirectory, true);
            let i = 0;
            for (const entry of entries) {
                console.info(`> copy ${entry.fullPath}`);
                let directoryToBeCopied;
                if (entry.isDirectory) {
                    directoryToBeCopied = entry;
                }
                else {
                    directoryToBeCopied = yield CordovaPluginFileUtils.getParent(entry);
                }
                console.debug(`directory to be copied ${directoryToBeCopied.fullPath}`);
                const directoryRelativePath = CordovaPluginFileUtils.getRelativePath(sourceDirectory, directoryToBeCopied);
                let targetParentDirectory = targetDirectory;
                if (directoryToBeCopied.fullPath != sourceDirectory.fullPath) {
                    targetParentDirectory = yield CordovaPluginFileUtils.getOrCreateChildDirectory(targetDirectory, directoryRelativePath);
                }
                console.debug('targetParentDirectory=' + targetDirectory.fullPath);
                if (!entry.isDirectory) {
                    yield new Promise((resolve, reject) => {
                        if (move) {
                            console.debug(`move file ${entry.fullPath} to ${targetParentDirectory.fullPath}`);
                            entry.moveTo(targetParentDirectory, entry.name, resolve, reject);
                        }
                        else {
                            console.debug(`copy file ${entry.fullPath} to ${targetParentDirectory.fullPath}`);
                            entry.copyTo(targetParentDirectory, entry.name, resolve, reject);
                        }
                    });
                    console.info(`copied file: ${entry.fullPath} to ${targetParentDirectory.fullPath}`);
                }
                onProgress(++i, entries.length);
            }
            // remove source directory in move case
            if (move) {
                yield CordovaPluginFileUtils.removeDirectory(sourceDirectory);
            }
        });
    }
    static removeDirectory(directoryEntry) {
        return new Promise((resolve, reject) => {
            directoryEntry.removeRecursively(resolve, reject);
        });
    }
}
CordovaPluginFileUtils.fileSystemsCache = {};
(function (CordovaPluginFileUtils) {
    let FileSystemType;
    (function (FileSystemType) {
        FileSystemType[FileSystemType["TEMPORARY"] = window.TEMPORARY] = "TEMPORARY";
        FileSystemType[FileSystemType["PERSISTENT"] = window.PERSISTENT] = "PERSISTENT";
    })(FileSystemType = CordovaPluginFileUtils.FileSystemType || (CordovaPluginFileUtils.FileSystemType = {}));
    let FileErrors;
    (function (FileErrors) {
        FileErrors[FileErrors["TypeMismatchError"] = 11] = "TypeMismatchError";
        FileErrors[FileErrors["NotFoundError"] = 1] = "NotFoundError";
    })(FileErrors = CordovaPluginFileUtils.FileErrors || (CordovaPluginFileUtils.FileErrors = {}));
})(CordovaPluginFileUtils || (CordovaPluginFileUtils = {}));
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
            targetDirectory = yield CordovaPluginFileUtils.getOrCreateDirectoryForPath(outputDirectoryEntry, directoryPathEntries);
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
            console.debug(`retrieving output directory: ${outputDirectoryUrl}`);
            const outputDirectoryEntry = yield CordovaPluginFileUtils.resolveOrCreateDirectoryEntry(outputDirectoryUrl);
            console.debug(`output directory entry: ${outputDirectoryEntry}`);
            console.debug(`retrieving zip file: ${zipFileUrl}`);
            let zipEntry = yield CordovaPluginFileUtils.resolveOrCreateFileEntry(zipFileUrl);
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
