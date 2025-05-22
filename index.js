require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000
const cors = require('cors') // Import the cors package for allowing cross-origin requests

app.use(cors()) // Enable CORS for all routes
app.use(express.json()) // Parse JSON bodies

app.get('/', (req, res) => {
    res.send('Wow !!! Server is Successfully running')
})

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@xihads-xone.ftg87hg.mongodb.net/?retryWrites=true&w=majority&appName=Xihads-Xone`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional startPing in v4.7)
        // await client.connect();

        const taskCollection = client.db("snapTaskerDb").collection("task"); // Make sure to use the correct database and collection names

        // Create a new MongoDB collection for bids
        const bidCollection = client.db("snapTaskerDb").collection("bids");

        // POST - Create a new bid
        app.post('/bids', async (req, res) => {
            try {
                const bid = req.body;

                // Add timestamp if not provided
                if (!bid.bidDate) {
                    bid.bidDate = new Date();
                }

                // Check if this user has already bid on this task
                const existingBid = await bidCollection.findOne({
                    taskId: bid.taskId,
                    userEmail: bid.userEmail
                });

                if (existingBid) {
                    return res.status(400).send({
                        success: false,
                        message: 'You have already placed a bid on this task'
                    });
                }

                const result = await bidCollection.insertOne(bid);

                res.send({
                    success: true,
                    insertedId: result.insertedId
                });
            } catch (error) {
                console.error('Error creating bid:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to create bid'
                });
            }
        });

        // GET - Check if a user has already bid on a task
        app.get('/bids/check/:email/:taskId', async (req, res) => {
            try {
                const { email, taskId } = req.params;

                const existingBid = await bidCollection.findOne({
                    taskId: taskId,
                    userEmail: email
                });

                res.send({
                    exists: !!existingBid
                });
            } catch (error) {
                console.error('Error checking bid existence:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to check bid existence'
                });
            }
        });

        // GET - Get bid count for a specific user
        app.get('/bids/count/:email', async (req, res) => {
            try {
                const email = req.params.email;

                const count = await bidCollection.countDocuments({
                    userEmail: email
                });

                res.send({ count });
            } catch (error) {
                console.error('Error getting bid count:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to get bid count'
                });
            }
        });

        // GET - Get all bids for a specific task
        app.get('/bids/task/:taskId', async (req, res) => {
            try {
                const taskId = req.params.taskId;

                const bids = await bidCollection.find({
                    taskId: taskId
                }).toArray();

                res.send(bids);
            } catch (error) {
                console.error('Error getting task bids:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to get task bids'
                });
            }
        });

        // GET - Get all bids for a specific user
        app.get('/bids/user/:email', async (req, res) => {
            try {
                const email = req.params.email;

                const bids = await bidCollection.find({
                    userEmail: email
                }).toArray();

                res.send(bids);
            } catch (error) {
                console.error('Error getting user bids:', error);
                res.status(500).send({
                    success: false,
                    message: 'Failed to get user bids'
                });
            }
        });

        //**************taskCollection Api************************
        // method - (post/Create)
        app.post('/task', async (req, res) => {
            const newTask = req.body;

            // Convert deadline string to Date object
            if (newTask.deadline) {
                newTask.deadline = new Date(newTask.deadline);
            }
            console.log(newTask);

            const result = await taskCollection.insertOne(newTask);
            res.send(result);
        });

        app.get('/recentTasks', async (req, res) => {
            try {
                const result = await taskCollection
                    .find()
                    .sort({ deadline: 1 }) // Sort by most recent deadlines
                    .limit(6)
                    .toArray();
                res.send(result);
            } catch (err) {
                console.error('Error fetching recent tasks:', err);
                res.status(500).send({ error: 'Internal server error' });
            }
        });

        // method - (get all)
        app.get('/task', async (req, res) => {
            // const cursor = taskCollection.find();
            // const result = await cursor.toArray();
            const result = await taskCollection.find().toArray();
            res.send(result);
        });

        // method - (read just one task)
        app.get('/task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await taskCollection.findOne(query);
            res.send(result);
        });

        // method - (delete)
        app.delete('/task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await taskCollection.deleteOne(query);
            res.send(result);
        });

        // method - (update-one/ put)
        app.put('/task/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedtask = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedtask
            }
            const result = await taskCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch (err) {
        // Ensures that the client will close when you finish/error
        console.error(err);
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})