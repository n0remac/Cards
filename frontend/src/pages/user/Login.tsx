import React, { useState } from 'react';
import { userService } from '../../service'; // Adjust the import path as needed
import { LoginRequest, User } from '../../rpc/proto/user/user_pb'; // Adjust as per your proto definitions

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginStatus, setLoginStatus] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const request = new LoginRequest();
        request.username = username;
        request.password = password;

        try {
            const response = await userService.login(request, {}); // Replace loginUser with your actual login function
            setLoginStatus('Login successful');
            // Additional logic after successful login (e.g., redirect or token storage)
        } catch (error) {
            console.error('Error logging in:', error);
            setLoginStatus('Login failed');
            // Additional error handling
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            <form onSubmit={handleSubmit}>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                <button type="submit">Login</button>
            </form>
            {loginStatus && <p>{loginStatus}</p>}
        </div>
    );
};

export default Login;
