const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");

//Load input validation
const validateRegisterInput = require("../../validation/register");

//Load login validation
const validateLoginInput = require("../../validation/login");

//Load User module

const User = require("../../models/User");

//@route  GET api/users/test
//@desc   Tests users routes
//@access Public

router.get("/test", (req, res) => {
  res.json({
    msg: "user works"
  });
});

//@route  GET api/users/register
//@desc   Register user routes
//@access Public

router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  //Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      return res.status(400).json({ email: "Email already exists" });
    } else {
      const avatar = gravatar.url(req.body.email, {
        s: "200", //size
        r: "pg", //rating
        d: "mm" //default
      });
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        avatar: avatar,
        password: req.body.password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) {
            throw err;
          }
          newUser.password = hash;
          newUser
            .save()
            .then(user => {
              res.json(user);
            })
            .catch(err => {
              console.log(err);
            });
        });
      });
    }
  });
});

//@route  GET api/users/login
//@desc   Login users / returningJWT Token
//@access Public

router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  //Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const email = req.body.email;
  const password = req.body.password;

  //Find user by email
  User.findOne({ email: email }).then(user => {
    //Check for user
    if (!user) {
      errors.email = "User not found";
      return res.status(404).json(errors);
    } else {
      //Check password
      bcrypt.compare(password, user.password).then(isMatch => {
        if (isMatch) {
          // res.json({
          //   msg: "Success"
          // });
          //User matched

          const payload = { id: user.id, name: user.name, avatar: user.avatar }; //creating jwt payload

          //Sign token
          jwt.sign(
            payload,
            keys.secretkey,
            { expiresIn: 3600 },
            (err, token) => {
              res.json({
                success: true,
                token: "Bearer " + token
              });
            }
          );
        } else {
          errors.password = "Password incorrect";
          return res.status(400).json(errors);
        }
      });
    }
  });
});

//@route  GET api/users/current
//@desc   return current user
//@access Private

router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    });
  }
);

module.exports = router;
