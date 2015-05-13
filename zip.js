var exec = cordova.require('cordova/exec');

function newProgressEvent(result) {
    var event = {
        total: result.total,
        loaded: result.loaded
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