const socket = io();

const isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;

const mouseDownEvent = isTouchDevice ? 'touchstart' : 'mousedown';
const mouseUpEvent = isTouchDevice ? 'touchend' : 'mouseup';

const playerWidth = 0.3;
const playerHeight = 0.8;
const playerSpeed = 1.5;
const playerRotationSpeed = 0.9 * Math.PI;

const bulletSize = 0.05;
const bulletSpeed = 3;

const wallSymbol = '#';
const wallSize = 1;
const wallHeight = 1;

let gunshotSound = null;
let winSound = null;

let renderer = null;
let camera = null;
let scene = null;

let playerBodies = [];
let wallBodies = [];

let players = [];
let player = null;
let bullets = [];
let walls = [];
let spawnPosition = [0, 0];
let dead = false;
let shootTime = 0;

let pressedKeys = {};

let winScore = 10;
let score = 0;
let scoreElement = document.querySelector('#score');

let mobileButtons = document.querySelector('#mobile-buttons'); 
if (isTouchDevice) {
  mobileButtons.style.display = 'block';
}

let upButton = document.querySelector('#up-button');
upButton.addEventListener(mouseDownEvent, () => pressedKeys[keyCode['Up']] = true);
upButton.addEventListener(mouseUpEvent, () => pressedKeys[keyCode['Up']] = false);
let downButton = document.querySelector('#down-button');
downButton.addEventListener(mouseDownEvent, () => pressedKeys[keyCode['Down']] = true);
downButton.addEventListener(mouseUpEvent, () => pressedKeys[keyCode['Down']] = false);
let leftButton = document.querySelector('#left-button');
leftButton.addEventListener(mouseDownEvent, () => pressedKeys[keyCode['Left']] = true);
leftButton.addEventListener(mouseUpEvent, () => pressedKeys[keyCode['Left']] = false);
let rightButton = document.querySelector('#right-button');
rightButton.addEventListener(mouseDownEvent, () => pressedKeys[keyCode['Right']] = true);
rightButton.addEventListener(mouseUpEvent, () => pressedKeys[keyCode['Right']] = false);
let shootButton = document.querySelector('#shoot-button');
shootButton.addEventListener(mouseDownEvent, () => pressedKeys[keyCode['Space']] = true);
shootButton.addEventListener(mouseUpEvent, () => pressedKeys[keyCode['Space']] = false);

let name = prompt('Enter your name');
if (!name) {
  name = null;
}
socket.emit('name', name);

initialize();
run();

function initialize() {
  gunshotSound = new Audio('sounds/gunshot.mp3');
  winSound = new Audio('sounds/win.mp3');

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(80, 1, 0.01, 1000);

  renderer = new THREE.WebGLRenderer({alpha: true});
  document.querySelector('#canvas').appendChild(renderer.domElement);
  renderer.setClearColor( 0xf4f4f4, 1);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Soft white light
  let light = new THREE.AmbientLight(0xffffff);
  scene.add(light);

  // Directional light
  let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.x = 0.2;
  scene.add(directionalLight);

  scoreElement.innerHTML = score;
}

function run() {
  let lastTime = Date.now();
  (function loop() {
    requestAnimationFrame(loop);
    let time = Date.now()
    let deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    update(deltaTime);
  })();
}

function update(deltaTime) {
  if (!dead) {
    updatePlayer(deltaTime);
  }

  for (let i = 0; i < bullets.length; ++i) {
    bullets[i].body.update(deltaTime);
  }

  for (let i = 0; i < bullets.length; ++i) {
    let body = bullets[i].body;
    bullets[i].mesh.position.x = body.position[0];
    bullets[i].mesh.position.z = body.position[1];
    if (Date.now() - bullets[i].time > 8000) {
      bullets[i].mesh.visible = false;
      bullets.splice(i, 1);
    }
  }

  handleCollisions();

  renderer.render(scene, camera);
};

function updatePlayer(deltaTime) {
  if (!player) {
    return;
  }

  let rotation = 0;   // angle to rotate player
  let direction = 0;  // forward or backward for player

  let moved = false;
  let rotated = false;

  if (pressedKeys[keyCode['Up']]) {
    moved = true;
    direction += 1;
  }
  if (pressedKeys[keyCode['Down']]) {
    moved = true;
    direction -= 1;
  }
  if (pressedKeys[keyCode['Left']]) {
    rotated = true;
    rotation = playerRotationSpeed;
  }
  if (pressedKeys[keyCode['Right']]) {
    rotated = true;
    rotation = -playerRotationSpeed;
  }

  if (pressedKeys[keyCode['Space']]) {
    shoot();
  }

  // Reset player velocity
  player.body.velocity[0] = 0;
  player.body.velocity[1] = 0;

  if (moved) {
    let lookAtVector = getPlayerLookAtVector(player);
    lookAtVector[0] *= direction;
    lookAtVector[1] *= direction;
    player.body.velocity[0] = lookAtVector[0] * playerSpeed;
    player.body.velocity[1] = lookAtVector[1] * playerSpeed;
  }

  if (player.body.velocity[0] || player.body.velocity[1]) {
    player.body.update(deltaTime);
    player.x = player.body.position[0];
    player.y = player.body.position[1];
    socket.emit('move', player.x, player.y);
  }

  if (rotated) {
    player.rotation += rotation * deltaTime;

    player.mesh.rotation.y = player.rotation;
    socket.emit('rotate', player.rotation);
  }

  camera.position.x = player.x;
  camera.position.z = player.y;
  camera.position.y = -0.05;
  camera.rotation.y = player.rotation;
}

