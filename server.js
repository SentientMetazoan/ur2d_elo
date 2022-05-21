const { express } = require("express");
const { mysql } = require('mysql');

console.log('=====> server.js starting connection...')
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ur2d_elo'
});
var app = express();

connection.connect(function (err) {
    if (!err) {
        console.log("Database is connected ... \n\n");
    } else {
        console.log("Error connecting database ... \n\n", err.message);
    }
});
app.listen(3000);