# Code Walkthrough

## deps

This project uses [node-lambda](https://github.com/motdotla/node-lambda) as a base for creating Lambda functions. It handles initialization, building, and deployment. This has been abstracted away using node scripts.

Also needed are `aws-sdk`, and `imagemagick`.

You may need to install ImageMagick on your machine using `brew install imagemagick`, but it is already installed in the node v4 image on Lambda.

## index.js

The bulk of the logic is located in `index.js`. Lambda looks for an exported function called `handler` in `index.js`, though this can be changed. For more info, see inline comments.

## config.json

`config.json` contains the target S3 bucket, and an array of sizes to generate. `size` is used as a constraint for the longest side of the image. So, depending on whether your image is portrait, landscape, or square, `size` will always constrain the longest side. `name` is used to generate the file name for each newly generated image. If your `name` is `small`, and your existing file name is `test.jpg`, your new file name will be `test.small.jpg`.

## context.json

`context.json` is used for local development, and manual triggers on Lambda. It will probably be blank when you clone the project, but can be used like so:

```json
{
  "sourceBucket": "myS3Bucket",
  "sourceKey": "path/to/my/images.jpg"
}
```
