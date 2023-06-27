const express = require("express");
const app = express();
var WebSocket = require("ws");
var WebSocketServer = require("ws").Server,
  wss = new WebSocketServer({
    port: 4041
  });
var uuid = require("uuid");
var path = require("path");
var clients = [];
var bullets = [];
var enemies = [];
var enemyBullets = [];
var wave = 0;

app.use(express.static("client"));

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(process.env.PORT || 4040, () => {
  console.log("Server listening on port 4040");
});

setInterval(updateGameState, 15);
function updateGameState() {
  for (let x = 0; x < 15; x++) {
    if (wave !== 0 && enemies.length === 4) {
      spawnWave();
    }
    for (let i = 0; i < bullets.length; i++) {
      let spliceBullet = false;
      for (let e = 0; e < enemies.length; e++) {
        if (enemies[e].type === "border") {
          continue;
        }
        if (
          dist(bullets[i].x, bullets[i].y, enemies[e].x, enemies[e].y) <
          bullets[i].size + enemies[e].size
        ) {
          enemies[e].hp -= bullets[i].dmg;
          if (enemies[e].hp <= 0) {
            for (let p = 0; p < clients.length; p++) {
              if (bullets[i].client_id === clients[p].id) {
                clients[p].points++;
              }
            }
            enemies.splice(e, 1);
          }
          spliceBullet = true;
        }
      }
      bullets[i].x += bullets[i].xv * bullets[i].speed;
      bullets[i].y += bullets[i].yv * bullets[i].speed;
      if (bullets[i].x < bullets[i].size) {
        spliceBullet = true;
      } else if (bullets[i].x > 700 - bullets[i].size) {
        spliceBullet = true;
      } else if (bullets[i].y < bullets[i].size) {
        spliceBullet = true;
      } else if (bullets[i].y > 700 - bullets[i].size) {
        spliceBullet = true;
      }
      if (spliceBullet === true) {
        bullets.splice(i, 1);
        i--;
      }
    }
    for (let i = 0; i < enemyBullets.length; i++) {
      let spliceBullet = false;
      for (let c = 0; c < clients.length; c++) {
        if (
          dist(
            enemyBullets[i].x,
            enemyBullets[i].y,
            clients[c].x,
            clients[c].y
          ) <
            clients[c].size + enemyBullets[i].size &&
          clients[c].respawn === 0 &&
          clients[c].shield <= 0
        ) {
          spliceBullet = true;
          if (enemyBullets[i].type !== "IceSniperBullet") {
            clients[c].hp -= enemyBullets[i].damage;
          } else {
            clients[c].frozen = enemyBullets[i].freeze;
          }
          if (clients[c].hp <= 0) {
            clients[c].hp = 0;
            clients[c].respawn = 100;
            clients[c].maxhp = 100;
            clients[c].speed = 3;
            clients[c].regen = 0.02;
            clients[c].reload = 50;
            clients[c].damage = 5;
          }
        }
      }
      enemyBullets[i].x += enemyBullets[i].xv;
      enemyBullets[i].y += enemyBullets[i].yv;
      if (enemyBullets[i].x < enemyBullets[i].size) {
        spliceBullet = true;
      } else if (enemyBullets[i].x > 700 - enemyBullets[i].size) {
        spliceBullet = true;
      } else if (enemyBullets[i].y < enemyBullets[i].size) {
        spliceBullet = true;
      } else if (enemyBullets[i].y > 700 - enemyBullets[i].size) {
        spliceBullet = true;
      }
      if (spliceBullet === true) {
        enemyBullets.splice(i, 1);
        i--;
      }
    }
    for (let i = 0; i < enemies.length; i++) {
      for (let c = 0; c < clients.length; c++) {
        if (
          dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
            clients[c].size + enemies[i].size &&
          clients[c].respawn === 0 &&
          clients[c].shield <= 0
        ) {
          clients[c].hp -= (enemies[i].size * enemies[i].speed) / 20;
          if (enemies[i].type === "border") {
            clients[c].hp = 0;
            clients[c].respawn = 100;
            clients[c].maxhp = 100;
            clients[c].speed = 3;
            clients[c].regen = 0.02;
            clients[c].reload = 50;
            clients[c].damage = 5;
            clients[c].healAura = 0;
          }
          if (clients[c].hp <= 0) {
            clients[c].hp = 0;
            clients[c].respawn = 100;
            clients[c].maxhp = 100;
            clients[c].speed = 3;
            clients[c].regen = 0.02;
            clients[c].reload = 50;
            clients[c].damage = 5;
            clients[c].healAura = 0;
          }
        }
      }
      if (
        enemies[i].type === "normal" ||
        enemies[i].type === "slower" ||
        enemies[i].type === "sniper" ||
        enemies[i].type === "octo" ||
        enemies[i].type === "IceSniper"
      ) {
        enemies[i].x += enemies[i].xv;
        enemies[i].y += enemies[i].yv;
        if (enemies[i].x < enemies[i].size) {
          enemies[i].xv *= -1;
        } else if (enemies[i].x > 700 - enemies[i].size) {
          enemies[i].xv *= -1;
        } else if (enemies[i].y < enemies[i].size) {
          enemies[i].yv *= -1;
        } else if (enemies[i].y > 700 - enemies[i].size) {
          enemies[i].yv *= -1;
        }
        if (enemies[i].type === "octo") {
          enemies[i].timer--;
          if (enemies[i].timer <= 0) {
            enemies[i].timer = enemies[i].reload;
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: 0,
              yv: -enemies[i].bulletSpeed * 0.7,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: enemies[i].bulletSpeed / 2,
              yv: -enemies[i].bulletSpeed / 2,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: enemies[i].bulletSpeed * 0.7,
              yv: 0,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: enemies[i].bulletSpeed / 2,
              yv: enemies[i].bulletSpeed / 2,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: 0,
              yv: enemies[i].bulletSpeed * 0.7,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: -enemies[i].bulletSpeed / 2,
              yv: enemies[i].bulletSpeed / 2,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: -enemies[i].bulletSpeed * 0.7,
              yv: 0,
              type: "octoBullet"
            });
            enemyBullets.push({
              x: enemies[i].x,
              y: enemies[i].y,
              damage: enemies[i].bulletDamage,
              size: enemies[i].bulletSize,
              xv: -enemies[i].bulletSpeed / 2,
              yv: -enemies[i].bulletSpeed / 2,
              type: "octoBullet"
            });
          }
        }
        if (enemies[i].type === "sniper") {
          enemies[i].timer--;
          if (enemies[i].timer <= 0) {
            enemies[i].timer = enemies[i].reload;
            let shoot = false;
            let closest = 69420;
            let clientX = -1;
            let clientY = -1;
            for (let c = 0; c < clients.length; c++) {
              if (
                dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
                  enemies[i].range &&
                clients[c].respawn === 0
              ) {
                shoot = true;
                if (
                  dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
                  closest
                ) {
                  closest = dist(
                    enemies[i].x,
                    enemies[i].y,
                    clients[c].x,
                    clients[c].y
                  );
                  clientX = clients[c].x;
                  clientY = clients[c].y;
                }
              }
            }
            if (shoot === true) {
              let dir = Math.atan2(
                clientY - enemies[i].y,
                clientX - enemies[i].x
              );
              let xv = Math.cos(dir) * enemies[i].bulletSpeed;
              let yv = Math.sin(dir) * enemies[i].bulletSpeed;
              enemyBullets.push({
                x: enemies[i].x,
                y: enemies[i].y,
                damage: enemies[i].bulletDamage,
                size: enemies[i].bulletSize,
                xv: xv,
                yv: yv,
                type: "sniperBullet"
              });
            }
          }
        }
        if (enemies[i].type === "IceSniper") {
          enemies[i].timer--;
          if (enemies[i].timer <= 0) {
            enemies[i].timer = enemies[i].reload;
            let shoot = false;
            let closest = 69420;
            let clientX = -1;
            let clientY = -1;
            for (let c = 0; c < clients.length; c++) {
              if (
                dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
                  enemies[i].range &&
                clients[c].respawn === 0
              ) {
                shoot = true;
                if (
                  dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
                  closest
                ) {
                  closest = dist(
                    enemies[i].x,
                    enemies[i].y,
                    clients[c].x,
                    clients[c].y
                  );
                  clientX = clients[c].x;
                  clientY = clients[c].y;
                }
              }
            }
            if (shoot === true) {
              let dir = Math.atan2(
                clientY - enemies[i].y,
                clientX - enemies[i].x
              );
              let xv = Math.cos(dir) * enemies[i].bulletSpeed;
              let yv = Math.sin(dir) * enemies[i].bulletSpeed;
              enemyBullets.push({
                x: enemies[i].x,
                y: enemies[i].y,
                freeze: enemies[i].freezeDuration,
                size: enemies[i].bulletSize,
                xv: xv,
                yv: yv,
                type: "IceSniperBullet"
              });
            }
          }
        }
      } else if (enemies[i].type === "homing") {
        enemies[i].speed = enemies[i].basespeed;
        let home = false;
        let closest = 69420;
        let clientX = -1;
        let clientY = -1;
        for (let c = 0; c < clients.length; c++) {
          if (
            dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
              enemies[i].range &&
            clients[c].respawn === 0
          ) {
            enemies[i].speed = enemies[i].basespeed / 2; //for damage
            home = true;
            if (
              dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
              closest
            ) {
              closest = dist(
                enemies[i].x,
                enemies[i].y,
                clients[c].x,
                clients[c].y
              );
              clientX = clients[c].x;
              clientY = clients[c].y;
            }
          }
        }
        if (home === true) {
          let dir = Math.atan2(clientY - enemies[i].y, clientX - enemies[i].x);
          let xv = (Math.cos(dir) * enemies[i].basespeed) / 1.5;
          let yv = (Math.sin(dir) * enemies[i].basespeed) / 1.5;
          enemies[i].x += xv;
          enemies[i].y += yv;
          if (enemies[i].x < enemies[i].size) {
            enemies[i].x = enemies[i].size;
          } else if (enemies[i].x > 700 - enemies[i].size) {
            enemies[i].x = 700 - enemies[i].size;
          }
          if (enemies[i].y < enemies[i].size) {
            enemies[i].y = enemies[i].size;
          } else if (enemies[i].y > 700 - enemies[i].size) {
            enemies[i].y = 700 - enemies[i].size;
          }
        } else {
          enemies[i].x += enemies[i].xv;
          enemies[i].y += enemies[i].yv;
          if (enemies[i].x < enemies[i].size) {
            enemies[i].xv *= -1;
          } else if (enemies[i].x > 700 - enemies[i].size) {
            enemies[i].xv *= -1;
          } else if (enemies[i].y < enemies[i].size) {
            enemies[i].yv *= -1;
          } else if (enemies[i].y > 700 - enemies[i].size) {
            enemies[i].yv *= -1;
          }
        }
      } else if (enemies[i].type === "dasher") {
        enemies[i].speed = enemies[i].basespeed;
        let dash = false;
        for (let c = 0; c < clients.length; c++) {
          if (
            dist(enemies[i].x, enemies[i].y, clients[c].x, clients[c].y) <
              enemies[i].size * 7 &&
            clients[c].respawn === 0
          ) {
            enemies[i].speed = enemies[i].basespeed * 6; //for damage
            dash = true;
            break;
          }
        }
        if (dash === true) {
          enemies[i].x += enemies[i].xv * 3;
          enemies[i].y += enemies[i].yv * 3;
        } else {
          enemies[i].x += enemies[i].xv;
          enemies[i].y += enemies[i].yv;
        }
        if (enemies[i].x < enemies[i].size) {
          enemies[i].xv *= -1;
        } else if (enemies[i].x > 700 - enemies[i].size) {
          enemies[i].xv *= -1;
        } else if (enemies[i].y < enemies[i].size) {
          enemies[i].yv *= -1;
        } else if (enemies[i].y > 700 - enemies[i].size) {
          enemies[i].yv *= -1;
        }
      } else if (enemies[i].type === "wall") {
        if (enemies[i].timer === 0) {
          enemies[i].x += enemies[i].xv;
          enemies[i].y += enemies[i].yv;
        } else {
          enemies[i].timer--;
          if (enemies[i].timer < 0) {
            enemies[i].timer = 0;
          }
        }
        if (enemies[i].x < enemies[i].size) {
          enemies[i].xv *= -1;
          enemies[i].x = enemies[i].size;
          enemies[i].timer = enemies[i].delay;
        } else if (enemies[i].x > 700 - enemies[i].size) {
          enemies[i].xv *= -1;
          enemies[i].x = 700 - enemies[i].size;
          enemies[i].timer = enemies[i].delay;
        } else if (enemies[i].y < enemies[i].size) {
          enemies[i].yv *= -1;
          enemies[i].y = enemies[i].size;
          enemies[i].timer = enemies[i].delay;
        } else if (enemies[i].y > 700 - enemies[i].size) {
          enemies[i].yv *= -1;
          enemies[i].y = 700 - enemies[i].size;
          enemies[i].timer = enemies[i].delay;
        }
      } else if (enemies[i].type === "border") {
        if (enemies[i].direction === 0) {
          enemies[i].x += enemies[i].speed;
        }
        if (enemies[i].direction === 1) {
          enemies[i].y += enemies[i].speed;
        }
        if (enemies[i].direction === 2) {
          enemies[i].x -= enemies[i].speed;
        }
        if (enemies[i].direction === 3) {
          enemies[i].y -= enemies[i].speed;
        }
        if (enemies[i].x < enemies[i].size) {
          enemies[i].direction += 1;
          enemies[i].x = enemies[i].size;
        } else if (enemies[i].x > 700 - enemies[i].size) {
          enemies[i].direction += 1;
          enemies[i].x = 700 - enemies[i].size;
        } else if (enemies[i].y < enemies[i].size) {
          enemies[i].direction += 1;
          enemies[i].y = enemies[i].size;
        } else if (enemies[i].y > 700 - enemies[i].size) {
          enemies[i].direction += 1;
          enemies[i].y = 700 - enemies[i].size;
        }
        if (enemies[i].direction === 4) {
          enemies[i].direction = 0;
        }
      }
    }
    let pX = [];
    let pY = [];
    let pS = [];
    let pH = [];
    let pMH = [];
    let pF = [];
    let pHA = [];
    for (let i = 0; i < clients.length; i++) {
      pX.push(clients[i].x);
      pY.push(clients[i].y);
      pS.push(clients[i].size);
      pH.push(clients[i].hp);
      pMH.push(clients[i].maxhp);
      pF.push(clients[i].frozen);
      pHA.push(clients[i].healAura);
    }
    for (let i = 0; i < clients.length; i++) {
      const clientSocket = clients[i].ws;
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            type: "update",
            pX: pX,
            pY: pY,
            pS: pS,
            pH: pH,
            pMH: pMH,
            pF: pF,
            pHA: pHA,
            wave: wave,
            bullets: bullets,
            enemyBullets: enemyBullets,
            enemies: enemies
          })
        );
      }
    }
  }
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
function updatePlayer(keys, speed, client_id) {
  let spd = speed;
  for (let i = 0; i < clients.length; i++) {
    if (clients[i].id === client_id && clients[i].respawn === 0) {
      if (
        keys[49] === true &&
        clients[i].points >=
          Math.round(Math.pow(2, 1 + (clients[i].maxhp - 100) / 10))
      ) {
        clients[i].points -= Math.round(
          Math.pow(2, 1 + (clients[i].maxhp - 100) / 10)
        );
        clients[i].maxhp += 10;
      }
      if (
        keys[50] === true &&
        clients[i].points >=
          Math.round(Math.pow(2, 1 + (clients[i].regen - 0.02) / 0.005))
      ) {
        clients[i].points -= Math.round(
          Math.pow(2, 1 + (clients[i].regen - 0.02) / 0.005)
        );
        clients[i].regen += 0.005;
      }
      if (
        keys[51] === true &&
        clients[i].points >=
          Math.round(Math.pow(2, 1 + (50 - clients[i].reload) / 5))
      ) {
        clients[i].points -= Math.round(
          Math.pow(2, 1 + (50 - clients[i].reload) / 5)
        );
        clients[i].reload -= 5;
      }
      if (
        keys[52] === true &&
        clients[i].points >=
          Math.round(Math.pow(2, 1 + (clients[i].speed - 3) / 0.4))
      ) {
        clients[i].points -= Math.round(
          Math.pow(2, 1 + (clients[i].speed - 3) / 0.4)
        );
        clients[i].speed += 0.4;
      }
      if (
        keys[53] === true &&
        clients[i].points >=
          Math.round(Math.pow(2, 1 + (clients[i].damage - 5) / 1))
      ) {
        clients[i].points -= Math.round(
          Math.pow(2, 1 + (clients[i].damage - 5) / 1)
        );
        clients[i].damage += 1;
      }
      if (
        keys[54] === true &&
        clients[i].points >=
          Math.round(Math.pow(2, 1 + clients[i].healAura / 30))
      ) {
        clients[i].points -= Math.round(
          Math.pow(2, 1 + clients[i].healAura / 30)
        );
        clients[i].healAura += 30;
      }
      clients[i].points = Math.round(clients[i].points);
      for (let e = 0; e < enemies.length; e++) {
        if (enemies[e].type === "slower") {
          if (
            dist(clients[i].x, clients[i].y, enemies[e].x, enemies[e].y) <
            clients[i].size + enemies[e].range
          ) {
            spd /= 2;
            break;
          }
        }
      }
      if (clients[i].frozen <= 0) {
        if (keys[87] === true || keys[38] === true) {
          clients[i].y -= spd;
        }
        if (keys[83] === true || keys[40] === true) {
          clients[i].y += spd;
        }
        if (keys[68] === true || keys[39] === true) {
          clients[i].x += spd;
        }
        if (keys[65] === true || keys[37] === true) {
          clients[i].x -= spd;
        }
      }
    }
    if (clients[i].x < clients[i].size) {
      clients[i].x = clients[i].size;
    }
    if (clients[i].x > 700 - clients[i].size) {
      clients[i].x = 700 - clients[i].size;
    }
    if (clients[i].y < clients[i].size) {
      clients[i].y = clients[i].size;
    }
    if (clients[i].y > 700 - clients[i].size) {
      clients[i].y = 700 - clients[i].size;
    }
  }
}

