const express = require("express");
const { PrismaClient } = require("./generated/prisma"); // Changed import path
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // Still needed for login route
const { authenticateToken } = require("./middleware"); // Import middleware
const cors = require("cors"); // Import cors

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// --- Auth Routes ---

// Register a new user
app.post("/auth/register", async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        isAdmin: false, // New registrations are never admins by default
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
      },
    });
    // Optionally, you could also log the user in and return a token here
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ error: "Error registering user", details: error.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" }); // User not found
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" }); // Incorrect password
    }

    // Ensure JWT_SECRET is available
    if (!JWT_SECRET) {
      console.error(
        "JWT_SECRET is not defined. Please set it in your environment variables."
      );
      return res
        .status(500)
        .json({ error: "Authentication configuration error" });
    }

    const token = jwt.sign(
      { userId: user.id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      token,
      userId: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error logging in", details: error.message });
  }
});

// Get current user details
app.get("/auth/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from the token payload (set by authenticateToken)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      // This case should ideally not happen if the token is valid and refers to an existing user
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get current user error:", error);
    res
      .status(500)
      .json({ error: "Error fetching user details", details: error.message });
  }
});

// --- User Routes ---

// Get all users (Example of a protected route)
app.get("/users", authenticateToken, async (req, res) => {
  // Example: Only allow admins to get all users
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
      }, // Exclude password
    });
    res.json(users);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching users", details: error.message });
  }
});

// Get user by ID (Protected, or allow users to get their own info)
app.get("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  // Users can get their own info, or admin can get any user info
  if (req.user.userId !== parseInt(id) && !req.user.isAdmin) {
    return res
      .status(403)
      .json({ error: "Forbidden: You can only access your own information" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
      }, // Exclude password
    });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching user", details: error.message });
  }
});

// Create a new user (Admin Only)
app.post("/users", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: "Forbidden: Admin access required to create users directly.",
    });
  }

  const { name, email, password, phone, isAdmin } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        isAdmin: isAdmin || false, // Admin can specify isAdmin status
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("Admin create user error:", error);
    res
      .status(500)
      .json({ error: "Error creating user", details: error.message });
  }
});

// Update a user (Protected, users can update their own info, or admin can update any)
app.put("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phone, isAdmin } = req.body;

  if (req.user.userId !== parseInt(id) && !req.user.isAdmin) {
    return res
      .status(403)
      .json({ error: "Forbidden: You can only update your own information" });
  }
  // Prevent non-admins from escalating privileges
  if (isAdmin !== undefined && !req.user.isAdmin) {
    return res
      .status(403)
      .json({ error: "Forbidden: You cannot change admin status." });
  }

  try {
    const dataToUpdate = { name, email, phone };
    if (isAdmin !== undefined && req.user.isAdmin) {
      // Only admins can change isAdmin status
      dataToUpdate.isAdmin = isAdmin;
    }

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters long" });
      }
      dataToUpdate.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
      }, // Exclude password
    });
    res.json(updatedUser);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("Update user error:", error);
    res
      .status(500)
      .json({ error: "Error updating user", details: error.message });
  }
});

// Delete a user (Protected, only admins or users themselves)
app.delete("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.userId !== parseInt(id) && !req.user.isAdmin) {
    return res.status(403).json({
      error:
        "Forbidden: You can only delete your own account or an admin can delete any account.",
    });
  }

  try {
    // Consider what happens to related data (e.g., Orders) when a user is deleted.
    // You might need to handle cascading deletes or disassociate related records in your Prisma schema or here.
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("Delete user error:", error);
    res
      .status(500)
      .json({ error: "Error deleting user", details: error.message });
  }
});

// --- Product Routes ---

// GET all active products
app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isDeleted: false, status: "ACTIVE" }, // Only show active, non-deleted products by default
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Get all products error:", error);
    res
      .status(500)
      .json({ error: "Error fetching products", details: error.message });
  }
});

// GET a single product by ID
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findFirst({
      where: { id: parseInt(id), isDeleted: false },
    });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: "Product not found or has been deleted" });
    }
  } catch (error) {
    console.error("Get product by ID error:", error);
    res
      .status(500)
      .json({ error: "Error fetching product", details: error.message });
  }
});

