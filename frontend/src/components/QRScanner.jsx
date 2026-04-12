import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../utils/api';

const QRScanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scanner.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText) {
            handleAttendance(decodedText);
            scanner.clear();
        }

        function onScanFailure(error) {
            // console.warn(`Code scan error = ${error}`);
        }

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, []);

    const handleAttendance = async (qrData) => {
        try {
            let parsedData;
            try {
                parsedData = JSON.parse(qrData);
            } catch (e) {
                setMessage('Invalid QR Format');
                return;
            }

            const { sessionId, qrCodeHash } = parsedData;
            const location = { lat: 0, long: 0 };

            const { data } = await api.post('/attendance/mark', {
                sessionId,
                qrCodeHash,
                location
            });

            setScanResult(data);
            setMessage('Attendance Marked Successfully!');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Attendance Failed');
        }
    };

    return (
        <div className="text-center">
            <h2 className="text-xl font-bold mb-4 text-white">Scan Attendance QR</h2>

            {message ? (
                <div className={`p-4 rounded-xl border ${scanResult ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-red-500/20 border-red-500/50 text-red-200'}`}>
                    <p className="font-bold">{message}</p>
                    <button
                        onClick={() => { setMessage(''); setScanResult(null); window.location.reload(); }}
                        className="mt-3 text-sm underline hover:text-white transition-colors"
                    >
                        Scan Again
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border-2 border-purple-500/30 shadow-lg shadow-purple-500/20">
                    <div id="reader" className="w-full bg-black"></div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
