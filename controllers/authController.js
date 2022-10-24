const User = require('../models/User')
const jwt = require('jsonwebtoken')
const { transporter } = require('../helpers/config')
const { v1 } = require('uuid')

exports.signup = (req, res) => {
    const user = new User(req.body)
    user.save((err, user) => {
        if (err)
            return res.status(400).send(err)
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET)
        transporter.sendMail({
            from: `"Marhaba Application" <${process.env.EMAIL}>`,
            to: user.email,
            subject: "Verification email for your Marhaba account.",
            html: `<p>Click <a href="http://${process.env.HOSTNAME}/api/auth/emailVerification/${token}">Here</a> to verify your email address.</p>`
        }).then(e => {
            user.hashed_password = undefined
            user.salt = undefined
            return res.json({ user, message: 'An email has been sent to your email for verification' })
        })
    })
}

exports.signin = (req, res) => {
    const { email, password } = req.body
    User.findOne({ email }, (err, user) => {
        if (err || !user)
            return res.status(400).json({
                erreur: 'Not found user with this email'
            })
        if (user.emailIsVerified == false)
            return res.status(401).json({ erreur: "Email is not verified, plese check your email" })
        if (!user.authenticated(password))
            return res.status(401).json({
                erreur: 'Incorect password'
            })
        const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET)
        res.cookie('token', token, { expire: new Date() + 8062000 })
        user.hashed_password = undefined
        user.salt = undefined
        return res.json({ token, user })
    })
}

exports.signout = (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'User Signout' })
}

exports.validateMail = (req, res) => {
    req.profil.emailIsVerified = true
    req.profil.save().then(result => res.send(`Your email ${req.profil.email} is verified.`))
}

exports.forgetpassword = (req, res) => {
    req.check('email', 'Email is required').notEmpty().isEmail().withMessage('Email is invalide')
    const errors = req.validationErrors()
    if (errors)
        return res.status(400).json({
            erreur: errors[0].msg
        })
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err || !user)
            return res.status(400).json({
                erreur: 'Not found user with this email'
            })
        user.codeReset = v1()
        user.save().then((e) => {
            const token = jwt.sign({ _id: user._id, codeReset: user.codeReset }, process.env.JWT_SECRET, { expiresIn: 600 })
            transporter.sendMail({
                from: `"Marhaba Application" <${process.env.EMAIL}>`,
                to: user.email,
                subject: "Réinitialisation de mot de passe pour votre compte Marhaba",
                html: `<p>Click <a href="http://localhost:2002/api/auth/resetpassword/${token}">Here</a> to reset your password.</p>`
            }).then(e => res.send('An email is sent to reset your password'))
        })
    })
}

exports.resetpassword = (req, res) => {
    if(req.codeReset == req.profil.codeReset){
        req.check('password', 'new password is required for reset').notEmpty().isLength({ min: 8, max: 20 }).withMessage('Password must between 8 and 20 caracteres')
        const errors = req.validationErrors()
        if (errors)
            return res.status(400).json({
                erreur: errors[0].msg
            })
        let user = req.profil
        user.hashed_password = user.cryptPassword(req.body.password)
        user.save().then(result => res.send(`Your password is reset succesfuly`))
    }
    else{
        return res.status(400).send('Invalid Token')
    }
}