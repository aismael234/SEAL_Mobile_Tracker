# SEAL_Mobile_Tracker

## Preview

<br/>

<div>
<img src="https://github.com/aismael234/SEAL_Mobile_Tracker/assets/87450228/dc1726db-5e99-4a18-baf2-67f3e64d21a4" width="30%" />
<img src="https://github.com/aismael234/SEAL_Mobile_Tracker/assets/87450228/a4d2618f-5890-43ff-9d9f-c9e03a9c88fb" width="30%" />
<img src="https://github.com/aismael234/SEAL_Mobile_Tracker/assets/87450228/9be401bc-10df-4db1-8c38-18068a13aeaf" width="30%" />
</div>

<br/>
<br/>


## Installing
**Note**: This mobile application is currently limited to iOS/iPadOS due to Android dependency issues, specifically the datetime component for selecting time ranges.

1. If this is your first time running this application, run ```npm install```.
2. Make sure you have an iOS/iPadOS simulator running at this point (MacOS required).
    1. If for whatever reason you can't run a simulator, you can download the Expo Go app from the app store and run it from there.
4. Run application with ```npm start```.

<br/>
<br/>

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
