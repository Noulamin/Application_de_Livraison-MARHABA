exports.getUser = (req, res) => {
    req.profil.hashed_password = undefined
    req.profil.salt = undefined
    return res.json({user: req.profil})
}