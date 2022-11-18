const express = require('express');
const app = express();
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const e = require('express');

// database configuration
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

app.use(express.static('src/resources'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/src/views'));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);
app.use(bodyParser.urlencoded({
  extended: true,
})
);

// Begin Routing

// NOTE: pages to render must have './pages/page' format due to project structure

app.get("/", (req, res) => {
  return res.render("./pages/home");
});



app.get("/login", (req, res) => {
  return res.render('./pages/login');
});

app.post('/login', async (req, res) => {
  const query = "Select * FROM players WHERE username = $1;";
  db.one(query, [req.body.username])
    .then(async (user) => {
      const match = await bcrypt.compare(req.body.password, user.password);
      if (!match) {
        console.log("Incorrect username or password");
        return res.render('./pages/login', { error: true, message: 'Incorrect username or password.' });

      } else {
        req.session.user = user;
        req.session.save();
        res.redirect('/profile');
      }
    })
    .catch((err) => {
      console.log(err);
      return res.render('./pages/login', { error: true, message: 'No account is associated with that username.' });
    });
});

app.post("/register", async (req, res) => {
  if (req.body.password !== req.body.confirmPassword) {
    return res.render('./pages/login', { error: true, message: 'Failed to register, passwords did not match. Try again.' });
  }
  const hash = await bcrypt.hash(req.body.password, 10);

  var userPhotoLink = 'data:image/jpeg;base64,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';
  if (req.body.profilePhotoLink.length != 0) {
    userPhotoLink = req.body.profilePhotoLink;
  }


  const classYear = /\d/.test(req.body.classYear) ? req.body.classYear : '0';
  const date = new Date();
  const joinDate = date.toISOString().split('T')[0];
  const insertQuery = 'INSERT INTO players (username, playerName, password, classYear, profilePhoto, joinDate) VALUES ($1, $2, $3, $4, $5, $6);';
  db.any(insertQuery, [req.body.username, req.body.playername, hash, classYear, userPhotoLink, joinDate])
    .then(() => {
      return res.render('./pages/login', { error: false, message: 'Successfully registered new account.' });
    })
    .catch((err) => {
      console.log(err);
      res.render("./pages/login", {
        message: "Failed to register, that username is already taken. Try another one.",
        error: 1
      });
    });
});










// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to register page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);


app.get("/about", (req, res) => {
  return res.render("./partials/about");
});


app.get("/sports", (req, res) => {
  const all_sports = `SELECT * FROM sports ORDER BY sportName ASC;`;
  db.any(all_sports)
    .then((sports) => {
      console.log(sports)
      db.any(`SELECT * FROM teamsToSports;`)
        .then((teamsToSports) => {
          console.log(teamsToSports)
          res.render("./pages/sports", {
            sports,
            teamsToSports
          });
        })
        .catch((err) => {
          res.render("./pages/home", {
            error: true,
            message: "No sports found in database."
          });
        });
    })
    .catch((err) => {
      res.render("./pages/home", {
        error: true,
        message: "No sports found in database."
      });
    });
});

app.get("/profile", (req, res) => {


  return res.render("./pages/profile", { user: req.session.user });
});

app.get("/edit_profile", (req, res) => {
  return res.render("./pages/edit_profile", { user: req.session.user });
});

app.get("/teams/:sportName", (req, res) => {
  const sportName = req.params.sportName;

  db.tx(t => {
    // creating a sequence of transaction queries:
    const teams = t.any('SELECT * FROM teams WHERE teamID IN (SELECT teamID FROM teamsToSports WHERE sportID = (SELECT sportID FROM sports WHERE sportName = $1));', [sportName]);
    const sportID = t.one('SELECT sportID FROM sports WHERE sportName = $1;', [sportName])
    const teamsToPlayers = db.any(`SELECT * FROM teamsToPlayers;`)
    const teamsToCaptains = db.any(`SELECT * FROM teamsToCaptains`)
    const playerName = db.any(`SELECT playerName,playerID  FROM players`)

    // returning a promise that determines a successful transaction:
    return t.batch([teams, sportID, teamsToPlayers, teamsToCaptains, playerName]); // all of the queries are to be resolved;
  })
    .then(data => {
      // success, COMMIT was executed
      return res.render("./pages/teams", {
        teams: data[0],
        sportID: data[1].sportid,
        teamsToPlayers: data[2],
        teamsToCaptains: data[3],
        playerNames: data[4]
      });
    })
    .catch(err => {
      // failure, ROLLBACK was executed
      console.log(err);
      return res.render("./pages/sports", { message: "Error Occured In Team Query", error: 1 })    
    });
});

app.get("/team/view/:teamID", (req, res) => {
  db.one("SELECT * FROM teams WHERE teamID=$1", [req.params.teamID])

      .then((team) => {
        return res.render("./pages/team", { team: team })
      })
      .catch((err) => {
        return res.render("./pages/sports", { message: "Team does not exist", error: 1 })
      })

})


app.post("/team/join", (req, res) => {
  const query = `INSERT INTO teamsToPlayers (playerID, teamID) VALUES ($1, $2);`
  db.any(query, [req.session.user.playerid, req.body.teamid])
    .then(() => {
      db.one("SELECT * FROM teams WHERE teamID=$1", [req.body.teamid])
        .then((team) => {
          console.log("team:" + team.teamname);
          return res.render(`./pages/team`, { team: team, error: false, message: 'Successfully joined team.' });
        })
        .catch((err) => {
          console.log(err);
          return res.render(`./pages/sports`, { error: true, message: 'Unable to find team.' });
        });
    })
    .catch((err) => {
      console.log(err);
      return res.render("./pages/teams", { error: true, message: 'Unable to join team.' });
    });
});

app.post("/team/create", (req, res) => {
  const sportID = req.body.sportID;
  const teamInsertQuery = 'INSERT INTO teams (teamName) VALUES ($1) RETURNING teamID';
  const teamRelationInsertQuery = 'INSERT INTO teamsToPlayers (playerID, teamID) VALUES ($1, $2);INSERT INTO teamsToCaptains (playerID, teamID) VALUES ($1, $2);INSERT INTO teamsToSports (teamID, sportID) VALUES ($2, $3);';
  db.any(teamInsertQuery, [req.body.teamName])
    .then((teamID) => {
      db.none(teamRelationInsertQuery, [req.session.user.playerid, teamID[0].teamid, sportID])
        .then(() => {
          db.one('SELECT * FROM teams where teamID = $1', [teamID[0].teamid])
            .then((team) => {
              return res.render("./pages/team", { team: team });
            })
            .catch((err) => {
              console.log(err);
              return res.render(`./pages/sports`, { error: true, message: 'Unable to find team.' });
            })
        })
        .catch((err) => {
          console.log(err);
          return res.render(`./pages/sports`, { error: true, message: 'Unable to add team relations' });
        })
    })
    .catch((err) => {
      console.log(err);
      return res.render("./pages/teams", { error: true, message: 'Unable to create team.' });
    })
});

app.post("/edit_profile", (req, res) => {
  var profilePhotoLink = req.body.profilephotolink;
  if(!profilePhotoLink) {
    profilePhotoLink = 'data:image/jpeg;base64,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';
  }
  console.log(req.session.user);
  db.one("UPDATE players SET username = $1, playerName = $2, classYear = $3, profilePhoto = $4 WHERE playerID = $5 RETURNING playerID;",
    [req.body.username, req.body.playername, req.body.classyear, profilePhotoLink, req.session.user.playerid])
    .then((playerID) => {
      db.one("SELECT * FROM players WHERE playerID = $1", [playerID.playerid])
        .then((user) => {
          req.session.user = user;
          req.session.save();
          return res.render("pages/profile", { user: req.session.user, error: false, message: 'Profile updated successfully.' });
        })
        .catch((err) => {
          console.log(err);
          return res.render("pages/profile", { user: req.session.user });
        })
    })
    .catch((err) => {
      console.log(err);
      return res.render("pages/profile", { user: req.session.user, error: false, true: 'That username is taken.' });
    });
});



app.get("/logout", (req, res) => {
  req.session.destroy();
  return res.render("pages/login", { error: false, message: 'Successfully logged out.' });
});








app.get("/yourUpcomingGames", (req, res) => {
  const checkOnTeam = `SELECT * FROM teamsToPlayers WHERE playerid = ${req.session.user.playerid};`;
  const query = `INSERT INTO teamsToPlayers VALUES (1,9); SELECT * FROM games WHERE gameid IN (SELECT gameid FROM teamsToGames WHERE teamsToGames.teamID IN (SELECT teamid FROM teamsToPlayers WHERE playerid = ${req.session.user.playerid}));`;

  db.any(query)
    .then((games) => {
      db.any(checkOnTeam)
        .then((teams) => {
          res.render("./pages/yourUpcomingGames", { games, teams });
        })
        .catch((err) => {
          console.log(err);
          res.render("./pages/yourUpcomingGames", { error: true });
        });
    })
    .catch((err) => {
      console.log(err);
      res.render("./pages/yourUpcomingGames", {
        games: [],
        error: true,
      });
    });
});

app.get("/allUpcomingGames", (req, res) => {
  const query = `SELECT * FROM games ORDER BY gameDate DESC, time ASC;`;

  db.any(query)
    .then((games) => {
      res.render("./pages/allUpcomingGames", {
        games,
      });

    })
    .catch((err) => {
      res.render("./pages/allUpcomingGames", {
        games: [],
        error: true,
        message: err.message,
      });
    });
});

app.get("/allGames", (req, res) => {
  const query = `SELECT * FROM games ORDER BY gameDate DESC, time ASC;`;

  db.any(query)
    .then((games) => {
      res.render("./pages/allGames", {
        games,
      });

    })
    .catch((err) => {
      res.render("./pages/allGames", {
        games: [],
        error: true,
        message: err.message,
      });
    });
});

app.get("/game", (req, res) => {
  const user = req.session.user;
  db.any(`SELECT teamname, teamid FROM teams WHERE teamid IN(SELECT teamid FROM teamsToGames WHERE gameID = $1 LIMIT 2);`, [req.query.gameid])
    .then(function (teaminfo) {
      db.any(`SELECT * FROM games WHERE gameID = $1`, [req.query.gameid])
        .then(function (game) {
          db.any(`SELECT sportname FROM sports WHERE sportid = (SELECT sportid FROM teamsToSports WHERE teamid = ${teaminfo[0].teamid} LIMIT 1);`)
            .then(function (sportname) {
              return res.render('./pages/game', { game, user, teaminfo, sportname })

            })
            .catch((err) => {
              return console.log(err);
            });
        })
        .catch((err) => {
          return console.log(err);
        });
    })
    .catch((err) => {
      return console.log(err);
    });
});

app.get("/yourTeams", (req, res) => {
  db.any(`SELECT * FROM teams WHERE teamID IN (SELECT teamID FROM teamsToPlayers WHERE playerID = ${req.session.user.playerid});`)
  .then((teams) => {
    return res.render("./pages/yourTeams", {teams});

  })
  .catch((err) => {
    return res.render("./pages/yourTeams", {
      teams: [],
      error: true,
      message: err.message,
    });
  });
});



app.get("/players", (req, res) => {
  db.any(`SELECT * FROM players ORDER BY playerID ASC;`)
  .then((players) => {
    return res.render("./pages/players", {players});

  })
  .catch((err) => {
    return res.render("./pages/players", {
      players: [],
      error: true,
      message: err.message,
    });
  });
});


app.get("/searchPlayers", (req, res) => {
  const q = req.query.q;
  db.any(`SELECT * FROM players WHERE  username LIKE '${q}%' OR playerName LIKE '${q}%'`)
    .then((players) => {
      if(players.length == 0) {
        db.any(`SELECT * FROM players WHERE classYear = ${q} OR playerid = ${q};`)
          .then((playersInt) => {
            if(playersInt.length == 0) {
              return res.render("./pages/playerSearchResults", {
                playersInt: [],
                players: [],
                error: true,
                message: 'No results.',
              });
            }
            return res.render("./pages/playerSearchResults", {players: [], playersInt});
          })
          .catch((err) => {
            return res.render("./pages/playerSearchResults", {
              playersInt: [],
              players: [],
              error: true,
              message: 'No results.',
            });
          });
      }
      else {
        return res.render("./pages/playerSearchResults", {players, playersInt: []});
      }

    })
    .catch((err) => {
      return res.render("./pages/playerSearchResults", {
        playersInt: [],
        players: [],
        error: true,
        message: 'No results.',
      });
    });
});


app.get("/player", (req, res) => {
  db.any(`SELECT * FROM players WHERE playerid = ${req.query.playerid} LIMIT 1;`)
  .then((player) => {
    db.any(`SELECT * FROM teams WHERE teamID IN (SELECT teamID FROM teamsToPlayers WHERE playerID = ${player[0].playerid});`)
      .then((teams) =>{
        return res.render("./pages/player", {player, teams});
      })
      .catch((err) => {
        return res.render("./pages/player", {
          teams: [],
          player: [],
          error: true,
          message: err.message,
        });
      });


    

  })
  .catch((err) => {
    return res.render("./pages/player", {
      teams: [],
      player: [],
      error: true,
      message: err.message,
    });
  });
});


app.get("/change_password", (req, res) => {
  return res.render("./pages/change_password", { user: req.session.user });
});

app.post("/change_password", async (req, res) => {
  const currentPassword = req.body.currentPassword;
  const match = await bcrypt.compare(currentPassword, req.session.user.password);
  if(!match) {
    return res.render("./pages/change_password", {error: true, message: 'Incorrect current password.'})
  }

  if(req.body.newPassword !== req.body.confirmNewPassword) {
    return res.render("./pages/change_password", {error: true, message: 'New passwords do not match.'})
  }

  if(req.body.newPassword == currentPassword) {
    return res.render("./pages/change_password", {error: true, message: 'New password cannot be current password.'})
  }

  
  
  const newHash = await bcrypt.hash(req.body.newPassword, 10);
  db.one(`UPDATE players SET password = '${newHash}' WHERE playerID = ${req.session.user.playerid} RETURNING playerID;`)
  .then((playerID) => {
    db.one("SELECT * FROM players WHERE playerID = $1", [playerID.playerid])
      .then((user) => {
        req.session.user = user;
        req.session.save();
        return res.render("./pages/profile", { user: req.session.user, error: false, message: 'Password changed successfully.'});
      })
      .catch((err) => {
        console.log(err);
        return res.render("./pages/change_password", { user: req.session.user, error: true, message: 'Failed to change password.' });
      })
  })
  .catch((err) => {
    console.log(err);
    return res.render("./pages/change_password", { user: req.session.user, error: true, message: 'Failed to change password.' });
  });




});



// End Routing


app.use((req, res, next) => {
  res.status(404).send(
    '<h1>404</h1><h4>page not found</h4>')
})

app.listen(3000);
console.log('Server is listening on port 3000');