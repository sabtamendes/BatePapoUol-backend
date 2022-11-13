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


const mongo = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let messages;

mongo.connect().then(() => {
    db = mongo.db("batepapouol");
    participants = db.collection("participants");
    messages = db.collection("messages");
});


const participantsSchema = joi.object({
    name: joi.string().min(1).required()
})

const messagesSchema = joi.object({
    from: joi.string().min(3).required(),
    to: joi.string().min(3).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
    time: joi.string()
})


server.post("/participants", async (req, res) => {
    const user = req.body;

    try {

        const { error } = participantsSchema.validate(user, { abortEarly: false });

        if (error) {
            const err = error.details.map((detail) => detail.message)
            res.status(422).send(err);
            return;
        }

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
            time: dayjs().format('HH:MM:ss')
        })

        res.sendStatus(201);

    } catch (error) {
        res.status(500).send(error.message)
    }
})

server.get("/participants", async (req, res) => {
    try {
        const renderingParticipants = await participants.find().toArray();
        res.send(renderingParticipants).status(200);

        if (!renderingParticipants) {
            res.status(404)
            return;
        }

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.post("/messages", async (req, res) => {
    const from = req.headers.user;
    const { to, text, type } = req.body;

    try {

        const newMessage = {
            from: from,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:MM:ss')
        }

        const { error } = messagesSchema.validate(newMessage, { abortEarly: false })

        if (error) {
            const err = error.details.map((detail) => detail.message)
            res.status(422).send(err)
            return;
        }

        const user = await participants.findOne({ name: from });

        if (!user) {
            res.sendStatus(409)
            return;
        }

        await messages.insertOne(newMessage)

        res.sendStatus(201)

    } catch (error) {
        res.status(500).send(error.message);
    }

})

server.get("/messages", async (req, res) => {

    const user = req.headers.user;
    const limit = req.query.limit;

    try {

        const message = await messages.find({ $or: [{ "from": user }, { "to": "Todos" }, { "to": user }, { "type": "message" }] })
            .limit(-limit)
            .toArray();

        res.send(message);

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.post("/status", async (req, res) => {
    const user = req.headers.user;
    try {
        const participantStatusChat = await participants.findOne({ name: user })

        if (!participantStatusChat) {
            res.sendStatus(404)
            return;
        }
        await participants.updateOne({ name: user }, { $set: { lastStatus: Date.now() } })

        res.sendStatus(200)

    } catch (error) {
        res.status(404).send(error.message);
    }
})

setInterval(async () => {

    const onlineStatusInMilliseconds = Date.now();
    const statusInSecondsInative = onlineStatusInMilliseconds - 10 * 1000;

    try {

        const participantStatusInative = await participants.find({ lastStatus: { $lte: statusInSecondsInative } }).toArray();

        if (participantStatusInative.length > 0) {

            const messageInativeUpdate = participantStatusInative.map((participantInative) => {
                return {
                    from: participantInative.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format('HH:MM:ss')
                }
            })

            await messages.insertMany(messageInativeUpdate)

            await participants.deleteMany({ lastStatus: { $lte: statusInSecondsInative } })
        }

    } catch (error) {
        console.log(error.message);
    }

}, 1500)

server.delete("/messages/:id", async (req, res) => {

    const from = req.headers.user;
    const id = req.params.id;

    try {
        const message = await messages.findOne({ _id: new ObjectId(id) })

        if (!message) {
            res.sendStatus(404)
            return;
        }
        if (message.from !== from) {
            res.sendStatus(401)
            return;
        }

        await messages.deleteOne({ _id: message._id })

        res.sendStatus(200)

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.put('/messages/:id', async (req, res) => {

    const id = req.params.id;
    const from = req.headers.user;
    const { to, text, type } = req.body;

    try {
        const newMessage = {
            from, to, text, type
        }

        const { error } = messagesSchema.validate(newMessage);
        if (error) {
            res.sendStatus(422)
            return;
        }

        const participantAtive = await participants.findOne({ name: from })

        if (!participantAtive) {
            res.sendStatus(422)
            return;
        }

        const message = await messages.findOne({ _id: new ObjectId(id) });

        if (!message) {
            res.sendStatus(404)
            return;
        }

        if (message.from !== from) {
            res.sendStatus(401)
            return;
        }

        await messages.updateOne({ _id: new ObjectId(id) },
            { $set: newMessage });

        res.sendStatus(201);

    } catch (error) {
        res.status(500).send(error.message);
    }
})

server.listen(process.env.PORT, () => { console.log("Listening on port " + process.env.PORT) });

