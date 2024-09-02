const jwt = require('jsonwebtoken');
const sendRes = require('../plugins/sendRes.js');

module.exports = (req, res, next) => {
    const token = req.headers.authorization

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            return sendRes(res, false, "bad token", null)
        } else {
            req.body.user = user
            next()
        }
    })
}