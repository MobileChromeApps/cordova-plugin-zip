cordova.commandProxy.add("Zip", {
        unzip:function(successCallback,errorCallback,args) {
            

        var file = args[0];

        var dir = args[1];

        var plugin = ZipCSComponent.ZipPlugin();

        plugin.unZipAsync(file, dir, function (percent) {
            successCallback(new ProgressEvent("OK", { "loaded": percent, "total": 100 }));
            // todo: fix
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