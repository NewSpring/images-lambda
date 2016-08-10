const fs = require("fs");
const httpsGet = require("https").get;
const im = require("imagemagick");
const S3 = require("aws-sdk").S3;

const config = require("./config");

const s3 = new S3({ region: "us-east-1" });

const downloadImage = (imageUrl) => (
  new Promise((resolve, reject) => {
    // create tmp directory
    if (!fs.existsSync("/tmp")) fs.mkdirSync("/tmp");

    const tmpFileName = "/tmp/original.jpg";
    const tmpFile = fs.createWriteStream(tmpFileName);
    console.log("downloading");
    httpsGet(imageUrl, (response) => {
      response.pipe(tmpFile);
      tmpFile.on("finish", () => {
        tmpFile.close();
        console.log("download finished");
        console.log("exists", fs.existsSync(tmpFileName));
        return resolve(tmpFileName);
      });
    }).on("error", (error) => {
      console.log(error.message);
      return reject();
    });
  })
);

const generateImages = (originalImage) => (
  Promise.all(config.resizes.map((resize) => (
    resizeImage(originalImage, resize.size, resize.name)
  )))
);

const resizeImage = (srcPath, width, name) => (
  new Promise((resolve, reject) => {
    im.resize({
      srcPath,
      dstPath: `/tmp/${name}.jpg`,
      width,
    }, (error, stdout, stderr) => {
      if (error) {
        console.log("error", error);
        return reject();
      }
      if (stdout) {
        console.log("stdout", stdout);
      }
      if (stderr) {
        console.log("stderr", stderr);
      }
      console.log("resized");
      return resolve();
    });
  })
);

const uploadImage = (image) => (
  new Promise((resolve, reject) => {
    const params = {
      Bucket: config.bucket,
      Key: `${image}.jpg`,
      ACL: "public-read",
      Body: fs.readFileSync(`/tmp/${image}.jpg`),
    };

    s3.putObject(params, (error, data) => {
      if (error) {
        console.log(error);
        return reject();
      }
      console.log(`uploaded ${image}.jpg to ${config.bucket}`);
      return resolve();
    });
  })
);

const uploadAllImages = () => (
  Promise.all(config.resizes.map((resize) => (
    uploadImage(resize.name)
  )))
);

exports.handler = (event, context, callback) => {
  console.log(event.image);
  downloadImage(event.image)
    .then(image => generateImages(image))
    .then(data => uploadAllImages())
    .then(result => callback(null, "meow"))
    .catch(error => console.log(error))
  ;
}
