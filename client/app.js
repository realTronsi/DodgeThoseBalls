var canvas = document.getElementById("Game");
var ctx = canvas.getContext("2d");
var keys = [];
var pX = [];
var pY = [];
var pS = [];
var pH = [];
var pMH = [];
var pF = [];
var pHA = [];
var respawn = 0;
var bullets = [];
var enemies = [];
var enemyBullets = [];
var upgrades = [];
var mouseX;
var mouseY;
var wave = 0;
var autofire = false;
var points = 0;

var ws = new WebSocket("wss://h5ohd-4041.sse.codesandbox.io/");
ws.onopen = function(e) {
  console.log("Connected to Server");
  gameLoop();
};

ws.onmessage = function(e) {
  var data = JSON.parse(e.data);
  if (data.type === "update") {
    pX = data.pX;
    pY = data.pY;
    pS = data.pS;
    pH = data.pH;
    pMH = data.pMH;
    pF = data.pF;
    pHA = data.pHA;
    enemies = data.enemies;
    enemyBullets = data.enemyBullets;
    bullets = data.bullets;
    wave = data.wave;
  }
  if (data.type === "personal") {
    points = data.points;
    points = Math.round(points);
    respawn = data.respawn;
    upgrades = [];
    upgrades.push(1 + (data.maxhp - 100) / 10);
    upgrades.push(1 + (data.regen - 0.02) / 0.005);
    upgrades.push(1 + (50 - data.reload) / 5);
    upgrades.push(1 + (data.speed - 3) / 0.4);
    upgrades.push(1 + (data.damage - 5) / 1);
    upgrades.push(1 + data.healAura / 30);
  }
};

ws.onclose = function() {
  console.log("Connection closed");
};

function shootBullet() {
  const payLoad = {
    type: "shootBullet",
    mx: mouseX,
    my: mouseY
  };
  ws.send(JSON.stringify(payLoad));
}

