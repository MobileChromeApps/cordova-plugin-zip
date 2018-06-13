
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

async function getFileSystem(type: FileSystemType = FileSystemType.PERSISTENT): Promise<FileSystem> {
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
    (event: { loaded?: number, total: number }): void;
}

async function unzip(
    zipFileUrl: string,
    outputDirectoryUrl: string,
    successCallback: SuccessCallback,
    errorCallback) {

    try {

        if (!zip) {
            throw new Error('zip.js not available, please import it: https://gildas-lormeau.github.io/zip.js');
        }

        console.info(`unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);

        const fileSystem: FileSystem = await getFileSystem();

        console.debug(`retrieving output directory: ${outputDirectoryUrl}`);
        const outputDirectoryEntry: DirectoryEntry = await new Promise<DirectoryEntry>((resolve, reject) => {
            fileSystem.root.getDirectory(outputDirectoryUrl, { create: true, exclusive: false }, resolve, reject);
        });

        console.debug(`output directory entry: ${outputDirectoryEntry}`);

        console.debug(`retrieving zip file: ${zipEntry}`);
        new Promise<DirectoryEntry>((resolve, reject) => {
            fileSystem.root.getDirectory(outputDirectoryUrl, { create: true, exclusive: false }, resolve, reject);
        });
        console.debug(`zip file entry: ${zipEntry}`);
        window.resolveLocalFileSystemURL()
        let zipEntry: FileEntry = await ;
        if (await exists(zipFileUrl, fileSystem.root)) {
            zipEntry = await getFileEntry(zipFileUrl, fileSystem.root);
        } else {
            const tempFileSystem: FileSystem = await getFileSystem(FileSystemType.TEMPORARY);
            zipEntry = await getFileEntry(zipFileUrl, tempFileSystem.root);
        }

        const zipBlob: Blob = await new Promise<Blob>((resolve, reject) => {
            zipEntry.file(resolve, reject);
        });

        console.info(`open reader on zip: ${zipFileUrl}`);
        zip.createReader(new zip.BlobReader(zipBlob), (zipReader) => {

            console.debug(`reader opened on zip: ${zipFileUrl}`);
            zipReader.getEntries(async (zipEntries) => {

                console.debug(`entries read: ${zipFileUrl}`);

                successCallback({
                    loaded: 0,
                    total: zipEntries.length
                });

                try {

                    let i = 0;
                    for (const entry of zipEntries) {
                        await unzipEntry(entry, outputDirectoryEntry);

                        successCallback({
                            loaded: ++i,
                            total: zipEntries.length
                        });
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
