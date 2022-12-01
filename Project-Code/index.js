const express = require('express');
const app = express();
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const e = require('express');
const nodemailer = require('nodemailer');
const log = console.log;

const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
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
    cookie: { maxAge: 1200000 }, 
    rolling: false
  })
);
app.use(bodyParser.urlencoded({
  extended: true,
})
);





// Begin Routing

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

  var gender = req.body.gender;
  if (!gender) {
    gender = 'Other/Prefer not to say';
  }

  var email = req.body.email;
  if (!email) {
    email = null;
  }

  const classYear = /\d/.test(req.body.classYear) ? req.body.classYear : '0';
  const date = new Date();
  const joinDate = date.toISOString().split('T')[0];
  const insertQuery = 'INSERT INTO players (username, playerName, password, classYear, profilePhoto, joinDate, email, phone, gender) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);';
  db.any(insertQuery, [req.body.username, req.body.playername, hash, classYear, req.body.profilePhotoLink, joinDate, email, req.body.phone, gender])
    .then(() => {
      return res.render('./pages/login', { error: false, message: 'Successfully registered new account.' });
    })
    .catch((err) => {
      console.log(err);
      res.render("./pages/login", {
        message: "Failed to register, that username or email is already taken. Try again.",
        error: 1
      });
    });
});

app.get("/forgotPassword", (req, res) => {
  return res.render("./pages/forgotPassword")
});

app.post("/forgotPassword", (req, res) => {
  const email = req.body.email;

  const resetCode = Math.floor(100000 + Math.random() * 900000);

  db.any(`SELECT * FROM players WHERE email = '${email}';`)
    .then((rows) => {
      if (rows.length == 0) {
        return res.render("./pages/forgotPassword", { error: 1, message: 'That email is not associated with an account.' })
      }

      let transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: 'true',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PWD_MAC || process.env.EMAIL_PWD_WINDOWS || process.env.EMAIL_PWD_IPHONE || process.env.EMAIL_PWD_IPAD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      let mailOptions = {
        from: 'improved.notifications@gmail.com',
        to: email,
        subject: 'IMProved Password Reset Code',
        text: 'Your password reset code is: ' + resetCode.toString() + '. If you did not request this code, ignore this email.'
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        transporter.close();
      });
      return res.render("./pages/resetPassword", { email, resetCode, error: false, message: 'Code sent successfully to ' + email });
    })
    .catch((err) => {
      console.log(err);
      return res.render("./pages/resetPassword", { email, resetCode, error: true, message: 'An error occurred.' });
    })
});

app.post("/resetPassword", async (req, res) => {
  if (req.body.inputCode !== req.body.resetCode) {
    return res.render('./pages/resetPassword', { resetCode: req.body.resetCode, email: req.body.email, error: true, message: 'Wrong code.' });
  }
  if (req.body.newPassword !== req.body.confirmNewPassword) {
    return res.render('./pages/resetPassword', { resetCode: req.body.resetCode, email: req.body.email, error: true, message: 'New passwords do not match.' });
  }
  else {
    const hash = await bcrypt.hash(req.body.newPassword, 10);
    db.one(`UPDATE players SET password = '${hash}' WHERE email = '${req.body.email}' RETURNING playerID;`)
      .then((playerID) => {
        db.one("SELECT * FROM players WHERE playerID = $1", [playerID.playerid])
          .then((user) => {
            req.session.user = user;
            req.session.save();
            return res.render("./pages/login", { user: req.session.user, error: false, message: 'Password reset successfully.' });
          })
          .catch((err) => {
            console.log(err);
            return res.render("./pages/login", { user: req.session.user, error: true, message: 'An error occurred.' });
          })
      })
      .catch((err) => {
        console.log(err);
        return res.render("./pages/login", { user: req.session.user, error: true, message: 'An error occurred.' });
      })
  }
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
            teamsToSports,
            user: req.session.user
          });
        })
        .catch((err) => {
          res.render("./pages/home", {
            error: true,
            message: "No sports found in database.",
            user: req.session.user
          });
        });
    })
    .catch((err) => {
      res.render("./pages/home", {
        error: true,
        message: "No sports found in database.",
        user: req.session.user
      });
    });
});

app.get("/profile", (req, res) => {
  return res.render("./pages/profile", { user: req.session.user });
});

