import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Camera, AlertCircle, Loader } from 'lucide-react';

const EyeTracker = ({ onFocusRatioUpdate }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const faceLandmarkerRef = useRef(null);
    const trackingRef = useRef(false);
    const animFrameRef = useRef(null);
    const lastVideoTimeRef = useRef(-1);
    const statsRef = useRef({ totalChecks: 0, focusChecks: 0 });

    const [status, setStatus] = useState('idle'); // idle | requesting | loading-ai | tracking | error
    const [errorMsg, setErrorMsg] = useState('');

    const startTracking = useCallback(() => {
        if (!faceLandmarkerRef.current || !videoRef.current) return;

        trackingRef.current = true;

        const loop = () => {
            if (!trackingRef.current) return;

            const video = videoRef.current;
            if (
                video &&
                video.readyState >= 2 &&
                video.currentTime !== lastVideoTimeRef.current
            ) {
                lastVideoTimeRef.current = video.currentTime;
                try {
                    const result = faceLandmarkerRef.current.detectForVideo(
                        video,
                        performance.now()
                    );

                    const isFocused =
                        result.faceLandmarks && result.faceLandmarks.length > 0;

                    statsRef.current.totalChecks += 1;
                    if (isFocused) statsRef.current.focusChecks += 1;

                    const ratio =
                        statsRef.current.focusChecks /
                        statsRef.current.totalChecks;
                    onFocusRatioUpdate(ratio, isFocused, true);
                } catch (e) {
                    // ignore single frame errors
                }
            }

            animFrameRef.current = requestAnimationFrame(loop);
        };

        animFrameRef.current = requestAnimationFrame(loop);
    }, [onFocusRatioUpdate]);

    const initMediaPipe = useCallback(async () => {
        try {
            setStatus('loading-ai');
            const filesetResolver = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            const landmarker = await FaceLandmarker.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: 'GPU',
                    },
                    outputFaceBlendshapes: true,
                    runningMode: 'VIDEO',
                    numFaces: 1,
                }
            );
            faceLandmarkerRef.current = landmarker;
            setStatus('tracking');
            startTracking();
        } catch (err) {
            console.error('MediaPipe init error:', err);
            setErrorMsg('Failed to load AI model. Please refresh.');
            setStatus('error');
        }
    }, [startTracking]);

    const requestCamera = useCallback(async () => {
        setStatus('requesting');
        setErrorMsg('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    initMediaPipe();
                };
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            setErrorMsg(
                err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access in your browser settings.'
                    : 'Could not access camera. Is it in use by another app?'
            );
            setStatus('error');
        }
    }, [initMediaPipe]);

    // Auto-request camera on mount
    useEffect(() => {
        requestCamera();
        return () => {
            trackingRef.current = false;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
            }
        };
    }, [requestCamera]);

    return (
        <div className="flex flex-col gap-3">
            {/* Camera Preview */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    playsInline
                    muted
                    style={{ display: status === 'tracking' ? 'block' : 'none' }}
                />

                {/* Status overlays */}
                {status === 'idle' || status === 'requesting' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                        <Loader className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-xs">Requesting camera...</span>
                    </div>
                ) : status === 'loading-ai' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                        <div className="relative">
                            <Camera className="w-8 h-8 text-indigo-400" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
                        </div>
                        <span className="text-xs text-center">
                            Camera ready<br />Loading AI model...
                        </span>
                        <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-indigo-500 rounded-full animate-pulse w-2/3" />
                        </div>
                    </div>
                ) : status === 'error' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                        <button
                            onClick={requestCamera}
                            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : null}

                {/* Live indicator when tracking */}
                {status === 'tracking' && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-[10px] font-medium">LIVE</span>
                    </div>
                )}
            </div>

            {/* Status text */}
            <p className="text-[11px] text-white/40 text-center">
                {status === 'tracking'
                    ? '🎯 AI face tracking active — stay in frame'
                    : status === 'loading-ai'
                    ? '⏳ Loading AI model (first load may take a moment)'
                    : status === 'error'
                    ? '❌ Camera unavailable'
                    : '📷 Initializing camera...'}
            </p>
        </div>
    );
};

export default EyeTracker;
