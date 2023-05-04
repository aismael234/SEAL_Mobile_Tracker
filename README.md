# SEAL_Mobile_Tracker

**Important Note**: As of now, within 'node*modules/react-native/Libraries/Blob/FileReader.js'* of your project folder, the 'readAsArrayBuffer(blob)' function is not implemented, which leads to an error when attempting to complete an InfluxDB query. You must change the definition of the function to:

```js

readAsArrayBuffer(blob) {
    this._aborted = false;

    if (blob == null) {
      throw new TypeError(
        "Failed to execute 'readAsArrayBuffer' on 'FileReader': parameter 1 is not of type 'Blob'"
      );
    }

    NativeFileReaderModule.readAsDataURL(blob.data)
      .then((text) => {
        if (this._aborted) {
          return;
        }

        const base64 = text.split(",")[1];
        const typedArray = toByteArray(base64);

        this._result = typedArray.buffer;
        this._setReadyState(DONE);
      })
      .catch((error) => {
        if (this._aborted) {
          return;
        }
        this._error = error;
        this._setReadyState(DONE);
      });
  }
```

(implementation provided by: <https://github.com/facebook/react-native/pull/30769#issuecomment-1449425629>)

Since node_modules is within .gitignore, these changes must be implemented locally every time someone imports this repo. There is probably a way to apply this change automatically, but I haven't looked into it.

DO NOT include node_modules/ in git commits to solve this issue.
