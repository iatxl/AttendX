import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const EyeTracker = ({ onFocusRatioUpdate }) => {
    const webcamRef = useRef(null);
    const [faceLandmarker, setFaceLandmarker] = useState(null);
    const [isTrackerReady, setIsTrackerReady] = useState(false);
    const trackingRef = useRef(false);
    const [hasCameraError, setHasCameraError] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);

    // Tracking stats
    const statsRef = useRef({
        totalChecks: 0,
        focusChecks: 0,
        startTime: null,
    });

    useEffect(() => {
        const initTracker = async () => {
            try {
                // Using CDN for the WASM and model files to avoid needing local task files
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );
                
                const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: 'GPU'
                    },
                    outputFaceBlendshapes: true,
                    runningMode: 'VIDEO',
                    numFaces: 1
                });
                
                setFaceLandmarker(landmarker);
                setIsTrackerReady(true);
            } catch (error) {
                console.error("Error initializing Face Landmarker:", error);
            }
        };
        initTracker();
        
        return () => {
            if (faceLandmarker) faceLandmarker.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const trackFocus = useCallback(() => {
        if (!trackingRef.current || !faceLandmarker || !webcamRef.current) return;
        
        const video = webcamRef.current.video;
        if (video && video.readyState === 4 && video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            
            try {
                const result = faceLandmarker.detectForVideo(video, performance.now());
                
                let isFocused = false;
                if (result.faceLandmarks && result.faceLandmarks.length > 0) {
                    // Face is in frame and landmarks detected
                    // Can optionally add more complex logic for eye gaze using blendshapes
                    // For now, if face is present and directed towards camera, it's counted as focus
                    isFocused = true;
                }

                statsRef.current.totalChecks += 1;
                if (isFocused) {
                    statsRef.current.focusChecks += 1;
                }

                const currentRatio = statsRef.current.focusChecks / statsRef.current.totalChecks;
                onFocusRatioUpdate(currentRatio, isFocused, true);
            } catch (error) {
                console.error("Tracking error:", error);
            }
        }
    }, [faceLandmarker, onFocusRatioUpdate]);

    useEffect(() => {
        let animationFrameId;
        if (isTrackerReady && isCameraReady) {
            // Start tracking loop
            trackingRef.current = true;
            statsRef.current.startTime = Date.now();
            
            const loop = () => {
                trackFocus();
                if (trackingRef.current) {
                    animationFrameId = requestAnimationFrame(loop);
                }
            };
            loop();
        }
        
        return () => {
            trackingRef.current = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isTrackerReady, isCameraReady, trackFocus]);

    return (
        <div className="relative w-48 h-36 rounded-lg overflow-hidden border-2 border-indigo-500/30 bg-black">
            <Webcam
                ref={webcamRef}
                audio={false}
                className="w-full h-full object-cover transform scale-x-[-1]"
                videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                onUserMedia={() => setIsCameraReady(true)}
                onUserMediaError={() => setHasCameraError(true)}
            />
            {hasCameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 text-white p-2 text-center text-xs">
                    <span className="font-bold mb-1">Camera Error</span>
                    <span>Please allow camera access</span>
                </div>
            )}
            {!hasCameraError && (!isTrackerReady || !isCameraReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-xs">
                    {!isCameraReady ? "Waiting for Camera..." : "Loading AI..."}
                </div>
            )}
        </div>
    );
};

export default EyeTracker;
