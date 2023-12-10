import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Demo from '@/pages/Demo';
import TemplateForm from '@/pages/TemplateForm';
import TemplateBuilder from '@/pages/TemplateBuilder';
import BiomeSelector from '@/pages/Biomes';
import {StoryTemplateForm} from '@/pages/GenerateTemplate';


export default function App() {
    return (
        <Router>
            <div>
                <nav>
                    <ul style={{ listStyleType: 'none', margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#333' }}>
                        <li style={{ float: 'left' }}>
                            <Link to="/" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Home</Link>
                        </li>
                        <li style={{ float: 'left' }}>
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
                        </li>
                    </ul>
                </nav>

                <Routes>
                    <Route path="/" element={<Demo />} />
                    <Route path="/template" element={<TemplateForm />} />
                    <Route path="/template/builder" element={<TemplateBuilder />} />
                    <Route path="/story" element={<StoryTemplateForm />} />
                    <Route path="/biomes" element={<BiomeSelector />} />
                </Routes>
            </div>
        </Router>
    );
}
