var exec = cordova.require('cordova/exec');

function newProgressEvent(result) {
    var event = {
        fileIndex: result.fileIndex,
        totalFiles: result.totalFiles,
        total: 1, // For backwards compability
        loaded: result.totalFiles > 0 ? result.fileIndex / result.totalFiles : 0
    };
    return event;
}

exports.unzip = function(fileName, outputDirectory, callback, progressCallback) {
    var win = function(result) {
        if (!result) return callback(0);
        if (progressCallback) {
            return progressCallback(newProgressEvent(result));
        }
    };
    var fail = function(result) {
        if (callback) {
            callback(-1);
        }
    };
    exec(win, fail, 'Zip', 'unzip', [fileName, outputDirectory]);
};