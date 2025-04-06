import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Plus, Phone, Mail } from 'lucide-react';

export default function AllClientProfile() {
    const { id } = useParams<{ id: string }>();
    const [client, setClient] = useState<any>(null);
    const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [editContact, setEditContact] = useState<any>(null);
    const role = useStore((state) => state.role);
    const user = useStore((state) => state.user);
    const [createdByEmployee, setCreatedByEmployee] = useState<any>(null);

    const [newContact, setNewContact] = useState({
        name: '',
        position: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        if (id) {
            loadClientData();
        }
    }, [id]);

    async function loadClientData() {
        const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        setClient(clientData);

        // Load contact persons
        const { data: contactData } = await supabase
            .from('contact_persons')
            .select('*')
            .eq('client_id', id)
            .order('created_at', { ascending: false });
        setContactPersons(contactData || []);

        if (clientData?.created_by) {
            await loadEmployeeData(clientData.created_by);
        }
    }

    async function loadEmployeeData(userId: string) {
        const { data: employeeData } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', userId)
            .single();

        setCreatedByEmployee(employeeData);
    }

    async function handleAddContact(e: React.FormEvent) {
        e.preventDefault();

        const { error } = await supabase
            .from('contact_persons')
            .insert([{ ...newContact, client_id: id }]);

        if (error) {
            console.error('Error adding contact person:', error);
            return;
        }

        setNewContact({ name: '', position: '', email: '', phone: '' });
        setShowAddContactModal(false);
        loadClientData();
    }

    async function handleUpdateContact(e: React.FormEvent) {
        e.preventDefault();

        const { error } = await supabase
            .from('contact_persons')
            .update({
                name: editContact.name,
                position: editContact.position,
                email: editContact.email,
                phone: editContact.phone,
            })
            .eq('id', editContact.id);

        if (error) {
            console.error('Error updating contact person:', error);
            return;
        }

        setEditContact(null);
        loadClientData();
    }

    if (!client) return null;

    return (
        <div className="space-y-6">
            {/* Client Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
                        <p className="text-gray-600">{client.company}</p>
                        <p className="text-gray-500 mt-2">{client.address}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddContactModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Contact
                        </button>
                    </div>
                </div>
            </div>

            {/* Client Created By */}
            {role === 'head' && client.created_by && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Client Created By</h2>
                    {createdByEmployee ? (
                        <p className="text-gray-600">Employee Name: {createdByEmployee?.full_name}</p>
                    ) : (
                        <p className="text-gray-600">User ID: {client.created_by}</p>
                    )}
                </div>
            )}

            {/* Contact Persons */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Persons</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contactPersons.map((contact) => (
                        <div key={contact.id} className="border rounded-lg p-4">
                            <h3 className="font-semibold text-gray-800">{contact.name}</h3>
                            <p className="text-gray-600 text-sm">{contact.position}</p>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {contact.email}
                                </div>
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {contact.phone}
                                </div>
                            </div>
                            {role === 'head' && (
                                <button
                                    onClick={() => setEditContact(contact)}
                                    className="mt-2 px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Contact Modal */}
            {showAddContactModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add Contact Person</h2>
                        <form onSubmit={handleAddContact}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Position</label>
                                <input
                                    type="text"
                                    value={newContact.position}
                                    onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddContactModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Add Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Contact Modal */}
            {editContact && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit Contact Person</h2>
                        <form onSubmit={handleUpdateContact}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editContact.name}
                                    onChange={(e) =>
                                        setEditContact({ ...editContact, name: e.target.value })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Position</label>
                                <input
                                    type="text"
                                    value={editContact.position}
                                    onChange={(e) =>
                                        setEditContact({ ...editContact, position: e.target.value })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editContact.email}
                                    onChange={(e) =>
                                        setEditContact({ ...editContact, email: e.target.value })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={editContact.phone}
                                    onChange={(e) =>
                                        setEditContact({ ...editContact, phone: e.target.value })
                                    }
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditContact(null)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}