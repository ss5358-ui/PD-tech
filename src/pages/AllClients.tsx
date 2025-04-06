import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function AllClients() {
    const [clients, setClients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredClients, setFilteredClients] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
        const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
    const [newClient, setNewClient] = useState({
        name: '',
        company: '',
        address: '',
    });
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const navigate = useNavigate();
    const role = useStore((state) => state.role);
    const user = useStore((state) => state.user);

    useEffect(() => {
        loadClients();
        if (role === 'head' || role === 'employee' || role === 'admin') {
            loadEmployees();
        }
    }, [role]);

    useEffect(() => {
        filterClients();
    }, [clients, searchQuery]);

    async function loadClients() {
        const { data, error } = await supabase
            .from('clients')
            .select('*, client_assignments(employee_id)');
        
        if (error) {
            console.error('Error loading clients:', error);
            return;
        }
        setClients(data || []);
    }

    const filterClients = () => {
        if (!searchQuery) {
            setFilteredClients(clients);
            return;
        }

        const filtered = clients.filter(client =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredClients(filtered);
    };

    async function loadEmployees() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('role', 'employee');
        
        if (error) {
            console.error('Error loading employees:', error);
            return;
        }
        setEmployees(data || []);
    }

    async function handleCreateClient(e: React.FormEvent) {
        e.preventDefault();
        const { data, error } = await supabase
            .from('clients')
            .insert([{ ...newClient, created_by: user?.id, status: 'ongoing' }])
            .select()
            .single();

        if (error) {
            console.error('Error creating client:', error);
            return;
        }

        setClients([...clients, data]);
        setNewClient({ name: '', company: '', address: '' });
        setShowAddModal(false);
    }

    async function handleAssignEmployees() {
        if (!selectedClient) return;

        const assignments = selectedEmployees.map(employeeId => ({
            client_id: selectedClient.id,
            employee_id: employeeId,
        }));

        const { error } = await supabase
            .from('client_assignments')
            .insert(assignments);

        if (error) {
            console.error('Error assigning employees:', error);
            return;
        }

        loadClients();
    }

        const filteredEmployees = employees.filter(employee =>
                employee.full_name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
        );

    return (
        <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white-800">Clients</h1>
                <div className="flex items-center">
                    <div className="relative mr-4">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="search"
                            placeholder="Search Clients"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-white-700 dark:border-gray-600 dark:placeholder-gray-800 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <div
                        key={client.id}
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    >
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {client.name}
                        </h3>
                        <p className="text-gray-600 mb-4">{client.company}</p>
                        <p className="text-gray-500 text-sm mb-4">{client.address}</p>
                        
                        <div className="flex justify-between items-center">
                            <button
                                onClick={() => navigate(`/allclients/${client.id}`)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                View Details
                            </button>
                            
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Client Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add New Client</h2>
                        <form onSubmit={handleCreateClient}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newClient.name}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Company</label>
                                <input
                                    type="text"
                                    value={newClient.company}
                                    onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={newClient.address}
                                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
