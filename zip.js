var exec = cordova.require('cordova/exec');

exports.unzip = function(fileName, outputDirectory, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1);
    };
    exec(win, fail, 'Zip', 'unzip', [fileName, outputDirectory]);
};