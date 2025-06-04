const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const { getOrSetUser } = require('../utils/cacheService');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(403).json({ status: false, message: 'Not authorized to access this route.' })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await getOrSetUser(decoded.id, async () => {
        return await User.findById(decoded.id).lean();
      });

      if (!user) {
        return res.status(404).json({ status: false, message: 'User not found.' })
      }
       if(user.isAccountDeactivated){
              return errorResponse(res, 403, 'Illegal Access , Account has been terminated , Please use another email');
          }
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ status: false, message: 'Token is invalid or expired' })
    }
  } catch (error) {
    next(error);
  }
};

module.exports = protect;
