
enum FileErrors {
    TypeMismatchError = 11,
    NotFoundError = 1
}

function isFileError(error: any, requestedError: FileErrors): boolean {
    if (error.name && error.name == FileErrors[requestedError]) {
        return true;
    }

    if (error.code && error.code == requestedError) {
        return true;
    }

    return false;
}

function getFileEntry(path: string, parentDirectory: DirectoryEntry): Promise<FileEntry> {
    return new Promise<FileEntry>((resolve, reject) => {
        parentDirectory.getFile(path, {}, resolve, reject);
    });
}

function resolveOrCreateDirectoryEntry(entryUrl: string): Promise<DirectoryEntry> {
    return resolveOrCreateEntry(entryUrl, true) as Promise<DirectoryEntry>;
}

function resolveOrCreateFileEntry(entryUrl: string): Promise<FileEntry> {
    return resolveOrCreateEntry(entryUrl, false) as Promise<FileEntry>;
}

async function resolveOrCreateEntry(entryUrl: string, directory: boolean): Promise<DirectoryEntry | FileEntry> {
    let entry: DirectoryEntry | FileEntry;
    try {
        entry = await new Promise<Entry>((resolve, reject) => {
            window.resolveLocalFileSystemURL(entryUrl, resolve, reject);
        }) as DirectoryEntry | FileEntry;
    } catch (e) {
        console.error(e);
        console.error(`cannot resolve directory entry at url ${entryUrl}`);

        const fileSystem: FileSystem = await (entryUrl.indexOf('/temporary/') != -1 ? getFileSystem(FileSystemType.TEMPORARY) : getFileSystem());
        let path: string = entryUrl;
        if (entryUrl.indexOf('/temporary/') != -1) {
            path = entryUrl.substring(entryUrl.indexOf('/temporary/') + '/temporary/'.length - 1);
        } else if (entryUrl.indexOf('/persistent/') != -1) {
            path = entryUrl.substring(entryUrl.indexOf('/persistent/') + '/persistent/'.length - 1);
        }

        entry = await new Promise<DirectoryEntry | FileEntry>((resolve, reject) => {
            if (directory) {
                fileSystem.root.getDirectory(path, { create: true, exclusive: false }, resolve, reject);
            } else {
                fileSystem.root.getFile(path, { create: true, exclusive: true }, resolve, reject);
            }
        });
    }

    return entry;
}

async function exists(path: string, parentDirectory: DirectoryEntry): Promise<boolean> {
    try {
        await getFileEntry(path, parentDirectory);
        return true;
    } catch (error) {
        if (isFileError(error, FileErrors.TypeMismatchError)) {
            return true;
        }

        if (isFileError(error, FileErrors.NotFoundError)) {
            return false;
        }

        throw error;
    }
}

enum FileSystemType {
    TEMPORARY = window.TEMPORARY,
    PERSISTENT = window.PERSISTENT
}

const fileSystemsCache: { [type: number]: FileSystem } = {};
async function getFileSystem(type: FileSystemType = FileSystemType.PERSISTENT): Promise<FileSystem> {
    if (fileSystemsCache[type]) {
        return fileSystemsCache[type];
    }

    const requestFileSystem = window['webkitRequestFileSystem'] || window.requestFileSystem;
    const storageInfo = navigator['webkitPersistentStorage'] || window['storageInfo'];

    console.debug(`zip plugin - requestFileSystem=${requestFileSystem} - storageInfo=${storageInfo}`);

    // request storage quota
    const requestedBytes: number = (1000 * 1000000 /* ? x 1Mo */);
    let grantedBytes: number = 0;
    if (storageInfo != null) {
        grantedBytes = await new Promise<number>((resolve, reject) => {
            storageInfo.requestQuota(requestedBytes, resolve, reject);
        });
    }
    console.debug('granted bytes: ' + grantedBytes);

    // request file system
    if (!requestFileSystem) {
        throw new Error('cannot access filesystem API');
    }
    const fileSystem: FileSystem = await new Promise<FileSystem>((resolve, reject) => {
        requestFileSystem(type, grantedBytes, resolve, reject);
    });
    console.debug('FileSystem ready: ' + fileSystem.name);

    fileSystemsCache[type] = fileSystem;

    return fileSystem;
}