function getPlayerLookAtVector(player) {
  let angle = player.rotation - Math.PI / 2;
  let vector = [-Math.cos(angle), Math.sin(angle)];
  return vector;
}

function createPlayer(id, x, y, rotation, name) {
  let textureLoader = new THREE.TextureLoader();

  let geometry = new THREE.BoxGeometry(playerWidth, playerHeight, playerWidth);
  let materials = [
    new THREE.MeshLambertMaterial({
      map: textureLoader.load('textures/left.png'), side: THREE.DoubleSide,
    }),
    new THREE.MeshLambertMaterial({
      map: textureLoader.load('textures/right.png'), side: THREE.DoubleSide,
    }),
    new THREE.MeshLambertMaterial({
      map: textureLoader.load('textures/top.png'), side: THREE.DoubleSide,
    }),
    new THREE.MeshLambertMaterial({
      map: textureLoader.load('textures/down.png'), side: THREE.DoubleSide,
    }),
    new THREE.MeshLambertMaterial({
      map: textureLoader.load('textures/back.png'), side: THREE.DoubleSide,
    }),
    new THREE.MeshLambertMaterial({
      map: textureLoader.load('textures/front.png'), side: THREE.DoubleSide,
    }),
  ];
  let mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(x, -(wallHeight - playerHeight), y);
  mesh.rotation.set(0, rotation, 0);

  let body = new RectangleBody(playerWidth, playerWidth);
  body.position[0] = x;
  body.position[1] = y;

  let player = {
    id: id,
    x: x,
    y: y,
    rotation: rotation,
    body: body,
    mesh: mesh,
    name: name,
  };
  return player;
}

function handleCollisions() {
  for (let i = 0; i < bullets.length; ++i) {
    if (bullets[i].body.collidesWith(player.body) &&
        bullets[i].owner !== player) {
      die();
    }

    for (let j = 0; j < walls.length; ++j) {
      if (bullets[i].body.collidesWith(walls[j].body)) {
        bullets[i].body.velocity[0] = 0;
        bullets[i].body.velocity[1] = 0;
        break;
      }
    }
  }

  for (let i = 0; i < bullets.length; ++i) {
    if (bullets[i].owner === player) {
      for (let j = 0; j < players.length; ++j) {
        if (bullets[i].body.collidesWith(players[j].body)) {
          killPlayer(players[j]);
          break;
        }
      }
    }
  }

  for (let i = 0; i < walls.length; ++i) {
    if (player.body.collidesWith(walls[i].body)) {
      resolveCollision(player.body, walls[i].body);
    }
  }
}

function respawn() {
  player.x = spawnPosition[0];
  player.y = spawnPosition[1];
  player.body.position[0] = spawnPosition[0];
  player.body.position[1] = spawnPosition[1];
  player.mesh.x = spawnPosition[0];
  player.mesh.z = spawnPosition[1];
  socket.emit('move', player.x, player.y);
}

function die() {
  dead = true;
  setTimeout(function() {
    socket.emit('die');
    dead = false;
    respawn();
  }, 500);
}

function killPlayer(player) {
  if (Date.now() - (player.killTime || 0) < 1000) {
    return;
  }
  player.killTime = Date.now();
  ++score;
  scoreElement.innerHTML = score;
  socket.emit('kill', player.id);
  if (score >= winScore) {
    socket.emit('win');
    winSound.play();
    winSound = winSound.cloneNode(true);
    setTimeout(function() {
      alert('You win!');
      score = 0;
      scoreElement.innerHTML = score;
      respawn();
      setTimeout(function() {
        location.reload();
      }, 10000);
    }, 100);
  }
}

socket.on('playerWin', function(id) {
  winSound.play();
  winSound = winSound.cloneNode(true);

  let player = findPlayer(id);
  alert(player.name + ' wins!');
  score = 0;
  scoreElement.innerHTML = score;
  respawn();

  setTimeout(function() {
    location.reload();
  }, 10000);
});

