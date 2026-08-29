import React, { useState, useEffect } from 'react';
import {
    BrowserRouter as Router,
    Link,
    Outlet,
    Route,
    Routes,
} from 'react-router-dom';
import { AllPosts } from './pages/blog/Blog';
import { CreatePost } from './pages/blog/CreatePost';
import Login from './pages/user/Login';
import Resume from './pages/blog/Resume';
import { Poetry } from './pages/blog/Poetry';
import { CreateTag } from './pages/blog/CreateTag';
import { FullPostComponent } from './pages/blog/ContentPage';
import { FilteredPosts } from './pages/blog/FilteredPosts';

const DiceGame = React.lazy(() => import('./pages/dice/DiceGame'));

const DiceRouteFallback = () => (
    <main className="grid h-[100dvh] place-items-center bg-[#185438] text-emerald-50">
        Loading letter dice…
    </main>
);

function SiteLayout({ isLoggedIn }: { isLoggedIn: boolean }) {
    return (
        <div>
            <nav>
                <ul className="list-none m-0 p-0 overflow-hidden bg-[#333]">
                    <li className="float-left">
                        <Link to="/" className="block text-white text-center py-3 px-4 no-underline">Blog</Link>
                    </li>
                    {isLoggedIn && (
                        <li className="float-left">
                            <Link to="/createpost" className="block text-white text-center py-3 px-4 no-underline">Create</Link>
                        </li>
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
                        <Link to="/dice" className="block text-white text-center py-3 px-4 no-underline">Letter Dice</Link>
                    </li>
                </ul>
            </nav>
            <Outlet />
        </div>
    );
}

function AppRoutes() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check if user is logged in by checking the presence of a token or any identifier in localStorage
        const token = localStorage.getItem('userToken');
        setIsLoggedIn(!!token);
    }, []);

    return (
        <Routes>
            <Route element={<SiteLayout isLoggedIn={isLoggedIn} />}>
                <Route path="/" element={<AllPosts />} />
                <Route path="/createpost" element={<CreatePost />} />
                <Route path="/login" element={<Login />} />
                {/* <Route path='/register' element={<Register />} /> */}
                <Route path='/resume' element={<Resume />} />
                <Route path='/poetry' element={<Poetry />} />
                <Route path='/tags' element={<CreateTag />} />
                <Route path="/post/:postId" element={<FullPostComponent />} />
                <Route path="/filtered" element={<FilteredPosts />} />
            </Route>
            <Route
                path="/dice"
                element={(
                    <React.Suspense fallback={<DiceRouteFallback />}>
                        <DiceGame />
                    </React.Suspense>
                )}
            />
        </Routes>
    );
}

export default function App() {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}