app.get("/editProfile", (req, res) => {
  return res.render("./pages/editProfile", { user: req.session.user });
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
        playerNames: data[4],
        user: req.session.user
      });
    })
    .catch(err => {
      // failure, ROLLBACK was executed
      console.log(err);

      return res.render("./pages/sports", { message: "Error Occured In Team Query", error: 1, user: req.session.user })
    });
});

app.get("/team/:teamID", (req, res) => {
  db.tx(t => {
    // creating a sequence of transaction queries:
    const sport = db.any(`SELECT sportName FROM sports WHERE sportID IN (SELECT sportID FROM teamsToSports WHERE teamID =  ${req.params.teamID} );`)
    const onTeam = db.any(`SELECT * FROM teamsToPlayers WHERE playerID = ${req.session.user.playerid} AND teamID = ${req.params.teamID};`)
    const team = db.one("SELECT * FROM teams WHERE teamID=$1", [req.params.teamID])
    const teamsToCaptains = db.one("SELECT * FROM teamsToCaptains WHERE teamID=$1", [req.params.teamID])
    const players = db.any(`SELECT *  FROM players 
    INNER JOIN teamsToPlayers ON players.playerID = teamsToPlayers.playerID
    WHERE teamsToPlayers.teamID = $1`, [req.params.teamID])
    const teamGames = db.any(`SELECT *  FROM games 
    INNER JOIN teamsToGames ON games.gameID = teamsToGames.gameID
    WHERE teamsToGames.teamID = $1 ORDER BY games.gameDate `, req.params.teamID)
    const numWinners = db.one(`SELECT COUNT(*) FROM gamesToWinners WHERE teamID = $1;`, req.params.teamID)
    const gamesQuery = t.any(`SELECT * FROM games INNER JOIN teamsToGames ON games.gameID = teamsToGames.gameID
     INNER JOIN teamsToSports ON teamsToGames.teamID = teamsToSports.teamID
      INNER JOIN sports ON teamsToSports.sportID = sports.sportID
       INNER JOIN teams ON teamsToSports.teamID = teams.teamID 
       WHERE games.gameid IN 
       (SELECT gameid FROM teamsToGames WHERE teamsToGames.teamID = $1) ORDER BY games.gameDate;`,req.params.teamID);
    // returning a promise that determines a successful transaction:
    return t.batch([team, teamsToCaptains, players, teamGames, numWinners, gamesQuery, onTeam, sport]); // all of the queries are to be resolved;
  })
    .then(data => {
      // success, COMMIT was executed
      return res.render("./pages/team", {
        team: data[0],
        teamsToCaptains: data[1],
        players: data[2],
        teamGames: data[3],
        numWinners: data[4],
        games: data[5],
        user: req.session.user,
        result: req.query.joinResult,
        onTeam: data[6],
        sport: data[7]
      });
    })
    .catch(err => {
      // failure, ROLLBACK was executed
      console.log(err);

      return res.redirect("/sports")
    });

})




app.post("/leaveTeam", (req, res) => {
  db.any(`SELECT *
  FROM teamsToPlayers
  WHERE teamID = ${req.body.teamid};`) 
  .then(data => {
    if(data.length == 1) {
      return res.redirect('/yourTeams');
    }
    else {
      if(req.body.iscaptain == "true") {
        db.any(`SELECT playerID FROM teamsToPlayers WHERE teamID = ${req.body.teamid} AND playerID != ${req.session.user.playerid} LIMIT 1;`)
        .then(newCaptainID => {
            if(newCaptainID.length > 0) {
                  db.any(`DELETE FROM teamsToPlayers WHERE teamID = ${req.body.teamid} AND playerID = ${req.session.user.playerid}; 
                  INSERT INTO teamsToCaptains (playerID, teamID) VALUES (${newCaptainID[0].playerid},${req.body.teamid});
                  DELETE FROM teamsToCaptains WHERE teamID = ${req.body.teamid} AND playerID = ${req.session.user.playerid};`)
                .then(data => {
                  return res.redirect('/yourTeams');
                })
                .catch(err => {
                  return res.redirect('/yourTeams');
                });
          }
          else {
            db.any(`DELETE FROM teamsToPlayers WHERE teamID = ${req.body.teamid} AND playerID = ${req.session.user.playerid}; 
            DELETE FROM teamsToCaptains WHERE teamID = ${req.body.teamid} AND playerID = ${req.session.user.playerid};`)
                .then(data => {
                  return res.redirect('/yourTeams');
                })
                .catch(err => {
                  return res.redirect('/yourTeams');
                });
          }
        })
        .catch(err => {
          return res.redirect('/yourTeams');
        }); 
      }
      else {
        db.any(`DELETE FROM teamsToPlayers WHERE teamID = ${req.body.teamid} AND playerID = ${req.session.user.playerid};`)
                .then(data => {
                  return res.redirect('/yourTeams');
                })
                .catch(err => {
                  return res.redirect('/yourTeams');
                });
      }
    }
  })
  .catch(err => {
    return res.redirect('/yourTeams');
  });
})

