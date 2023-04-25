// TODO implement player 2
var borderSize = 5;
var playerPoints = 0;
var playerX = 80;
var playerY = 300;

var gameStatus = "running"

//variables player 2 not tested
var playerPoints2 = 0;
var player2X = 720;
var player2Y = 300;
var playerDirection2 = "none";
// end variables player2

var playerWidth = 5; // use for the 2 players
var playerHeight = 200; // use for the 2 players
var playerHalf = playerHeight / 2; // use for the 2 players
var playerSpeed = 250; // use for the 2 players
var playerSpeedIncrement = 15;
var playerDirection = "none";

var ballX = 400;
var ballY = 300;
var ballSize = 15;
var ballHalf = ballSize / 2;
var ballSpeed = 200;
var ballSpeedIncrement = 25;
var ballDirection = "downRight";

var roundStarted = false;

var startingPlayer;
var currentMessage;
if (Math.round(Math.random()) == 1) {
    startingPlayer = 1;
    currentMessage = "Player 1 press SPACE to kick the ball";
} else {
    startingPlayer = 2;
    currentMessage = "Player 2 press SPACE to kick the ball";
}


function run(fps) {

    if (fps < 1) return;

    if (!roundStarted) return;

    const boardWidth = 800;
    const boardHeight = 600;

    // Move player MODIFIED
    switch (playerDirection) {
        case "down":
            playerY = playerY + playerSpeed / fps;
            break;
        case "up":
            playerY = playerY - playerSpeed / fps;
            break;
    }
    switch (playerDirection2) {
        case "down":
            player2Y = player2Y + playerSpeed / fps;
            break;
        case "up":
            player2Y = player2Y - playerSpeed / fps;
            break;
    }

    // Keep player in bounds
    const playerMinY = playerHalf;
    const playerMaxY = boardHeight - playerHalf;

    if (playerY < playerMinY) {

        playerY = playerMinY;

    } else if (playerY > playerMaxY) {

        playerY = playerMaxY;
    }

    if (player2Y < playerMinY) {

        player2Y = playerMinY;

    } else if (player2Y > playerMaxY) {

        player2Y = playerMaxY;
    }

    // Move ball
    let ballNextX = ballX;
    let ballNextY = ballY;
    switch (ballDirection) {
        case "upRight":
            ballNextX = ballX + ballSpeed / fps;
            ballNextY = ballY - ballSpeed / fps;
            break;
        case "upLeft":
            ballNextX = ballX - ballSpeed / fps;
            ballNextY = ballY - ballSpeed / fps;
            break;
        case "downRight":
            ballNextX = ballX + ballSpeed / fps;
            ballNextY = ballY + ballSpeed / fps;
            break;
        case "downLeft":
            ballNextX = ballX - ballSpeed / fps;
            ballNextY = ballY + ballSpeed / fps;
            break;
    }

    // TODO maybe we can use this for the player 2?
    // Check ball collision with board sides
    const lineBall = [[ballX, ballY], [ballNextX, ballNextY]];

    // const lineBoardLeft = [[borderSize, 0], [borderSize, boardHeight]];
    // const intersectionLeft = findIntersection(lineBall, lineBoardLeft);

    // const boardMaxX = boardWidth - borderSize;
    // const lineBoardRight = [[boardMaxX, 0], [boardMaxX, boardHeight]];
    // const intersectionRight = findIntersection(lineBall, lineBoardRight);

    // Keep this!
    const lineBoardTop = [[0, borderSize], [boardWidth, borderSize]];
    const intersectionTop = findIntersection(lineBall, lineBoardTop);

    const lineBoardBottom = [[0, boardHeight], [boardWidth, boardHeight]];
    const intersectionBottom = findIntersection(lineBall, lineBoardBottom);
    // if (intersectionLeft != null) {
    //     switch (ballDirection) {
    //         case "upLeft": 
    //             ballDirection = "upRight";
    //             break;
    //         case "downLeft": 
    //             ballDirection = "downRight";
    //             break;
    //     }
    //     ballX = intersectionLeft[0] + 1;
    //     ballY = intersectionLeft[1];

    // } else if (intersectionRight != null) {

    //     switch (ballDirection) {
    //         case "upRight": 
    //             ballDirection = "upLeft";
    //             break;
    //         case "downRight": 
    //             ballDirection = "downLeft";
    //             break;
    //     }
    //     ballX = intersectionRight[0] - 1;
    //     ballY = intersectionRight[1];
    if (intersectionTop != null) {
        console.log(intersectionTop, "top", lineBall, lineBoardTop);
        switch (ballDirection) {
            case "upRight":
                ballDirection = "downRight";
                break;
            case "upLeft":
                ballDirection = "downLeft";
                break;
        }
        ballX = intersectionTop[0];
        ballY = intersectionTop[1] + 1;
    } else if (intersectionBottom != null) {
        console.log(intersectionBottom, "bottom");
        switch (ballDirection) {
            case "downRight":
                ballDirection = "upRight";
                break;
            case "downLeft":
                ballDirection = "upLeft";
                break;
        }
        ballX = intersectionBottom[0];
        ballY = intersectionBottom[1] - 1;

    } else {
        if (ballNextX > boardWidth) {
            ballX = 400;
            ballY = 300;
            player2Y = 300;
            playerY = 300;
            playerPoints++
            startingPlayer = 2;
            roundStarted = false;
            if (playerPoints == 5) {
                currentMessage = "Player 1 wins! \nPlayer 2 press SPACE to start a new game"
            } else {
                currentMessage = "Player 2 press SPACE to kick the ball"
            }
        } else if (ballNextX < 0) {
            ballX = 400;
            ballY = 300;
            player2Y = 300;
            playerY = 300;
            playerPoints2++
            startingPlayer = 1;
            roundStarted = false;
            if (playerPoints2 == 5) {
                currentMessage = "Player 2 wins! \nPlayer 1 press SPACE to start a new game"
            } else {
                currentMessage = "Player 1 press SPACE to kick the ball"
            }
        } else {
            ballX = ballNextX;
            ballY = ballNextY;
        }
    }

    // Check ball collision with player
    const linePlayer = [[playerX, playerY - playerHalf], [playerX, playerY + playerHalf]];
    const intersectionPlayer = findIntersection(lineBall, linePlayer);

    const linePlayer2 = [[player2X, player2Y + playerHalf], [player2X, player2Y - playerHalf]];
    const intersectionPlayer2 = findIntersection(lineBall, linePlayer2);

    if (intersectionPlayer != null) {

        switch (ballDirection) {
            case "downLeft":
                ballDirection = "downRight";
                break;
            case "upLeft":
                ballDirection = "upRight";
                break;
        }
        ballX = intersectionPlayer[0] + 1;
        ballY = intersectionPlayer[1];
        ballSpeed = ballSpeed + ballSpeedIncrement;
        playerSpeed = playerSpeed + playerSpeedIncrement;
    } else if (intersectionPlayer2 != null) {
        switch (ballDirection) {
            case "downRight":
                ballDirection = "downLeft";
                break;
            case "upRight":
                ballDirection = "upLeft";
                break;
        }
        ballX = intersectionPlayer2[0] - 1;
        ballY = intersectionPlayer2[1];
        ballSpeed = ballSpeed + ballSpeedIncrement;
        playerSpeed = playerSpeed + playerSpeedIncrement;
    }

    // Set player Y position
    // playerY = 600 - playerHeight - 10; // TODO change!!!!!
}

