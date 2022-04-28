/**
 * Serves the built hebbia_utils.js locally for testing.
 */
 const http = require("http");
 const fs = require('fs').promises;
 const host = 'localhost';
 const port = 9999;
 
 const requestListener = function (req, res) {
    fs.readFile(__dirname + '/built' + req.url)
        .then(contents => {
            res.setHeader("Content-Type", "text/javascript");
            res.writeHead(200);
            res.end(contents);
        })
        .catch(err => {                   
            res.writeHead(404);
            res.end(JSON.stringify({error:"Resource not found"}));
        })

 };
 
 const server = http.createServer(requestListener);
 server.listen(port, host, () => {
     console.log(`Server is running on http://${host}:${port}.  Press CTRL(or CMD)+C to end.`);
 });
