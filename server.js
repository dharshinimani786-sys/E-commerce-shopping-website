const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, "data", "db.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: "change-this-demo-secret-before-deployment",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 4 }
}));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Please log in first." });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Create the demo admin account on first run.
(function seedAdmin() {
  const db = readDB();
  if (!db.users.some(u => u.email === "admin@shopnest.com")) {
    db.users.push({
      id: 1, name: "ShopNest Admin", email: "admin@shopnest.com",
      password: bcrypt.hashSync("Admin@123", 10), role: "admin"
    });
    db.nextUserId = Math.max(db.nextUserId || 1, 2);
    writeDB(db);
  }
})();

app.get("/api/products", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ message: "Enter name, valid email and password (at least 6 characters)." });
  }
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: "This email is already registered." });
  }
  const user = {
    id: db.nextUserId || 1, name: name.trim(), email: email.toLowerCase().trim(),
    password: await bcrypt.hash(password, 10), role: "customer"
  };
  db.users.push(user);
  db.nextUserId = user.id + 1;
  writeDB(db);
  req.session.user = publicUser(user);
  res.status(201).json({ message: "Account created successfully.", user: req.session.user });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === String(email || "").toLowerCase().trim());
  if (!user || !await bcrypt.compare(password || "", user.password)) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }
  req.session.user = publicUser(user);
  res.json({ message: "Login successful.", user: req.session.user });
});

app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out." }));
});

app.post("/api/orders", requireLogin, (req, res) => {
  const { items, address, phone } = req.body;
  if (!Array.isArray(items) || items.length === 0 || !address || !phone) {
    return res.status(400).json({ message: "Add products, delivery address and phone number." });
  }
  const db = readDB();
  const orderItems = [];
  let total = 0;
  for (const item of items) {
    const product = db.products.find(p => p.id === Number(item.productId));
    const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
    if (!product) return res.status(400).json({ message: "A selected product is no longer available." });
    orderItems.push({ productId: product.id, name: product.name, price: product.price, quantity });
    total += product.price * quantity;
  }
  const order = {
    id: db.nextOrderId || 1, userId: req.session.user.id,
    customer: req.session.user.name, email: req.session.user.email,
    items: orderItems, total, address: address.trim(), phone: phone.trim(),
    status: "Placed", createdAt: new Date().toISOString()
  };
  db.orders.push(order);
  db.nextOrderId = order.id + 1;
  writeDB(db);
  res.status(201).json({ message: "Your order has been placed!", order });
});

app.get("/api/orders", requireLogin, (req, res) => {
  const db = readDB();
  const orders = req.session.user.role === "admin"
    ? db.orders
    : db.orders.filter(o => o.userId === req.session.user.id);
  res.json(orders.slice().reverse());
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, category, price, image, description } = req.body;
  if (!name || !category || !(Number(price) > 0) || !image) {
    return res.status(400).json({ message: "Name, category, positive price and image URL are required." });
  }
  const db = readDB();
  const product = {
    id: db.nextProductId || 1, name: name.trim(), category: category.trim(),
    price: Number(price), image: image.trim(), description: description || ""
  };
  db.products.push(product);
  db.nextProductId = product.id + 1;
  writeDB(db);
  res.status(201).json(product);
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found." });
  const { name, category, price, image, description } = req.body;
  if (!name || !category || !(Number(price) > 0) || !image) {
    return res.status(400).json({ message: "Please complete all required product fields." });
  }
  Object.assign(product, { name: name.trim(), category: category.trim(), price: Number(price), image: image.trim(), description: description || "" });
  writeDB(db);
  res.json(product);
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const before = db.products.length;
  db.products = db.products.filter(p => p.id !== Number(req.params.id));
  if (db.products.length === before) return res.status(404).json({ message: "Product not found." });
  writeDB(db);
  res.json({ message: "Product deleted." });
});

app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const order = db.orders.find(o => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Order not found." });
  const allowed = ["Placed", "Processing", "Shipped", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
  order.status = req.body.status;
  writeDB(db);
  res.json(order);
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`ShopNest is running at http://localhost:${PORT}`));
