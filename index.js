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
      return resolve(data.Body);
    });
  })
);

const generateImages = (originalImage) => (
  Promise.all(config.resizes.map((resize) => (
    resizeImage(originalImage, resize.size, resize.name)
  )))
);

const resizeImage = (srcData, width, name) => (
  new Promise((resolve, reject) => {
    im.resize({
      srcData,
      width,
    }, (error, stdout, stderr) => {
      if (error || stderr) {
        console.log("error", error || stderr);
        return reject();
      }
      console.log(`resized ${name}.jpg`);
      return resolve({
        name,
        imageBuffer: new Buffer(stdout, "binary"),
      });
    });
  })
);

const uploadImage = (name, imageBuffer) => (
  new Promise((resolve, reject) => {
    const params = {
      Bucket: config.bucket,
      Key: `${name}.jpg`,
      ACL: "public-read",
      Body: imageBuffer,
    };

    s3.putObject(params, (error, data) => {
      if (error) {
        console.log(error);
        return reject();
      }
      console.log(`uploaded ${name}.jpg to ${config.bucket}`);
      return resolve();
    });
  })
);

const uploadAllImages = (data) => (
  Promise.all(data.map((image) => (
    uploadImage(image.name, image.imageBuffer)
  )))
);

exports.handler = (event, context, callback) => {
  downloadImage(event.sourceBucket, event.sourceKey)
    .then(image => generateImages(image))
    .then(data => uploadAllImages(data))
    .then(result => callback())
    .catch(error => console.log(error))
  ;
};
