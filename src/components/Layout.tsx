import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  LayoutDashboard,
  Bell,
  Clipboard,
  Book,
  Table2Icon,
  Menu,
  Clock,
} from 'lucide-react';
import { useStore } from '../lib/store';

export default function Layout() {
  const { role } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="p-2 bg-gray-200 rounded-md shadow-md m-2 focus:outline-none z-50 fixed top-22 left-0"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Sidebar */}
      <div className={`w-64 bg-white shadow-lg ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <nav className="mt-8">
          {/* Dashboard link is always available */}
          <Link
            to="/dashboard"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>

          {/* Employees link visible for 'head' and 'e.head' roles */}
          {(role === 'head' || role === 'e.head') && (
            <Link
              to="/employees"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Users className="w-5 h-5 mr-3" />
              Employees
            </Link>
          )}

          {/* Clients link visible only for 'head', 'admin', and 'employee' roles */}
          {(role === 'head' || role === 'admin' || role === 'employee') && (
            <Link
              to="/clients"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Building2 className="w-5 h-5 mr-3" />
              My Clients
            </Link>
          )}

          {/* EClients link visible only for 'e.employee' role */}
          {(role === 'e.employee' || role === 'e.head') && (
            <Link
              to="/eclients"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Building2 className="w-5 h-5 mr-3" />
              My Clients
            </Link>
          )}

          {/* EClients link visible only for 'e.employee' role */}
          {( role === 'finance.employee') && (
            <Link
              to="/fclients"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Building2 className="w-5 h-5 mr-3" />
              My Clients
            </Link>
          )}

          {/* PD Kits link visible for 'head' */}
          {(role === 'e.head') && (
            <Link
              to="/pd-kits"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Clipboard className="w-5 h-5 mr-3" />
              PD Kits
            </Link>
          )}

          {/* Site Visit link visible for 'employee' and 'e.employee' roles */}
          {(role === 'employee' || role === 'e.employee') && (
            <Link
              to="/site-visit"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Clipboard className="w-5 h-5 mr-3" />
              Site Visit
            </Link>
          )}

          {/* Documents Upload link visible for 'finance.employee' */}
          {role === 'finance.employee' && (
            <>
              <Link
                to="/documents-upload"
                className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
              >
                <Table2Icon className="w-5 h-5 mr-3" />
                Documents Upload
              </Link>

            </>
          )}

          <Link
            to="/allclients"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            <Table2Icon className="w-5 h-5 mr-3" />
            All Clients
          </Link>

            {(role === 'head' || role === 'e.head' || role === 'admin') && (
            <Link
              to="/time-insights"
              className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
            >
              <Table2Icon className="w-5 h-5 mr-3" />
              Site Visit Time
            </Link>
            )}

          {/* XL Data link */}
          <Link
            to="/xldata"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            <Table2Icon className="w-5 h-5 mr-3" />
            XL Data
          </Link>


          {/* Notifications link */}
          <Link
            to="/Notifications"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            <Bell className="w-5 h-5 mr-3" />
            Notifications
          </Link>

          {/* Clients History link */}
          <Link
            to="/clients-history"
            className="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100"
          >
            <Book className="w-5 h-5 mr-3" />
            Clients History
          </Link>

        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
