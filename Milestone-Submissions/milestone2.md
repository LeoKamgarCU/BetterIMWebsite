### 3 Primary features: Registration/login, Team creation, Join a team 

### Unit tests:  


### Registration/login:   
Tell user to register/login –> the following should happen:    
User clicks on register button if they are not logged in and have not previously registered with the site   
User is directed to the registration page   
User inputs their desired username, password, confirm password, class year, profile photo (not required)    
Test data should include all types of characters for the username and password, including passwords that do not meet the minimum security requirements and passwords that do not match.   
For example: username = “user1”, password = “123” should fail because the password is too weak    
username = “user1”, password = “Quwheu$?” should be successful because the password is strong    
User must fill in all inputs and correctly format all fields      
User clicks register; password is hashed and inputted data is inserted into the users database table via POST method    
If registration is successful, the user is redirected to login page and a success message is displayed    
The user then logs in by entering their username and password    
If the user exists in the database and the credentials are correct, the user is then redirected to the home page    
Otherwise, a message is displayed informing the user that the username or password is incorrect.  
If registration is unsuccessful, the user is redirected to the register page and an error message is displayed    

Test environment: a locally running instance of the website server    
Test results: explained above (everything should work as expected/outlined above)    
User acceptance testers: ourselves and our roommates  

### Feature #2: Team Creation  

Test Flow:  
Under a specific sport, the user will select a “Create a Team” button, opening a modal to input team information.  
The user will be prompted to input a unique team name. Upon submitting the modal:  
If information is valid (name is unique), it will send a POST request to insert a team into the team database table. The user’s id and the new team id will be inserted into the teamsToCaptains table as well as the teamsToPlayers table. The team id and the sport id will then be added to the teamsToSports table  .  
Otherwise, an error message will prompt the user to input different information.  
The user will then be rendered/redirected to the Team page.  

Test Data:   
User inputs team name: Team name (varchar)  
Output into database: PlayerID (user id), TeamID, SportID  

Test Environment: Running on a local server  

Test Results: The results will be visible in the database via an insertion to the Teams, teamsToPlayers, teamsToSports, and teamsToCaptains tables.  

User Acceptance Testers: Ourselves and roommates/other students.  



### Join a Team:  
Test Cases:  
Flow: User Presses Join Team → User Experience (Redirected to Team Page), Data Activity (New playersToTeams input of the current user’s playerID and the teamID)  
Test Data: Navigate to a team page, press join a team. We need a user’s profile (for playerID) and the desired team to join (for teamID)  
Test Environment: The environment would be the local server   
Test Results: The results will be visible in the database via an additional entry showing a specific user has indeed joined a team (This is equivalent to   playersToTeams table including an additional row)  
User Acceptance Testers: The testers to be used will be ourselves, as well as our roommates  
