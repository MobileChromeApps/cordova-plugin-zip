zip
===================

A Cordova plugin to unzip files in Android and iOS.

##Installation

###Prior to Cordova 2.7 / Manually

*   For Java, add the file Zip.java from the src/android folder into your eclipse project under a package org.apache.cordova
*   For iOS, add the 4 files under the src/ios directories into your project. Then add all files in src/ios.minizip into your project. Note that all files in should be in the same folder in the project i.e. do not create a folder called "minizip" in the xcode project (for example the files SSZipArchive.h should be next to the file crypt.h)
*   For both Java and iOS open the file zip.js insert the line

        cordova.define("zip.Zip", function(require, exports, module) {

    at the very beginning of the file. Add the line

        });

    at the end of the file
*   Add the modified zip.js into the www folder of Xcode or Eclipse
*   In Eclipse, open the Project/res/xm//config.xml. Add the following line under the plugins tag
        <plugin name="Zip" value="org.apache.cordova.Zip" />
*   In XCode, open the Project/config.xml. Add the following line under the plugins tag
        <plugin name="Zip" value="Zip" />

### 2.7 or later / Future branch of Plugman, cordova-cli and the latest cordova-js master as of April 16th, 2013

*   Assuming you've used cordova create to create the platforms, you can use 
        cordova plugin add directory-of-the-zip-plugin
    to add the plugin

##Usage

        zip.unzip('full file path', 'directory where to extract to', function(){
            console.log('All Done');
        });
