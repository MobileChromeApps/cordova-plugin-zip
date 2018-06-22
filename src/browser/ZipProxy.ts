

async function unzipEntry(entry: zip.Entry, outputDirectoryEntry: DirectoryEntry) {
    console.debug(`extracting ${entry.filename} to ${outputDirectoryEntry.fullPath}`);
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

        console.info(`unzipping ${zipFileUrl} to ${outputDirectoryUrl}`);

        console.debug(`retrieving output directory: ${outputDirectoryUrl}`);
        const outputDirectoryEntry: DirectoryEntry = await CordovaPluginFileUtils.resolveOrCreateDirectoryEntry(outputDirectoryUrl);
        console.debug(`output directory entry: ${outputDirectoryEntry}`);

        console.debug(`retrieving zip file: ${zipFileUrl}`);
        let zipEntry: FileEntry = await CordovaPluginFileUtils.resolveOrCreateFileEntry(zipFileUrl);
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
        unzip(zipFileUrl, outputDirectoryUrl, successCallback, errorCallback);
    }
};
require("cordova/exec/proxy").add("Zip", module.exports);
