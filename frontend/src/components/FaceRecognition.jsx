import { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

const FaceRecognition = () => {
    const webcamRef = useRef(null);
    const [imgSrc, setImgSrc] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setImgSrc(imageSrc);
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
        setMessage('');
    };

    const verifyFace = async () => {
        if (!imgSrc) return;
        setLoading(true);
        setMessage('Verifying...');

        try {
            // Simulation
            setTimeout(() => {
                setMessage('Face Verification Logic to be connected to Backend');
                setLoading(false);
            }, 1500);
        } catch (error) {
            setMessage('Verification Failed');
            setLoading(false);
        }
    };

    return (
        <div className="text-center">
            <h2 className="text-xl font-bold mb-4 text-white">Face Attendance</h2>

            <div className="mb-6 rounded-xl overflow-hidden border-2 border-purple-500/30 shadow-lg shadow-purple-500/20 relative bg-black h-64 flex items-center justify-center">
                {imgSrc ? (
                    <img src={imgSrc} alt="Captured face" className="w-full h-full object-cover" />
                ) : (
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Scanning overlay animation */}
                {!imgSrc && (
                    <motion.div
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                    />
                )}
            </div>

            <div className="flex justify-center gap-4">
                {!imgSrc ? (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={capture}
                        className="glass-button px-6 py-2 rounded-lg"
                    >
                        Capture Face
                    </motion.button>
                ) : (
                    <>
                        <button
                            onClick={retake}
                            className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        >
                            Retake
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={verifyFace}
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Verify & Mark'}
                        </motion.button>
                    </>
                )}
            </div>

            {message && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 font-semibold text-purple-300"
                >
                    {message}
                </motion.p>
            )}
        </div>
    );
};

export default FaceRecognition;
