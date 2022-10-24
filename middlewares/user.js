const User = require('../models/User')
const jwt = require('jsonwebtoken')

exports.userById = (req, res, next, id) => {
    User.findById(id).exec((err, user) => {
        if(err || !user)
            return res.status(404).json({
                error: 'User not found'
            })
        req.profil = user
        next()
    })
}

exports.userByToken = (req, res, next, token) => {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.codeReset = payload.codeReset
    this.userById(req, res, next, payload._id)
}