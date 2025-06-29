Game Session Management Feature Requirements:
Core Functionality:

When users first visit the website, present them with two options:

"Create New Game Session"
"Join Existing Game Session"

Create New Game Session:

When selected, automatically generate a unique short ID (e.g., 4-6 characters)
Create a new game session associated with this ID
Display the generated ID to the user so they can share it with others

Join Existing Game Session:

Provide an input field for users to enter a game session ID
Validate the entered ID exists
If valid, connect the user to that existing game session
If invalid, show an error message

Technical Specifications:

Game session IDs should be short, memorable, and unique
The system should track active game sessions
Users should be able to share session IDs with others to allow them to join
Consider implementing session expiration or cleanup for inactive sessions

User Experience:

Clear, intuitive interface for the initial choice
Immediate feedback when creating or joining sessions
Error handling for invalid session IDs
