const express = require('express');
const app = express();
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

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
app.set('views', path.join(__dirname, '/src/views'))
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

app.get("/", (req, res) => {
    return res.render("pages/home");
});

app.get("/about", (req, res) => {
    return res.render("pages/about");
});

app.get("/login", (req, res) => {
    return res.render("pages/login");
});

app.get("/profile", (req, res) => {
    return res.render("pages/profile", { user: sess });
});

app.get("/register", (req, res) => {
    return res.render("pages/register");
});

app.get("/logout", (req, res) => {
    return res.render("pages/login");
});

app.post('/login', async (req, res) => {
    try {
        const user = await db.one("SELECT * FROM players WHERE username=$1 AND password=$2",
            [req.body.username, req.body.password]);
        if (!user) {
            res.redirect("/register");
        }
        const match = await bcrypt.compare(req.body.password, user.password);
        if (match) {
            req.session.user = user;
            req.session.save();
            return res.redirect("/discover");
        } else {
            return res.render("pages/login");
        }
    }
    catch (err) {
        return res.render("pages/register");
    }
});


app.post("/register", async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const tempClassYear = 2022;
    const tempProfilePhoto = '';
    const tempJoinDate = 2022;
    const insertQuery = 'INSERT INTO players (playerName, password, classYear, profilePhoto, joinDate) VALUES ($1, $2, $3, $4, $5);';
    db.any(insertQuery, [req.body.username, hash, tempClassYear, tempProfilePhoto, tempJoinDate])
        .then(() => {
            res.redirect("/login");
        })
        .catch((err) => {
            console.log(err);
            res.redirect("/register");
        })
});

// End Routing

app.listen(3000);
console.log('Server is listening on port 3000');
