import React from 'react';

// AuthLayout: bare background for login/register — NO Navbar
// The pages themselves have their own logo + navigation links inside the card
const AuthLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#060606] relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-950/25 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-950/20 rounded-full blur-3xl" />
            </div>
            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
};

export default AuthLayout;