async function unzipEntry(entry: zip.Entry, outputDirectoryEntry: DirectoryEntry) {
    console.debug(`extracting ${entry.filename} to ${outputDirectoryEntry.fullPath}`);
    let isDirectory = entry.filename.charAt(entry.filename.length - 1) == '/';

    if (isDirectory) {
        console.debug('add directory: ' + entry.filename);
        await new Promise((resolve, reject) => {
            outputDirectoryEntry.getDirectory(entry.filename, { create: true }, resolve, reject);
        });
    } else {
        console.debug('adding file (get file): ' + entry.filename);
        const targetFileEntry = await new Promise<FileEntry>((resolve, reject) => {
            outputDirectoryEntry.getFile(entry.filename, { create: true, exclusive: false }, resolve, reject);
        });
        console.debug('adding file (write file): ' + entry.filename);
        await new Promise((resolve, reject) => {
            entry.getData(new zip.FileWriter(targetFileEntry), resolve, (progress, total) => {
                console.debug(`${entry.filename}: ${progress} / ${total}`);
            });
        });
        console.debug('added file: ' + entry.filename);
    }
}

interface SuccessCallback {
    (event: { loaded?: number, total: number }, options?): void;
}

async function unzip(
    zipFileUrl: string,
    outputDirectoryUrl: string,
    successCallback: SuccessCallback,
    errorCallback) {

    function onProgress(loaded: number, total: number) {
        successCallback(
            { loaded, total },
            { keepCallback: true });
    }

    try {

        if (!zip) {
            throw new Error('zip.js not available, please import it: https://gildas-lormeau.github.io/zip.js');
        }

        console.info(`unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);

        const fileSystem: FileSystem = await getFileSystem();

        console.debug(`retrieving output directory: ${outputDirectoryUrl}`);
        const outputDirectoryEntry: DirectoryEntry = await resolveOrCreateDirectoryEntry(outputDirectoryUrl);
        console.debug(`output directory entry: ${outputDirectoryEntry}`);

        console.debug(`retrieving zip file: ${zipFileUrl}`);
        let zipEntry: FileEntry = await resolveOrCreateFileEntry(zipFileUrl);
        console.debug(`zip file entry: ${zipEntry}`);

        const zipBlob: Blob = await new Promise<Blob>((resolve, reject) => {
            zipEntry.file(resolve, reject);
        });

        console.info(`open reader on zip: ${zipFileUrl}`);
        zip.createReader(new zip.BlobReader(zipBlob), (zipReader) => {

            console.debug(`reader opened on zip: ${zipFileUrl}`);
            zipReader.getEntries(async (zipEntries) => {

                console.debug(`entries read: ${zipFileUrl}`);

                onProgress(0, zipEntries.length);

                try {

                    let i = 0;
                    for (const entry of zipEntries) {
                        await unzipEntry(entry, outputDirectoryEntry);

                        onProgress(++i, zipEntries.length);
                    }

                    zipReader.close(() => {
                        console.info(`unzip OK from ${zipFileUrl} to ${outputDirectoryUrl}`);
                        successCallback({
                            total: zipEntries.length
                        });
                    });

                } catch (e) {
                    console.error(e, `error while unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);
                    zipReader.close();
                    errorCallback(e);
                }
            });
        }, errorCallback);

    } catch (e) {
        console.error(e, `error while unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);
        errorCallback(e);
    }
}

declare var module;
declare var require;

module.exports = {
    unzip: function (successCallback, errorCallback, args) {
        const [zipFileUrl, outputDirectoryUrl] = args;

        zip.useWebWorkers = false;

        unzip(zipFileUrl, outputDirectoryUrl, successCallback, errorCallback);
    }
};
require("cordova/exec/proxy").add("Zip", module.exports);
