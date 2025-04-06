import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Plus, Phone, Mail, LogOutIcon, MapPin, Send } from 'lucide-react';

export default function EClientProfile() {
    const { id } = useParams<{ id: string }>();
    const [client, setClient] = useState<any>(null);
    const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [siteVisits, setSiteVisits] = useState<any[]>([]);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [EndClientModal, SetEndClientModal] = useState(false);
    const [ecompleteModal, SetecompleteModal] = useState(false);
    const [assets, setAssets] = useState<any[]>([]);
    const [editContact, setEditContact] = useState<any>(null);
    const [isAssigned, setIsAssigned] = useState<boolean>(false);
    const [loading, setLoading] = useState({
        contact: false,
        status: false
    });
    const role = useStore((state) => state.role);
    const user = useStore((state) => state.user);
    const openGoogleMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const [newContact, setNewContact] = useState({
        name: '',
        position: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        if (id) {
            loadClientData();
            loadAssets();
            checkAssignment();
        }
    }, [id, isAssigned]);

    async function loadClientData() {
        try {
            const { data: clientData } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            setClient(clientData);

            // Always load contact persons
            const { data: contactData } = await supabase
                .from('contact_persons')
                .select('*')
                .eq('client_id', id)
                .order('created_at', { ascending: false });
            setContactPersons(contactData || []);

            // Only load these if admin/head or assigned
            if (role === 'admin' || role === 'e.head' || isAssigned) {
                // Load site visits - only those done by e.employees
                const { data: visitData } = await supabase
                    .from('site_visit')
                    .select(`
                        *,
                        employees (
                            full_name,
                            role
                        ),
                        site_visit_form (
                            address,
                            contact_no,
                            notes,
                            exit_location,
                            created_at
                        ),
                        site_visit_assets (
                            asset_id,
                            quantity,
                            assets (
                                item
                            )
                        )
                    `)
                    .eq('client_Id', id)
                    .order('created_at', { ascending: false });

                // Filter to only show visits by e.employees
                const eEmployeeVisits = visitData?.filter(visit => 
                    visit.employees?.role === 'e.employee'
                ) || [];

                setSiteVisits(eEmployeeVisits);
            }
        } catch (error) {
            console.error('Error loading client data:', error);
        }
    }

    async function loadAssets() {
        try {
            const { data } = await supabase
                .from('assets')
                .select('*')
                .order('item');

            setAssets(data || []);
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    }

    async function checkAssignment() {
        try {
            if (role === 'admin' || role === 'e.head') {
                setIsAssigned(true);
                return;
            }

            if (!user?.id || !id) {
                setIsAssigned(false);
                return;
            }

            const { data, error } = await supabase
                .from('client_assignments')
                .select('*')
                .eq('client_id', id)
                .eq('employee_id', user.id)
                .single();

            setIsAssigned(!!data);
        } catch (error) {
            console.error('Error checking assignment:', error);
        }
    }

    async function handleAddContact(e: React.FormEvent) {
        e.preventDefault();
        setLoading({...loading, contact: true});

        try {
            const { error } = await supabase
                .from('contact_persons')
                .insert([{ ...newContact, client_id: id }]);

            if (error) throw error;

            setNewContact({ name: '', position: '', email: '', phone: '' });
            setShowAddContactModal(false);
            await loadClientData();
        } catch (error) {
            console.error('Error adding contact person:', error);
        } finally {
            setLoading({...loading, contact: false});
        }
    }

    async function handleUpdateContact(e: React.FormEvent) {
        e.preventDefault();
        setLoading({...loading, contact: true});

        try {
            const { error } = await supabase
                .from('contact_persons')
                .update({
                    name: editContact.name,
                    position: editContact.position,
                    email: editContact.email,
                    phone: editContact.phone,
                })
                .eq('id', editContact.id);

            if (error) throw error;

            setEditContact(null);
            await loadClientData();
        } catch (error) {
            console.error('Error updating contact person:', error);
        } finally {
            setLoading({...loading, contact: false});
        }
    }

    async function handleStatusUpdate(newStatus: 'ecomplete' | 'completed') {
        setLoading({...loading, status: true});

        try {
            const { error } = await supabase
                .from('clients')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            SetEndClientModal(false);
            SetecompleteModal(false);
            await loadClientData();
        } catch (error) {
            console.error('Error updating client status:', error);
        } finally {
            setLoading({...loading, status: false});
        }
    }

    if (!client) return <div className="flex justify-center items-center h-screen">Loading client data...</div>;

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
                            disabled={loading.contact}
                        >
                            {loading.contact ? 'Adding...' : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Contact
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Contact Persons - Always visible */}
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
                            {role === 'e.head' && (
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

            {/* Site Visits with Location Tracking */}
            {(role === 'admin' || role === 'head' || isAssigned) && (
                <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Site Visits</h2>
                {siteVisits.length === 0 ? (
                    <p className="text-gray-500">No site visits found</p>
                ) : (
                    <div className="space-y-4">
                    {siteVisits.map((visit) => (
                        <div key={visit.id} className="border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800">
                                {visit.employees?.full_name || 'Unknown Employee'}
                                </h3>
                                <span className="text-sm text-gray-500">
                                {new Date(visit.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            
                            {/* Location Information Section */}
                            {visit.latitude && visit.longitude && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-gray-700 mb-2">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    <span className="font-medium">Visit Location</span>
                                    </div>
                                    <button
                                    onClick={() => openGoogleMaps(
                                        parseFloat(visit.latitude),
                                        parseFloat(visit.longitude)
                                    )}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                    >
                                    <MapPin className="w-3 h-3 mr-1" />
                                    View on Google Maps
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                    <div className="bg-white p-2 rounded border">
                                    <div className="text-xs text-gray-500">Latitude</div>
                                    <div className="font-mono text-sm">{visit.latitude}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border">
                                    <div className="text-xs text-gray-500">Longitude</div>
                                    <div className="font-mono text-sm">{visit.longitude}</div>
                                    </div>
                                </div>
                                </div>
                            )}

                            {visit.site_visit_form && visit.site_visit_form.length > 0 && (
                                <div className="mt-3 space-y-2">
                                <p className="text-gray-600">
                                    <span className="font-medium">Address:</span> {visit.site_visit_form[0].address}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Contact:</span> {visit.site_visit_form[0].contact_no}
                                </p>
                                <p className="text-gray-500">
                                    <span className="font-medium">Notes:</span> {visit.site_visit_form[0].notes}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Exit Location:</span> {visit.site_visit_form[0].exit_location}
                                </p>
                                </div>
                            )}

                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700">Assets Used:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                {visit.site_visit_assets?.map((asset: any) => (
                                    <li key={asset.asset_id}>
                                    {asset.assets?.item} (Qty: {asset.quantity})
                                    </li>
                                ))}
                                {(!visit.site_visit_assets || visit.site_visit_assets.length === 0) && (
                                    <li>No assets used</li>
                                )}
                                </ul>
                            </div>
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
                </div>
            )}


            {role === 'e.head' && (
                <button
                    onClick={() => SetecompleteModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center"
                    disabled={loading.status}
                >
                    {loading.status ? 'Processing...' : (
                        <>
                            <LogOutIcon className="w-4 h-4 mr-2" />
                            E Complete
                        </>
                    )}
                </button>
            )}

            {/* End Client Modal */}
            {EndClientModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">End Client</h2>
                        <p className="text-gray-600 mb-4">Are you sure you want to mark this client as completed?</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => SetEndClientModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={loading.status}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('completed')}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                disabled={loading.status}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* E complete Modal */}
            {ecompleteModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Ecomplete</h2>
                        <p className="text-gray-600 mb-4">Are you sure you want to mark this client as Ecomplete?</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => SetecompleteModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={loading.status}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('ecomplete')}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                disabled={loading.status}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    disabled={loading.contact}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    disabled={loading.contact}
                                >
                                    {loading.contact ? 'Adding...' : 'Add Contact'}
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
                                    disabled={loading.contact}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    disabled={loading.contact}
                                >
                                    {loading.contact ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}