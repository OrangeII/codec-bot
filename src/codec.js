const sharp = require('sharp');
const makePortrait = require('./portrait');
const fetch = require('node-fetch');
var wrap = require('word-wrap');

const TEXTBOX_SIZE = {
  height: 128,
  width: 502
};
const YES_SNAKE = "Yes, Snake. ";

const getTemplate = async () => {
  const response = await fetch(process.env.IMG_CODEC_TEMPLATE_URL);
  return response.buffer();
};

const getSvgLines = (text) => {
  text = wrap(text, {
    width: 38,
    trim: true
  });
  return text.split(/\r?\n/).map(line => {
    return `<tspan x="0" dy="1.3em">${line}</tspan>`;
  }).join(" ");
};

const getTextBox = (text) => {
  return Buffer.from(`<svg width="${TEXTBOX_SIZE.width}" height="${TEXTBOX_SIZE.height}">
                        <rect x="0" y="0" width="100%" height="100%" fill="#000" />
                        <text x="0" y="-10" text-anchor="start" fill="#FFF" font-size="24px" font-family="Arial, Helvetica, sans-serif, monospace">
                        ${getSvgLines(text)}
                        </text>
                      </svg>`);
};

const codec = async (picture, text, includeSnake) => {
  if (includeSnake)
    text = YES_SNAKE + text
  const portrait = await makePortrait(picture).then(p => p.toBuffer());
  const textBox = await sharp(getTextBox(text)).blur(parseFloat(process.env.IMG_TEXT_BLUR)).toBuffer();
  const template = sharp(await getTemplate());
  return template
    .composite([
      { input: portrait, top: 78, left: 222 },
      { input: textBox, top: 348, left: 264 }
    ]);
};

module.exports = codec;
