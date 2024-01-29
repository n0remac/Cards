import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GameLobby = () => {
  const [isGameFull, setIsGameFull] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('userToken');
    setIsLoggedIn(!!token);

    if (!token) {
      navigate('/login');
    }

    // Check if game is full (implement your logic here)
    // setIsGameFull(true/false based on game state);
  }, [navigate]);

  const joinGame = () => {
    // Implement logic to join game
    // Update game state and check if the game is full
  };

  if (isGameFull) {
    navigate('/game'); // Navigate to the game page when the game is full
  }

  return (
    <div>
      <h1>Game Lobby</h1>
      {isLoggedIn && <button onClick={joinGame}>Join Game</button>}
      {!isLoggedIn && <p>Please log in to join a game.</p>}
    </div>
  );
};

export default GameLobby;
