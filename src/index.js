import cors from "cors";
import dayjs from "dayjs";
import dotenv from "dotenv";
import express from "express";
import joi from "joi";
import { MongoClient } from "mongodb";

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


const participantSchema = joi.object({
    name: joi.string().min(3).required()
})

const messageSchema = joi.object({
    from: joi.string().min(3).required(),
    to: joi.string().min(3).required(),
    text: joi.string().min(3).required(),
    type: joi.string().valid("message", "private_message").required(),
    time: joi.string()
})


server.post("/participants", (req, res) => {
    const participant = req.body;

    const validation = participantSchema.validate(participant, { abortEarly: false });

    if (validation.error) {
        const err = validation.error.details.map((detail) => detail.message)
        res.status(422).send(err);
        return;
    }


    participants.findOne({ name: participant.name }).then((p) => {

        if (p) {
            res.sendStatus(409);
            return;
        }

        participants
            .insertOne({
                name: participant.name,
                lastStatus: Date.now()
            })


        messages.insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().locale('pt-br').format('HH:MM:SS')
        })
        res.sendStatus(201);
    })


})

server.get("/participants", (req, res) => {
    const participantExist = participants.find().toArray().then((participants) => {
        res.send(participants)
    });
    if (!participantExist) {
        res.send(404).status({ error: "Usuário não encontrado" })
    }
    res.sendStatus(200);
})

server.post("/messages", (req, res) => {
  
     const {text, to, type } = req.body;
    const {user} = req.headers;

    const validation = messageSchema.validate(to, text, type, user, { abortEarly: false })

    if (validation.error) {
        const err = validation.error.details.map((detail) => detail.message)
        res.status(422).send(err);
        return;
    }


    const participantAlreadyExist = participants.findOne({name: user});

    if(participantAlreadyExist){
        res.sendStatus(409);
        return;
    }
        
    
    messages.insertOne({
        from: user,
        to: to,
        text: text,
        type: type,
        time: dayjs().locale('pt-br').format('HH:MM:SS')
    })
    res.sendStatus(201)
})

server.get("/messages",(req,res)=>{
    messages.find({}).toArray().then((m)=>{
        res.send(m)
    })
    
})
server.listen(5000, () => { console.log("Running on port 5000") });