INSERT INTO sports (sportName) VALUES
('Basketball'),
('Volleyball'),
('Baseball'),
('Soccer'),
('Football');


-- Testing Teams
-- password to type in login is 'asdf'
INSERT INTO players (username, playerName, password, classYear, profilePhoto, joinDate) VALUES ('user1', 'leo', '$2b$10$pSWjpntEzHInJozarXe4Z..5GM5QeUE/z3OEfK3NHdDS4tjPSj4Yu', 2022, '', '2022-11-11');

INSERT INTO teams (teamName) VALUES
('Team 1'),
('Team 2');

INSERT INTO teamsToSports (teamID, sportID) VALUES (1, 3);
INSERT INTO teamsToSports (teamID, sportID) VALUES (2, 3);
