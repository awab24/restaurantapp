const express = require("express");
const {
  initdb,
  register,
  login,
  requireAuth,
  requireRole,
  listMenu,
  createCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createReservation,
  listReservations,
  updateReservationStatus,
  createOrder,
  listOrders,
  updateOrderStatus,
  recordPayment,
  reportSales,
  reportTopItems,
} = require("../controllers/controllers");

const router = express.Router();

router.post("/admin/initdb", initdb);

router.post("/auth/register", register);
router.post("/auth/login", login);

router.get("/menu", listMenu);
router.post("/menu/categories", requireAuth, requireRole(["admin", "staff"]), createCategory);
router.post("/menu/items", requireAuth, requireRole(["admin", "staff"]), createMenuItem);
router.put("/menu/items/:id", requireAuth, requireRole(["admin", "staff"]), updateMenuItem);
router.delete("/menu/items/:id", requireAuth, requireRole(["admin", "staff"]), deleteMenuItem);

router.post("/reservations", requireAuth, createReservation);
router.get("/reservations", requireAuth, requireRole(["admin", "staff"]), listReservations);
router.patch("/reservations/:id/status", requireAuth, requireRole(["admin", "staff"]), updateReservationStatus);

router.post("/orders", requireAuth, createOrder);
router.get("/orders", requireAuth, listOrders);
router.patch("/orders/:id/status", requireAuth, requireRole(["admin", "staff"]), updateOrderStatus);
router.post("/payments", requireAuth, requireRole(["admin", "staff"]), recordPayment);

router.get("/reports/sales", requireAuth, requireRole(["admin", "staff"]), reportSales);
router.get("/reports/top-items", requireAuth, requireRole(["admin", "staff"]), reportTopItems);

module.exports = router;
