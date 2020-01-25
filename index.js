let express = require('express');
let http = require('http');

let app = express();
let server = http.createServer(app);
let io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));

let port = process.env.PORT || 4000;
server.listen(port, function() {
  console.log('Listening on ' + port + '...');
});

let players = [];

let maps = [
  {
    walls: [
      '#####################',
      '#      #     #      #',
      '# ##   ##   ##   ## #',
      '# #  #         #  # #',
      '# ## # ####### # ## #',
      '#                   #',
      '#####################',
    ],
    spawnPosition: [10, 1],
  },
  {
    walls: [
      '###########',
      '#         #',
      '# # # # # #',
      '#         #',
      '# # # # # #',
      '#         #',
      '# # # # # #',
      '#         #',
      '###########',
    ],
    spawnPosition: [6, 3],
  },
  {
    walls: [
      '###########',
      '#         #',
      '#  #   #  #',
      '# ##   ## #',
      '#         #',
      '# ##   ## #',
      '#  #   #  #',
      '#         #',
      '###########',
    ],
    spawnPosition: [5, 4],
  },
  {
    walls: [
      '  ###   ###  ',
      ' #   # #   # ',
      '#     #     #',
      '#  #     #  #',
      '#           #',
      ' #         # ',
      '  #   #   #  ',
      '   #     #   ',
      '    #   #    ',
      '     # #     ',
      '      #      ',
    ],
    spawnPosition: [6, 4],
  },
  {
    walls: [
      '#######',
      '#     #',
      '#     #',
      '#     #',
      '#     #',
      '#     #',
      '#######',
    ],
    spawnPosition: [3, 3],
  },
];
let mapIndex = 0;
let map = maps[mapIndex];

io.on('connection', function(socket) {
  let player = {
    name: '',
    id: socket.id, 
    x: map.spawnPosition[0],
    y: map.spawnPosition[1],
    rotation: Math.PI,
  };

  socket.on('name', function(name) {
    player.name = name || socket.id;
    socket.emit('init', player, players, map.walls, map.spawnPosition);
    players.push(player);

    socket.broadcast.emit('playerJoin', player.id, player.x, player.y, player.rotation, player.name);
  });

  socket.on('disconnect', function() {
    socket.broadcast.emit('playerLeave', socket.id);
    let index = players.findIndex(player => {
      return player.id === socket.id;
    });
    if (typeof index === 'undefined') {
      return;
    }
    players.splice(index, 1);
  });

  socket.on('shoot', function() {
    socket.broadcast.emit('playerShoot', socket.id);
  });

  socket.on('die', function() {
    socket.broadcast.emit('playerDie', socket.id);
  });

  socket.on('kill', function(id) {
  });

  socket.on('win', function(id) {
    socket.broadcast.emit('playerWin', socket.id);
    mapIndex = (mapIndex + 1) % maps.length;
    map = maps[mapIndex];
  });

  socket.on('move', function(x, y) {
    socket.broadcast.emit('playerUpdatePosition', socket.id, x, y);
    let index = players.findIndex(player => {
      return player.id === socket.id;
    });
    if (typeof index === 'undefined') {
      return;
    }
    players[index].x = x;
    players[index].y = y;
  });

  socket.on('rotate', function(rotation) {
    socket.broadcast.emit('playerUpdateRotation', socket.id, rotation);
    let index = players.findIndex(player => {
      return player.id === socket.id;
    });
    if (typeof index === 'undefined') {
      return;
    }
    players[index].rotation = rotation;
  });
});
