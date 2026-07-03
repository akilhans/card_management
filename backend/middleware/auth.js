const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Token taqdim etilmagan' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Yaroqsiz token' });
  }
};

const superAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin')
    return res.status(403).json({ message: 'Super admin huquqi talab qilinadi' });
  next();
};

module.exports = { auth, superAdmin };
