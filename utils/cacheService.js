const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

const get = (key) => {
  return cache.get(key);
};

const set = (key, value, ttl = 300) => {
  return cache.set(key, value, ttl);
};

const del = (pattern) => {
  const allKeys = cache.keys();
  const matchedKeys = allKeys.filter((key) => key.startsWith(pattern));
  if (matchedKeys.length > 0) {
    cache.del(matchedKeys);
  }
};

const flush = () => {
  return cache.flushAll();
};

const keys = () => {
  cache.keys();
};
const getOrSetUser = async (key, fetchCallback) => {
  const cached = get(`User:${key}`);
  if (cached) return cached;

  const fresh = await fetchCallback();
  if (fresh) {
    set(`User:${key}`, fresh);
  }
  return fresh;
};
const getOrSetWebsiteUsers = async (key, fetchCallback) => {
  const cached = get(`Website_User:${key}`);
  if (cached) return cached;

  const fresh = await fetchCallback();
  if (fresh) {
    set(`Website_User:${key}`, fresh);
  }
  return fresh;
};

module.exports = {
  get,
  set,
  del,
  flush,
  keys,getOrSetUser ,getOrSetWebsiteUsers
};
