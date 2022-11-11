import cors from "cors";
import dayjs from "dayjs";
import dotenv from "dotenv";
import express from "express";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());


const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let messages;

mongoClient.connect().then(() => {
    db = mongoClient.db("batepapouol");
    participants = db.collection("participants");
    messages = db.collection("messages");
});


const participantSchema = joi.object({
    name: joi.string().min(1).required()
})

const messageSchema = joi.object({
    from: joi.string().min(1).required(),
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
    time: joi.string()
})


server.post("/participants", async (req, res) => {
    const user = req.body;

    const validation = participantSchema.validate(user, { abortEarly: false });

    if (validation.error) {
        const err = validation.error.details.map((detail) => detail.message)
        res.status(422).send(err);
        return;
    }
    try {
        const participantAlreadyExist = await participants.findOne({ name: user.name })

        if (participantAlreadyExist) {
            res.sendStatus(409);
            return;
        }

        await participants.insertOne({
            name: user.name,
            lastStatus: Date.now()
        })

        await messages.insertOne({
            from: user.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })

        res.sendStatus(201);

    } catch (error) {
        res.status(500).send(error.message)
    }

})

server.get("/participants", async (req, res) => {
    try {
        const renderingParticipants = await participants.find().toArray();

        if (!renderingParticipants) {
            res.status(404).send({ error: "Usuário não encontrado" })
        }

        res.send(renderingParticipants).status(200);

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.post("/messages", async (req, res) => {

    const { to, text, type } = req.body;
    const { user } = req.headers;
    console.log(to, text, type, user)
    try {
        const message = {
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        }
        const validation = messageSchema.validate(message, { abortEarly: false })

        if (validation.error) {
            const err = validation.error.details.map((detail) => detail.message)
            res.status(422).send(err);
            return;
        }

        const participantExist = await participants.findOne({ name: user });

        if (!participantExist) {
            res.sendStatus(409);
            return;
        }

        await messages.insertOne(message)

        res.sendStatus(201)
    } catch (error) {
        res.status(500).send(error.message);
    }

})

server.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const { user } = req.headers;
    try {

        const allMesssages = await messages.find().toArray();

        const messageFilter = allMesssages.filter((message) => {
            const { from, to, type } = message;
            const especifyingUser = to === "Todos" || to === user || from === user;
            const especifyingType = type === "message";

            return especifyingUser || especifyingType;
        })

        if (limit && limit !== NaN) {
            return res.send(messageFilter.slice(-limit));
        }

        res.send(messageFilter);

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.post("/status", async (req, res) => {
    const { user } = req.headers;
    try {
        const participantStatus = await participants.findOne({ name: user })

        if (!participantStatus) {
            return res.sendStatus(404)
        }
        await participants.updateOne({ name: user }, { $set: { lastStatus: Date.now() } })

        res.sendStatus(200)

    } catch (error) {
        res.status(404).send(error.message);
    }
})

setInterval(async () => {
    const statusSecondInative = Date.now() - 10 * 1000;
    try {

        const participantStatusInative = await participants.find({ lastStatus: { $lte: statusSecondInative } }).toArray()

        if (participantStatusInative.length > 0) {
            const messageInativeUpdate = participantStatusInative.map((participantInative) => {
                return {
                    from: participantInative.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format('HH:mm:ss')
                }
            })
            await messages.insertMany(messageInativeUpdate);
            await participants.deleteMany({ lastStatus: { $lte: statusSecondInative } })
        }

    } catch (error) {
        res.status(500).send(error.message);
    }

}, 150000)

server.delete("/messages/:id", async (req, res) => {
    const user = req.headers.user;
    const { id } = req.params;
    try {
        const messageExist = await messages.findOne({ _id: new ObjectId(id) })

        if (!messageExist) {
            res.sendStatus(404)
            return;
        }
        if (messageExist.from !== user) {
            res.sendStatus(401)
            return;
        }

        await messages.deleteOne({ _id: messageExist._id })
        res.sendStatus(200)

    } catch (error) {
        res.status(500).send(error.message)
    }

})

server.put('/messages/:id', async (req, res) => {
    const { id } = req.params;
    const from = req.headers.user;
    const { to, text, type } = req.body;

    try {
        const newMessage = {
            from, to, text, type
        }

        const validation = messageSchema.validate(newMessage);
        if (validation.error) {
            return res.sendStatus(422);
        }

        const participantExist = await participants.findOne({ name: from })

        if (!participantExist) {
            return res.sendStatus(422);
        }

        const message = await messages.findOne({ _id: new ObjectId(id) });

        if (!message) {
            return res.sendStatus(404);
        }

        if (message.from !== from) {
            return res.sendStatus(401);
        }


        await messages.updateOne({ _id: new ObjectId(id) },
            { $set: newMessage });

        res.sendStatus(201);

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.listen(process.env.PORT, () => { console.log("Listening on port " + process.env.PORT) });

