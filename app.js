const express = require("express");
const fs = require("fs/promises");
const url = require("url");
const post = require("./post.js");
const { v4: uuidv4 } = require("uuid");
const functions=require("./functions/utils.js")
const api=require('./functions/API.js')

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

  // gameLoop();
  // Send clients list to everyone
  // sendClients()

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


    }else if (messageAsObject.type == "removeTotem") { 
      if(messageAsObject.id && messageAsObject.totemId){
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
            message: totms,
            player:players[socketsClients.get(ws)]
          };
        }
        broadcast(rst);
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

    console.log(messageAsObject)
  });
});

// Send position of all players every 200 ms
const intervalo=setInterval(function() {
  if(wss.clients.size>1){
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        var rst = {
          type: "positions",
          message: functions.getPlayerPos(socketsClients.get(client))
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

// const TARGET_FPS = 60;
// const TARGET_MS = 1000 / TARGET_FPS;
// let frameCount = 0;
// let fpsStartTime = Date.now();
// let currentFPS = 0;

// function gameLoop() {
//   const startTime = Date.now();

//   if (currentFPS >= 1) {
//     // Podeu treure la següent línia per millorar el rendiment
//     //  console.log(`FPS actual: ${currentFPS.toFixed(2)}`);
//     // Cridar aquí la funció que actualitza el joc (segons currentFPS)
//     // Cridar aquí la funció que fa un broadcast amb les dades del joc a tots els clients
//     // if (socketsClients.has("pl1")) {
//     //   if (socketsClients.has("pl2")) {
//         // if the players are online the game starts
//         // TODO HERE LOGIC
//         // utils.run(currentFPS.toFixed(2));
//         // broadcast(utils.getRst());
//         // TODO broadcaste neccesary info for the game
//       }
//     }
//   }
//   // if the players are online the game starts
//   // TODO broadcaste neccesary info for the game

//   // const endTime = Date.now();
//   // const elapsedTime = endTime - startTime; // TODO pass this to calculate score
//   // const remainingTime = Math.max(1, TARGET_MS - elapsedTime);

//   // frameCount++;
//   // const fpsElapsedTime = endTime - fpsStartTime;
//   // if (fpsElapsedTime >= 500) {
//   //   currentFPS = (frameCount / fpsElapsedTime) * 1000;
//   //   frameCount = 0;
//   //   fpsStartTime = endTime;
//   // }
//   // if (socketsClients.has("pl1") && socketsClients.has("pl2")) {
//   //   setTimeout(() => {
//   //     setImmediate(gameLoop);
//   //   }, remainingTime);
//   // }
// }

function notFound(req,res){
  res.send({status: "OK", result: `PAGE NOT FOUND`})
}
