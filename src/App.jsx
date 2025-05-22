// File: src / App.jsx;

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import BreadcrumbNav from "./components/BreadcrumbNav";
import DatePickerTest from "./components/DatePickerTest";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { BreadcrumbProvider } from "./context/BreadcrumbContext";
import CreateInvoice from "./pages/CreateInvoice";
import EditInvoice from "./pages/EditInvoice";
import Home from "./pages/Home";
import InvoiceList from "./pages/InvoiceList";
import Login from "./pages/Login";
import Logs from "./pages/Logs";
import UserSettings from "./pages/UserSettings";

function App() {
  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <Router>
          <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] pl-4 pr-4">
            <Header />
            <div className="container mx-auto px-4 pt-16 max-w-[1060px]">
              {" "}
              <BreadcrumbNav />
              <div className="pt-2 pb-8">
                {" "}
                {/* Consistent content wrapper */}
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Home />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/create-invoice"
                    element={
                      <ProtectedRoute>
                        <CreateInvoice />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/invoices"
                    element={
                      <ProtectedRoute>
                        <InvoiceList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-invoice/:id"
                    element={
                      <ProtectedRoute>
                        <EditInvoice />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <UserSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <ProtectedRoute>
                        <Logs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/date-picker-test"
                    element={<DatePickerTest />}
                  />
                </Routes>
              </div>
            </div>
          </div>
        </Router>
      </BreadcrumbProvider>
    </AuthProvider>
  );
}

export default App;
