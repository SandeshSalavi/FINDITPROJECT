module.exports.isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
};


module.exports.isAdmin=(req, res, next) => {
    if (!req.session.admin) {
       return res.redirect("/login/admin");
    }
     next();

    
};


