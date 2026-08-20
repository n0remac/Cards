import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AllPosts } from './pages/blog/Blog';
import { CreatePost } from './pages/blog/CreatePost';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Resume from './pages/blog/Resume';
import { Poetry } from './pages/blog/Poetry';
import { CreateTag } from './pages/blog/CreateTag';
import { FullPostComponent } from './pages/blog/ContentPage';
import { FilteredPosts } from './pages/blog/FilteredPosts';

const DiceGame = React.lazy(() => import('./pages/dice/DiceGame'));

const DiceRouteFallback = () => (
    <main className="grid min-h-[calc(100vh-3rem)] place-items-center bg-[#111513] text-stone-300">
        Loading dice…
    </main>
);

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check if user is logged in by checking the presence of a token or any identifier in localStorage
        const token = localStorage.getItem('userToken');
        setIsLoggedIn(!!token);
    }, []);

    return (
        <Router>
            <div>
                <nav>
                    <ul className="list-none m-0 p-0 overflow-hidden bg-[#333]">
                        <li className="float-left">
                            <Link to="/" className="block text-white text-center py-3 px-4 no-underline">Blog</Link>
                        </li>
                        {isLoggedIn && (
                            <div>
                                <li className="float-left">
                                    <Link to="/createpost" className="block text-white text-center py-3 px-4 no-underline">Create</Link>
                                </li>
                            </div>
                        )}
                        <li className="float-left">
                            <Link to="/resume" className="block text-white text-center py-3 px-4 no-underline">Resume</Link>
                        </li>
                        <li className="float-left">
                            <Link to="/tags" className="block text-white text-center py-3 px-4 no-underline">Tags</Link>
                        </li>
                        <li className="float-left">
                            <Link to="/poetry" className="block text-white text-center py-3 px-4 no-underline">Poetry</Link>
                        </li>
                        <li className="float-left">
                            <Link to="/dice" className="block text-white text-center py-3 px-4 no-underline">Dice</Link>
                        </li>
                        {/* Uncomment and adjust the login and register links as necessary */}
                        {/* {!isLoggedIn && (
                            <>
                                <li style={{ float: 'right' }}>
                                    <Link to="/login" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Login</Link>
                                </li>
                                <li style={{ float: 'right' }}>
                                    <Link to="/register" style={{ display: 'block', color: 'white', textAlign: 'center', padding: '14px 16px', textDecoration: 'none' }}>Register</Link>
                                </li>
                            </>
                        )} */}
                    </ul>
                </nav>

                <Routes>
                    <Route path="/" element={<AllPosts />} />
                    <Route path="/createpost" element={<CreatePost />} />
                    <Route path="/login" element={<Login />} />
                    {/* <Route path='/register' element={<Register />} /> */}
                    <Route path='/resume' element={<Resume />} />
                    <Route path='/poetry' element={<Poetry />} />
                    <Route path='/tags' element={<CreateTag />} />
                    <Route path="/post/:postId" element={<FullPostComponent />} />
                    <Route path="/filtered" element={<FilteredPosts />} />
                    <Route
                        path="/dice"
                        element={(
                            <React.Suspense fallback={<DiceRouteFallback />}>
                                <DiceGame />
                            </React.Suspense>
                        )}
                    />
                </Routes>
            </div>
        </Router>
    );
}