function gameLoop() {
  ctx.clearRect(0, 0, 900, 700);
  ctx.beginPath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "black";
  ctx.moveTo(700, 0);
  ctx.lineTo(700, 700);
  ctx.stroke();
  ctx.beginPath();
  ctx.font = "30px Comic Sans MS";
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.textAlign = "center";
  ctx.fillText(wave, 350, 40);
  ctx.font = "15px Comic Sans MS";
  ctx.fillText("Points: " + points, 800, 40);
  for (let i = 0; i < upgrades.length; i++) {
    ctx.beginPath();
    ctx.fillStyle = "gray";
    ctx.arc(800, 90 * i + 90, 40, 0, Math.PI * 2);
    ctx.fill();
    if (points < Math.round(Math.pow(2, upgrades[i]))) {
      ctx.beginPath();
      ctx.fillStyle = "red";
      ctx.arc(
        800,
        90 * i + 90,
        40,
        0,
        (Math.PI * 2 * points) / Math.pow(2, upgrades[i])
      );
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "gray";
      ctx.arc(800, 90 * i + 90, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.fillStyle = "green";
      ctx.arc(800, 90 * i + 90, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    if (i === 0) {
      ctx.fillText("Health", 800, 90 * i + 95);
    } else if (i === 1) {
      ctx.fillText("Regen", 800, 90 * i + 95);
    } else if (i === 2) {
      ctx.fillText("Reload", 800, 90 * i + 95);
    } else if (i === 3) {
      ctx.fillText("Speed", 800, 90 * i + 95);
    } else if (i === 4) {
      ctx.fillText("Damage", 800, 90 * i + 95);
    } else if (i === 5) {
      ctx.fillText("HealAura", 800, 90 * i + 95);
    }
  }

  for (let i = 0; i < pS.length; i++) {
    ctx.beginPath();
    if (pF[i] <= 0) {
      ctx.fillStyle = "black";
    } else {
      ctx.fillStyle = "rgb(83, 35, 90)";
    }
    ctx.arc(pX[i], pY[i], pS[i], 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(pX[i], pY[i], (pS[i] * 8) / 9, 0, (Math.PI * 2 * pH[i]) / pMH[i]);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "rgba(92, 200, 79, 0.1)";
    ctx.arc(pX[i], pY[i], pHA[i], 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    if (pF[i] <= 0) {
      ctx.fillStyle = "black";
    } else {
      ctx.fillStyle = "rgb(83, 35, 90)";
    }
    ctx.arc(pX[i], pY[i], (pS[i] * 7) / 9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < bullets.length; i++) {
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(bullets[i].x, bullets[i].y, bullets[i].size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < enemyBullets.length; i++) {
    ctx.beginPath();
    if (enemyBullets[i].type === "sniperBullet") {
      ctx.fillStyle = "rgb(180, 47, 8)";
    } else if (enemyBullets[i].type === "octoBullet") {
      ctx.fillStyle = "rgb(223, 68, 68)";
    } else if (enemyBullets[i].type === "IceSniperBullet") {
      ctx.fillStyle = "rgb(150, 85, 207)";
    }
    ctx.arc(
      enemyBullets[i].x,
      enemyBullets[i].y,
      enemyBullets[i].size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].type !== "border") {
      if (enemies[i].type === "slower") {
        ctx.beginPath();
        ctx.fillStyle = "rgba(235, 65, 70, 0.3)";
        ctx.arc(enemies[i].x, enemies[i].y, enemies[i].range, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      if (enemies[i].type === "normal") {
        ctx.fillStyle = "rgb(81, 81, 81)";
      } else if (enemies[i].type === "slower") {
        ctx.fillStyle = "rgb(188, 50, 54)";
      } else if (enemies[i].type === "wall") {
        ctx.fillStyle = "rgb(123, 181, 222)";
      } else if (enemies[i].type === "dasher") {
        ctx.fillStyle = "rgb(33, 47, 171)";
      } else if (enemies[i].type === "homing") {
        ctx.fillStyle = "rgb(250, 165, 106)";
      } else if (enemies[i].type === "sniper") {
        ctx.fillStyle = "rgb(201, 66, 27)";
      } else if (enemies[i].type === "octo") {
        ctx.fillStyle = "rgb(245, 75, 75)";
      } else if (enemies[i].type === "IceSniper") {
        ctx.fillStyle = "rgb(106, 37, 163)";
      }
      ctx.arc(enemies[i].x, enemies[i].y, enemies[i].size, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "white";
      ctx.arc(
        enemies[i].x,
        enemies[i].y,
        (enemies[i].size * 8) / 9,
        0,
        (Math.PI * 2 * enemies[i].hp) / enemies[i].maxhp
      );
      ctx.fill();
      ctx.beginPath();
      if (enemies[i].type === "normal") {
        ctx.fillStyle = "rgb(81, 81, 81)";
      } else if (enemies[i].type === "slower") {
        ctx.fillStyle = "rgb(188, 50, 54)";
      } else if (enemies[i].type === "wall") {
        ctx.fillStyle = "rgb(123, 181, 222)";
      } else if (enemies[i].type === "dasher") {
        ctx.fillStyle = "rgb(33, 47, 171)";
      } else if (enemies[i].type === "homing") {
        ctx.fillStyle = "rgb(250, 165, 106)";
      } else if (enemies[i].type === "sniper") {
        ctx.fillStyle = "rgb(201, 66, 27)";
      } else if (enemies[i].type === "octo") {
        ctx.fillStyle = "rgb(245, 75, 75)";
      } else if (enemies[i].type === "IceSniper") {
        ctx.fillStyle = "rgb(106, 37, 163)";
      }
      ctx.arc(enemies[i].x, enemies[i].y, enemies[i].size, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "white";
      ctx.arc(
        enemies[i].x,
        enemies[i].y,
        (enemies[i].size * 8) / 9,
        0,
        (Math.PI * 2 * enemies[i].hp) / enemies[i].maxhp
      );
      ctx.fill();
      ctx.beginPath();
      if (enemies[i].type === "normal") {
        ctx.fillStyle = "rgb(81, 81, 81)";
      } else if (enemies[i].type === "slower") {
        ctx.fillStyle = "rgb(188, 50, 54)";
      } else if (enemies[i].type === "wall") {
        ctx.fillStyle = "rgb(123, 181, 222)";
      } else if (enemies[i].type === "dasher") {
        ctx.fillStyle = "rgb(33, 47, 171)";
      } else if (enemies[i].type === "homing") {
        ctx.fillStyle = "rgb(250, 165, 106)";
      } else if (enemies[i].type === "sniper") {
        ctx.fillStyle = "rgb(201, 66, 27)";
      } else if (enemies[i].type === "octo") {
        ctx.fillStyle = "rgb(245, 75, 75)";
      } else if (enemies[i].type === "IceSniper") {
        ctx.fillStyle = "rgb(106, 37, 163)";
      }
      ctx.arc(
        enemies[i].x,
        enemies[i].y,
        (enemies[i].size * 7) / 9,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.fillStyle = "black";
      ctx.arc(enemies[i].x, enemies[i].y, enemies[i].size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (respawn !== 0) {
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(350, 100, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(350, 100, 40, 0, (Math.PI * 2 * respawn) / 100);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(350, 100, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText("Respawning", 350, 170);
  }

  if (
    keys[87] === true ||
    keys[83] === true ||
    keys[68] === true ||
    keys[65] === true ||
    keys[49] === true ||
    keys[50] === true ||
    keys[51] === true ||
    keys[52] === true ||
    keys[53] === true ||
    keys[54] === true ||
    keys[37] === true ||
    keys[38] === true ||
    keys[39] === true ||
    keys[40] === true
  ) {
    const payLoad = {
      type: "keyPress",
      keys: keys
    };
    ws.send(JSON.stringify(payLoad));
    for (let i = 0; i < 6; i++) {
      keys[49 + i] = false;
    }
  }
  if (keys[69] === true) {
    keys[69] = false;
    if (autofire === true) {
      autofire = false;
    } else {
      autofire = true;
    }
  }
  if (keys[190] === true) {
    keys[190] = false;
    ws.send(
      JSON.stringify({
        type: "skip"
      })
    );
  }
  if (autofire === true) {
    shootBullet();
  }
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener("click", function(e) {
  shootBullet();
});
canvas.addEventListener("mousemove", function(e) {
  mouseX = e.clientX - canvas.offsetLeft;
  mouseY = e.clientY - canvas.offsetTop;
});
document.body.addEventListener("keydown", function(e) {
  keys[e.keyCode] = true;
});
document.body.addEventListener("keyup", function(e) {
  keys[e.keyCode] = false;
});
