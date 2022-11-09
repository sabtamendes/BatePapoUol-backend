import cors from "cors";
//import dayjs from "dayjs";
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
    name : joi.string().min(3).required()
 })

 const messageSchema = joi.object({

 })
server.post("/participants",(req,res)=>{
    const participant = req.body;
    //const data = dayjs().locale('pt-br').format('HH:MM:SS');

    const validation = participantSchema.validate(participant,{ abortEarly: false});

    if(validation.error){
        const err = validation.error.details.map((detail) => detail.message)
        res.status(422).send(err);
        return;
    }

// const participantAlreadyExist = participants.findOne({name: participant.name});

// if(participantAlreadyExist){
//     res.sendStatus(409);
//     return;
// }

    participants
        .insertOne({
            name: participant.name, 
            lastStatus: Date.now()
            })
          
    
    res.sendStatus(201)
})

server.get("/participants",(req,res)=>{
    participants.find().toArray().then((participants)=>{
        res.send(participants)
    });
})


server.listen(5000, ()=>{console.log("Running on port 5000")});