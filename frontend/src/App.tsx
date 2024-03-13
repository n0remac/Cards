import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
// import Demo from '@/pages/Demo';
// import TemplateForm from '@/pages/TemplateForm';
// import TemplateBuilder from '@/pages/TemplateBuilder';
// import BiomeSelector from '@/pages/Biomes';
// import {StoryTemplateForm} from '@/pages/GenerateTemplate';
// import { GenerateCards } from './pages/cards/GenerateCards';
// import { AllCards, DisplayCard, UsersCards } from './pages/cards/Cards';
// import { CreateCard } from './pages/cards/CreateCard';
// import { CombineCards } from './pages/cards/CombineCards';
// import Login from './pages/user/Login';
// import Register from './pages/user/Register';
// import GameLobby from './pages/game/Lobby';
// import { Game } from './pages/game/Game';
// import {CreateDeck, UsersDecks, DeckById} from './pages/cards/Deck';
import { AllPosts } from './pages/blog/Blog';
import { CreatePost } from './pages/blog/CreateBlog';


export default function App() {
    return (
        <Router>
            <div>
                <nav>
                    <ul style={{ listStyleType: 'none', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#333' }}>
                        <li style={{ float: 'left' }}>
                            <Link to="/" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Blog</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/createpost" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Create</Link>
                        </li>
                        
                        {/* <li style={{ float: 'right' }}>
                            <Link to="/login" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Login</Link>
                        </li>
                        <li style={{ float: 'right' }}>
                            <Link to="/register" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Register</Link>
                        </li> */}
                        
                    </ul>
                </nav>

                <Routes>
                    <Route path="/" element={<AllPosts />} />
                    <Route path="/createpost" element={<CreatePost />} />
                </Routes>
            </div>
        </Router>
    );
}
