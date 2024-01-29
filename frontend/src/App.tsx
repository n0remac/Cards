import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Demo from '@/pages/Demo';
import TemplateForm from '@/pages/TemplateForm';
import TemplateBuilder from '@/pages/TemplateBuilder';
import BiomeSelector from '@/pages/Biomes';
import {StoryTemplateForm} from '@/pages/GenerateTemplate';
import { GenerateCards } from './pages/cards/GenerateCards';
import { DisplayCards } from './pages/cards/Cards';
import { CreateCard } from './pages/cards/CreateCard';
import { CombineCards } from './pages/cards/CombineCards';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import GameLobby from './pages/game/Lobby';
import Deck from './pages/cards/Deck';


export default function App() {
    return (
        <Router>
            <div>
                <nav>
                    <ul style={{ listStyleType: 'none', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#333' }}>
                        <li style={{ float: 'left' }}>
                            <Link to="/cards/combine" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Combine Cards</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/cards/generate" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Generate Cards</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/cards/create" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Create Card</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/cards" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>All Cards</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/lobby" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Lobby</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/deck" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Deck</Link>
                        </li>
                        {/* <li style={{ float: 'left' }}>
                            <Link to="/template" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Template Form</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/template/builder" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Template Builder</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/story" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Story Template Form</Link>
                        </li>
                        <li style={{ float: 'left' }}>
                            <Link to="/biomes" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Biome Selector</Link>
                        </li> */}
                        <li style={{ float: 'right' }}>
                            <Link to="/login" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Login</Link>
                        </li>
                        <li style={{ float: 'right' }}>
                            <Link to="/register" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Register</Link>
                        </li>
                        
                    </ul>
                </nav>

                <Routes>
                    <Route path="/" element={<Demo />} />
                    <Route path="/cards/generate" element={<GenerateCards />} />
                    <Route path="/cards/" element={<DisplayCards />} />
                    <Route path="/cards/create" element={<CreateCard />} />
                    <Route path="/template" element={<TemplateForm />} />
                    <Route path="/template/builder" element={<TemplateBuilder />} />
                    <Route path="/story" element={<StoryTemplateForm />} />
                    <Route path="/biomes" element={<BiomeSelector />} />
                    <Route path="/cards/combine" element={<CombineCards />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/lobby" element={<GameLobby />} />
                    <Route path="/deck" element={<Deck />} />
                </Routes>
            </div>
        </Router>
    );
}
