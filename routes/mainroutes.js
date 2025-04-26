const express=require('express');

const router= express.Router();

router.get('/',(req,res)=>{
    res.send("homepage served by the route handler");
});

router.get('/about',(req,res) =>{
    res.send("this is the about page")
});

module.exports= router;

