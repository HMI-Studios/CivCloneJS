const express = require('express');
const app = express();
const port = 8080;

const path = require('path');
app.use('/', express.static(path.join(__dirname, '../client')));

// TODO
app.use('/map', express.static(path.join(__dirname, 'data/map.json')));

// app.get('/map', (req, res) => {
//   res.json('Hello World!');
// });

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
})