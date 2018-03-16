const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.static(path.join(__dirname)));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'zpp.html'));
});

let defaultGame = {
  playerOne: {
    score: 0,
    serve: true,
  },
  playerTwo: {
    score: 0,
    serve: false,
  }
};
app.get('/game', function (req, res) {
  fs.readFile('data/game.json', 'utf8', function (err, data) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.send(defaultGame);
    }
    res.send(data.toString());
  });
});

app.post('/game', function (req, res) {
  let game = req.body;
  if (req.playerOne && req.playerTwo) {
    fs.writeFile('data/game.json', req.body);
  }
});

app.listen(5020);