// untested because individual team page is broken
app.get('/team/delete/:teamID', async (req, res) => {
  const checkTeamCaptain = `SELECT * FROM teamsToCaptains WHERE teamID=$1 AND playerID=$2`
  try {
    await db.one(checkTeamCaptain, [req.params.teamID, req.session.user.playerid]);
  } catch (err) {
    console.log(err);
    return res.redirect("/yourTeams");
  }

  const query = `
DELETE FROM teamsToPlayers WHERE teamID=$1;
DELETE FROM teamsToSports WHERE teamID=$1;
DELETE FROM teamsToGames WHERE teamID=$1;
DELETE FROM teamsToCaptains WHERE teamID=$1;
DELETE FROM gamesToWinners WHERE teamID=$1;
DELETE FROM teams WHERE teamID=$1;`
  db.any(query, [req.params.teamID])
      .then(() => {
        return res.redirect("/yourTeams");
      })
      .catch((err) => {
        console.log(err);
        return res.redirect("/yourTeams");
      })
})

app.post("/team/join", (req, res) => {
  db.any(` 
  SELECT * FROM sports WHERE (sportID IN(SELECT sportID FROM teamsToSports WHERE teamID IN(SELECT teamID FROM teamsToPlayers WHERE playerID = ${req.session.user.playerid}))) 
  AND sportID IN(SELECT sportID FROM sports WHERE (sportID = (SELECT sportID FROM teamsToSports WHERE teamID = ${req.body.teamid} LIMIT 1)));
  `)
  .then((data) => {
    if(data.length > 0) {
      return res.redirect("./"+req.body.teamid+"?joinResult=sportError");
    }
    else {
      db.any(`SELECT * FROM teamsToPlayers WHERE playerID = ${req.session.user.playerid} AND teamID = ${req.body.teamid};`) 
    .then((data) => {
        if(data.length > 0) {
          return res.redirect("./"+req.body.teamid+"?joinResult=onTeamError");
        }
        else {
          const query = `INSERT INTO teamsToPlayers (playerID, teamID) VALUES ($1, $2);`
          db.any(query, [req.session.user.playerid, req.body.teamid])
            .then(() => {
              db.one("SELECT * FROM teams WHERE teamID=$1", [req.body.teamid])
                .then((team) => {
                  console.log("team:" + team.teamname);
                  return res.redirect("./"+req.body.teamid+"?joinResult=success");
                })
                .catch((err) => {
                  console.log(err);
                  return res.render(`./pages/sports`, { error: true, message: 'Unable to find team.', user: req.session.user });
                });
            })
            .catch((err) => {
              console.log(err);
              return res.render("./pages/teams", { error: true, message: 'Unable to join team.', user: req.session.user });
            });
        }

    })
    .catch((err) => {
          return res.redirect("./"+req.body.teamid+"?joinResult=failure");
});

    }
  })
  .catch((err) => {
    return res.redirect("./"+req.body.teamid+"?joinResult=failure");
});


  
});

app.post("/team/create", (req, res) => {
  const sportID = req.body.sportID;
  const teamInsertQuery = 'INSERT INTO teams (teamName) VALUES ($1) RETURNING teamID';
  const teamRelationInsertQuery = `INSERT INTO teamsToPlayers (playerID, teamID) VALUES ($1, $2);
  INSERT INTO teamsToCaptains (playerID, teamID) VALUES ($1, $2);
  INSERT INTO teamsToSports (teamID, sportID) VALUES ($2, $3);`;
  db.any(teamInsertQuery, [req.body.teamName])
    .then((teamID) => {
      db.none(teamRelationInsertQuery, [req.session.user.playerid, teamID[0].teamid, sportID])
        .then(() => {
          db.one('SELECT * FROM teams where teamID = $1', [teamID[0].teamid])
            .then((team) => {
              return res.redirect("./"+teamID[0].teamid);
            })
            .catch((err) => {
              console.log(err);
              return res.render(`./pages/sports`, { error: true, message: 'Unable to find team.', user: req.session.user });
            })
        })
        .catch((err) => {
          console.log(err);
          return res.render(`./pages/sports`, { error: true, message: 'Unable to add team relations', user: req.session.user });
        })
    })
    .catch((err) => {
      console.log(err);
      return res.render("./pages/teams", { error: true, message: 'Unable to create team.', user: req.session.user });
    })
});


