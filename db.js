const { createPool } = require('mysql');

const DB = createPool({
    host:'localhost',
    user: 'root',
    password: '',
    database: 'ur2d_elo',
    connectionLimit: 10
})

module.exports = DB