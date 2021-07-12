const sharp = require('sharp');
const MGS_COLOR_TINT = '#4d876f';

const getCropParameters = (imgWidth, imgHeight) => {
  let width = (imgHeight * 15) / 28;
  let left = imgWidth / 2 - width / 2;
  return {
    left: Math.round(left),
    top: 0,
    width: Math.round(width),
    height: imgHeight
  };
};

const portrait = async (input) => {
  const image = sharp(input);
  const metadata = await image.metadata();
  return image
    .tint(MGS_COLOR_TINT)
    .extract(getCropParameters(metadata.width, metadata.height))
    .resize(120, 224)
    .blur(parseFloat(process.env.IMG_PORTRAIT_BLUR));
};

module.exports = portrait;
