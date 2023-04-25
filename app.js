const express = require("express");
const fs = require("fs/promises");
const url = require("url");
const post = require("./post.js");
const { v4: uuidv4 } = require("uuid");
const utils = require("./functions/gameLogic.js");

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

// Run WebSocket server
const WebSocket = require("ws");
const wss = new WebSocket.Server({ server: httpServer });
const socketsClients = new Map();
console.log(`Listening for WebSocket queries on ${port}`);

// What to do when a websocket client connects
wss.on("connection", (ws) => {
  console.log("Client connected");
  // Add client to the clients list
  const id = uuidv4();
  
  // if (socketsClients.has("pl1")) {
  //   if (socketsClients.has("pl2")) {
  //     ws.close();
  //   } else {
  //     socketsClients.set("pl2", ws);
  //     ws.send(JSON.stringify({ type: "setPlayer", player: 2 }))
  //     //TODO start game
  //   }
  // } else {
  //   socketsClients.set("pl1", ws);
  //   ws.send(JSON.stringify({ type: "setPlayer", player: 1 }))
  //   console.log("pl1")
  // }
  var rst = { type: "connectionTest", message: "OK" };
  ws.send(JSON.stringify(rst));

  gameLoop();
  // Send clients list to everyone
  // sendClients()

  // What to do when a client is disconnected
  ws.on("close", () => {
  });

  // What to do when a client message is received
  ws.on("message", (bufferedMessage) => {
    var messageAsString = bufferedMessage.toString();
    var messageAsObject = {};
    try {
      messageAsObject = JSON.parse(messageAsString);
    } catch (e) {
      console.log("Could not parse bufferedMessage from WS message");
    }
    if (messageAsObject.type == "bounce") {
      var rst = { type: "bounce", message: messageAsObject.message };
      ws.send(JSON.stringify(rst));
    } else if (messageAsObject.type == "broadcast") {
      var rst = {
        type: "broadcast",
        origin: id,
        message: messageAsObject.message,
      };
      broadcast(rst);
    } else if (messageAsObject.type == "private") {
      var rst = {
        type: "private",
        origin: id,
        destination: messageAsObject.destination,
        message: messageAsObject.message,
      };
      private(rst);
    // } 
    // else if (messageAsObject.type == "playerDirection") {
    //   utils.updateDirection(messageAsObject.player, messageAsObject.direction)
    // } else if (messageAsObject.type == "kickBall") {
    //   console.log(messageAsObject)
    //   utils.kickBall(messageAsObject.player)
    } else if (messageAsObject.type == "disconnectPlayer") {
      utils.reset()
      socketsClients.delete("pl1")
      socketsClients.delete("pl2")
      broadcast({ type: "disconnect" })
    }
  });
});

// Send clientsIds to everyone
// function sendClients () {
//   var clients = []
//   socketsClients.forEach((value, key) => {
//     clients.push(value.id)
//   })
//   wss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       var id = socketsClients.get(client).id
//       var messageAsString = JSON.stringify({ type: "clients", id: id, list: clients })
//       client.send(messageAsString)
//     }
//   })
// }

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

const TARGET_FPS = 60;
const TARGET_MS = 1000 / TARGET_FPS;
let frameCount = 0;
let fpsStartTime = Date.now();
let currentFPS = 0;

function gameLoop() {
  const startTime = Date.now();

  if (currentFPS >= 1) {
    // Podeu treure la següent línia per millorar el rendiment
    //  console.log(`FPS actual: ${currentFPS.toFixed(2)}`);
    // Cridar aquí la funció que actualitza el joc (segons currentFPS)
    // Cridar aquí la funció que fa un broadcast amb les dades del joc a tots els clients
    if (socketsClients.has("pl1")) {
      if (socketsClients.has("pl2")) {
        // if the players are online the game starts
        // TODO HERE LOGIC
        // utils.run(currentFPS.toFixed(2));
        broadcast(utils.getRst());
        // TODO broadcaste neccesary info for the game
      }
    }
  }
  // if the players are online the game starts
  // TODO broadcaste neccesary info for the game


  const endTime = Date.now();
  const elapsedTime = endTime - startTime;
  const remainingTime = Math.max(1, TARGET_MS - elapsedTime);

  frameCount++;
  const fpsElapsedTime = endTime - fpsStartTime;
  if (fpsElapsedTime >= 500) {
    currentFPS = (frameCount / fpsElapsedTime) * 1000;
    frameCount = 0;
    fpsStartTime = endTime;
  }
  if (socketsClients.has("pl1") && socketsClients.has("pl2")) {
    setTimeout(() => {
      setImmediate(gameLoop);
    }, remainingTime);
  }
}
