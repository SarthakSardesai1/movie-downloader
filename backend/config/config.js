const bcrypt = require('bcryptjs');

module.exports = {
    omdbApiKey: process.env.OMDB_API_KEY,
    monetagId: process.env.MONETAG_ID,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    adminUsername: process.env.ADMIN_USERNAME,
    adminPassword: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10)
};
