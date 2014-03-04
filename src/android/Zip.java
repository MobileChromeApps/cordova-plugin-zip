package org.apache.cordova;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.FileNotFoundException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;


import android.net.Uri;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaResourceApi.OpenForReadResult;
import org.apache.cordova.PluginResult;
import org.json.JSONException;
import org.json.JSONObject;

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
            String outputDirectory = args.getString(1);

            // Since Cordova 3.3.0 and release of File plugins, files are accessed via cdvfile://
            // Accept a path or a URI for the source zip.
            Uri zipUri = getUriForArg(zipFileName);

            // Same for target directory
            Uri outputUri = getUriForArg(outputDirectory);

            CordovaResourceApi resourceApi = webView.getResourceApi();

            File tempFile = resourceApi.mapUriToFile(zipUri);
            if(tempFile == null || !tempFile.exists()) {
                Log.e(LOG_TAG, "Zip file does not exist");
            }

            File outputDir = resourceApi.mapUriToFile(outputUri);
            outputDirectory = outputDir.getAbsolutePath();
            outputDirectory += outputDirectory.endsWith(File.separator) ? "" : File.separator;
            if(outputDir == null || (!outputDir.exists() && !outputDir.mkdirs())){
                throw new FileNotFoundException("File: \"" + outputDirectory + "\" not found");
            }

            OpenForReadResult zipFile = resourceApi.openForRead(zipUri);
            ProgressEvent progress = new ProgressEvent();
            progress.setTotal(zipFile.length);

            InputStream is = zipFile.inputStream;

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

                progress.setLoaded(4 + 4 + 4 + 4 + pubkeyLength + signatureLength);
            }

            // The inputstream is now pointing at the start of the actual zip file content.
            ZipInputStream zis = new ZipInputStream(new BufferedInputStream(is));

            ZipEntry ze;

            byte[] buffer = new byte[1024];
            boolean anyEntries = false;

            updateProgress(callbackContext, progress);

            while ((ze = zis.getNextEntry()) != null) 
            {
                anyEntries = true;
                String compressedName = ze.getName();

                if (ze.isDirectory()) {
                   File dir = new File(outputDirectory + compressedName);
                   dir.mkdirs();
                } else {
                    File file = new File(outputDirectory + compressedName);
                    file.getParentFile().mkdirs();
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
                progress.addLoaded(ze.getCompressedSize());
                updateProgress(callbackContext, progress);
                zis.closeEntry();
            }
            zis.close();

            // final progress = 100%
            progress.setLoaded(progress.getTotal());
            updateProgress(callbackContext, progress);

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

    private void updateProgress(CallbackContext callbackContext, ProgressEvent progress) throws JSONException {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, progress.toJSONObject());
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);
    }

    private Uri getUriForArg(String arg) {
        CordovaResourceApi resourceApi = webView.getResourceApi();
        Uri tmpTarget = Uri.parse(arg);
        return resourceApi.remapUri(
                tmpTarget.getScheme() != null ? tmpTarget : Uri.fromFile(new File(arg)));
    }

    private static class ProgressEvent {
        private long loaded;
        private long total;
        public long getLoaded() {
            return loaded;
        }
        public void setLoaded(long loaded) {
            this.loaded = loaded;
        }
        public void addLoaded(long add) {
            this.loaded += add;
        }
        public long getTotal() {
            return total;
        }
        public void setTotal(long total) {
            this.total = total;
        }
        public JSONObject toJSONObject() throws JSONException {
            return new JSONObject(
                    "{loaded:" + loaded +
                    ",total:" + total + "}");
        }
    }
}
