import {useEffect} from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router";
import { ToastContainer } from 'react-toastify';

import apiService from "./services/api.service";
import { AuthProvider } from "./common/useAuthContext";
import Role from "./common/Role";
import { PrivateRoute } from "./components/PrivateRoute";
import Navigationbar from "./components/Navigation";
import PasscodeResets from "./components/PasscodeResets";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Connect from "./pages/Connect";
import Documents from "./pages/Documents";
import Integrations from "./pages/Integrations";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import ScreenShare from "./pages/ScreenShare";
import NoMatch from "./pages/404";

import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString(); 

export default function App() {

  useEffect(() => {
    apiService.checkLogin()
  }, [])

  return (
    <>
      <AuthProvider>
        <Router>
          <div className="app">
            <Navigationbar />
            <PasscodeResets />
            <div className="app-main">
              <Routes>
                <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                <Route path="/documents/:itemId?" element={<PrivateRoute><Documents /></PrivateRoute>} />
                <Route path="/connect" element={<PrivateRoute><Connect /></PrivateRoute>} />
                <Route path="/pair/app" element={<PrivateRoute><Connect /></PrivateRoute>} />
                <Route path="/pair" element={<PrivateRoute><Connect /></PrivateRoute>} />
                <Route path="/integrations" element={<PrivateRoute><Integrations /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/screenshare" element={<PrivateRoute><ScreenShare /></PrivateRoute>} />
                <Route path="/admin" element={<PrivateRoute roles={[Role.Admin]}><Admin /></PrivateRoute>} />

                <Route path="/login" element={<Login />} />
                <Route path="*" element={<NoMatch />} />
              </Routes>
            </div>
          </div>
        </Router>
      </AuthProvider>
      <ToastContainer autoClose={2000} />
    </>
  );
}
