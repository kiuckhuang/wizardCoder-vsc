// https://github.com/node-fetch/node-fetch/issues/1617#issuecomment-1467764667
export {};

declare global {
  type FormData = import('formdata-node').FormData;
  type File = import('formdata-node').File;
  type Blob = import('formdata-node').Blob;

  var File: File;
  var Blob: Blob;
}