const express = require('express')
const app = express()
var path = require('path');
app.get('/', (req, res) =>  { res.sendFile(path.join(__dirname + '/index.html')); });

app.listen(9000, () => console.log('Example app listening on port 9000!'))

app.use(express.static('./'));