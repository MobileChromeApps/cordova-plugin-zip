#import "Zip.h"
#import "CDVFile.h"

@implementation Zip

- (NSString *)pathForURL:(NSString *)urlString
{
    // Attempt to use the File plugin to resolve the destination argument to a
    // file path.
    NSString *path;
    id filePlugin = [self.commandDelegate getCommandInstance:@"File"];
    if (filePlugin != nil) {
        CDVFilesystemURL* url = [CDVFilesystemURL fileSystemURLWithString:urlString];
        path = [filePlugin filesystemPathForURL:url];
    }
    // If that didn't work for any reason, return the original argument.
    if (path == nil) {
        path = urlString;
    }
    return path;
}

- (void)unzip:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        
        @try {
            NSString *zipURL = [command.arguments objectAtIndex:0];
            NSString *destinationURL = [command.arguments objectAtIndex:1];
            NSError *error;

            NSString *zipPath = [self pathForURL:zipURL];
            NSString *destinationPath = [self pathForURL:destinationURL];

            if([SSZipArchive unzipFileAtPath:zipPath toDestination:destinationPath overwrite:YES password:nil error:&error]) {
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
            } else {
                NSLog(@"%@ - %@", @"Error occurred during unzipping", [error localizedDescription]);
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Error occurred during unzipping"];
            }
        } @catch(NSException* exception) {
            NSLog(@"%@ - %@", @"Error occurred during unzipping", [exception debugDescription]);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Error occurred during unzipping"];
        }
        
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end