app.post("/allGames/create", (req, res) => {

  const gameInsertQuery = 'INSERT INTO games (gameDate, time, location) VALUES ($1,$2,$3) RETURNING gameID';
  const gameRelationInsertQuery = `INSERT INTO teamsToGames (teamID, gameID) VALUES ($2, $1);INSERT INTO teamsToGames (teamID, gameID) VALUES ($3, $1);`
  db.any(gameInsertQuery, [req.body.gameDate, req.body.gameTime, req.body.gameLocation])
    .then((data) => {
      db.none(gameRelationInsertQuery, [data[0].gameid, req.body.teamid1, req.body.teamid2])
        .then(() => {
          return res.render(`./pages/createSuccess`, {
            user: req.session.user,
            playerID: req.session.user.playerid,
            error: false, message: 'Game successfully created.'
          });
        })
        .catch((err) => {
          console.log(err);
          return res.render(`./pages/createSuccess`, { user: req.session.user, playerID: req.session.user.playerid, error: true, message: 'Unable to add game relations.' });
        })
    })
    .catch((err) => {
      console.log(err);
      return res.render("./pages/createSuccess", { playerID: req.session.user.playerid, error: true, message: 'Unable to create game.' });
    })
});

app.post("/editProfile", (req, res) => {

  console.log(req.session.user);
  var year = req.body.classyear;
  if (!year || year == 'Other/NA') {
    year = 0;
  }

  var email = req.body.email;
  if (!email) {
    email = null;
  }

  db.one("UPDATE players SET username = $1, playerName = $2, classYear = $3, profilePhoto = $4, email = $5, phone = $6 WHERE playerID = $7 RETURNING playerID;",
    [req.body.username, req.body.playername, year, req.body.profilephotolink, email, req.body.phone, req.session.user.playerid])
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
      return res.render("pages/profile", { user: req.session.user, error: true, message: 'Error. That username or email is already registered with another account.' });
    });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  return res.render("pages/login", { error: false, message: 'Successfully logged out.' });
});

app.get("/yourUpcomingGames", (req, res) => {
  db.tx(t => {
    const teamsQuery = t.any(`SELECT * FROM teamsToPlayers WHERE playerid = ${req.session.user.playerid};`);
    const gamesQuery = t.any(`SELECT * FROM games INNER JOIN teamsToGames ON games.gameID = teamsToGames.gameID INNER JOIN teamsToSports ON teamsToGames.teamID = teamsToSports.teamID INNER JOIN sports ON teamsToSports.sportID = sports.sportID INNER JOIN teams ON teamsToSports.teamID = teams.teamID WHERE games.gameid IN (SELECT gameid FROM teamsToGames WHERE teamsToGames.teamID IN (SELECT teamid FROM teamsToPlayers WHERE playerid = ${req.session.user.playerid})) ORDER BY games.gameDate;`);

    return t.batch([teamsQuery, gamesQuery]);
  })
    .then(data => {
      const gameData = [];
      for (let i = 0; i < data[1].length; i += 2) {
        const gameObject = {
          gameid: data[1][i].gameid,
          gamedate: data[1][i].gamedate,
          time: data[1][i].time,
          location: data[1][i].location,
          team1: data[1][i].teamname,
          team1id: data[1][i].teamid,
          team2: data[1][i + 1].teamname,
          team2id: data[1][i + 1].teamid,
          sportname: data[1][i].sportname
        };
        gameData.push(gameObject);
        console.log(gameObject);
      }

      return res.render("./pages/yourUpcomingGames", { teams: data[0], games: gameData, user: req.session.user });
    })
    .catch(err => {
      console.log(err);
      return res.render("./pages/yourUpcomingGames", { teams: [], games: [], user: req.session.user, error: true, message: "Failed to Retrieve Upcoming Games" });
    });
});

