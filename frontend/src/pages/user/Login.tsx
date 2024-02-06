import React, { useState } from 'react';
import { userService } from '../../service';
import { LoginRequest } from '../../rpc/proto/user/user_pb';

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
            const response = await userService.login(request, {});
            const token = response.token;
            localStorage.setItem('userToken', token); // Store the token
            localStorage.setItem('username', username); // Store the username
            setLoginStatus('Login successful');
            // Redirect or perform additional actions
        } catch (error) {
            console.error('Error logging in:', error);
            setLoginStatus('Login failed');
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