// POST create a new product (Admin Only)
app.post("/products", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const { name, description, price, imageUrl, category, stock, status } =
    req.body;

  if (!name || price === undefined || !category || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Name, price, category, and stock are required" });
  }
  if (typeof price !== "number" || price < 0) {
    return res
      .status(400)
      .json({ error: "Price must be a non-negative number" });
  }
  if (typeof stock !== "number" || stock < 0) {
    return res
      .status(400)
      .json({ error: "Stock must be a non-negative integer" });
  }

  try {
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        category,
        stock,
        status: status || "ACTIVE", // Default to ACTIVE if not provided
      },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Create product error:", error);
    // Add more specific error handling if needed (e.g., for invalid enum status)
    res
      .status(500)
      .json({ error: "Error creating product", details: error.message });
  }
});

// PUT update an existing product (Admin Only)
app.put("/products/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const { id } = req.params;
  const {
    name,
    description,
    price,
    imageUrl,
    category,
    stock,
    status,
    isDeleted,
  } = req.body;

  if (price !== undefined && (typeof price !== "number" || price < 0)) {
    return res
      .status(400)
      .json({ error: "Price must be a non-negative number" });
  }
  if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
    return res
      .status(400)
      .json({ error: "Stock must be a non-negative integer" });
  }
  // Add validation for status enum if provided
  if (status && !["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
    return res.status(400).json({ error: "Invalid product status" });
  }

  try {
    const productToUpdate = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!productToUpdate || productToUpdate.isDeleted) {
      return res
        .status(404)
        .json({ error: "Product not found or has been deleted" });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        price,
        imageUrl,
        category,
        stock,
        status,
        isDeleted, // Allow admin to explicitly un-delete or modify this
      },
    });
    res.json(updatedProduct);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    console.error("Update product error:", error);
    res
      .status(500)
      .json({ error: "Error updating product", details: error.message });
  }
});

// DELETE (soft delete) a product (Admin Only)
app.delete("/products/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const { id } = req.params;
  try {
    const productToDelete = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!productToDelete || productToDelete.isDeleted) {
      return res
        .status(404)
        .json({ error: "Product not found or already deleted" });
    }

    await prisma.product.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true, status: "ARCHIVED" }, // Also set status to ARCHIVED on soft delete
    });
    res.status(204).send(); // No content
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product not found" });
    }
    console.error("Delete product error:", error);
    res
      .status(500)
      .json({ error: "Error deleting product", details: error.message });
  }
});

// GET admin products (Admin Only)
app.get("/admin/products", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        status: { in: ["ACTIVE", "INACTIVE"] },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Get admin products error:", error);
    res
      .status(500)
      .json({ error: "Error fetching products", details: error.message });
  }
});

// GET archived products (Admin Only)
app.get("/admin/archived-products", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        status: "ARCHIVED",
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error("Get archived products error:", error);
    res.status(500).json({
      error: "Error fetching archived products",
      details: error.message,
    });
  }
});

// --- ProductAvailability Routes (Admin Only) ---

// POST /product-availabilities - Create a new product availability entry
app.post("/product-availabilities", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const { productId, weekStart, weekEnd, maxQuantity } = req.body;

  if (
    productId === undefined ||
    !weekStart ||
    !weekEnd ||
    maxQuantity === undefined
  ) {
    return res.status(400).json({
      error: "productId, weekStart, weekEnd, and maxQuantity are required",
    });
  }
  if (typeof maxQuantity !== "number" || maxQuantity < 0) {
    return res
      .status(400)
      .json({ error: "maxQuantity must be a non-negative number" });
  }

  try {
    // Validate dates
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid date format for weekStart or weekEnd" });
    }
    if (startDate >= endDate) {
      return res
        .status(400)
        .json({ error: "weekStart must be before weekEnd" });
    }

    // Check if product exists and is not deleted
    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
    });
    if (!product) {
      return res.status(404).json({
        error: `Product with ID ${productId} not found or has been deleted.`,
      });
    }

    const newAvailability = await prisma.productAvailability.create({
      data: {
        productId,
        weekStart: startDate,
        weekEnd: endDate,
        maxQuantity,
      },
    });
    res.status(201).json(newAvailability);
  } catch (error) {
    console.error("Create product availability error:", error);
    if (error.code === "P2003") {
      // Foreign key constraint failed (e.g. product doesn't exist)
      return res.status(400).json({
        error: `Invalid productId: ${productId}. Product may not exist.`,
      });
    }
    res.status(500).json({
      error: "Error creating product availability",
      details: error.message,
    });
  }
});

