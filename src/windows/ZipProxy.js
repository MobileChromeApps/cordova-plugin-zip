cordova.commandProxy.add("Zip", {
        unzip:function(successCallback,errorCallback,args) {
         
            var file = args[0];
            var dir = args[1];

            var plugin = ZipCSComponent.ZipPlugin();

            plugin.unZipByUriAsync(file, dir, function (loaded, total) {
            //plugin.unZipByPathAsync(file, dir, function (loaded, total) {
                var progressEvent = new ProgressEvent("OK", { loaded: loaded, total: total })
                var callbackParams = { keepCallback: true };
                successCallback(progressEvent, callbackParams);
            })
            .done(
                function () {
                    successCallback();
                },
                function (error) {
                    errorCallback(error);
                }
            );

        }
    });