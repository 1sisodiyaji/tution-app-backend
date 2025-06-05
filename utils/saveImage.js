const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function saveImage(base64Avatar, userName, folderName) {
  if (!base64Avatar || typeof base64Avatar !== 'string') {
    throw new Error('Invalid or missing base64 avatar data');
  }
  const base64Data = base64Avatar.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `${userName.replace(/\s+/g, '_')}-${Date.now()}.webp`;
  const uploadDir = path.join(__dirname, `../uploads/${folderName}`);
  const filePath = path.join(uploadDir, fileName);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await sharp(buffer).webp({ quality: 80 }).toFile(filePath);

  return `${process.env.SERVER_URL}/uploads/${folderName}/${fileName}`;
}
module.exports = saveImage;
