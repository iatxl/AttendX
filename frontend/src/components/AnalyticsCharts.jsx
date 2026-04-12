import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const AnalyticsCharts = () => {
    // Mock Data - In real app, fetch from backend
    const attendanceData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [
            {
                label: 'Average Attendance %',
                data: [85, 88, 82, 90, 87],
                backgroundColor: 'rgba(79, 70, 229, 0.6)',
            },
        ],
    };

    const defaulterData = {
        labels: ['Regular', 'Borderline', 'Defaulter'],
        datasets: [
            {
                data: [70, 20, 10],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(234, 179, 8, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(234, 179, 8, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <h3 className="text-lg font-bold mb-4 text-gray-700">Weekly Attendance Trend</h3>
                <Bar options={{ responsive: true }} data={attendanceData} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <h3 className="text-lg font-bold mb-4 text-gray-700">Student Status Distribution</h3>
                <div className="w-64 mx-auto">
                    <Pie data={defaulterData} />
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
