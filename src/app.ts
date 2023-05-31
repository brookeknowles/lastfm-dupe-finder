const express = require('express');
const { getTopAlbums, getTopTracks, findDuplicates } = require('./lastfmService');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/duplicates', async (req, res) => {
  const username = req.body.username;
  const method = req.body.method;

  if (!username || !method) {
    res.status(400).send('Username and method are required');
    return;
  }

  const progressCallback = (progress, message) => {
    // Emit the progress and message back to frontend so it can update the progress bar
    io.emit('progress', progress);
    io.emit('message', message)
  };

  let data = [];
  if (method === 'albums') {
    data = await getTopAlbums(username, progressCallback);
  } else if (method === 'tracks') {
    data = await getTopTracks(username, progressCallback);
  } else {
    res.status(400).send('Invalid method');
    return;
  }

  const duplicates = findDuplicates(data);
  res.send(duplicates);
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}. Go to http://localhost:${port}/`);
});
