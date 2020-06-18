# Cordova ZIP plugin - browser endpoint
Written in TypeScript, transpiled to JavaScript

## Build
```
npx tsc cordova-plugin-file.d.ts zip.js.d.ts FileUtil.ts ZipProxy.ts --target ES6 --outFile ZipProxy.js
```

## Integrate
Cordova ZIP plugin uses zip.js (https://github.com/gildas-lormeau/zip.js) to unzip, you have to include it in your app this way:
(your zip.js-bundle.js should at least include zip.js, inflate.js, deflate.js, zip-ext.js)

```typescript
 private async importBrowserZipSupport(): Promise<void> {

    const zipPlugin = zip;
    if (isBrowserPlatform()) {
        console.info('browser platform: loading zip.js');
        // zip.js is required for browser platform (cordova-plugin-zip relies on it)
        // it should be included by cordova plugin zip platform browser
        const zipJsScript: HTMLScriptElement = document.createElement('script');
        const zipJsScriptLoaded = new Promise<void>((resolve, reject) => {
            zipJsScript.onload = () => resolve();
        });
        zipJsScript.src = 'path/to/zip.js-bundle.js';
        document.body.appendChild(zipJsScript);

        await zipJsScriptLoaded;
        console.info('browser platform: zip.js loaded!');

        window['zip'] = Object.assign(zipPlugin, window['zip']);
        console.debug('browser platform: zip.js merged into zip');
    }
}
```