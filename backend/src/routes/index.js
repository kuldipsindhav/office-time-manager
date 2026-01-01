const authRoutes = require('./auth');
const userRoutes = require('./users');
const punchRoutes = require('./punch');
const nfcRoutes = require('./nfc');
const dashboardRoutes = require('./dashboard');
const adminRoutes = require('./admin');

module.exports = {
  authRoutes,
  userRoutes,
  punchRoutes,
  nfcRoutes,
  dashboardRoutes,
  adminRoutes
};