// GET /product-availabilities - Get all product availabilities (Admin Only)
// Optional query params: productId, startDate, endDate
app.get("/product-availabilities", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const { productId, startDate, endDate } = req.query;
  const whereClause = {};

  if (productId) {
    whereClause.productId = parseInt(productId);
  }
  if (startDate) {
    whereClause.weekStart = { gte: new Date(startDate) };
  }
  if (endDate) {
    whereClause.weekEnd = { lte: new Date(endDate) };
  }

  try {
    const availabilities = await prisma.productAvailability.findMany({
      where: whereClause,
      include: { product: { select: { name: true, id: true } } }, // Include product name for context
      orderBy: { weekStart: "asc" },
    });
    res.json(availabilities);
  } catch (error) {
    console.error("Get all product availabilities error:", error);
    res.status(500).json({
      error: "Error fetching product availabilities",
      details: error.message,
    });
  }
});

// GET /product-availabilities/:id - Get a single product availability by ID (Admin Only)
app.get("/product-availabilities/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  const { id } = req.params;
  try {
    const availability = await prisma.productAvailability.findUnique({
      where: { id: parseInt(id) },
      include: { product: { select: { name: true, id: true } } },
    });
    if (availability) {
      res.json(availability);
    } else {
      res.status(404).json({ error: "Product availability not found" });
    }
  } catch (error) {
    console.error("Get product availability by ID error:", error);
    res.status(500).json({
      error: "Error fetching product availability",
      details: error.message,
    });
  }
});

// PUT /product-availabilities/:id - Update an existing product availability (Admin Only)
app.put("/product-availabilities/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  const { id } = req.params;
  const { productId, weekStart, weekEnd, maxQuantity } = req.body;

  const dataToUpdate = {};
  if (productId !== undefined) dataToUpdate.productId = productId;
  if (weekStart !== undefined) dataToUpdate.weekStart = new Date(weekStart);
  if (weekEnd !== undefined) dataToUpdate.weekEnd = new Date(weekEnd);
  if (maxQuantity !== undefined) {
    if (typeof maxQuantity !== "number" || maxQuantity < 0) {
      return res
        .status(400)
        .json({ error: "maxQuantity must be a non-negative number" });
    }
    dataToUpdate.maxQuantity = maxQuantity;
  }

  if (dataToUpdate.weekStart && isNaN(dataToUpdate.weekStart.getTime())) {
    return res.status(400).json({ error: "Invalid date format for weekStart" });
  }
  if (dataToUpdate.weekEnd && isNaN(dataToUpdate.weekEnd.getTime())) {
    return res.status(400).json({ error: "Invalid date format for weekEnd" });
  }
  if (
    dataToUpdate.weekStart &&
    dataToUpdate.weekEnd &&
    dataToUpdate.weekStart >= dataToUpdate.weekEnd
  ) {
    return res.status(400).json({ error: "weekStart must be before weekEnd" });
  }
  // If only one date is provided for update, ensure it doesn't violate existing range if the other date is not updated

  try {
    if (productId !== undefined) {
      const product = await prisma.product.findFirst({
        where: { id: productId, isDeleted: false },
      });
      if (!product) {
        return res.status(404).json({
          error: `Product with ID ${productId} not found or has been deleted.`,
        });
      }
    }

    const updatedAvailability = await prisma.productAvailability.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });
    res.json(updatedAvailability);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Product availability not found" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({
        error: `Invalid productId: ${productId}. Product may not exist.`,
      });
    }
    console.error("Update product availability error:", error);
    res.status(500).json({
      error: "Error updating product availability",
      details: error.message,
    });
  }
});

// DELETE /product-availabilities/:id - Delete a product availability (Admin Only)
app.delete(
  "/product-availabilities/:id",
  authenticateToken,
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }
    const { id } = req.params;
    try {
      await prisma.productAvailability.delete({
        where: { id: parseInt(id) },
      });
      res.status(204).send(); // No content
    } catch (error) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ error: "Product availability not found" });
      }
      console.error("Delete product availability error:", error);
      res.status(500).json({
        error: "Error deleting product availability",
        details: error.message,
      });
    }
  }
);

