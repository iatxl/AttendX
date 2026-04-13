import React, { useRef, useEffect } from 'react';
import Navbar from './Navbar';

const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4';

const AppLayout = ({ children }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        let startTime = null, isFadingOut = false, raf = null;

        const tick = (time) => {
            if (!startTime) startTime = time;
            const elapsed = time - startTime, dur = video.duration || 5;
            if (elapsed < 800 && !isFadingOut) video.style.opacity = (elapsed / 800) * 0.22; // max 22% opacity
            else if (dur && video.currentTime >= dur - 0.5) {
                isFadingOut = true;
                video.style.opacity = Math.max(0, 0.22 - ((video.currentTime - (dur - 0.5)) / 0.5) * 0.22);
            } else if (!isFadingOut) video.style.opacity = 0.22;
            raf = requestAnimationFrame(tick);
        };
        const onPlay = () => { startTime = performance.now(); isFadingOut = false; video.style.opacity = 0; raf = requestAnimationFrame(tick); };
        const onEnded = () => {
            cancelAnimationFrame(raf);
            video.style.opacity = 0;
            setTimeout(() => { video.currentTime = 0; video.play(); }, 200);
        };
        video.addEventListener('play', onPlay);
        video.addEventListener('ended', onEnded);
        video.play().catch(() => {});
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('ended', onEnded);
            cancelAnimationFrame(raf);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#060606] relative">
            {/* ── Cinematic ambient video — slightly more prominent ─────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity"
                    src={VIDEO_SRC}
                    muted
                    playsInline
                    style={{ opacity: 0 }}
                />
                {/* Refined overlay — lets more ambient motion through */}
                <div className="absolute inset-0 bg-[#060606]/78" />
                {/* Gradient vignette — darker edges, vibrant centre */}
                <div className="absolute inset-0 bg-radial-gradient"
                    style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 0%, rgba(6,6,6,0.3) 60%, rgba(6,6,6,0.85) 100%)' }} />
            </div>

            {/* ── Ambient color orbs ─────────────────────────────────────────── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-950/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-950/15 rounded-full blur-3xl" />
            </div>

            {/* ── Content ────────────────────────────────────────────────────── */}
            <div className="relative z-10">
                <Navbar />
                <main className="pt-24 pb-16">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
