const { createCanvas } = require('canvas');
const log = require('../config/logger');

function generateAvatar(n, c) {
  const name = n || '';
  const color = c || '#000000';
  try {
    const words = name.split(' ');
    let initials = '';

    if (words.length === 1) {
      initials = words[0].charAt(0).toUpperCase();
    } else if (words.length === 2) {
      initials = words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
    } else {
      initials = words[0].charAt(0).toUpperCase() + words[words.length - 1].charAt(0).toUpperCase();
    }
    const canvasSize = 200;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');
    const fontSize = canvasSize * 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(canvasSize / 2, canvasSize / 2);
    ctx.fillText(initials, 0, 0);
    const imageUrl = canvas.toDataURL();
    log.info('[SUCCESS] Created the image for ' + name);
    return imageUrl;
  } catch (error) {
    log.error('[Failed] to Create Avatar', error);
  }
}
module.exports = generateAvatar;
