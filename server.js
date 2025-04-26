const express= require('express');

const app=express();

app.use=express();

const port=3000;

app.get('/',(req,res)=>{
    res.send ("hello from my first express server");

});

app.listen(port,()=>{
    console.log('the server is running and listening on  PORT=3000');


});