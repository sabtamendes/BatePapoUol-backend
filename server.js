import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import 'dayjs/locale/pt-br';

const app = express();
app.use(cors());
app.use(express.json());

app.post("/participants",(req,res)=>{
    const {name} = req.body;
    const data = dayjs().locale('pt-br').format('HH:MM:SS');
})

app.listen(5000)