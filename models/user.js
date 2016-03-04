var config = require('./../config/config');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');

var userSchema = new Schema({
  name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    set: function (v) {
      return v.toLowerCase();
    },
    validate: {
      validator: function (v) {
        return /.+\@.+\..+/.test(v);
      },
      message: 'Please fill a valid e-mail address.'
    },
    required: 'A valid e-mail address is required.',
    unique: 'This e-mail address has been already registered'
  },
  password: {
    type: String,
    required: 'A valid password is required.',
    validate: {
      validator: function (v) {
        return v && v.length > 5;
      },
      message: 'Password should be longer.'
    }
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  lastLoginAttempt: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  }
});

userSchema.pre('save', function (next) {
  var user = this;

  if (user.isModified('password')) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) {
        return next(err);
      }

      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) {
          return next(err);
        }

        user.password = hash;
        next();
      });
    });
  }
  else {
    next();
  }
});

userSchema.methods.authenticate = function (password, next) {
  var user = this;

  var lastLogin = user.lastLoginAttempt;
  user.lastLoginAttempt = Date.now();
  user.loginAttempts += 1;

  if (Date.now() - lastLogin >= 900000) {
    user.loginAttempts = 0;
  }
  if (user.loginAttempts >= 5) {
    return next({ message: 'You have tried to login too many times, please wait 15 min before trying again' })
  }

  user.save(function (err) {
    if (err) {
      return next(err);
    }

    user.verifyPassword(password, function (err, matches) {
      if (err) {
        return next(err);
      }

      if (!matches) {
        return next(null, false);
      }

      if (matches) {
        user.loginAttempts = 0;
        user.save(function (err) {
          if (err) {
            return next(err);
          }

          return next(null, true);
        });
      }
    });
  });
};

userSchema.methods.changePassword = function (oldPassword, newPassword, next) {
  var user = this;

  user.verifyPassword(oldPassword, function (err, matches) {
    if (err) {
      return next(err);
    }

    if (!matches) {
      return next({ "message": "Provided password doesn't match" });
    }

    user.password = newPassword;

    user.save(function (err) {
      if (err) {
        return next(err);
      }

      return next();
    });
  });
}

userSchema.methods.changeEmail = function (newEmail, next) {
  var user = this;
  // user.verifyPassword(password, function(err, matches) {
  //   if (err) {
  //     return next(err);
  //   }
    
  //   if (!matches) {
  //     return next({"message" : "Provided password doesn't match"});
  //   }
    
  user.email = newEmail;

  user.save(function (err) {
    if (err) {
      return next(err);
    }

    return next();
  });
  // });
}

userSchema.methods.changeName = function (newName, next) {
  var user = this;
  user.name = newName;
  user.save(function (err) {
    if (err) {
      return next(err);
    }

    return next();
  });
};

userSchema.methods.deleteUser = function (password, next) {
  var user = this;
  user.verifyPassword(password, function (err, matches) {
    if (err) {
      return next(err);
    }

    if (!matches) {
      return next({ "message": "Provided password doesn't match" });
    }

    user.remove(function (err) {
      if (err) {
        return next({ "message": "Internal error, please try again" });
      }
      next();
    });
  });
};

userSchema.methods.verifyPassword = function (password, next) {
  var user = this;
  bcrypt.compare(password, user.password, function (err, result) {
    if (err) {
      return next({ "message": "Internal error, please try again" });
    }

    next(null, result);
  });
};


mongoose.model('User', userSchema);