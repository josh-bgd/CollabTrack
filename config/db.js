const mysql = require('mysql2');

// Configuration du pool de connexions
const pool = mysql.createPool({
    host: '192.168.101.164',
    user: 'informatique',
    password: '1JTgA1ktC;wvSc<KMMq4',
    database: 'informatique',
    waitForConnections: true,
    connectionLimit: 12, // Nombre maximum de connexions simultanées
    queueLimit: 0 // Pas de limite pour les files d'attente
});

module.exports = pool.promise();
