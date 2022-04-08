/**
 * Serves the built hebbia_utils.js locally for testing.
 */
 const http = require("http");
 const fs = require('fs').promises;
 const host = 'localhost';
 const port = 9999;
 
 const requestListener = function (req, res) {
    fs.readFile(__dirname + '/built/hebbia_utils.min.js')
        .then(contents => {
            res.setHeader("Content-Type", "text/javascript");
            res.writeHead(200);
            res.end(contents);
        })
        .catch(err => {           
            const error = `Could not start server for serving built hebbia files: ${err}.  Did you run the build task first?`;
            const json_error = JSON.stringify({
                'error': error
            });
            res.setHeader("Content-Type", "application/json");
            res.writeHead(500);
            res.end(json_error);
            console.error(error);
        })
 };
 
 const server = http.createServer(requestListener);
 server.listen(port, host, () => {
     console.log(`Server is running on http://${host}:${port}.  Press CTRL(or CMD)+C to end.`);
 });
