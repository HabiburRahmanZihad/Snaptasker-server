require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 3000
const cors = require('cors') // Import the cors package for allowing cross-origin requests
const jwt = require('jsonwebtoken') // Import the jsonwebtoken package for token handling
const cookieParser = require('cookie-parser') // Import the cookie-parser package for parsing cookies






// Middleware to handle CORS and JSON parsing

const allowedOrigins = [
    'http://localhost:5173',              // Local frontend dev
    'https://snap-tasker.vercel.app'      // Deployed frontend
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));


app.use(express.json()) // Parse JSON bodies

app.use(cookieParser()) // Middleware to parse cookies


// Middleware to verify JWT tokens
// This middleware checks if the JWT token is valid and attaches the user information to the request object
const verifyJWT = (req, res, next) => {

    const token = req.cookies.token; // Get the token from cookies

    if (!token) {
        console.warn('No token in cookies');
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    console.log('Cookies:', req.cookies);


    jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err, decoded) => {

        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.user = decoded; // Attach the decoded user information to the request object
        (decoded);
        next(); // Call the next middleware or route handler
    });
}




app.get('/', (req, res) => {
    res.send('Wow !!! Server is Successfully running')
})







// MongoDB connection URI
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@xihads-xone.ftg87hg.mongodb.net/?retryWrites=true&w=majority&appName=Xihads-Xone`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
const client = new MongoClient(process.env.DB_URI, {
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




        // Create a new MongoDB collection for bids
        const bidCollection = client.db("snapTaskerDb").collection("bids");

        // Create a new MongoDB collection for tasks
        const taskCollection = client.db("snapTaskerDb").collection("task"); // Make sure to use the correct database and collection names

        // Create a new MongoDB collection for applications
        const applicationsCollections = client.db("snapTaskerDb").collection("applications"); // Make sure to use the correct database and collection names










        //**************jwtCollection Api************************

        // POST - Generate a JWT token
        app.post('/jwt', (req, res) => {
            const { email } = req.body;
            const user = { email };
            const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '1d' });


            // const token = jwt.sign(user, 'secret', { expiresIn: '1h' });
            // res.send({ token });

            // Set the token as a cookie
            res.cookie('token', token, {
                httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
                // secure: false, // Use secure cookies in production
                secure: process.env.NODE_ENV === 'production', // Required for Vercel (HTTPS)
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site cookies
                maxAge: 24 * 60 * 60 * 1000 // 1 day in milliseconds
            });
            res.send({ success: true });
            // res.send({ success: true, token });
        });
















        //**************bidCollection Api************************
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

        // method: GET /task - Get all tasks (optionally filtered by email using query parameter)
        app.get('/task', async (req, res) => {
            // const cursor = taskCollection.find();
            // const result = await cursor.toArray();
            const email = req.query.email;
            const query = {};

            if (email) {
                query.email = email;
            }
            const result = await taskCollection.find(query).toArray();
            res.send(result);
        });

        // method - (read just one task)
        app.get('/task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await taskCollection.findOne(query);
            res.send(result);
        });

        // method - (post/Create)
        app.post('/task', verifyJWT, async (req, res) => {
            const newTask = req.body;

            // Convert deadline string to Date object
            if (newTask.deadline) {
                newTask.deadline = new Date(newTask.deadline);
            }

            const result = await taskCollection.insertOne(newTask);
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





        //**************applicationsCollections Api************************

        // method: GET /applications - Get all applications for a specific user (filtered by applicantEmail via query)
        app.get('/applications', verifyJWT, async (req, res) => {
            const { email, taskId } = req.query;

            // verify that the user email matches the token
            if (req.user.email !== email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }

            console.log("Decoded token email:", req.user.email);
            console.log("Query email:", req.query.email);


            const query = {};
            if (email) query.applicantEmail = email;
            if (taskId) query.taskId = taskId;

            // console.log(req.cookies.token);
            // console.log(req.cookies);

            const result = await applicationsCollections.find(query).toArray();
            res.send(result);
        });

        // method - (get all application for a specific task)
        app.get('/applications/task/:taskId', async (req, res) => {
            const taskId = req.params.taskId;
            const query = { taskId: taskId };
            const result = await applicationsCollections.find(query).toArray();
            res.send(result);
        });

        // method - (post/Create)
        app.post('/applications', async (req, res) => {
            const application = req.body;
            const result = await applicationsCollections.insertOne(application);
            res.send(result);
        });

        // method - (delete)
        app.delete('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await applicationsCollections.deleteOne(query);
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