function findPlayer(id) {
  return players.find(player => {
    return player.id === id;
  });
}

function createBullet(x, y, direction, rotation, owner) {
  let geometry = new THREE.BoxGeometry(bulletSize, bulletSize, bulletSize * 3);
  let material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(0x000000), side: THREE.DoubleSide,
  });
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, camera.position.y, y);
  mesh.rotation.set(0, rotation, 0);

  let body = new RectangleBody(bulletSize, bulletSize);
  body.position[0] = x;
  body.position[1] = y;
  body.velocity[0] = direction[0] * bulletSpeed;
  body.velocity[1] = direction[1] * bulletSpeed;

  let bullet = {
    mesh: mesh,
    body: body,
    time: Date.now(),
    owner: owner,
  };
  return bullet;
}

function randomRgbColor() {
  let letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function createWall(x, y) {
  let geometry = new THREE.BoxGeometry(wallSize, wallHeight, wallSize);
  let color = randomRgbColor();
  let material = new THREE.MeshLambertMaterial({
    color: new THREE.Color(color), side: THREE.DoubleSide,
  });
  let mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0, y);

  let body = new RectangleBody(wallSize, wallSize);
  body.position[0] = x;
  body.position[1] = y;

  let wall = {
    mesh: mesh,
    body: body,
  };
  return wall;
}

function loadWalls(newWalls) {
  walls = [];
  for (let i = 0; i < newWalls.length; ++i) {
    for (let j = 0; j < newWalls[i].length; ++j) {
      if (newWalls[i][j] === wallSymbol) {
        let wall = createWall(j, i);
        walls.push(wall);
        scene.add(wall.mesh);
      }
    }
  }
}

socket.on('init', function(newPlayer, newPlayers, newWalls, newSpawnPosition) {
  for (let i = 0; i < players.length; ++i) {
    scene.remove(players[i].mesh);
  }
  for (let i = 0; i < walls.length; ++i) {
    scene.remove(walls[i].mesh);
  }
  players = [];
  playerBodies = [];
  bullets = [];
  walls = [];

  loadWalls(newWalls);

  spawnPosition = newSpawnPosition;

  player = createPlayer(
      newPlayer.id, newPlayer.x, newPlayer.y, newPlayer.rotation, newPlayer.name);

  for (let i = 0; i < newPlayers.length; ++i) {
    let newPlayer = newPlayers[i];
    let player = createPlayer(
        newPlayer.id, newPlayer.x, newPlayer.y, newPlayer.rotation, newPlayer.name);
    players.push(player);
    playerBodies.push(player.body);
    scene.add(player.mesh);
  }
});

socket.on('playerJoin', function(id, x, y, rotation, name) {
  let player = createPlayer(id, x, y, rotation, name);
  players.push(player);
  playerBodies.push(player.body);
  scene.add(player.mesh);
});

socket.on('playerLeave', function(id) {
  let index;
  index = players.findIndex(player => {
    return player.id === id;
  });
  if (typeof index === 'undefined') {
    return;
  }
  let player = players[index];
  if (!player) {
    location.reload();
  }
  scene.remove(player.mesh);
  players.splice(index, 1);

  index = playerBodies.findIndex(body => {
    return body === player.body;
  });
  playerBodies.splice(index, 1);
});

socket.on('playerShoot', function(id) {
  let player = findPlayer(id);
  let lookAtVector = getPlayerLookAtVector(player);
  let bullet = createBullet(player.x, player.y, lookAtVector, player.rotation, player);
  bullets.push(bullet);
  scene.add(bullet.mesh);

  gunshotSound.play();
  gunshotSound = gunshotSound.cloneNode(true);
});

socket.on('playerUpdatePosition', function(id, x, y) {
  let player = findPlayer(id);
  player.mesh.position.x = x;
  player.mesh.position.z = y;
  player.body.position[0] = x;
  player.body.position[1] = y;
  player.x = x;
  player.y = y;
});

socket.on('playerUpdateRotation', function(id, rotation) {
  let player = findPlayer(id);
  player.mesh.rotation.set(0, rotation, 0);
  player.rotation = rotation;
});

function shoot() {
  if (Date.now() - shootTime < 250) {
    return;
  }
  shootTime = Date.now();
  let lookAtVector = getPlayerLookAtVector(player);
  gunshotSound.play();
  gunshotSound = gunshotSound.cloneNode(true);
  let bullet = createBullet(player.x, player.y, lookAtVector, player.rotation, player);
  bullets.push(bullet);
  scene.add(bullet.mesh);
  socket.emit('shoot');
}

window.addEventListener('keydown', function(e) {
  pressedKeys[e.keyCode] = true;
});

window.addEventListener('keyup', function(e) {
  pressedKeys[e.keyCode] = false;
});
