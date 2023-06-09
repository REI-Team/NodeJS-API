const express = require("express");
const fs = require("fs/promises");
const url = require("url");
const post = require("./post.js");
const { v4: uuidv4 } = require("uuid");
const functions=require("./functions/utils.js")
const api=require('./functions/API.js')
var isPaused = false;

// Wait 'ms' milliseconds
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start HTTP server
const app = express();

// Set port number
const port = process.env.PORT || 3000;

// Activate HTTP server
const httpServer = app.listen(port, appListen);
function appListen() {
  //console.log(`Listening for HTTP queries on: http://localhost:${port}`)
}
// If the script close, close the server
process.on("SIGINT", () => {
  console.log("Closing http server");
  httpServer.close()
  clearInterval(intervalo);
})
app.set('trust proxy', true) // this to take the client ip
// API functions
app.use('/API', api.router)
app.use('/*',notFound)

// Run WebSocket server
const WebSocket = require("ws");
const { clearInterval } = require("timers");
const wss = new WebSocket.Server({ server: httpServer });
const socketsClients = new Map(); // variable to localize players , asign and delete from players list
let players={};
console.log(`Listening for WebSocket queries on ${port}`);

// What to do when a websocket client connects
wss.on("connection", (ws,req) => {
  console.log("Client connected");
  // Add client to the clients list
  const id = uuidv4();
  console.log("Number of clients: ",wss.clients.size);
  // console.log(req.socket.remoteAddress);
  functions.storeConn(req.socket.remoteAddress,"Connection")
  // console.log(wss.clients);
  players[id]={start:0,end:0,hits:0,error:0,username:"",degree:0}
  socketsClients.set(ws,id);
  var rst = { type: "connectionTest", message: "OK" ,player:id};

  ws.send(JSON.stringify(rst));

  // What to do when a client is disconnected
  ws.on("close", () => {
    // TODO here change to control tokens 
    functions.delPosition(socketsClients.get(ws))
    delete players[socketsClients.get(ws)];
    delete functions.tokens[socketsClients.get(ws)]
    socketsClients.delete(ws)
    functions.storeConn(req.socket.remoteAddress,"Disconnect")
    if(wss.clients.size<1){
      functions.tokens={};
      functions.positions={};
      console.log("TOKENS WIPED");
      console.log(functions.getTotems());
      console.log(players);
      console.log(socketsClients);
      let y=Math.floor(1416 / 60)
      let x=Math.floor(2516 / 50)
      functions.grid = new Array(x)
        .fill()
        .map(() => new Array(y).fill(false));
      // TODO stop logic here
    }
  });

  // What to do when a client message is received
  ws.on("message", async (bufferedMessage) => { // TODO configure calls
    var messageAsString = bufferedMessage.toString();
    var messageAsObject = {};
    try {
      messageAsObject = JSON.parse(messageAsString);
    } catch (e) {
      console.log("Could not parse bufferedMessage from WS message");
    }
    if (messageAsObject.type == "setPlayer" && messageAsObject.grade && messageAsObject.username) {
      isPaused=true
      let degre=await functions.getDegree(messageAsObject.grade)
      let ok=await functions.makeTokens(socketsClients.get(ws) , degre)
      // console.log(ok);
      if(ok){
        players[socketsClients.get(ws)].username=messageAsObject.username
        players[socketsClients.get(ws)].degree=degre
        players[socketsClients.get(ws)].start=Date.now();
        var rst = {type:"totems",message:ok};
        broadcast(rst);

      }else{
        var rst = { type: "error", message: "Token generate error" };
          ws.send(JSON.stringify(rst));
      }
      await functions.wait(700)
      isPaused=false

    }else if (messageAsObject.type == "removeTotem") { 
      if(messageAsObject.id && messageAsObject.totemId){
        isPaused=true
        let correct=functions.removeTotem(messageAsObject.id,messageAsObject.totemId,players[socketsClients.get(ws)].degree,socketsClients.get(ws));
        if(correct){
          players[socketsClients.get(ws)].hits++
          console.log("totem ok",players[socketsClients.get(ws)].hits);
        }else{
          players[socketsClients.get(ws)].error++
          console.log("Totem wrong",players[socketsClients.get(ws)].error);
        }
        let totms=functions.getTotems()
        console.log(totms);
        var rst
        if(players[socketsClients.get(ws)].hits>=5){
          let endTime=Date.now();
          let totalTime=endTime-players[socketsClients.get(ws)].start

          rst = {
            type: "totems",
            message: totms,
            winner:socketsClients.get(ws),
            hits:players[socketsClients.get(ws)].hits,
            errors:players[socketsClients.get(ws)].error,
            player:players[socketsClients.get(ws)],
            endTime:totalTime
          };

        }else{

          rst = {
            type: "totems",
            message: totms
          };
        }
        broadcast(rst);
        rst={
          type:"stats",
          hits:players[socketsClients.get(ws)].hits,
          errors:players[socketsClients.get(ws)].error
        }
        ws.send(JSON.stringify(rst))
        await functions.wait(700)
        isPaused=false
      }

    } else if (messageAsObject.type == "broadcast") { // CAN BE USEFULL TO BROADCAST WHEN A PLAYER CONNECT OR WINS
      var rst = {
        type: "broadcast",
        origin: id,
        message: messageAsObject.message,
      };
      broadcast(rst);
    } else if (messageAsObject.type == "private") { // Maybe not neccessary
      var rst = {
        type: "private",
        origin: id,
        destination: messageAsObject.destination,
        message: messageAsObject.message,
      };
      private(rst);
    } 
    else if (messageAsObject.type == "playerPosition") { // TODO
      if(messageAsObject.y && messageAsObject.x){
        functions.setPosition(socketsClients.get(ws),messageAsObject.x,messageAsObject.y)
      }
    } else if (messageAsObject.type == "disconnectPlayer") {
      
      broadcast({ type: "disconnect" })
    }

  });
});

// Send position of all players every 200 ms
const intervalo=setInterval(function() {
  if(wss.clients.size>1 && !isPaused){
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        var rst = {
          type: "positions",
          message: functions.getPlayerPos()
        };
        client.send(JSON.stringify(rst))
      }
    });

  }
}, 200);

// Send a message to all websocket clients
async function broadcast(obj) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      var messageAsString = JSON.stringify(obj);
      client.send(messageAsString);
    }
  });
}

// Send a private message to a specific client
async function private(obj) {
  wss.clients.forEach((client) => {
    if (
      socketsClients.get(client).id == obj.destination &&
      client.readyState === WebSocket.OPEN
    ) {
      var messageAsString = JSON.stringify(obj);
      client.send(messageAsString);
      return;
    }
  });
}

function notFound(req,res){
  res.send({status: "OK", result: `PAGE NOT FOUND`})
}
