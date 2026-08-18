import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { jest } from "@jest/globals";

import app from "../../app.js";

import Category from "../../models/Category.js";
import Product from "../../models/Product.js";
import Setting from "../../models/Setting.js";
import User from "../../models/User.js";
import Order from "../../models/Order.js";
import Coupon from "../../models/Coupon.js";
import Refund from "../../models/Refund.js";

import { generateAccessToken } from "../../utils/tokens.js";

jest.setTimeout(120000);

let mongo;

let admin;
let customer;

let adminToken;
let customerToken;

const PASSWORD = "StrongPass1!";

/* =========================================================
   HELPER: CREATE USER
========================================================= */

async function createUser({
  role = "customer",
  email,
  username,
  name,
}) {
  return User.create({
    username,
    name,
    email,
    password: PASSWORD,
    phone: "01712345678",

    role,

    isEmailVerified: true,

    securityQuestion:
      "What was your childhood nickname?",

    securityAnswerHash:
      await bcrypt.hash("fluffy", 10),
  });
}

/* =========================================================
   HELPER: CREATE PRODUCT
========================================================= */

async function createProduct({
  price = 1000,
  stock = 10,
  name = "Test Ring",
} = {}) {
  const category = await Category.create({
    name: {
      en: "Test Category",
      bn: "টেস্ট",
    },

    slug:
      `test-category-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
  });

  return Product.create({
    name: {
      en: name,
      bn: name,
    },

    description: {
      en: "Integration test product",
      bn: "Integration test product",
    },

    category: category._id,

    basePrice: price,

    totalStock: stock,

    isActive: true,
  });
}

/* =========================================================
   HELPER: AUTH HEADER
========================================================= */

function auth(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/* =========================================================
   HELPER: LOGIN
========================================================= */

async function login(identifier, password = PASSWORD) {
  return request(app)
    .post("/api/auth/login")
    .send({
      email: identifier,
      password,
    });
}

/* =========================================================
   DATABASE SETUP
========================================================= */

beforeAll(async () => {
  process.env.NODE_ENV = "test";

  process.env.JWT_SECRET =
    process.env.JWT_SECRET ||
    "integration-test-secret";

  process.env.FRONTEND_URL =
    "http://localhost:5173";

  mongo = await MongoMemoryServer.create();

  await mongoose.connect(mongo.getUri());

  /* -------------------------------------------------------
     CREATE ADMIN
  ------------------------------------------------------- */

  admin = await createUser({
    role: "admin",

    email:
      "admin.integration@example.com",

    username:
      "integration_admin",

    name:
      "Integration Admin",
  });

  /* -------------------------------------------------------
     CREATE CUSTOMER
  ------------------------------------------------------- */

  customer = await createUser({
    role: "customer",

    email:
      "customer.integration@example.com",

    username:
      "integration_customer",

    name:
      "Integration Customer",
  });

  /* -------------------------------------------------------
     CREATE TOKENS
  ------------------------------------------------------- */

  adminToken =
    generateAccessToken(admin._id);

  customerToken =
    generateAccessToken(customer._id);

  /* -------------------------------------------------------
     SETTINGS
  ------------------------------------------------------- */

  await Setting.create({
    vatRate: 0.10,

    defaultDeliveryCharge: 150,

    districtDeliveryCharges: [
      {
        district: "Dhaka",
        charge: 100,
      },
    ],

    lowStockThreshold: 2,
  });
});

/* =========================================================
   DATABASE CLEANUP
========================================================= */

afterAll(async () => {
  await mongoose.connection.dropDatabase();

  await mongoose.disconnect();

  await mongo.stop();
});

/* =========================================================
   GUEST CHECKOUT
========================================================= */

describe(
  "Integration Tests: Guest Checkout End-to-End (Backend)",
  () => {

    test(
      "creates a guest order, calculates totals, and decreases stock",
      async () => {

        const product =
          await createProduct({
            price: 1000,
            stock: 5,
          });

        const response =
          await request(app)
            .post("/api/orders/guest-checkout")
            .send({

              guestInfo: {
                name:
                  "Guest Customer",

                email:
                  "guest@example.com",

                phone:
                  "01812345678",
              },

              address: {
                addressLine:
                  "123 Main Street",

                district:
                  "Dhaka",

                city:
                  "Dhaka",

                phone:
                  "01812345678",
              },

              paymentMethod:
                "cod",

              items: [
                {
                  productId:
                    product._id.toString(),

                  quantity: 2,
                },
              ],
            });

        expect(response.status)
          .toBe(201);

        expect(response.body.isGuest)
          .toBe(true);

        expect(
          response.body.guestInfo.email
        ).toBe(
          "guest@example.com"
        );

        expect(response.body.items)
          .toHaveLength(1);

        expect(
          response.body.items[0].quantity
        ).toBe(2);

        expect(response.body.subtotal)
          .toBe(2000);

        expect(response.body.vat)
          .toBe(200);

        expect(
          response.body.deliveryCharge
        ).toBe(100);

        expect(
          response.body.totalAmount
        ).toBe(2300);

        expect(
          response.body.payment.status
        ).toBe("pending");

        expect(
          response.body.guestOrderId
        ).toMatch(/^ORD-GUEST-678-/);

        /* -------------------------------------------------
           VERIFY DATABASE
        ------------------------------------------------- */

        const savedOrder =
          await Order.findById(
            response.body._id
          );

        const savedProduct =
          await Product.findById(
            product._id
          );

        expect(savedOrder)
          .not
          .toBeNull();

        expect(savedOrder.isGuest)
          .toBe(true);

        expect(savedOrder.user)
          .toBeNull();

        expect(savedProduct.totalStock)
          .toBe(3);
      }
    );

    test(
      "rejects an empty guest cart",
      async () => {

        const before =
          await Order.countDocuments({
            isGuest: true,
          });

        const response =
          await request(app)
            .post(
              "/api/orders/guest-checkout"
            )
            .send({

              guestInfo: {
                name:
                  "Guest Customer",

                email:
                  "guest2@example.com",

                phone:
                  "01812345678",
              },

              address: {
                addressLine:
                  "123 Main Street",

                district:
                  "Dhaka",

                city:
                  "Dhaka",

                phone:
                  "01812345678",
              },

              items: [],
            });

        expect(response.status)
          .toBe(400);

        expect(response.body.message)
          .toBe("Cart is empty.");

        const after =
          await Order.countDocuments({
            isGuest: true,
          });

        expect(after)
          .toBe(before);
      }
    );
  }
);

/* =========================================================
   BKASH PAYMENT
========================================================= */

describe(
  "Integration Tests: bKash Proof Submission & Admin Verification (Backend)",
  () => {

    let order;

    beforeAll(async () => {

      const product =
        await createProduct({
          price: 1500,
          stock: 5,
          name:
            "bKash Test Necklace",
        });

      const checkout =
        await request(app)
          .post(
            "/api/orders/guest-checkout"
          )
          .send({

            guestInfo: {
              name:
                "bKash Guest",

              email:
                "bkash.guest@example.com",

              phone:
                "01912345678",
            },

            address: {
              addressLine:
                "456 Payment Road",

              district:
                "Dhaka",

              city:
                "Dhaka",

              phone:
                "01912345678",
            },

            paymentMethod:
              "bkash",

            items: [
              {
                productId:
                  product._id.toString(),

                quantity: 1,
              },
            ],
          });

      expect(checkout.status)
        .toBe(201);

      order = checkout.body;
    });

    test(
      "allows guest to submit bKash proof",
      async () => {

        const response =
          await request(app)
            .post(
              `/api/payments/bkash/${order._id}`
            )
            .send({

              senderNumber:
                "01912345678",

              trxId:
                "9G7A1B2C3D",

              screenshot:
                "/uploads/test-proof.png",

              guestEmail:
                "bkash.guest@example.com",
            });

        expect(response.status)
          .toBe(201);

        expect(
          response.body.message
        ).toMatch(/submitted/i);

        expect(
          response.body.payment.bkash.trxId
        ).toBe(
          "9G7A1B2C3D"
        );

        expect(
          response.body.payment.bkash
            .verificationStatus
        ).toBe(
          "pending_verification"
        );

        const saved =
          await Order.findById(
            order._id
          );

        expect(
          saved.payment.status
        ).toBe("pending");

        expect(
          saved.payment.bkash
            .verificationStatus
        ).toBe(
          "pending_verification"
        );
      }
    );

    test(
      "rejects wrong guest email",
      async () => {

        const response =
          await request(app)
            .post(
              `/api/payments/bkash/${order._id}`
            )
            .send({

              senderNumber:
                "01912345678",

              trxId:
                "ABC1234567",

              guestEmail:
                "wrong@example.com",
            });

        expect(response.status)
          .toBe(403);

        expect(response.body.message)
          .toBe(
            "Order email does not match."
          );
      }
    );

    test(
      "admin can verify bKash payment",
      async () => {

        const response =
          await request(app)
            .patch(
              `/api/payments/bkash/${order._id}/verify`
            )
            .set(auth(adminToken))
            .send({
              approve: true,
            });

        expect(response.status)
          .toBe(200);

        expect(response.body.message)
          .toBe(
            "Payment verified."
          );

        expect(
          response.body.payment.status
        ).toBe("paid");

        expect(
          response.body.payment.bkash
            .verificationStatus
        ).toBe("verified");

        expect(
          response.body.payment
            .transactionId
        ).toBe(
          "9G7A1B2C3D"
        );

        const saved =
          await Order.findById(
            order._id
          );

        expect(
          saved.payment.status
        ).toBe("paid");

        expect(
          saved.payment.transactionId
        ).toBe(
          "9G7A1B2C3D"
        );

        expect(
          saved.payment.bkash
            .verifiedBy
            .toString()
        ).toBe(
          admin._id.toString()
        );
      }
    );
  }
);

/* =========================================================
   REFUND + COUPON
========================================================= */

describe(
  "Integration Tests: Refund Lifecycle & Coupon Interaction (Backend)",
  () => {

    let product;
    let coupon;
    let order;

    beforeAll(async () => {

      product =
        await createProduct({
          price: 1000,
          stock: 5,
          name:
            "Refund Coupon Bracelet",
        });

      coupon =
        await Coupon.create({

          code:
            "REFUND10",

          title:
            "Refund Integration Coupon",

          description:
            "10 percent off",

          discountType:
            "percentage",

          discountValue:
            10,

          minimumPurchase:
            0,

          usageLimit:
            10,

          perUserLimit:
            1,

          startDate:
            new Date(
              Date.now() - 60000
            ),

          endDate:
            new Date(
              Date.now() +
              86400000
            ),

          isActive:
            true,
        });

      const checkout =
        await request(app)
          .post("/api/orders/checkout")
          .set(auth(customerToken))
          .send({

            address: {
              addressLine:
                "10 Refund Road",

              district:
                "Dhaka",

              city:
                "Dhaka",

              phone:
                "01712345678",
            },

            paymentMethod:
              "cod",

            couponCode:
              coupon.code,

            items: [
              {
                productId:
                  product._id.toString(),

                quantity: 1,
              },
            ],
          });

      expect(checkout.status)
        .toBe(201);

      order =
        checkout.body;
    });

    test(
      "applies coupon during checkout",
      async () => {

        expect(
          order.couponCode
        ).toBe("REFUND10");

        expect(
          order.discountAmount
        ).toBe(100);

        expect(
          order.originalTotal
        ).toBe(1250);

        expect(
          order.totalAmount
        ).toBe(1150);

        const savedCoupon =
          await Coupon.findById(
            coupon._id
          );

        expect(
          savedCoupon.usedCount
        ).toBe(1);

        expect(
          savedCoupon.usedBy
        ).toHaveLength(1);

        expect(
          savedCoupon.usedBy[0].user
            .toString()
        ).toBe(
          customer._id.toString()
        );
      }
    );

    test(
      "changes order to delivered",
      async () => {

        const response =
          await request(app)
            .patch(
              `/api/orders/${order._id}/status`
            )
            .set(auth(adminToken))
            .send({
              status:
                "delivered",
            });

        expect(response.status)
          .toBe(200);

        expect(response.body.status)
          .toBe("delivered");

        const saved =
          await Order.findById(
            order._id
          );

        expect(saved.status)
          .toBe("delivered");
      }
    );

    test(
      "customer creates refund request",
      async () => {

        const response =
          await request(app)
            .post("/api/refunds")
            .set(auth(customerToken))
            .send({

              orderId:
                order._id.toString(),

              productId:
                product._id.toString(),

              quantity: 1,

              requestType:
                "refund",

              reason:
                "damaged",

              details:
                "Product arrived damaged.",
            });

        expect(response.status)
          .toBe(201);

        expect(response.body.status)
          .toBe("pending");

        expect(
          response.body.refundAmount
        ).toBe(1000);

        expect(
          response.body.item.quantity
        ).toBe(1);
      }
    );

    test(
      "admin approves and processes refund",
      async () => {

        const refund =
          await Refund.findOne({
            order: order._id,
          });

        expect(refund)
          .not
          .toBeNull();

        const beforeStock =
          (
            await Product.findById(
              product._id
            )
          ).totalStock;

        /* ---------------------------------
           APPROVE
        --------------------------------- */

        const approve =
          await request(app)
            .patch(
              `/api/refunds/${refund._id}/status`
            )
            .set(auth(adminToken))
            .send({

              status:
                "approved",

              adminNote:
                "Approved for refund.",
            });

        expect(approve.status)
          .toBe(200);

        expect(approve.body.status)
          .toBe("approved");

        /* ---------------------------------
           PROCESS
        --------------------------------- */

        const process =
          await request(app)
            .patch(
              `/api/refunds/${refund._id}/status`
            )
            .set(auth(adminToken))
            .send({
              status:
                "processed",
            });

        expect(process.status)
          .toBe(200);

        expect(process.body.status)
          .toBe("processed");

        expect(
          process.body.stockRestored
        ).toBe(true);

        expect(
          process.body.processedAt
        ).toBeTruthy();

        const afterStock =
          (
            await Product.findById(
              product._id
            )
          ).totalStock;

        expect(afterStock)
          .toBe(beforeStock + 1);
      }
    );

    test(
      "does not allow one-use coupon to be reused after refund",
      async () => {

        const response =
          await request(app)
            .post("/api/orders/checkout")
            .set(auth(customerToken))
            .send({

              address: {
                addressLine:
                  "10 Refund Road",

                district:
                  "Dhaka",

                city:
                  "Dhaka",

                phone:
                  "01712345678",
              },

              paymentMethod:
                "cod",

              couponCode:
                "REFUND10",

              items: [
                {
                  productId:
                    product._id.toString(),

                  quantity: 1,
                },
              ],
            });

        expect(response.status)
          .toBe(400);

        expect(
          response.body.message
        ).toMatch(
          /already used.*maximum number of times/i
        );

        const savedCoupon =
          await Coupon.findById(
            coupon._id
          );

        expect(
          savedCoupon.usedCount
        ).toBe(1);
      }
    );
  }
);

/* =========================================================
   ADMIN SECURITY + LOGIN LOCKOUT
========================================================= */

describe(
  "Integration Tests: Admin Route Protection & Login Lockout (Backend)",
  () => {

    test(
      "blocks unauthenticated admin request",
      async () => {

        const response =
          await request(app)
            .get("/api/admin/stats");

        expect(response.status)
          .toBe(401);

        expect(
          response.body.message
        ).toMatch(
          /not authorized/i
        );
      }
    );

    test(
      "blocks customer from admin route",
      async () => {

        const response =
          await request(app)
            .get("/api/admin/stats")
            .set(
              auth(customerToken)
            );

        expect(response.status)
          .toBe(403);

        expect(
          response.body.message
        ).toBe(
          "Admin access required"
        );
      }
    );

    test(
      "allows admin to access admin route",
      async () => {

        const response =
          await request(app)
            .get("/api/admin/stats")
            .set(
              auth(adminToken)
            );

        expect(response.status)
          .toBe(200);
      }
    );

    test(
      "locks account after five failed login attempts",
      async () => {

        const lockoutUser =
          await createUser({

            role:
              "customer",

            email:
              `lockout-${Date.now()}@example.com`,

            username:
              `lockout_${Date.now()}`,

            name:
              "Lockout User",
          });

        const attempts = [];

        for (
          let i = 0;
          i < 5;
          i += 1
        ) {

          attempts.push(
            await login(
              lockoutUser.email,
              "WrongPassword1!"
            )
          );
        }

        expect(
          attempts.map(
            (response) =>
              response.status
          )
        ).toEqual([
          401,
          401,
          401,
          401,
          401,
        ]);

        const locked =
          await login(
            lockoutUser.email,
            PASSWORD
          );

        expect(locked.status)
          .toBe(423);

        expect(
          locked.body.message
        ).toMatch(
          /temporarily locked/i
        );

        const savedUser =
          await User.findById(
            lockoutUser._id
          ).select(
            "+loginAttempts +lockUntil"
          );

        expect(
          savedUser.loginAttempts
        ).toBeGreaterThanOrEqual(5);

        expect(
          savedUser.lockUntil
        ).toBeTruthy();

        expect(
          savedUser.lockUntil.getTime()
        ).toBeGreaterThan(
          Date.now()
        );
      }
    );
  }
);