import React from 'react';
import Navbar from './Navbar';

const AppLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#060606] relative">
            {/* Subtle ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-950/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-950/20 rounded-full blur-3xl" />
            </div>
            <Navbar />
            <main className="relative z-10 pt-24 pb-16">
                {children}
            </main>
        </div>
    );
};

export default AppLayout;
