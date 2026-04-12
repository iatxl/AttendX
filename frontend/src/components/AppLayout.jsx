import React from 'react';
import Navbar from './Navbar';
import Background3D from './Background3D';

const AppLayout = ({ children }) => {
    return (
        <>
            <Background3D />
            <div className="relative z-10 w-full min-h-screen pt-4 pb-10">
                <Navbar />
                <main>
                    {children}
                </main>
            </div>
        </>
    );
};

export default AppLayout;
