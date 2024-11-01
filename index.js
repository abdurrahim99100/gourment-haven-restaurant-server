const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_PAYMENT_SECRET);
console.log("This is stripe secret", stripe);
const port = process.env.PORT || 5000;

// middle were;
app.use(cors());
app.use(express.json());

const db_user = process.env.DB_USER;
const db_password = process.env.DB_PASSWORD;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${db_user}:${db_password}@test-folder.hsudmnm.mongodb.net/?retryWrites=true&w=majority&appName=gourment-haven-restaurant`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // start code => ------------------------------------------------>

    // Get the database and collection on which to run the operation
    // users
    const databaseUsers = client
      .db("gourment-haven-restaurant")
      .collection("users");
    const databaseMenus = client
      .db("gourment-haven-restaurant")
      .collection("menu");
    // review
    const databaseReviews = client
      .db("gourment-haven-restaurant")
      .collection("review");
    // carts
    const databaseCarts = client
      .db("gourment-haven-restaurant")
      .collection("carts");
    // payment
    const databasePayments = client
      .db("gourment-haven-restaurant")
      .collection("payments");

    // jwt token;
    app.post("/jwt", async (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        res.send({ token });
      } catch (error) {
        console.log(error);
      }
    });

    // verify token;
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];

      // verify a token symmetric
      jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidder access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verify token;
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await databaseUsers.findOne(query);
      const isAdmin = user.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // users related api; =? ------------------------------------------->
    // get admin
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized access" });
        }
        const query = { email: email };
        const user = await databaseUsers.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });

        // catch
      } catch (error) {
        console.log(error);
      }
    });

    // post all users;
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await databaseUsers.findOne(query);
        if (existingUser) {
          return res.send({ message: "user is existing" });
        }
        const result = await databaseUsers.insertOne(user);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // get all users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await databaseUsers.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // update users
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const updateUserId = req.params.id;
          const filter = { _id: new ObjectId(updateUserId) };

          const updateDoc = {
            $set: {
              role: "admin",
            },
          };

          const result = await databaseUsers.updateOne(filter, updateDoc);
          res.send(result);
        } catch (error) {
          console.log(error);
        }
      }
    );

    // delete users
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const deleteUserId = req.params.id;
        const query = { _id: new ObjectId(deleteUserId) };
        const result = await databaseUsers.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // menu related api=? ----------------------------------------------------------------------

    // post menu;
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const item = req.body;
        const result = await databaseMenus.insertOne(item);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // get all menu;
    app.get("/menu", async (req, res) => {
      try {
        const result = await databaseMenus.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // get single menu;
    app.get("/menu/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: id }; // ObjectId ব্যবহার করে কনভার্ট করা হয়েছে
        const result = await databaseMenus.findOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" }); // error response পাঠানো
      }
    });

    // update a menu;
    app.patch("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: id };
        const updateDoc = {
          $set: {
            name: item.name,
            recipe: item.recipe,
            category: item.category,
            image: item.image,
            price: item.price,
          },
        };
        const result = await databaseMenus.updateOne(filter, updateDoc);
        console.log("update data=>", result);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // delete menu;
    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await databaseMenus.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // review related api=? ----------------------------------------------------
    // get all review;
    app.get("/review", async (req, res) => {
      try {
        const result = await databaseReviews.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // card related apis; =>-----------------------------------------------------
    // post a cart
    app.post("/carts", async (req, res) => {
      try {
        const item = req.body;
        const result = await databaseCarts.insertOne(item);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.get("/carts", verifyToken, async (req, res) => {
      try {
        const email = req.query?.email;
        if (!email) {
          res.send([]);
        }
        const query = { email: email };
        const result = await databaseCarts.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.delete("/carts/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await databaseCarts.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // payment related api;.................................................>
    app.post("/create-payment-intent", verifyToken, async (req, res) => {
      try {
        const { price } = req.body;
        const totalAmount = parseInt(price * 100); // price is ok;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalAmount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.log("client secret error message=>", error);
      }
    });

    // save payment information
    app.post("/payment", verifyToken, async (req, res) => {
      try {
        const payment = req.body;
        const paymentResult = await databasePayments.insertOne(payment);

        const query = {
          _id: {
            $in: payment.cartIds.map((id) => new ObjectId(id)),
          },
        };

        // delete cart
        const delateResult = await databaseCarts.deleteMany(query);

        res.send({
          paymentResult,
          delateResult,
        });
      } catch (error) {
        console.log(error);
      }
    });

    // get user conform payment;
    app.get("/payments/:email", verifyToken, async (req, res) => {
      try {
        const query = { email: req.params?.email };
        if (req.params?.email !== req.decoded?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }

        const result = await databasePayments.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // stats on analytics; ---------------------------------------------------->
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const user = await databaseUsers.estimatedDocumentCount();
        const menuItems = await databaseMenus.estimatedDocumentCount();
        const orders = await databasePayments.estimatedDocumentCount();
        const result = await databasePayments
          .aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: "$price",
                },
              },
            },
          ])
          .toArray();

        const revenue = result.length > 0 ? result[0].totalRevenue : 0;

        res.send({
          user,
          menuItems,
          orders,
          revenue,
        });
      } catch (error) {
        console.log(error);
      }
    });

    // using aggregate pipeline;----------------------------------------->
    app.get("/order-stats", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await databasePayments
          .aggregate([
            {
              $unwind: "$menuItemIds",
            },
            {
              $lookup: {
                from: "menu",
                localField: "menuItemIds",
                foreignField: "_id",
                as: "menuItems",
              },
            },
            {
              $unwind: "$menuItems",
            },
            {
              $group: {
                _id: "$menuItems.category",
                quantity: { $sum: 1 },
                revenue: { $sum: "$menuItems.price" },
              },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // end code =>-------------------------------------<
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is Running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});


// last code update by 11/1/2024, 11:41 AM