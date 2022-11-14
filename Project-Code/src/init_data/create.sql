CREATE TABLE players (
    playerID SERIAL PRIMARY KEY NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    playerName VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    classYear SMALLINT NOT NULL,
    profilePhoto VARCHAR(100) NOT NULL,
    joinDate DATE NOT NULL
);

CREATE TABLE messages(
    messageID SERIAL PRIMARY KEY NOT NULL,
    messageContent VARCHAR(200) NOT NULL
);

CREATE TABLE teams (
    teamID SERIAL PRIMARY KEY NOT NULL,
    teamName VARCHAR(100) NOT NULL
);

CREATE TABLE teamsToPlayers (
    playerID INT NOT NULL REFERENCES players(playerID),
    teamID INT NOT NULL REFERENCES teams(teamID)
);

CREATE TABLE playersToMessages (
    playerID INT NOT NULL REFERENCES players(playerID),
    messageID INT NOT NULL REFERENCES messages(messageID)
);

CREATE TABLE games (
    gameID SERIAL PRIMARY KEY NOT NULL,
    gameDate DATE NOT NULL,
    time TIME NOT NULL,
    location TEXT NOT NULL
);

CREATE TABLE sports (
    sportID SERIAL PRIMARY KEY NOT NULL,
    sportName VARCHAR(100) NOT NULL,
    sportDesc VARCHAR(500) NOT NULL
);

CREATE TABLE teamsToSports (
    teamID INT NOT NULL REFERENCES teams(teamID),
    sportID INT NOT NULL REFERENCES sports(sportID)
);

CREATE TABLE teamsToGames (
    teamID INT NOT NULL REFERENCES teams(teamID),
    gameID INT NOT NULL REFERENCES games(gameID)
);

CREATE TABLE teamsToCaptains (
    teamID INT NOT NULL REFERENCES teams(teamID),
    playerID INT NOT NULL REFERENCES players(playerID)
);



