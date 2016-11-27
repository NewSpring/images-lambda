const im = require("imagemagick");
const S3 = require("aws-sdk").S3;

// contains target S3 bucket, and what images should be generated
const config = require("./config");

const s3 = new S3({ region: "us-east-1" });

// downloads the image.
// the image is stored in-memory as a buffer
// instead of writing to disk.
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

// generates new images by iterating over the resizes
// specified in the config.
const generateImages = (originalImage) => (
  Promise.all(config.resizes.map((resize) => (
    resizeImage(originalImage.buffer, resize.size, resize.name, originalImage.key)
  )))
);

// determines if an image is portrait or not.
// by default, the resized image is constrained based on width.
// but, if it's taller than it is wide, height is used as the constraint.
const isPortrait = (srcData) => (
  new Promise((resolve, reject) => {
    im.identify({ data: srcData }, (error, features) => {
      if (error) {
        console.log(error);
        reject();
      }
      console.log("height", features.height);
      console.log("width", features.width);
      const portrait = features.height > features.width;
      console.log("isPortrait", portrait);
      resolve(portrait);
    });
  })
);

// uses imagemagick to resize the image, and stores it
// in-memory as a buffer
const resizeImage = (srcData, width, name, key) => (
  new Promise((resolve, reject) => {
    const params = { srcData };

    isPortrait(srcData)
      .then((portrait) => {
        if (portrait) {
          params.height = width;
        } else {
          params.width = width;
        }

        im.resize(params, (error, stdout, stderr) => {
          if (error || stderr) {
            console.log("error", error || stderr);
            return reject();
          }
          console.log(`resized ${name} ${key}`);
          return resolve({
            name,
            key,
            imageBuffer: new Buffer(stdout, "binary"),
          });
        });

      });

  })
);

// iterates over all resized images and uploads them
const uploadAllImages = (data) => (
  Promise.all(data.map((image) => (
    uploadImage(image.name, image.key, image.imageBuffer)
  )))
);

// generates the new file name for the image, and 
// uploads it to the S3 bucket specified
const uploadImage = (name, key, imageBuffer) => (
  new Promise((resolve, reject) => {
    console.log(`splitting: ${key}`);
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

// function called by Lambda when triggered
exports.handler = (event, context, callback) => {
  const sourceBucket = event.sourceBucket || event.Records[0].s3.bucket.name;
  const sourceKey = event.sourceKey || event.Records[0].s3.object.key;
  downloadImage(sourceBucket, sourceKey)
    .then(image => generateImages(image))
    .then(data => uploadAllImages(data))
    .then(result => callback())
    .catch(error => console.log(error))
  ;
};
