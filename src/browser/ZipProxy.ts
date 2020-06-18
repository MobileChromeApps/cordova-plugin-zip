
async function unzipEntry(entry: zip.Entry, outputDirectoryEntry: DirectoryEntry) {
    logDebug(`extracting ${entry.filename} to ${outputDirectoryEntry.fullPath}`);
    let isDirectory = entry.filename.charAt(entry.filename.length - 1) == '/';

    let directoryPathEntries: string[] = entry.filename.split('/').filter(pathEntry => !!pathEntry);
    if (!isDirectory) {
        directoryPathEntries.splice(directoryPathEntries.length - 1, 1);
    }
    console.log('directoryPathEntries=' + directoryPathEntries.join(', '));

    let targetDirectory: DirectoryEntry = outputDirectoryEntry;
    if (directoryPathEntries.length > 0) {
        targetDirectory = await CordovaPluginFileUtils.getOrCreateDirectoryForPath(outputDirectoryEntry, directoryPathEntries);
    }
    console.log('targetDirectory=' + targetDirectory.fullPath);

    if (!isDirectory) {
        logDebug('adding file (get file): ' + entry.filename);
        const targetFileEntry = await new Promise<FileEntry>((resolve, reject) => {
            outputDirectoryEntry.getFile(entry.filename, { create: true, exclusive: false }, resolve, reject);
        });
        logDebug('adding file (write file): ' + entry.filename);
        await new Promise((resolve, reject) => {
            entry.getData(new zip.FileWriter(targetFileEntry), resolve, (progress, total) => {
                logDebug(`${entry.filename}: ${progress} / ${total}`);
            });
        });
        logDebug('added file: ' + entry.filename);
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

    zip.useWebWorkers = false;

    function onProgress(loaded: number, total: number) {
        successCallback(
            { loaded, total },
            { keepCallback: true });
    }

    try {

        if (!zip) {
            throw new Error('zip.js not available, please import it: https://gildas-lormeau.github.io/zip.js');
        }

        logInfo(`unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);

        logDebug(`retrieving output directory: ${outputDirectoryUrl}`);
        const outputDirectoryEntry: DirectoryEntry = await CordovaPluginFileUtils.resolveOrCreateDirectoryEntry(outputDirectoryUrl);
        logDebug(`output directory entry: ${outputDirectoryEntry}`);

        logDebug(`retrieving zip file: ${zipFileUrl}`);
        let zipEntry: FileEntry = await CordovaPluginFileUtils.resolveOrCreateFileEntry(zipFileUrl);
        logDebug(`zip file entry: ${zipEntry}`);

        const zipBlob: Blob = await new Promise<Blob>((resolve, reject) => {
            zipEntry.file(resolve, reject);
        });

        logInfo(`open reader on zip: ${zipFileUrl}`);
        zip.createReader(new zip.BlobReader(zipBlob), (zipReader) => {

            logDebug(`reader opened on zip: ${zipFileUrl}`);
            zipReader.getEntries(async (zipEntries) => {

                logDebug(`entries read: ${zipFileUrl}`);

                onProgress(0, zipEntries.length);

                try {

                    let i = 0;
                    for (const entry of zipEntries) {
                        await unzipEntry(entry, outputDirectoryEntry);

                        onProgress(++i, zipEntries.length);
                    }

                    zipReader.close(() => {
                        logInfo(`unzip OK from ${zipFileUrl} to ${outputDirectoryUrl}`);
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
        unzip(zipFileUrl, outputDirectoryUrl, successCallback, errorCallback);
    }
};
require("cordova/exec/proxy").add("Zip", module.exports);
