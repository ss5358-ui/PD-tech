import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function ClientsHistory() {
    const [clients, setClients] = useState<any[]>([]);
    const navigate = useNavigate();
    // const role = useStore((state) => state.role);

    useEffect(() => {
        loadClients();
    }, []);

    async function loadClients() {
        const { data, error } = await supabase
            .from('clients')
            .select('*, client_assignments(employee_id)')
            .eq('status', 'completed');
        
        if (error) {
            console.error('Error loading clients:', error);
            return;
        }
        setClients(data || []);
    }

    return (
        <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Clients History</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => (
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
                                onClick={() => navigate(`/clientshistoryprofile/${client.id}`)}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}