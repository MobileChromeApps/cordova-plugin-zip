package org.apache.cordova;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.FileNotFoundException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;


import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
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

            File outputDir = new File(outputDirectory);
            if(!outputDir.exists() && !outputDir.mkdirs()){
                throw new FileNotFoundException("File: \"" + outputDirectory + "\" not found");
            }

            InputStream is = new FileInputStream(zipFileName);

            if (zipFileName.endsWith("crx")) {
                // CRX files contain a header. This header consists of:
                //  * 4 bytes of magic number
                //  * 4 bytes of CRX format version,
                //  * 4 bytes of public key length
                //  * 4 bytes of signature length
                //  * the public key
                //  * the signature
                // and then the ordinary zip data follows. We skip over the header before creating the ZipInputStream.

                is.skip(8); // 4 bytes for the magic number, 4 for the version.
                int pubkeyLength = is.read();
                pubkeyLength += is.read() << 8;
                is.skip(2);

                int signatureLength = is.read();
                signatureLength += is.read() << 8;
                is.skip(2);

                is.skip(pubkeyLength + signatureLength);
            }

            // The inputstream is now pointing at the start of the actual zip file content.
            ZipInputStream zis = new ZipInputStream(new BufferedInputStream(is));

            ZipEntry ze;

            byte[] buffer = new byte[1024];
            boolean anyEntries = false;

            while ((ze = zis.getNextEntry()) != null) 
            {
                anyEntries = true;
                String compressedName = ze.getName();

                if (ze.isDirectory()) {
                   File dir = new File(outputDirectory + compressedName);
                   dir.mkdirs();
                } else {
                    File file = new File(outputDirectory + compressedName);
                    if(file.exists() || file.createNewFile()){
                        FileOutputStream fout = new FileOutputStream(file);
                        int count;
                        while ((count = zis.read(buffer)) != -1)
                        {
                            fout.write(buffer, 0, count);
                        }
                        fout.close();
                    }

                }
                zis.closeEntry();
            }
            zis.close();
            if (anyEntries)
                callbackContext.success();
            else
                callbackContext.error("Bad zip file");
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
