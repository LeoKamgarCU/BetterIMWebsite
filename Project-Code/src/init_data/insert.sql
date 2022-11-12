INSERT INTO sports (sportName) VALUES
('Basketball'),
('Volleyball'),
('Baseball'),
('Soccer'),
('Football');

-- Default user: Username: user1, Password: asdf
INSERT INTO players (username, playerName, password, classYear, profilePhoto, joinDate) VALUES ('user1', 'leo', '$2b$10$pSWjpntEzHInJozarXe4Z..5GM5QeUE/z3OEfK3NHdDS4tjPSj4Yu', 2022, '', '2022-11-11');

-- INSERT INTO players (username, playerName, password, classYear) VALUES ('a', 'Joe Joe', 'p', 2023);
INSERT INTO teams (teamName) VALUES ('team1');
INSERT INTO teams (teamName) VALUES ('team2');
INSERT INTO teams (teamName) VALUES ('team3');
INSERT INTO teams (teamName) VALUES ('team4');
INSERT INTO teams (teamName) VALUES ('team5');
INSERT INTO teams (teamName) VALUES ('team6');
INSERT INTO teams (teamName) VALUES ('team7');
INSERT INTO teams (teamName) VALUES ('team8');
INSERT INTO teams (teamName) VALUES ('team9');

-- INSERT INTO teamsToPlayers (playerID, teamID) VALUES (1, 1);


INSERT INTO games (gameDate, time, location) VALUES ('2021-11-15', '01:00', 'd');
INSERT INTO games (gameDate, time, location) VALUES ('2022-06-15', '01:01', 'c');
INSERT INTO games (gameDate, time, location) VALUES ('2022-11-13', '2:00', 'a');
INSERT INTO games (gameDate, time, location) VALUES ('2022-11-11', '23:00', 'b');


INSERT INTO teamsToSports (teamID, sportID) VALUES (1, 1);
INSERT INTO teamsToSports (teamID, sportID) VALUES (2, 1);
INSERT INTO teamsToSports (teamID, sportID) VALUES (3, 2);
INSERT INTO teamsToSports (teamID, sportID) VALUES (4, 2);
INSERT INTO teamsToSports (teamID, sportID) VALUES (5, 3);
INSERT INTO teamsToSports (teamID, sportID) VALUES (6, 3);
INSERT INTO teamsToSports (teamID, sportID) VALUES (7, 4);
INSERT INTO teamsToSports (teamID, sportID) VALUES (8, 4);

INSERT INTO teamsToGames (teamID, gameID) VALUES (1, 1);
INSERT INTO teamsToGames (teamID, gameID) VALUES (2, 1);
-- INSERT INTO teamsToGames (teamID, gameID) VALUES (1, 3);

INSERT INTO teamsToGames (teamID, gameID) VALUES (3, 2);
INSERT INTO teamsToGames (teamID, gameID) VALUES (4, 2);


INSERT INTO teamsToGames (teamID, gameID) VALUES (5, 3);
INSERT INTO teamsToGames (teamID, gameID) VALUES (6, 3);

INSERT INTO teamsToGames (teamID, gameID) VALUES (7, 4);
INSERT INTO teamsToGames (teamID, gameID) VALUES (8, 4);

