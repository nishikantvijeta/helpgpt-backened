import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "yoursecretkey";

export default function auth(req, res, next) {
  console.log("Headers received:", req.headers);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Adjust this based on your token payload structure
    req.userId = decoded.userId || decoded.id || null;  
    if (!req.userId) {
      return res.status(401).json({ error: "Token missing user ID" });
    }
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}

