const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // if there isn't any token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err.message);
      return res.sendStatus(403); // if token is no longer valid or tampered
    }
    req.user = user; // Add decoded user payload to request object
    next(); // pass the execution to the router handler
  });
};

module.exports = {
  authenticateToken,
};
