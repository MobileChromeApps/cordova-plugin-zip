#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>
#import "SSZipArchive.h"

@interface ZipPlugin : CDVPlugin <SSZipArchiveDelegate> {
    @private
    CDVInvokedUrlCommand* _command;
}


- (void)unzip:(CDVInvokedUrlCommand*)command;
- (void)zipArchiveWillUnzipFileAtIndex:(NSInteger)fileIndex totalFiles:(NSInteger)totalFiles archivePath:(NSString *)archivePath fileInfo:(unz_file_info)fileInfo;

@end
