const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");


app.use(cors());
app.use(express.json());
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.yq19m.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

console.log("process env: ", JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const verifyToken = async (req, res, next) => {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}


async function run() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('doctor-portal');
        const collection = db.collection('appointments');
        const usersCollection = db.collection('users');
        app.get("/appointments", async (req, res) => {
            console.log(req.query);
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date }
            console.log("query; ", query);
            const appointments = await collection.find(query).toArray();
            console.log("appointments: ", appointments);
            // res.send(appointments);
            res.send(appointments);
        })

        app.get("/users/admin", async (req, res) => {
            console.log(req.query);
            const email = req.query.email;
            const query = { email: email }
            console.log("query for admin:  ", query);
            const result = await usersCollection.findOne(query);
            console.log("/users/admin: ", result);
            let admin = {}
            if (result?.role === "admin") {
                admin = { admin: true }
            }
            else {
                admin = { admin: false }
            }
            res.send(admin);
        })
        // appointment post request
        app.post("/appointments", async (req, res) => {
            const appointment = req.body;
            console.log("/appointment e ami peyechi: ", appointment);
            const result = await collection.insertOne(appointment);
            res.send(result);
        })

        // user post request

        app.post("/users", async (req, res) => {
            const user = req.body;
            console.log("/user e ami peyechi: ", user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
        app.put("/users", async (req, res) => {
            const user = req.body;
            const options = { upsert: true };
            const query = { email: user.email };
            const updateUser = {
                $set: user
            };
            const result = await usersCollection.updateOne(query, updateUser, options);
            res.send(result);
        })
        app.put("/users/admin", verifyToken, async (req, res) => {
            const user = req.body;
            // console.log("decoded email paisi: ", req.decodedEmail);
            const requestedEmail = req.decodedEmail;

            if (requestedEmail) {
                const roleCheck = await usersCollection.findOne({ email: requestedEmail });
                if (roleCheck.role === "admin") {
                    const query = { email: user.email };
                    const updateUser = {
                        $set: { role: "admin" }
                    };
                    const result = await usersCollection.updateOne(query, updateUser);
                    res.send(result);

                }

            }
            else {

                res.status(401).send({ error: "You are not authorized to perform this action" });

            }




            // res.send({ error: "You are not authorized to perform this action" });

        })
    } finally {
        // console.error(err);
    }
}

run().catch(console.error);

app.get("/", (req, res) => {
    res.send("Hello Doctor Portal");
})
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});