function addBullet(mx, my, size, dmg, client_id) {
  for (let i = 0; i < clients.length; i++) {
    if (
      clients[i].id === client_id &&
      clients[i].respawn === 0 &&
      clients[i].frozen <= 0
    ) {
      let x = clients[i].x;
      let y = clients[i].y;
      let dir = Math.atan2(my - clients[i].y, mx - clients[i].x);
      let xv = Math.cos(dir);
      let yv = Math.sin(dir);
      bullets.push({
        x: x,
        y: y,
        xv: xv,
        yv: yv,
        dmg: dmg,
        speed: 0.7,
        size: size,
        client_id: client_id
      });
    }
  }
}
function spawnNormalEnemy(hp, size, speed) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    speed: speed,
    xv: xv,
    yv: yv,
    type: "normal"
  });
}
function spawnDasherEnemy(hp, size, speed) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    basespeed: speed,
    speed: speed,
    xv: xv,
    yv: yv,
    type: "dasher"
  });
}
function spawnWallEnemy(x, y, hp, size, speed, direction, delay) {
  let xv = 0;
  let yv = 0;
  if (direction === 1) {
    xv = 0;
    yv = speed;
  } else if (direction === 2) {
    xv = 0;
    yv = -speed;
  } else if (direction === 3) {
    xv = speed;
    yv = 0;
  } else if (direction === 4) {
    xv = -speed;
    yv = 0;
  }
  enemies.push({
    x: x,
    y: y,
    maxhp: hp,
    hp: hp,
    size: size,
    speed: speed,
    xv: xv,
    yv: yv,
    delay: delay,
    timer: 0,
    type: "wall"
  });
}
function spawnSlowerEnemy(hp, size, speed, range) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    speed: speed,
    range: range,
    xv: xv,
    yv: yv,
    type: "slower"
  });
}
function spawnOctoEnemy(
  hp,
  size,
  speed,
  reload,
  bulletDamage,
  bulletSpeed,
  bulletSize
) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    basespeed: speed,
    speed: speed,
    reload: reload,
    timer: reload,
    bulletDamage: bulletDamage,
    bulletSpeed: bulletSpeed,
    bulletSize: bulletSize,
    xv: xv,
    yv: yv,
    type: "octo"
  });
}
function spawnSniperEnemy(
  hp,
  size,
  speed,
  range,
  reload,
  bulletDamage,
  bulletSpeed,
  bulletSize
) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    basespeed: speed,
    speed: speed,
    range: range,
    reload: reload,
    timer: reload,
    bulletDamage: bulletDamage,
    bulletSpeed: bulletSpeed,
    bulletSize: bulletSize,
    xv: xv,
    yv: yv,
    type: "sniper"
  });
}
function spawnIceSniperEnemy(
  hp,
  size,
  speed,
  range,
  reload,
  freezeDuration,
  bulletSpeed,
  bulletSize
) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    basespeed: speed,
    speed: speed,
    range: range,
    reload: reload,
    timer: reload,
    freezeDuration: freezeDuration,
    bulletSpeed: bulletSpeed,
    bulletSize: bulletSize,
    xv: xv,
    yv: yv,
    type: "IceSniper"
  });
}
function spawnHomingEnemy(hp, size, speed, range) {
  let xv = Math.random() * speed;
  let yv = (speed - xv) * randomPolarity();
  xv *= randomPolarity();
  enemies.push({
    x: 350,
    y: 350,
    maxhp: hp,
    hp: hp,
    size: size,
    basespeed: speed,
    speed: speed,
    range: range,
    xv: xv,
    yv: yv,
    type: "homing"
  });
}
function spawnBorderBalls() {
  enemies.push({
    x: 20,
    y: 20,
    size: 20,
    direction: 0,
    speed: 0.05,
    type: "border"
  });
  enemies.push({
    x: 680,
    y: 20,
    size: 20,
    direction: 1,
    speed: 0.05,
    type: "border"
  });
  enemies.push({
    x: 680,
    y: 680,
    size: 20,
    direction: 2,
    speed: 0.05,
    type: "border"
  });
  enemies.push({
    x: 20,
    y: 680,
    size: 20,
    direction: 3,
    speed: 0.05,
    type: "border"
  });
}

