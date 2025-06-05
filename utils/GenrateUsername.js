const crypto = require('crypto');

const generateUniqueUsername = (name) => {
  const shortName = name.toLowerCase().replace(/\s+/g, '').slice(0, 8);
  const uniqueId = crypto.randomBytes(4).toString('hex');
  return `${shortName}@${uniqueId}`;
};

module.exports = { generateUniqueUsername };
