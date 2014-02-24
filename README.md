zip
===================

A Cordova plugin to unzip files in Android and iOS.

##Installation

    cordova plugin add https://github.com/MobileChromeApps/zip.git

##Usage

    zip.unzip(<source zip>, <destination dir>, <callback>);

Both source and destination arguments can be URLs obtained from the HTML File
interface or absolute paths to files on the device.

The callback argument will be executed when the unzip is complete, or when an
error occurs. It will be called with a single argument, which will be 0 on
success, or -1 on failure.