app.get("/allUpcomingGames", (req, res) => {
  const query = `SELECT * FROM games INNER JOIN teamsToGames ON games.gameID = teamsToGames.gameID INNER JOIN teamsToSports ON teamsToGames.teamID = teamsToSports.teamID INNER JOIN sports ON teamsToSports.sportID = sports.sportID INNER JOIN teams ON teamsToSports.teamID = teams.teamID ORDER BY games.gameDate;`;

  db.any(query)
    .then(data => {
      const gameData = [];
      for (let i = 0; i < data.length; i += 2) {
        const gameObject = {
          gameid: data[i].gameid,
          gamedate: data[i].gamedate,
          time: data[i].time,
          location: data[i].location,
          team1: data[i].teamname,
          team2: data[i + 1].teamname,
          sportname: data[i].sportname
        };
        gameData.push(gameObject);
        console.log(gameObject);
      }
      return res.render("./pages/allUpcomingGames", { games: gameData, user: req.session.user });
    })
    .catch(err => {
      console.log(err);
      return res.render("./pages/allUpcomingGames", { games: [], user: req.session.user, error: true, message: err.message });
    });
});

app.get("/allGames", (req, res) => {
  db.tx(t => {


    const sports = db.any(`SELECT * FROM sports ORDER BY sportName ASC;`);
    const gamesQuery = t.any(`SELECT * FROM games INNER JOIN teamsToGames ON games.gameID = teamsToGames.gameID INNER JOIN teamsToSports ON teamsToGames.teamID = teamsToSports.teamID INNER JOIN sports ON teamsToSports.sportID = sports.sportID INNER JOIN teams ON teamsToSports.teamID = teams.teamID ORDER BY games.gameDate;`);
    const winnersQuery = t.any(`SELECT * FROM gamesToWinners;`);

    return t.batch([gamesQuery, winnersQuery, sports]);
  })
    .then(data => {
      const allGames = data[0];
      const winners = data[1];
      const gameData = [];
      for (let i = 0; i < allGames.length; i += 2) {
        let index = -1;
        for (let j = 0; j < winners.length; j++) {
          if (allGames[i].gameid === winners[j].gameid) {
            index = j;
            break;
          }
        }
        let winner = 0;
        if (index !== -1) {
          winner = (allGames[i].teamid === winners[index].teamid ? 1 : 2);
        }
        const gameObject = {
          gameid: allGames[i].gameid,
          gamedate: allGames[i].gamedate,
          time: allGames[i].time,
          location: allGames[i].location,
          team1: allGames[i].teamname,
          team2: allGames[i + 1].teamname,
          sportname: allGames[i].sportname,
          winner: winner
        };
        gameData.push(gameObject);
        console.log(gameObject);
      }
      return res.render("./pages/allGames", { games: gameData, user: req.session.user, sports: data[2] });
    })
    .catch(err => {
      console.log(err);
      return res.render("./pages/allGames", { games: [], user: req.session.user, error: true, message: err.message, sports: [] });
    });
});


