
const authMiddleware = require("./authMiddleware");

function adminMiddleware(req, res, next) {
  // First verify that the user is logged in.
  authMiddleware(req, res, () => {
    // Then check whether the user is an admin.
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admins only.",
      });
    }

    next();
  });
}

module.exports = adminMiddleware;
