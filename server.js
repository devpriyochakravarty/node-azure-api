const express= require('express');


const mainroutes=require('./routes/mainroutes');

const app=express();


const port=3000;

app.use('/',mainroutes);




app.listen(port,()=>{
    console.log('the server is running and listening on  PORT=3000');


});