var exec = cordova.require('cordova/exec');

function newProgressEvent(result) {
    var event = {
        loaded: result.loaded,
        total: result.total
    };
    return event;
}

/**
 *  Example:
 *  const downZipUrl: string = downZipFileEntry.toInternalURL();
    const downUnzipDirectoryUrl: string = downUnzipDir.toInternalURL();
    zip.unzip(
                downZipUrl,
                downUnzipDirectoryUrl,
                (result: CordovaZipPluginUnzipResult, errorMessage: string) => {
                    if (result == CordovaZipPluginUnzipResult.Success) {
                        resolve();
                    } else {
                        this.log.error(errorMessage, 'an error occurred during unzip');
                        reject('an error occurred during unzip: ' + errorMessage);
                    }
                },
                event => onProgress(event.loaded, event.total));
 */
exports.unzip = function (fileNameUrl, outputDirectoryUrl, callback, progressCallback) {
    var win = function (result) {
        if (result && typeof result.loaded != "undefined") {
            if (progressCallback) {
                return progressCallback(newProgressEvent(result));
            }
        } else if (callback) {
            callback(0);
        }
    };
    var fail = function (result) {
        if (callback) {
            callback(-1, result);
        }
    };
    exec(win, fail, 'Zip', 'unzip', [fileNameUrl, outputDirectoryUrl]);
};