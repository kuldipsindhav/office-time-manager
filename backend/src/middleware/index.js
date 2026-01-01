const { protect, authorize, canAccessUser } = require('./auth');
const { errorHandler, notFound, asyncHandler } = require('./errorHandler');
const validation = require('./validation');

module.exports = {
  protect,
  authorize,
  canAccessUser,
  errorHandler,
  notFound,
  asyncHandler,
  ...validation
};