// --- PickupSlot Routes ---

// POST /pickup-slots - Create a new pickup slot (Admin Only)
app.post("/pickup-slots", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  const { startTime, endTime, maxOrders, isActive } = req.body;

  if (!startTime || !endTime || maxOrders === undefined) {
    return res
      .status(400)
      .json({ error: "startTime, endTime, and maxOrders are required" });
  }

  const slotStartTime = new Date(startTime);
  const slotEndTime = new Date(endTime);

  if (isNaN(slotStartTime.getTime()) || isNaN(slotEndTime.getTime())) {
    return res
      .status(400)
      .json({ error: "Invalid date format for startTime or endTime" });
  }

  if (slotStartTime >= slotEndTime) {
    return res.status(400).json({ error: "startTime must be before endTime" });
  }

  if (
    typeof maxOrders !== "number" ||
    maxOrders < 0 ||
    !Number.isInteger(maxOrders)
  ) {
    return res
      .status(400)
      .json({ error: "maxOrders must be a non-negative integer" });
  }

  try {
    const newPickupSlot = await prisma.pickupSlot.create({
      data: {
        startTime: slotStartTime,
        endTime: slotEndTime,
        maxOrders,
        isActive: isActive === undefined ? true : isActive, // Default to true if not provided
      },
    });
    res.status(201).json(newPickupSlot);
  } catch (error) {
    console.error("Create pickup slot error:", error);
    res
      .status(500)
      .json({ error: "Error creating pickup slot", details: error.message });
  }
});

// GET /pickup-slots - Get pickup slots
// Authenticated users: get active, future slots
// Admins: get all slots, can filter by date and isActive status
app.get("/pickup-slots", authenticateToken, async (req, res) => {
  const { date, isActive } = req.query; // For admin filtering
  const now = new Date();

  try {
    let whereClause = {};

    if (req.user.isAdmin) {
      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true";
      }
      if (date) {
        const filterDate = new Date(date);
        if (isNaN(filterDate.getTime())) {
          return res
            .status(400)
            .json({ error: "Invalid date format for filter" });
        }
        // Filter for slots that are active on this specific day
        // A slot is active on a day if its startTime is before the end of that day
        // AND its endTime is after the start of that day.
        const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999));

        whereClause.AND = [
          ...(whereClause.AND || []),
          { startTime: { lt: endOfDay } },
          { endTime: { gt: startOfDay } },
        ];
      }
    } else {
      // Non-admin users: only active slots with startTime in the future
      whereClause.isActive = true;
      whereClause.startTime = { gt: now };
    }

    const pickupSlots = await prisma.pickupSlot.findMany({
      where: whereClause,
      orderBy: { startTime: "asc" },
    });
    res.json(pickupSlots);
  } catch (error) {
    console.error("Get pickup slots error:", error);
    res
      .status(500)
      .json({ error: "Error fetching pickup slots", details: error.message });
  }
});

// GET /pickup-slots/:id - Get a single pickup slot by ID (Admin Only)
app.get("/pickup-slots/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  const { id } = req.params;
  try {
    const pickupSlot = await prisma.pickupSlot.findUnique({
      where: { id: parseInt(id) },
    });
    if (pickupSlot) {
      res.json(pickupSlot);
    } else {
      res.status(404).json({ error: "Pickup slot not found" });
    }
  } catch (error) {
    console.error("Get pickup slot by ID error:", error);
    res
      .status(500)
      .json({ error: "Error fetching pickup slot", details: error.message });
  }
});

