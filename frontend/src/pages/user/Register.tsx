import React, { useState } from 'react';
import { userService } from '../../service'; // Adjust the import path as needed
import { CreateUserRequest, User } from '../../rpc/proto/user/user_pb';

export const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registrationStatus, setRegistrationStatus] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const newUser = new User();
        newUser.username = username;
        newUser.email = email;
        newUser.password = password; // Ensure password is handled securely

        const request = new CreateUserRequest();
        request.user = newUser;

        try {
            const response = await userService.createUser(request, {});
            setRegistrationStatus('Registration successful');
            // Additional logic after successful registration (e.g., redirect)
        } catch (error) {
            console.error('Error creating user:', error);
            setRegistrationStatus('Registration failed');
            // Additional error handling
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Register</h1>
            <form onSubmit={handleSubmit}>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
                <button type="submit">Register</button>
            </form>
            {registrationStatus && <p>{registrationStatus}</p>}
        </div>
    );
};

export default Register;
