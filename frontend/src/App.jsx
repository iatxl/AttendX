import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import OnlineClass from './pages/OnlineClass';
import JoinFaculty from './pages/JoinFaculty';
import LiveClassViewer from './pages/LiveClassViewer';
import AppLayout from './components/AppLayout';
import AuthLayout from './components/AuthLayout';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen text-white relative">
        <Routes>
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <AppLayout><Dashboard /></AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/class"
            element={
              <PrivateRoute>
                <AppLayout><OnlineClass /></AppLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/live"
            element={
              <PrivateRoute>
                <LiveClassViewer />
              </PrivateRoute>
            }
          />
          <Route path="/join" element={<JoinFaculty />} />
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
