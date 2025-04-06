import React, { useState, useEffect } from 'react';
import { Plus, Mail, Phone, Calendar, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    // Update filteredEmployees whenever employees or searchQuery changes
    filterEmployees();
  }, [employees, searchQuery]);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading employees:', error);
      return;
    }

    setEmployees(data || []);
    setFilteredEmployees(data || []); // Initialize filtered employees with all employees
  }

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmployee.email,
        password: newEmployee.password,
      });

      if (authError) throw authError;

      // Create employee record
      const { error: employeeError } = await supabase
        .from('employees')
        .insert([
          {
            id: authData.user?.id,
            email: newEmployee.email,
            full_name: newEmployee.full_name,
            role: newEmployee.role,
          },
        ]);

      if (employeeError) throw employeeError;

      setNewEmployee({
        email: '',
        password: '',
        full_name: '',
        role: 'employee',
      });
      setShowAddModal(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filterEmployees = () => {
    if (!searchQuery) {
      setFilteredEmployees(employees);
      return;
    }

    const filtered = employees.filter((employee) =>
      employee.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search employees..."
            className="p-2 border rounded mr-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* <button
            onClick={filterEmployees}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </button> */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {employee.full_name}
                </h3>
                <p className="text-gray-500">{employee.role}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  employee.role === 'head'
                    ? 'bg-purple-100 text-purple-800'
                  : employee.role === 'admin'
                    ? 'bg-green-100 text-green-800'
                    : employee.role === 'e.head'
                      ? 'bg-orange-100 text-orange-800'
                      : employee.role === 'e.employee'
                        ? 'bg-yellow-100 text-yellow-800'
                        : employee.role === 'finance.employee'
                          ? 'bg-teal-100 text-teal-800'
                        : 'bg-blue-100 text-blue-800'
                }`}
              >
                {employee.role}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {employee.email}
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                Joined {new Date(employee.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Employee</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateEmployee}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newEmployee.full_name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, full_name: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, email: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, password: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Role</label>
                <select
                  value={newEmployee.role}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, role: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="employee">Employee</option>
                  <option value="head">Head</option>
                  <option value="admin">Admin</option>
                  <option value="e.employee">E.Employee</option>
                  <option value="e.head">E.Head</option>
                  <option value="finance.employee">Finance Employee</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}