function findIntersection(lineA, lineB) {
    result = [0, 0];

    const aX0 = lineA[0][0];
    const aY0 = lineA[0][1];
    const aX1 = lineA[1][0];
    const aY1 = lineA[1][1];

    const bX0 = lineB[0][0];
    const bY0 = lineB[0][1];
    const bX1 = lineB[1][0];
    const bY1 = lineB[1][1];

    var x, y;

    if (aX1 == aX0) { // lineA is vertical
        if (bX1 == bX0) { // lineB is vertical too
            return null;
        }
        x = aX0;
        const bM = (bY1 - bY0) / (bX1 - bX0);
        const bB = bY0 - bM * bX0;
        y = bM * x + bB;
    } else if (bX1 == bX0) { // lineB is vertical
        x = bX0;
        const aM = (aY1 - aY0) / (aX1 - aX0);
        const aB = aY0 - aM * aX0;
        y = aM * x + aB;
    } else {
        const aM = (aY1 - aY0) / (aX1 - aX0);
        const aB = aY0 - aM * aX0;

        const bM = (bY1 - bY0) / (bX1 - bX0);
        const bB = bY0 - bM * bX0;

        const tolerance = 1e-5;
        if (Math.abs(aM - bM) < tolerance) {
            return null;
        }

        x = (bB - aB) / (aM - bM);
        y = aM * x + aB;
    }

    // Check if the intersection point is within the bounding boxes of both line segments
    const boundingBoxTolerance = 1e-5;
    const withinA = x >= Math.min(aX0, aX1) - boundingBoxTolerance &&
        x <= Math.max(aX0, aX1) + boundingBoxTolerance &&
        y >= Math.min(aY0, aY1) - boundingBoxTolerance &&
        y <= Math.max(aY0, aY1) + boundingBoxTolerance;
    const withinB = x >= Math.min(bX0, bX1) - boundingBoxTolerance &&
        x <= Math.max(bX0, bX1) + boundingBoxTolerance &&
        y >= Math.min(bY0, bY1) - boundingBoxTolerance &&
        y <= Math.max(bY0, bY1) + boundingBoxTolerance;

    if (withinA && withinB) {
        result[0] = x;
        result[1] = y;
    } else {
        return null;
    }
    return result;
}

function getRst() {
    return { type: "gameData", playerX: playerX, player2X: player2X, player2Y: player2Y, playerY: playerY, playerPoints: playerPoints, playerPoints2: playerPoints2, ballX: ballX, ballY: ballY, currentMessage: currentMessage }
}

function updateDirection(player, state) {
    if (player == "1") {
        playerDirection = state
    } else if (player == "2") {
        playerDirection2 = state
    }
}

function kickBall(player) {
    if (player == startingPlayer && startingPlayer == 1 && !roundStarted) {
        if (playerPoints == 5 || playerPoints2 == 5) {
            playerPoints = 0
            playerPoints2 = 0
        }
        if (Math.round(Math.random()) == 1) {
            ballDirection = "downRight"
        } else {
            ballDirection = "upRight"
        }
        currentMessage = ""
        roundStarted = true
    } else if (player == startingPlayer && startingPlayer == 2 && !roundStarted) {
        if (playerPoints == 5 || playerPoints2 == 5) {
            playerPoints = 0
            playerPoints2 = 0
        }
        if (Math.round(Math.random()) == 1) {
            ballDirection = "downLeft"
        } else {
            ballDirection = "upLeft"
        }
        currentMessage = ""
        roundStarted = true
    }
}

function reset() {
    if (Math.round(Math.random()) == 1) {
        startingPlayer = 1;
        currentMessage = "Player 1 press SPACE to kick the ball";
    } else {
        startingPlayer = 2;
        currentMessage = "Player 2 press SPACE to kick the ball";
    }
    ballX = 400;
    ballY = 300;
    player2Y = 300;
    playerY = 300;
    playerPoints = 0
    playerPoints2 = 0
}
module.exports = { run, getRst, updateDirection, kickBall, reset }