function spawnWave() {
  wave++;
  /*spawnNormalEnemy(20, 15, 0.1);
    spawnSlowerEnemy(20, 15, 0.1, 80);
    spawnWallEnemy(200, 15, 30, 15, 0.2, 1, 1000);
    spawnWallEnemy(15, 400, 50, 15, 0.1, 3, 800);
    spawnDasherEnemy(30, 20, 0.2);
    spawnHomingEnemy(20, 15, 0.1, 200);
    spawnSniperEnemy(50, 20, 0.1, 1000, 1000, 30, 0.3, 5);
    spawnOctoEnemy(20, 15, 0.1, 2000, 10, 0.3, 5);
    spawnIceSniperEnemy(20, 20, 0.1, 2000, 1500, 90, 0.3, 10);
    */
  if (wave === 1) {
    spawnNormalEnemy(20, 15, 0.1);
    spawnNormalEnemy(20, 15, 0.1);
    spawnNormalEnemy(20, 15, 0.1);
  } else if (wave === 2) {
    for (let i = 0; i < 5; i++) {
      spawnNormalEnemy(15, 15, 0.1);
    }
  } else if (wave === 3) {
    for (let i = 0; i < 7; i++) {
      spawnNormalEnemy(20, 17, 0.1);
    }
  } else if (wave === 4) {
    for (let i = 0; i < 5; i++) {
      spawnNormalEnemy(25, 20, 0.1);
    }
    for (let i = 0; i < 5; i++) {
      spawnNormalEnemy(15, 15, 0.12);
    }
  } else if (wave === 5) {
    for (let i = 0; i < 7; i++) {
      spawnNormalEnemy(30, 20, 0.11);
    }
  } else if (wave === 6) {
    for (let i = 0; i < 5; i++) {
      spawnNormalEnemy(40, 23, 0.125);
    }
  } else if (wave === 7) {
    for (let i = 0; i < 4; i++) {
      spawnNormalEnemy(25, 15, 0.1);
    }
    for (let i = 0; i < 4; i++) {
      spawnNormalEnemy(15, 10, 0.12);
    }
    spawnSlowerEnemy(20, 15, 0.1, 120);
    spawnSlowerEnemy(20, 15, 0.1, 120);
  } else if (wave === 8) {
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(27, 17, 0.11);
    }
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(17, 12, 0.13);
    }
    spawnSlowerEnemy(25, 17, 0.11, 120);
    spawnSlowerEnemy(25, 17, 0.11, 120);
  } else if (wave === 9) {
    for (let i = 0; i < 10; i++) {
      spawnNormalEnemy(33, 20, 0.14);
    }
  } else if (wave === 10) {
    spawnNormalEnemy(60, 40, 0.05);
    spawnNormalEnemy(60, 40, 0.05);
    for (let i = 0; i < 8; i++) {
      spawnNormalEnemy(35, 20, 0.08);
    }
  } else if (wave === 11) {
    spawnDasherEnemy(20, 15, 0.09);
    spawnDasherEnemy(20, 15, 0.09);
  } else if (wave === 12) {
    for (let i = 0; i < 6; i++) {
      spawnDasherEnemy(23, 17, 0.1);
    }
  } else if (wave === 13) {
    for (let i = 0; i < 9; i++) {
      spawnDasherEnemy(23, 20, 0.11);
    }
  } else if (wave === 14) {
    for (let i = 0; i < 7; i++) {
      spawnDasherEnemy(23, 20, 0.11);
    }
    for (let i = 0; i < 4; i++) {
      spawnNormalEnemy(17, 15, 0.1);
    }
  } else if (wave === 15) {
    for (let i = 0; i < 8; i++) {
      spawnDasherEnemy(25, 20, 0.12);
    }
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(20, 13, 0.11);
    }
  } else if (wave === 16) {
    for (let i = 0; i < 10; i++) {
      spawnDasherEnemy(30, 20, 0.12);
    }
    for (let i = 0; i < 8; i++) {
      spawnNormalEnemy(23, 15, 0.12);
    }
  } else if (wave === 17) {
    for (let i = 0; i < 12; i++) {
      spawnDasherEnemy(30, 20, 0.14);
    }
  } else if (wave === 18) {
    for (let i = 0; i < 13; i++) {
      spawnDasherEnemy(35, 23, 0.15);
    }
  } else if (wave === 19) {
    for (let i = 0; i < 15; i++) {
      spawnDasherEnemy(45, 25, 0.1);
    }
  } else if (wave === 20) {
    spawnDasherEnemy(65, 40, 0.11);
    spawnDasherEnemy(65, 40, 0.11);
    for (let i = 0; i < 6; i++) {
      spawnDasherEnemy(20, 15, 0.13);
    }
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(23, 15, 0.1);
    }
  } else if (wave === 21) {
    for (let i = 0; i < 4; i++) {
      spawnHomingEnemy(20, 20, 0.1, 200);
    }
    for (let i = 0; i < 4; i++) {
      spawnNormalEnemy(20, 20, 0.1);
    }
  } else if (wave === 22) {
    for (let i = 0; i < 5; i++) {
      spawnHomingEnemy(23, 20, 0.11, 200);
    }
    for (let i = 0; i < 5; i++) {
      spawnNormalEnemy(23, 20, 0.11);
    }
  } else if (wave === 23) {
    for (let i = 0; i < 7; i++) {
      spawnHomingEnemy(23, 20, 0.12, 200);
    }
    for (let i = 0; i < 7; i++) {
      spawnNormalEnemy(23, 20, 0.12);
    }
  } else if (wave === 24) {
    for (let i = 0; i < 5; i++) {
      spawnHomingEnemy(30, 20, 0.13, 200);
    }
    for (let i = 0; i < 5; i++) {
      spawnNormalEnemy(30, 20, 0.13);
    }
  } else if (wave === 25) {
    for (let i = 0; i < 4; i++) {
      spawnHomingEnemy(30, 20, 0.13, 200);
    }
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(30, 15, 0.14);
    }
    spawnSlowerEnemy(20, 15, 0.13, 200);
    spawnSlowerEnemy(20, 15, 0.13, 200);
  } else if (wave === 26) {
    for (let i = 0; i < 6; i++) {
      spawnHomingEnemy(30, 20, 0.14, 200);
    }
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(30, 17, 0.15);
    }
    spawnSlowerEnemy(23, 15, 0.14, 200);
    spawnSlowerEnemy(23, 15, 0.14, 200);
    spawnSlowerEnemy(23, 15, 0.14, 200);
  } else if (wave === 27) {
    for (let i = 0; i < 8; i++) {
      spawnHomingEnemy(40, 20, 0.16, 200);
    }
  } else if (wave === 28) {
    for (let i = 0; i < 8; i++) {
      spawnHomingEnemy(45, 23, 0.18, 250);
    }
  } else if (wave === 29) {
    for (let i = 0; i < 12; i++) {
      spawnHomingEnemy(50, 27, 0.14, 250);
    }
  } else if (wave === 30) {
    spawnDasherEnemy(65, 40, 0.11);
    spawnNormalEnemy(60, 40, 0.05);
    spawnHomingEnemy(60, 40, 0.09, 250);
    for (let i = 0; i < 4; i++) {
      spawnHomingEnemy(30, 20, 0.12, 200);
    }
    for (let i = 0; i < 4; i++) {
      spawnNormalEnemy(30, 15, 0.13);
    }
    for (let i = 0; i < 4; i++) {
      spawnDasherEnemy(30, 15, 0.11);
    }
    spawnSlowerEnemy(23, 15, 0.14, 200);
    spawnSlowerEnemy(23, 15, 0.14, 200);
  } else if (wave === 31) {
    spawnSniperEnemy(30, 20, 0.1, 1000, 1000, 20, 0.3, 5);
    spawnSniperEnemy(30, 20, 0.1, 1000, 1000, 20, 0.3, 5);
  } else if (wave === 32) {
    for (let i = 0; i < 4; i++) {
      spawnSniperEnemy(23, 17, 0.1, 1000, 1000, 10, 0.4, 4);
    }
  } else if (wave === 33) {
    for (let i = 0; i < 2; i++) {
      spawnSniperEnemy(35, 25, 0.15, 1000, 1200, 40, 0.3, 7);
      spawnSlowerEnemy(23, 15, 0.14, 200);
    }
  } else if (wave === 34) {
    for (let i = 0; i < 3; i++) {
      spawnSniperEnemy(30, 17, 0.2, 1000, 700, 10, 0.3, 4);
    }
    spawnNormalEnemy(30, 15, 0.14);
    spawnNormalEnemy(30, 15, 0.14);
  } else if (wave === 35) {
    for (let i = 0; i < 2; i++) {
      spawnSniperEnemy(53, 23, 0.13, 1000, 1200, 25, 0.3, 5);
    }
    spawnSlowerEnemy(30, 17, 0.1, 150);
    spawnSlowerEnemy(30, 17, 0.1, 150);
  } else if (wave === 36) {
    for (let i = 0; i < 3; i++) {
      spawnSniperEnemy(33, 20, 0.14, 1000, 1000, 20, 0.3, 5);
    }
    for (let i = 0; i < 6; i++) {
      spawnNormalEnemy(20, 17, 0.14);
    }
  } else if (wave === 37) {
    for (let i = 0; i < 2; i++) {
      spawnSniperEnemy(45, 23, 0.11, 1000, 1400, 30, 0.4, 5);
    }
    for (let i = 0; i < 5; i++) {
      spawnDasherEnemy(20, 15, 0.13);
    }
  } else if (wave === 38) {
    for (let i = 0; i < 4; i++) {
      spawnSniperEnemy(33, 17, 0.1, 1000, 1200, 20, 0.3, 5);
    }
    for (let i = 0; i < 4; i++) {
      spawnHomingEnemy(33, 17, 0.1, 250);
    }
    spawnSlowerEnemy(30, 17, 0.15, 130);
  } else if (wave === 39) {
    for (let i = 0; i < 2; i++) {
      spawnSniperEnemy(60, 23, 0.05, 1000, 1200, 45, 0.3, 10);
    }
    for (let i = 0; i < 4; i++) {
      spawnSlowerEnemy(60, 23, 0.07);
    }
  } else if (wave === 40) {
    spawnSniperEnemy(440, 50, 0, 1000, 900, 100, 0.3, 20);
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPolarity() {
  if (Math.random() < 0.5) {
    return -1;
  } else {
    return 1;
  }
}

wss.on("connection", function(ws) {
  var client_id = uuid.v4();
  var reloadTimer = 0;
  var reload = 50;
  var speed = 3;
  var damage = 5;

  clients.push({
    id: client_id,
    ws: ws,
    x: 60,
    y: 60,
    size: 10,
    hp: 100,
    maxhp: 100,
    regen: 0.02,
    frozen: 0,
    damage: damage,
    reload: reload,
    speed: speed,
    shield: 50,
    healAura: 0,
    respawn: 0,
    points: 0
  });
  if (clients.length === 1) {
    wave = 0;
    enemies = [];
    enemyBullets = [];
    spawnBorderBalls();
    spawnWave();
  }
  setInterval(function() {
    reloadTimer--;
    if (reloadTimer < 0) {
      reloadTimer = 0;
    }
    for (let i = 0; i < clients.length; i++) {
      if (client_id === clients[i].id) {
        for (let c = 0; c < clients.length; c++) {
          if (
            dist(clients[i].x, clients[i].y, clients[c].x, clients[c].y) <
              clients[c].healAura &&
            clients[i].id !== client_id
          ) {
            clients[i].hp += clients[c].regen / 2;
          }
        }
        reload = clients[i].reload;
        let maxhp = clients[i].maxhp;
        let regen = clients[i].regen;
        clients[i].frozen--;
        if (clients[i].frozen < 0) {
          clients[i].frozen = 0;
        }
        speed = clients[i].speed;
        damage = clients[i].damage;
        let healAura = clients[i].healAura;
        if (clients[i].shield > 0) {
          clients[i].shield--;
        }
        if (clients[i].respawn === 0) {
          clients[i].hp += clients[i].regen;
          if (clients[i].hp > clients[i].maxhp) {
            clients[i].hp = clients[i].maxhp;
          }
        } else {
          let canRespawn = false;
          for (let c = 0; c < clients.length; c++) {
            if (clients[c].respawn === 0) {
              canRespawn = true;
              break;
            }
          }
          if (canRespawn === true) {
            clients[i].respawn -= 0.1;
          }
          if (clients[i].respawn < 0) {
            clients[i].respawn = 0;
            clients[i].shield = 50;
          }
        }
        const clientSocket = clients[i].ws;
        let points = clients[i].points;
        let respawn = clients[i].respawn;
        if (clientSocket.readyState === WebSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: "personal",
              points: points,
              respawn: respawn,
              maxhp: maxhp,
              regen: regen,
              reload: reload,
              speed: speed,
              damage: damage,
              healAura: healAura
            })
          );
        }
        break;
      }
    }
  }, 10);
  ws.on("message", function(message) {
    let msg = JSON.parse(message);
    if (msg.type === "keyPress") {
      updatePlayer(msg.keys, speed, client_id);
    } else if (msg.type === "shootBullet" && reloadTimer === 0) {
      reloadTimer = reload;
      addBullet(msg.mx, msg.my, 5, damage, client_id);
    } else if (msg.type === "skip") {
      for (let i = 0; i < enemies.length; i++) {
        if (enemies[i].type !== "border") {
          enemies.splice(i, 1);
          i--;
        }
      }
      enemyBullets = [];
      spawnWave();
    }
  });
  ws.on("close", function() {
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].id === client_id) {
        clients.splice(i, 1);
      }
    }
  });
});
