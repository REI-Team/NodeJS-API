
const mysql=require('mysql2')
var express = require('express');
var bcrypt = require("bcryptjs");

var positions=[]
var tokens={} // variable for broadcast totems to all clients

// Perform a query to the database
function queryDatabase (query) {

    return new Promise((resolve, reject) => {
      var connection = mysql.createConnection({
        host: process.env.MYSQLHOST || "containers-us-west-140.railway.app",
        port: process.env.MYSQLPORT || 6606,
        user: process.env.MYSQLUSER || "root",
        password: process.env.MYSQLPASSWORD || "Hf8acLz5bmjPx43m0SqR",
        database: process.env.MYSQLDATABASE || "railway"
      });
  
      connection.query(query, (error, results) => { 
        if (error) reject(error);
        resolve(results)
      });
       
      connection.end();
    })
  }

// Wait 'ms' milliseconds
function wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

function toLocalTime(time) {
    var d = new Date(time);
    var offset = (new Date().getTimezoneOffset() / 60) * -1;
    var n = new Date(d.getTime() + offset);
    return n;
};

async function encriptPassword(passwd){
  let salt=await bcrypt.genSalt(10)
  let hash=await bcrypt.hash(passwd,salt)
  return hash
}

async function saveScore(name,degree,success,errors,time,ip){
  // let exists=await queryDatabase(`SELECT id FROM degree WHERE name='${degree}';`) // <- THIS IS OPTIONAL , BETTER WE PASS THE ID AND NOT THE NAME
  // if(!exists || exists.length==0) return false
  let numberOfOcupations =await queryDatabase(`SELECT COUNT(name) FROM ocupations WHERE degree=${degree};`)
  if(!numberOfOcupations || numberOfOcupations==0) return false
  try {
    numberOfOcupations=numberOfOcupations[0]['COUNT(name)']
    success=parseInt(success)
    errors=parseInt(errors)
    time=parseInt(time)
  } catch (error) {
    return false
  }
  let endScore = 0;
    endScore += (success / numberOfOcupations) * 10;
    endScore -= (errors / numberOfOcupations) * 5;
    if (time < 30) {
        endScore += 5;
    } else if (time < 60) {
        endScore += 3;
    } else {
        endScore += 1;
    }
    endScore=await Math.max(0, Math.min(endScore, 10));
    try {
      await queryDatabase(`INSERT INTO ranking(name,degree,score,time,errors,success,ip) VALUES('${name}',${degree},${endScore},${time},${errors},${success},'${ip}');`)
    } catch (error) {
      console.log(error);
      return false
    }
    return endScore;
}

async function storeConn(ip,type){
  try {
    await queryDatabase(`INSERT INTO connections(ip,time,type) VALUES('${ip}','${new Date()}','${type}');`)
  } catch (error) {
    console.log("ERROR#storeConn");
    console.log(error);
  }
}

async function makeTokens(id,name,degree){ 
  let ocupations=await queryDatabase(`SELECT * FROM ocupations WHERE degree=${degree};`)
  if(ocupations.length>4){
    let choosed=[]
    let actualnum=0
    let tokensArray=[]
    for (let index = 0; index < 5; index++) {

      while (actualnum==0||choosed.includes(actualnum)) {
        actualnum=getRandomInt(ocupations.length)
      }
      choosed.push(actualnum)
      tokensArray.push({totem:ocupations[actualnum],position:registerObject()})
    }

    let traps=await queryDatabase(`SELECT * FROM ocupations WHERE degree<>${degree};`)
    if(traps.length>4){
      let choosed=[]
      let actualnum=0
      let trapsArray=[]
      for (let index = 0; index < 5; index++) {

        while (actualnum==0||choosed.includes(actualnum)) {
          actualnum=getRandomInt(traps.length)
        }
        choosed.push(actualnum)
        trapsArray.push({totem:traps[actualnum],position:registerObject()})
      }
      tokens[id]={totems:tokensArray,traps:trapsArray}
      console.log("ACTUAL TOKENS:",tokens);
      // wait(1000);
      return tokens
  }
}

  return false
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max)+1;
}

// Generate totems position
// Initialize an empty grid to keep track of registered object positions
let y=Math.floor(1440 / 60)
let x=Math.floor(2560 / 50)
const grid = new Array(x)
  .fill()
  .map(() => new Array(y).fill(false));

function registerObject() {
  const cellWidth = 50;
  const cellHeight = 60;
  const mapWidth = 2560;
  const mapHeight = 1440;

  // Generate a random x and y position for the new object
  let x, y;
  do {
    x = Math.floor(Math.random() * (mapWidth - cellWidth));
    y = Math.floor(Math.random() * (mapHeight - cellHeight));
  } while (checkOverlap(x, y));

  // Register the object's position on the grid
  const gridX = Math.floor(x / cellWidth);
  const gridY = Math.floor(y / cellHeight);
  grid[gridX][gridY] = true;

  // Return the object's position
  return { x, y };
}

// Helper function to check for overlap with existing objects
function checkOverlap(x, y) {
  const cellWidth = 50;
  const cellHeight = 60;

  // Check if the new object overlaps with any previously registered objects
  for (let i = Math.floor(x / cellWidth); i <= Math.ceil((x + cellWidth) / cellWidth) - 1; i++) {
    for (let j = Math.floor(y / cellHeight); j <= Math.ceil((y + cellHeight) / cellHeight) - 1; j++) {
      if (grid[i][j]) {
        return true;
      }
    }
  }
  return false;
}


module.exports = { queryDatabase,wait,toLocalTime,encriptPassword,saveScore,storeConn,makeTokens,tokens }
