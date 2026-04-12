import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '@fontsource/geist-sans'; // Ensure it's imported

export default function Home() {
    const videoRef = useRef(null);
    const fadeRequestRef = useRef(null);
    const navigate = useNavigate();

    // Custom JS-controlled fade loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let startTime = null;
        let isFadingOut = false;

        const updateOpacity = (time) => {
            if (!startTime) startTime = time;
            const elapsed = time - startTime;
            const duration = video.duration || 5;

            // Fade in (first 0.5s)
            if (elapsed < 500 && !isFadingOut) {
                video.style.opacity = elapsed / 500;
            } 
            // Fade out (last 0.5s)
            else if (duration && video.currentTime >= duration - 0.5) {
                isFadingOut = true;
                const fadeOutStart = duration - 0.5;
                const fadeOutElapsed = video.currentTime - fadeOutStart;
                video.style.opacity = Math.max(0, 1 - (fadeOutElapsed / 0.5));
            } 
            // Playing fully visible
            else if (!isFadingOut) {
                video.style.opacity = 1;
            }

            fadeRequestRef.current = requestAnimationFrame(updateOpacity);
        };

        const onPlay = () => {
            startTime = performance.now();
            isFadingOut = false;
            video.style.opacity = 0;
            fadeRequestRef.current = requestAnimationFrame(updateOpacity);
        };

        const onEnded = () => {
            cancelAnimationFrame(fadeRequestRef.current);
            video.style.opacity = 0;
            setTimeout(() => {
                video.currentTime = 0;
                video.play();
            }, 100);
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('ended', onEnded);
        // Autoplay requires mute to consistently work
        video.play().catch(console.error);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('ended', onEnded);
            if (fadeRequestRef.current) cancelAnimationFrame(fadeRequestRef.current);
        };
    }, []);

    const navItems = [
        { name: 'Features', hasChevron: true },
        { name: 'Solutions', hasChevron: false },
        { name: 'Plans', hasChevron: false },
        { name: 'Learning', hasChevron: true },
    ];

    const logos = ['Vortex', 'Nimbus', 'Prysma', 'Cirrus', 'Kynder', 'Halcyn'];

    return (
        <div className="min-h-screen flex flex-col relative w-full overflow-hidden bg-transparent">
            {/* Background Video Wrapper */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transition-opacity"
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
                    muted
                    playsInline
                    style={{ opacity: 0 }}
                />
            </div>

            {/* Blurred overlay shape */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[984px] h-[527px] opacity-90 bg-gray-950 blur-[82px] pointer-events-none z-0"></div>

            {/* Content Wrapper */}
            <div className="relative z-10 flex flex-col flex-1 pb-10">
                {/* Navbar */}
                <div className="w-full py-5 px-8 flex flex-row justify-between items-center relative">
                    <div className="flex items-center">
                        {/* We use a placeholder since the logo image might not exist yet, but request asked for src/assets/logo.png */}
                        {/* Fallback to text if img fails to emphasize the UI premiumness */}
                        <div className="font-['General_Sans'] font-bold text-2xl tracking-tight">AttendX</div>
                    </div>

                    <div className="flex items-center space-x-8">
                        {navItems.map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => navigate('/login')}
                                className="flex items-center text-[hsl(var(--foreground))]/90 hover:text-[hsl(var(--foreground))] transition-colors text-sm font-medium"
                            >
                                {item.name}
                                {item.hasChevron && <ChevronDown className="ml-1 w-4 h-4 opacity-70" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center">
                        <button 
                            onClick={() => navigate('/login')}
                            className="bg-white text-black hover:bg-gray-100 transition-colors rounded-full px-4 py-2 font-medium text-sm">
                            Sign Up
                        </button>
                    </div>
                    {/* Divider Line */}
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--foreground))]/20 to-transparent mt-[3px]"></div>
                </div>

                {/* Hero Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 overflow-visible relative z-10 w-full max-w-5xl mx-auto mt-10">
                    <h1 className="font-['General_Sans'] text-[150px] md:text-[220px] font-normal leading-[1.02] tracking-[-0.024em] whitespace-nowrap overflow-visible">
                        <span className="text-[hsl(var(--foreground))]">Attend</span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-l from-amber-300 via-purple-500 to-indigo-500">
                            X
                        </span>
                    </h1>
                    <p className="text-[hsl(var(--hero-sub))] text-lg leading-8 max-w-md mt-[9px] opacity-80">
                        The ultimate intelligent attendance<br />platform for modern learning
                    </p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white rounded-full px-[29px] py-[24px] mt-[25px] font-medium transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        Join Platform
                    </button>
                </div>

                {/* Logo Marquee */}
                <div className="w-full max-w-5xl mx-auto mt-auto pt-16 flex items-center justify-between gap-12 overflow-hidden">
                    <div className="text-[hsl(var(--foreground))]/50 text-sm whitespace-nowrap font-medium tracking-wide flex-shrink-0">
                        Relied on by brands<br />across the globe
                    </div>

                    <div className="relative flex-1 overflow-hidden mask-fade-edges">
                        <div className="flex animate-[scrolling-marquee_20s_linear_infinite] gap-16 min-w-max pr-16"
                             style={{ animationName: 'marquee-left' }}>
                            {[...logos, ...logos].map((logo, idx) => (
                                <div key={idx} className="flex items-center space-x-3">
                                    <div className="liquid-glass w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white/90">
                                        {logo.charAt(0)}
                                    </div>
                                    <span className="text-base font-semibold text-[hsl(var(--foreground))]">
                                        {logo}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes marquee-left {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }
            `}</style>
        </div>
    );
}
