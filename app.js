require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


const app = express();



app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//We tell our app to use the session package
app.use(session({
  secret: process.env.SECRETKEY,
  resave: false,
  saveUninitialized: false
}));

//initializing to use passport
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/BikeRentalDB")
//mongoose.set("useCreateIndex", true);

const rentalSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret: String
});

//we setup our sessionSchema to use passportLocalMongoose as a plugin
rentalSchema.plugin(passportLocalMongoose);


const Rental = mongoose.model("rental", rentalSchema);

//here we use our passport local mongoose to create a local log in strategy

passport.use(Rental.createStrategy());

// here we setup serialse and deserialse for our user
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});


app.post("/register", function(req, res) {
  //the method register comes from the passport package
  Rental.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      //here we create the cookie that saves the users current login session
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});


app.post("/login", function(req, res) {
  const user = new Rental({
    email: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      //This line of code authenticates the user
      //the "local" is the kind of strategy u are using
      //Here we also create a cookie that the user is authenticated
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});


app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});


app.get("/secrets", function(req, res) {
  //query for all documents where a specific field is not null in MongoDB
  if (req.isAuthenticated()) {
    Rental.find({
      "secret": {
        $ne: null
      }
    }, function(err, foundSecrets) {
      if (err) {
        console.log(err);
      } else {
        res.render("secrets", {
          submittedSecrets: foundSecrets
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res) {
  //here we store the user that submitted the secret
  const secretSubmit = req.body.secret;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  //here we find the user by id so we can save it to our database
  //so the secret gets added to the specific user in the database
  console.log(req.user._id);
  Rental.findById(req.user._id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        //Found user with an id. and we save the secret into the users database
        foundUser.secret = secretSubmit;
        //then save to database and redirect to the secrets page
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });
});



app.listen("3000", function() {
  console.log("Server is running on port 3000");
});
