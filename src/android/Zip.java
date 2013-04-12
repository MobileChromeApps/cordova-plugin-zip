package org.apache.cordova;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONException;

import android.util.Log;

public class Zip extends CordovaPlugin {

    private static final String LOG_TAG = "Zip";
    
    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("unzip".equals(action)) {
            unzip(args, callbackContext);
            return true;
        }
        return false;
    }

    private void unzip(final CordovaArgs args, final CallbackContext callbackContext) {
        this.cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                unzipSync(args, callbackContext);
            }
        });
    }

    private void unzipSync(CordovaArgs args, CallbackContext callbackContext) {
        try {
            String zipFileName = args.getString(0);
            zipFileName = getFilePathFromPath(zipFileName);
            String outputDirectory = args.getString(1);
            outputDirectory = getFilePathFromPath(outputDirectory);
            outputDirectory += outputDirectory.endsWith(File.separator) ? "" : File.separator;

            String tempDir = getFilePathFromPath(zipFileName);
            File tempFile = new File(tempDir);
            boolean ex = tempFile.exists();
            if(!ex) {
                Log.e(LOG_TAG, "Doesn't exist");
            }
            InputStream is = new FileInputStream(zipFileName);
            ZipInputStream zis = new ZipInputStream(new BufferedInputStream(is));
            ZipEntry ze;

            byte[] buffer = new byte[1024];

            while ((ze = zis.getNextEntry()) != null) 
            {
                String compressedName = ze.getName();

                if (ze.isDirectory()) {
                   File dir = new File(outputDirectory + compressedName);
                   dir.mkdirs();
                } else {
                    FileOutputStream fout = new FileOutputStream(outputDirectory + compressedName);
                    int count;
                    while ((count = zis.read(buffer)) != -1) 
                    {
                        fout.write(buffer, 0, count);             
                    }

                    fout.close();
                }
                zis.closeEntry();
            }
            zis.close();
            callbackContext.success();
        } catch (Exception e) {
            String errorMessage = "An error occurred while unzipping.";
            callbackContext.error(errorMessage);
            Log.e(LOG_TAG, errorMessage, e);
        }
    }

    private String getFilePathFromPath(String path) {
        String prefix = "file://";

        if (path.startsWith(prefix)) {
            return path.substring(prefix.length());
        } else {
            return path;
        }
    }
}
