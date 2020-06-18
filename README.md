# cordova-plugin-zip

A Cordova plugin to unzip files in Android and iOS.

## Installation

    cordova plugin add cordova-plugin-zip

## Usage
```javascript
    zip.unzip(<source zip>, <destination dir>, <callback>, [<progressCallback>]);
```
Both source and destination arguments can be URLs obtained from the HTML File
interface or absolute paths to files on the device.

The callback argument will be executed when the unzip is complete, or when an
error occurs. It will be called with a single argument, which will be 0 on
success, or -1 on failure.

The progressCallback argument is optional and will be executed whenever a new ZipEntry
has been extracted. E.g.:
```javascript
    var progressCallback = function(progressEvent) {
        $( "#progressbar" ).progressbar("value", Math.round((progressEvent.loaded / progressEvent.total) * 100));
    };
```
The values `loaded` and `total` are the number of compressed bytes processed and total. Total is the
file size of the zip file.

## Example
```typescript
const downZipUrl: string = downZipFileEntry.toInternalURL();
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
```

## Release Notes

### 3.2.0 
* Browser platform support
* Updated doc
* Pass error message to upper layer

### 3.1.0 (Feb 23, 2016)
* Updated SSZipArchive (ios lib) to 1.1

### 3.0.0 (May 1, 2015)
* Updated SSZipArchive (ios lib) to 0.2.1
* Update file plugin dependency to use npm version (cordova-plugin-file)

### 2.1.0 (May 1, 2014)
* Added progress events
* Fix iOS path handling when given file: URLs as src/target
