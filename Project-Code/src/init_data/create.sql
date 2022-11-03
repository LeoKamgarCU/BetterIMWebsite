CREATE TABLE players (
    playerID SERIAL PRIMARY KEY NOT NULL,
    playerName VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    classYear VARCHAR(9) NOT NULL,
    joinDate DATE NOT NULL,
);

CREATE TABLE games (
    gameID SERIAL PRIMARY KEY NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL
);

CREATE TABLE sports (
    sportID SERIAL PRIMARY KEY NOT NULL,
    sportName VARCHAR(100) NOT NULL
);

CREATE TABLE teams (
    teamID SERIAL PRIMARY KEY NOT NULL,
    teamName VARCHAR(100) NOT NULL 
);

CREATE TABLE playersToTeams (
    playerID INT NOT NULL,
    teamID INT NOT NULL
);


CREATE TABLE teamsToSports (
    teamID INT NOT NULL,
    sportID INT NOT NULL
);

CREATE TABLE teamsToGames (
    teamID INT NOT NULL,
    gameID INT NOT NULL
);



