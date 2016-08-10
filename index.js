const im = require("imagemagick");
const S3 = require("aws-sdk").S3;

const config = require("./config");

const s3 = new S3({ region: "us-east-1" });

const downloadImage = (Bucket, Key) => (
  new Promise((resolve, reject) => {
    console.log(`downloading ${Key} from ${Bucket}`);
    s3.getObject({ Bucket, Key }, (error, data) => {
      if (error) {
        console.log(error);
        return reject();
      }
      return resolve({
        key: Key,
        buffer: data.Body,
      });
    });
  })
);

const generateImages = (originalImage) => (
  Promise.all(config.resizes.map((resize) => (
    resizeImage(originalImage.buffer, resize.size, resize.name, originalImage.key)
  )))
);

const resizeImage = (srcData, width, name, key) => (
  new Promise((resolve, reject) => {
    im.resize({
      srcData,
      width,
    }, (error, stdout, stderr) => {
      if (error || stderr) {
        console.log("error", error || stderr);
        return reject();
      }
      console.log(`resized ${name} ${key}.jpg`);
      return resolve({
        name,
        key,
        imageBuffer: new Buffer(stdout, "binary"),
      });
    });
  })
);

const uploadAllImages = (data) => (
  Promise.all(data.map((image) => (
    uploadImage(image.name, image.key, image.imageBuffer)
  )))
);

const uploadImage = (name, key, imageBuffer) => (
  new Promise((resolve, reject) => {
    const keyParts = key.split(".");
    keyParts.splice(keyParts.length - 1, 0, name);
    const newKey = keyParts.join(".");
    const params = {
      Bucket: config.bucket,
      Key: newKey,
      ACL: "public-read",
      Body: imageBuffer,
    };

    s3.putObject(params, (error, data) => {
      if (error) {
        console.log(error);
        return reject();
      }
      console.log(`uploaded ${newKey} to ${config.bucket}`);
      return resolve();
    });
  })
);

exports.handler = (event, context, callback) => {
  downloadImage(event.sourceBucket, event.sourceKey)
    .then(image => generateImages(image))
    .then(data => uploadAllImages(data))
    .then(result => callback())
    .catch(error => console.log(error))
  ;
};
