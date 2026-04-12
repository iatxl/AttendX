# Implementation Plan: Built-in Live Streaming

## Architecture
Faculty Dashboard → [Start Live] → Socket.io signaling → WebRTC peer connections → Students receive stream

## Components

### Backend
- Install `socket.io`
- Add WebRTC signaling via Socket.io events  
- Add `isLive` + `liveRoomId` fields to Session model
- Add REST endpoint to list active live sessions

### Frontend — Faculty
- "Start Live Class" panel in Faculty Dashboard
- Select subject → Start → Screen share or webcam
- Broadcasts to all connected students via WebRTC
- See student count live

### Frontend — Student
- Dashboard shows "🔴 LIVE" badge on active sessions from their faculty
- Click "Join" → `/class?session=<id>`
- Receives faculty's WebRTC stream in the main area
- Face tracking still runs for attendance

## Socket.io Events
- `start-broadcast` → faculty starts room
- `join-room` → student joins room  
- `student-joined` → server tells faculty who joined (triggers offer)
- `offer` → faculty → specific student
- `answer` → student → faculty
- `ice-candidate` → bidirectional
- `end-broadcast` → faculty ends class
