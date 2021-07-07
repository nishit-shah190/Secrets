//jshint esversion:6
require('dotenv').config();
const express= require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const md5 = require("md5");
const app = express();
// const encrypt = require("mongoose-encryption");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const bcrypt = require("bcrypt");
// const encrypt = require('mongoose-encryption');
// const saltRounds = 8;

app.use(express.static("public"));
app.set('view engine' , 'ejs');
app.use(express.urlencoded({extended:true}));

app.use(session ({
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB" , {useNewUrlParser:true});
mongoose.set("useCreateIndex" , true);
//userSchema.plugin(encrypt, {secret: process.env.SECRET , encryptedField:['password']});
// final commit done

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User  = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user,done)
{
    done(null, user.id);
});

passport.deserializeUser(function(id,done){
    User.findById(id, function(err,user)
    {
        done(err,user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/", function(req, res)
{
    res.render("home")
});
app.get("/login", function(req,res)
{
    res.render("login");
});
app.get("/register", function(req,res)
{
    res.render("register");
});

app.get('/auth/google', 
   passport.authenticate('google',{scope:['profile']})
);

app.get("/auth/google/secrets",
   passport.authenticate('google' , {failureRedirect: "/login"}),
   function(req,res){
       res.redirect("/secrets");
 });


app.get("/secrets", function(req,res)
{
    User.find({"secret":{$ne:null}}, function(err , foundUsers)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            if(foundUsers)
            {
                res.render("secrets" , {userswithSecrets: foundUsers});
            }
        }
    })
});

app.get("/submit", function(req,res)
{
    if(req.isAuthenticated())
    {
        res.render("submit");
    }
    else
    {
        res.redirect("/login");
    }

});

app.post("/submit" , function(req,res)
{
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, function(err, foundUser)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            if(foundUser)
            {
               foundUser.secret = submittedSecret;
               foundUser.save(function ()
               {
                   res.redirect("/secrets")
               });
               
            }
        }
    });
});

app.get("/logout", function(req,res)
{
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req,res)
{
    // const newUser = new User({
    //     email:req.body.username,
    //     password:md5(req.body.password)
    // });
    // newUser.save(function(err)
    // {
    //     if(err)
    //     {
    //         console.log(err);
    //     }
    //     else
    //     {
    //         res.render("secrets");
    //     }
    // });

    // bcrypt.hash(req.body.password, saltRounds ,  function(req,res)
    // {
    // const newUser = new User({
    //     email:req.body.username,
    //     password: hash
    // });
    // newUser.save(function(err)
    // {
    //     if(err)
    //     {
    //         console.log(err);
    //     }
    //     else
    //     {
    //         res.render("secrets");
    //     }
    // });
    User.register({username:req.body.username}, req.body.password, function(err,user)
    {
        if(err)
        {
            console.log(err);
            res.redirect("/register");
        }
        else
        {
            passport.authenticate("local") (req,res,function(){
               res.redirect("/secrets"); 
            });
        }
    });

});

app.post("/login", function(req,res)
{
    // const username = req.body.username;
    // const password = md5(req.body.password);

    // User.findOne({email: username} , function(err,foundUser)
    // {
    //     if(err)
    //     {
    //         console.log(err);
    //     }
    //     else
    //     if(foundUser.password === password)
    //     {
    //        res.render("secrets");
    //     }
    // })
    const user = new User({
        username:req.body.username,
        passowrd: req.body.password
    });
    req.login(user, function(err)
    {
        if(err){
            console.log(err);
        }
        else
        {
            passport.authenticate("local")(req,res,function()
            {
                res.redirect("/secrets");
            });
        }
    })
})




app.listen(3000, function()
{
    console.log("Server running in 3000");
})



