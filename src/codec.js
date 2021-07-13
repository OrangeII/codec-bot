const sharp = require('sharp');
const makePortrait = require('./portrait');
const fetch = require('node-fetch');
var wrap = require('word-wrap');

const TEXTBOX_SIZE_SMALL = {
  height: 128,
  width: 502,
  top: 348,
  left: 264,
  max_chars_per_line: 45
};
const TEXTBOX_SIZE_LARGE = {
  height: 128,
  width: 750,
  top: 348,
  left: 145,
  max_chars_per_line: 70
};


const YES_SNAKE = "Yes, Snake. ";

const getTemplate = async () => {
  const response = await fetch(process.env.IMG_CODEC_TEMPLATE_URL);
  return response.buffer();
};

const getSvgLines = (text, textboxConfig) => {
  text = wrap(text, {
    width: textboxConfig.max_chars_per_line,
    trim: true
  });
  return text.split(/\r?\n/).map(line => {
    return `<tspan x="0" dy="1.3em">${line}</tspan>`;
  }).join(" ");
};

const getTextBox = (text, textboxConfig) => {
  return Buffer.from(`<svg width="${textboxConfig.width}" height="${textboxConfig.height}">
                        <rect x="0" y="0" width="100%" height="100%" fill="#000" />
                        <text x="0" y="-10" text-anchor="start" fill="#FFF" font-size="24px" font-family="Arial, Helvetica, sans-serif, monospace">
                        ${getSvgLines(text, textboxConfig)}
                        </text>
                      </svg>`);
};

const codec = async (picture, text, includeSnake) => {
  if (includeSnake)
    text = YES_SNAKE + text
  const portrait = await makePortrait(picture).then(p => p.toBuffer());
  const textboxConfig = text.length > TEXTBOX_SIZE_SMALL.max_chars_per_line * 4 ? TEXTBOX_SIZE_LARGE : TEXTBOX_SIZE_SMALL;
  const textBox = await sharp(getTextBox(text, textboxConfig)).blur(parseFloat(process.env.IMG_TEXT_BLUR)).toBuffer();
  const template = sharp(await getTemplate());
  return template
    .composite([
      { input: portrait, top: 78, left: 222 },
      { input: textBox, top: textboxConfig.top, left: textboxConfig.left }
    ]);
};

module.exports = codec;