// PUT /pickup-slots/:id - Update an existing pickup slot (Admin Only)
app.put("/pickup-slots/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  const { id } = req.params;
  const { startTime, endTime, maxOrders, isActive } = req.body;

  const dataToUpdate = {};

  if (startTime !== undefined) {
    const slotStartTime = new Date(startTime);
    if (isNaN(slotStartTime.getTime())) {
      return res
        .status(400)
        .json({ error: "Invalid date format for startTime" });
    }
    dataToUpdate.startTime = slotStartTime;
  }
  if (endTime !== undefined) {
    const slotEndTime = new Date(endTime);
    if (isNaN(slotEndTime.getTime())) {
      return res.status(400).json({ error: "Invalid date format for endTime" });
    }
    dataToUpdate.endTime = slotEndTime;
  }

  if (
    dataToUpdate.startTime &&
    dataToUpdate.endTime &&
    dataToUpdate.startTime >= dataToUpdate.endTime
  ) {
    return res.status(400).json({ error: "startTime must be before endTime" });
  }
  // If only one date is provided, need to check against the existing other date in DB
  // This logic can get complex; for now, we assume if both are provided they are validated together.
  // If only one is provided, it's updated directly. A more robust solution might fetch the existing record.

  if (maxOrders !== undefined) {
    if (
      typeof maxOrders !== "number" ||
      maxOrders < 0 ||
      !Number.isInteger(maxOrders)
    ) {
      return res
        .status(400)
        .json({ error: "maxOrders must be a non-negative integer" });
    }
    dataToUpdate.maxOrders = maxOrders;
  }
  if (isActive !== undefined) {
    dataToUpdate.isActive = isActive;
  }

  try {
    // Check if slot exists before attempting update
    const existingSlot = await prisma.pickupSlot.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingSlot) {
      return res.status(404).json({ error: "Pickup slot not found" });
    }

    // Validate start/end time consistency if one is updated and the other is not
    const finalStartTime = dataToUpdate.startTime || existingSlot.startTime;
    const finalEndTime = dataToUpdate.endTime || existingSlot.endTime;

    if (finalStartTime >= finalEndTime) {
      return res.status(400).json({
        error:
          "Update would result in startTime being after or same as endTime",
      });
    }

    const updatedPickupSlot = await prisma.pickupSlot.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });
    res.json(updatedPickupSlot);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pickup slot not found" });
    }
    console.error("Update pickup slot error:", error);
    res
      .status(500)
      .json({ error: "Error updating pickup slot", details: error.message });
  }
});

// DELETE /pickup-slots/:id - Delete a pickup slot (Admin Only)
app.delete("/pickup-slots/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  const { id } = req.params;
  try {
    // Before deleting, consider if there are any orders associated with this slot.
    // The schema has onDelete: Restrict for Order.pickupSlotId, so Prisma will prevent deletion if orders exist.
    await prisma.pickupSlot.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pickup slot not found" });
    }
    if (error.code === "P2003") {
      // Foreign key constraint failed
      return res.status(409).json({
        error:
          "Cannot delete pickup slot. It is currently associated with existing orders.",
      });
    }
    console.error("Delete pickup slot error:", error);
    res
      .status(500)
      .json({ error: "Error deleting pickup slot", details: error.message });
  }
});

// --- Order Routes ---

// POST /orders - Place an order (user or guest)
app.post("/orders", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  let userId = null;
  let isAuthenticated = false;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      userId = payload.userId;
      isAuthenticated = true;
    } catch (err) {
      // Invalid token, treat as guest
      userId = null;
      isAuthenticated = false;
    }
  }

  const { items, guest } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty." });
  }
  if (!isAuthenticated && (!guest || !guest.name || !guest.email)) {
    return res
      .status(400)
      .json({ error: "Name and email are required for guest checkout." });
  }

  try {
    // Create the order
    const order = await prisma.order.create({
      data: {
        userId: userId || undefined, // null for guest
        guestName: isAuthenticated ? null : guest.name,
        guestEmail: isAuthenticated ? null : guest.email,
        createdAt: new Date(),
        orderItems: {
          create: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            name: item.name, // for historical record
          })),
        },
      },
      include: { orderItems: true },
    });
    res.status(201).json({ order });
  } catch (error) {
    console.error("Order creation error:", error);
    res
      .status(500)
      .json({ error: "Error placing order", details: error.message });
  }
});

