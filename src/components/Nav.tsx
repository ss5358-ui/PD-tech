import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { observer } from 'mobx-react-lite';

const Nav = observer(() => {
    const store = useStore();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        store.logout();
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
    };

    return (
        <nav className="bg-White-800 text-Black shadow-lg py-4 px-6 flex items-center justify-between">
            <div className="text-left">
                <p className="text-sm">Date: {currentTime.toLocaleDateString()}</p>
                <p className="text-sm">Time: {currentTime.toLocaleTimeString()}</p>
                
            </div>
            <div className="flex items-center">
                <span className="mr-4">Role: {store.role}</span>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
});

export default Nav;