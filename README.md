# AttendX

AttendX is an AI-Powered Smart Attendance Management System designed to eliminate proxy attendance and provide intelligent analytics.

## Project Structure

- **frontend/**: React.js application (Vercel)
- **backend/**: Node.js Express server (Render)
- **ai-service/**: Python FastAPI microservice for Face Recognition (Render)

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB Atlas Account

### Installation

1. **Backend**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **AI Service**
   ```bash
   cd ai-service
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Features
- QR Code Attendance
- Face Recognition & Liveness Detection
- Role-based Dashboards (Admin, Faculty, Student)
- Predictive Analytics