// GET /orders - Get orders (User: their own, Admin: all or filtered)
app.get("/orders", authenticateToken, async (req, res) => {
  const { userId: currentUserId, isAdmin } = req.user;
  const { userId, status, pickupSlotId, dateFrom, dateTo } = req.query; // Admin filters

  try {
    const whereClause = {};

    if (isAdmin) {
      if (userId) whereClause.userId = parseInt(userId);
      if (status) whereClause.status = status;
      if (pickupSlotId) whereClause.pickupSlotId = parseInt(pickupSlotId);
      if (dateFrom)
        whereClause.createdAt = {
          ...whereClause.createdAt,
          gte: new Date(dateFrom),
        };
      if (dateTo)
        whereClause.createdAt = {
          ...whereClause.createdAt,
          lte: new Date(dateTo),
        };
    } else {
      // Non-admins can only see their own orders
      whereClause.userId = currentUserId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        pickupSlot: true,
        items: {
          include: { product: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    res
      .status(500)
      .json({ error: "Error fetching orders", details: error.message });
  }
});

// GET /orders/:id - Get a single order by ID (User: their own, Admin: any)
app.get("/orders/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userId, isAdmin } = req.user;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        pickupSlot: true,
        items: { include: { product: true } }, // Include full product details for order items
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // If not admin, check if the order belongs to the user
    if (!isAdmin && order.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You can only view your own orders" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order by ID error:", error);
    res
      .status(500)
      .json({ error: "Error fetching order", details: error.message });
  }
});

// PUT /orders/:id - Update an order (Admin: status; User: cancel PENDING)
app.put("/orders/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, specialInstructions } = req.body; // Admins can change status, users might change special instructions or cancel
  const { userId, isAdmin } = req.user;

  if (!status && specialInstructions === undefined) {
    return res.status(400).json({
      error: "No update data provided (status or specialInstructions).",
    });
  }

  try {
    const orderToUpdate = await prisma.order.findUnique({
      where: { id: parseInt(id) },
    });

    if (!orderToUpdate) {
      return res.status(404).json({ error: "Order not found" });
    }

    const dataToUpdate = {};

    if (isAdmin) {
      if (status) {
        // Validate status enum
        if (
          ![
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "READY_FOR_PICKUP",
            "COMPLETED",
            "CANCELLED",
          ].includes(status)
        ) {
          return res.status(400).json({ error: "Invalid order status" });
        }
        dataToUpdate.status = status;
      }
      if (specialInstructions !== undefined) {
        dataToUpdate.specialInstructions = specialInstructions;
      }
    } else {
      // Non-admin users
      if (orderToUpdate.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Forbidden: You cannot update this order." });
      }
      if (
        specialInstructions !== undefined &&
        orderToUpdate.status === "PENDING"
      ) {
        dataToUpdate.specialInstructions = specialInstructions;
      }
      // User wants to cancel
      if (status === "CANCELLED") {
        if (orderToUpdate.status !== "PENDING") {
          return res.status(400).json({
            error: "Order can only be cancelled if it is currently PENDING.",
          });
        }
        dataToUpdate.status = "CANCELLED";
        // TODO: Add logic to revert stock if an order is cancelled
        // This requires a transaction and careful handling of product stock.
      } else if (status && status !== orderToUpdate.status) {
        // Non-admins cannot change status to anything other than CANCELLED (from PENDING)
        return res
          .status(403)
          .json({ error: "Forbidden: You can only cancel a PENDING order." });
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields to update or action not permitted." });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        items: true,
        user: { select: { name: true, email: true } },
        pickupSlot: true,
      },
    });

    // If order was cancelled by user, revert stock
    if (dataToUpdate.status === "CANCELLED" && !isAdmin) {
      await prisma.$transaction(async (tx) => {
        for (const item of updatedOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      });
    }

    res.json(updatedOrder);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }
    console.error("Update order error:", error);
    res
      .status(500)
      .json({ error: "Error updating order", details: error.message });
  }
});

// DELETE /orders/:id - Delete an order (Admin Only - soft delete or status change preferred)
// For now, actual deletion for admins. Consider changing to status = ARCHIVED or similar.
app.delete("/orders/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // If deleting, consider reverting stock if the order wasn't CANCELLED or COMPLETED.
    // This example will revert stock if not COMPLETED or CANCELLED.
    // More complex logic might be needed based on specific business rules.
    if (order.status !== "COMPLETED" && order.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        // It's important to delete OrderItems first due to foreign key constraints if not using cascade delete
        // or to delete them within the same transaction before deleting the order.
        // Prisma schema onDelete: Cascade for OrderItems takes care of this.
        await tx.order.delete({ where: { id: parseInt(id) } });
      });
    } else {
      await prisma.order.delete({ where: { id: parseInt(id) } });
    }

    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Order not found" });
    }
    // P2003 can happen if OrderItems are not deleted and schema doesn't cascade
    console.error("Delete order error:", error);
    res
      .status(500)
      .json({ error: "Error deleting order", details: error.message });
  }
});

