const post = require('../post.js')
var express = require('express');
var router = express.Router();
const utils= require('./utils.js')
const functions=require('./utils')

router.post('/set_record',setRecord)
router.post('/get_ranking',getRanking)
router.get('/test',functions.makeTokens)

async function setRecord(req,res){
    let receivedPOST = await post.getPostObject(req)
    let result = { status: "KO", result: "Invalid param" }

    if(receivedPOST.name && receivedPOST.degree && receivedPOST.success && receivedPOST.errors && receivedPOST.time){
        // TODO here score calculator and push on bbdd
        // console.log("params ok");
        let saved=await utils.saveScore(receivedPOST.name, receivedPOST.degree , receivedPOST.success , receivedPOST.errors , receivedPOST.time)
        if(saved) result={status: "OK", result: `SCORE SAVED:${saved}`}
        // console.log(result,saved);
    }

    return res.send(result)
}

async function getRanking(req,res){
    let receivedPOST = await post.getPostObject(req)
    let result = { status: "KO", result: "Invalid param" }
    let query='SELECT * FROM ranking ORDER BY score DESC '
    if(receivedPOST.start && receivedPOST.elements ){
        // TODO here score calculator and push on bbdd
        query+=`LIMIT ${receivedPOST.elements} OFFSET ${receivedPOST.start}`
    }else{
        query+='LIMIT 20'
    }
    query+=';'
    let results= await utils.queryDatabase(query)
    result={ status: "OK", result: results }
    return res.send(result)
}

module.exports = { router }