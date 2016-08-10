const fs = require("fs");
const httpsGet = require("https").get;
const im = require("imagemagick");

const config = require("./config");

const downloadImage = (imageUrl) => (
  new Promise((resolve, reject) => {
    // create tmp directory
    if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp");

    const tmpFileName = "./tmp/original.jpg";
    const tmpFile = fs.createWriteStream(tmpFileName);
    httpsGet(imageUrl, (response) => {
      response.pipe(tmpFile);
      tmpFile.on("finish", () => {
        tmpFile.close();
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
      dstPath: `./tmp/${name}.jpg`,
      width,
    }, (err, stdout, stderr) => {
      if (err) {
        console.log(error);
        return reject();
      }
      console.log("resized");
      return resolve();
    });
  })
);

exports.handler = (event, context, callback) => {
  console.log(event.image);
  downloadImage(event.image)
    .then(image => generateImages(image))
    .then(result => callback(null, "meow"))
    .catch(error => console.log(error))
  ;
}
