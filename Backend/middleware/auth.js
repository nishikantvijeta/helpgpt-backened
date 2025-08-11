import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "yoursecretkey";

export default function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.userId = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    req.userId = null; // treat as guest if invalid token
    next();
  }
}




// import jwt from "jsonwebtoken";
// const JWT_SECRET = process.env.JWT_SECRET || "yoursecretkey";

// export default function (req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     // No token - treat as guest
//     req.userId = null; // or a special value
//     return next();
//   }

//   const token = authHeader.split(" ")[1];
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     req.userId = decoded.userId;
//     next();
//   } catch {
//     return res.status(401).json({ error: "Invalid token" });
//   }
// }
