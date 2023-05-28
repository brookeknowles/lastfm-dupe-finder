const express = require('express');
const { getTopAlbums, getTopTracks, findDuplicates } = require('./lastfmService');
const { Album, Track } = require('./models');
const path = require('path');

const app = express();
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

  let data = [];
  if (method === 'albums') {
    data = await getTopAlbums(username);
  } else if (method === 'tracks') {
    data = await getTopTracks(username);
  } else {
    res.status(400).send('Invalid method');
    return;
  }

  const duplicates = findDuplicates(data, method);
  res.send(duplicates);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
