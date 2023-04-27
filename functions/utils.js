
const mysql=require('mysql2')
var express = require('express');
var bcrypt = require("bcryptjs");

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

async function saveScore(name,degree,success,errors,time){
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
      await queryDatabase(`INSERT INTO ranking(name,degree,score,time,errors,success) VALUES('${name}',${degree},${endScore},${time},${errors},${success});`)
    } catch (error) {
      console.log(error);
      return false
    }
    return endScore;
}

module.exports = { queryDatabase,wait,toLocalTime,encriptPassword,saveScore }