// --- Cart Routes ---

// GET /cart - Get user's cart (authenticated users only)
app.get("/cart", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                status: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return res.json({ items: [] });
    }

    // Filter out items where product is inactive/deleted and format for frontend
    const validItems = cart.items
      .filter((item) => item.product.status === "ACTIVE")
      .map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
      }));

    res.json({ items: validItems });
  } catch (error) {
    console.error("Get cart error:", error);
    res
      .status(500)
      .json({ error: "Error fetching cart", details: error.message });
  }
});

// POST /cart/add - Add item to cart (authenticated users only)
app.post("/cart/add", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId, quantity = 1 } = req.body;

  if (!productId || quantity < 1) {
    return res
      .status(400)
      .json({ error: "Valid productId and quantity are required" });
  }

  try {
    // Verify product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        isDeleted: false,
        status: "ACTIVE",
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
        },
      });
    }

    res.json({ message: "Item added to cart successfully" });
  } catch (error) {
    console.error("Add to cart error:", error);
    res
      .status(500)
      .json({ error: "Error adding item to cart", details: error.message });
  }
});

// PUT /cart/update - Update cart item quantity (authenticated users only)
app.put("/cart/update", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId, quantity } = req.body;

  if (!productId || quantity < 1) {
    return res
      .status(400)
      .json({ error: "Valid productId and quantity are required" });
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    res.json({ message: "Cart item updated successfully" });
  } catch (error) {
    console.error("Update cart error:", error);
    res
      .status(500)
      .json({ error: "Error updating cart item", details: error.message });
  }
});

// DELETE /cart/remove - Remove item from cart (authenticated users only)
app.delete("/cart/remove", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: "productId is required" });
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    await prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    res.json({ message: "Item removed from cart successfully" });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res
      .status(500)
      .json({ error: "Error removing item from cart", details: error.message });
  }
});

// DELETE /cart/clear - Clear entire cart (authenticated users only)
app.delete("/cart/clear", authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return res.json({ message: "Cart already empty" });
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res
      .status(500)
      .json({ error: "Error clearing cart", details: error.message });
  }
});

// POST /cart/sync - Merge guest (localStorage) cart into user's cart on login
// Behavior: For each product in guest cart, add its quantity to any existing quantity in user cart.
// If product not present in user cart, create it. Skips inactive/deleted products silently.
app.post("/cart/sync", authenticateToken, async (req, res) => {
  const { userId } = req.user;
  const { items } = req.body; // Expect [{ id: productId, quantity }]

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Items must be an array" });
  }

  // Filter and normalize incoming items: positive integer quantities only
  const normalized = items
    .filter(
      (it) => it && typeof it.id === "number" && typeof it.quantity === "number"
    )
    .map((it) => ({
      id: it.id,
      quantity: Math.max(1, Math.floor(it.quantity)),
    }));

  if (normalized.length === 0) {
    return res.json({ message: "Nothing to sync", items: [] });
  }

  try {
    // Ensure cart exists
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    // Build quick lookup of existing cart items
    const existingMap = new Map(cart.items.map((ci) => [ci.productId, ci]));

    for (const localItem of normalized) {
      const productId = localItem.id;
      const addQuantity = localItem.quantity;

      // Validate product still active
      const product = await prisma.product.findFirst({
        where: { id: productId, isDeleted: false, status: "ACTIVE" },
        select: { id: true },
      });
      if (!product) continue; // skip invalid

      const existing = existingMap.get(productId);
      if (existing) {
        const newQuantity = existing.quantity + addQuantity; // additive merge
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
        });
      } else {
        const created = await prisma.cartItem.create({
          data: { cartId: cart.id, productId, quantity: addQuantity },
        });
        existingMap.set(productId, created);
      }
    }

    // Return updated cart items with product data
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const responseItems = (updatedCart?.items || [])
      .filter((i) => i.product.status === "ACTIVE")
      .map((i) => ({
        id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        imageUrl: i.product.imageUrl,
        quantity: i.quantity,
      }));

    res.json({ message: "Cart merged successfully", items: responseItems });
  } catch (error) {
    console.error("Sync cart error:", error);
    res
      .status(500)
      .json({ error: "Error merging cart", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Graceful shutdown for Prisma client
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