app.post("/gameCreate", (req, res) => {
  db.tx(t => {
    const teams = db.any(`SELECT * FROM teams ORDER BY teamName ASC;`);
    const teamsToSports = db.any(`SELECT * FROM teamsToSports;`);
    return t.batch([teams, teamsToSports]); // all of the queries are to be resolved;
  })
    .then(data => {
      res.render("./pages/gameCreate", {
        user: req.session.user,
        playerID: req.session.user.playerid,
        teams: data[0],
        teamsToSports: data[1],
        sportSelect: req.body.sportselect
      });
    })
    .catch((err) => {
      res.render("./pages/yourUpcomingGames", {
        user: req.session.user,
        playerID: req.session.user.playerid,
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
              return res.render('./pages/game', { game, user, teaminfo, sportname, user: req.session.user })

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
      return res.render("./pages/yourTeams", { teams, user: req.session.user });

    })
    .catch((err) => {
      return res.render("./pages/yourTeams", {
        teams: [],
        error: true,
        message: err.message,
        user: req.session.user
      });
    });
});

app.get("/players", (req, res) => {
  db.any(`SELECT * FROM players ORDER BY playerID ASC;`)
    .then((players) => {
      return res.render("./pages/players", { players, user: req.session.user });
    })
    .catch((err) => {
      return res.render("./pages/players", {
        players: [],
        error: true,
        message: err.message,
        user: req.session.user
      });
    });
});
app.get("/searchPlayers", (req, res) => {
  const q = req.query.q;
  db.any(`SELECT * FROM players WHERE 
          LOWER(gender) LIKE '${q}%' 
          OR gender LIKE '${q}%' 
          OR LOWER(username) LIKE '${q}%' 
          OR username LIKE '${q}%' 
          OR LOWER(playerName) LIKE '${q}%'
          OR playerName LIKE '${q}%' 
          OR playerID IN(SELECT playerID FROM teamsToPlayers WHERE teamID IN(SELECT teamID FROM teamsToSports WHERE sportID IN(SELECT sportID FROM sports WHERE LOWER(sportName) LIKE '${q}%' OR sportName LIKE '${q}%'))) 
          OR playerID IN(SELECT playerID FROM teamsToPlayers WHERE teamID IN(SELECT teamID FROM teams WHERE LOWER(teamName) LIKE '${q}%' OR teamName LIKE '${q}%'));`)
    .then((players) => {
      if (players.length == 0) {
        db.any(`SELECT * FROM players WHERE classYear = ${q} OR playerid = ${q};`)
          .then((playersInt) => {
            if (playersInt.length == 0) {
              return res.render("./pages/playerSearchResults", {
                playersInt: [],
                players: [],
                error: true,
                message: 'No results.',
                user: req.session.user
              });
            }
            return res.render("./pages/playerSearchResults", { players: [], playersInt, user: req.session.user });
          })
          .catch((err) => {
            return res.render("./pages/playerSearchResults", {
              playersInt: [],
              players: [],
              error: true,
              message: 'No results.',
              user: req.session.user
            });
          });
      }
      else {
        return res.render("./pages/playerSearchResults", { players, playersInt: [], user: req.session.user });
      }

    })
    .catch((err) => {
      return res.render("./pages/playerSearchResults", {
        playersInt: [],
        players: [],
        error: true,
        message: 'No results.',
        user: req.session.user
      });
    });
});

app.get("/player", (req, res) => {
  db.any(`SELECT * FROM players WHERE playerid = ${req.query.playerid} LIMIT 1;`)
    .then((player) => {
      db.any(`SELECT * FROM teams WHERE teamID IN (SELECT teamID FROM teamsToPlayers WHERE playerID = ${player[0].playerid});`)
        .then((teams) => {
          return res.render("./pages/player", { player, teams, user: req.session.user });
        })
        .catch((err) => {
          return res.render("./pages/player", {
            teams: [],
            player: [],
            error: true,
            message: err.message,
            user: req.session.user
          });
        });
    })
    .catch((err) => {
      return res.render("./pages/player", {
        teams: [],
        player: [],
        error: true,
        message: err.message,
        user: req.session.user
      });
    });
});

app.get("/changePassword", (req, res) => {
  return res.render("./pages/changePassword", { user: req.session.user });
});

app.post("/changePassword", async (req, res) => {
  const currentPassword = req.body.currentPassword;
  const match = await bcrypt.compare(currentPassword, req.session.user.password);
  if (!match) {
    return res.render("./pages/changePassword", { error: true, message: 'Incorrect current password.', user: req.session.user })
  }

  if (req.body.newPassword !== req.body.confirmNewPassword) {
    return res.render("./pages/changePassword", { error: true, message: 'New passwords do not match.', user: req.session.user })
  }

  if (req.body.newPassword == currentPassword) {
    return res.render("./pages/changePassword", { error: true, message: 'New password cannot be current password.', user: req.session.user })
  }

  const newHash = await bcrypt.hash(req.body.newPassword, 10);
  db.one(`UPDATE players SET password = '${newHash}' WHERE playerID = ${req.session.user.playerid} RETURNING playerID;`)
    .then((playerID) => {
      db.one("SELECT * FROM players WHERE playerID = $1", [playerID.playerid])
        .then((user) => {
          req.session.user = user;
          req.session.save();
          return res.render("./pages/profile", { user: req.session.user, error: false, message: 'Password changed successfully.', user: req.session.user });
        })
        .catch((err) => {
          console.log(err);
          return res.render("./pages/changePassword", { user: req.session.user, error: true, message: 'Failed to change password.', user: req.session.user });
        })
    })
    .catch((err) => {
      console.log(err);
      return res.render("./pages/changePassword", { user: req.session.user, error: true, message: 'Failed to change password.', user: req.session.user });
    });
});

// End Routing

app.use((req, res, next) => {
  res.status(404).send('<div style="text-align: center"><h1>404</h1><h3>Page not found</h3><h5>Check the URL you entered.</h5></div>');
})


app.listen(3000);
console.log('Server is listening on port 3000');
