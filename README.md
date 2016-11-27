# images-lambda

AWS lambda function that takes an image URL, downloads it, generates new sizes for it, and uploads the new images to S3.

## Getting Started

You may need to install ImageMagick on your machine, but it is already installed in the node image on Lambda.

```bash
brew install imagemagick
```

Then,

```bash
$ npm i
$ npm start # run locally
$ npm run deploy # deploy to AWS
```
