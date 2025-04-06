import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Plus, Phone, Mail, LogOutIcon, MapPin, Send } from 'lucide-react';

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [siteVisits, setSiteVisits] = useState<any[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddQuotationModal, setShowAddQuotationModal] = useState(false);
  const [EndClientModal, SetEndClientModal] = useState(false);
  const [poreceivedModal, SetporeceivedModal] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [editContact, setEditContact] = useState<any>(null);
  const [isAssigned, setIsAssigned] = useState<boolean>(false);
  const [loading, setLoading] = useState({
    contact: false,
    quotation: false,
    endClient: false,
    poReceived: false
  });
  const role = useStore((state) => state.role);
  const user = useStore((state) => state.user);

  const [newContact, setNewContact] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
  });

  const [newQuotation, setNewQuotation] = useState({
    amount: '',
    description: '',
    start_date: '',
    end_date: '',
    selectedAssets: [] as { assetId: string; quantity: number }[],
  });

  // Function to open Google Maps with coordinates
  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Function to send email with quotation details (admin only)
  const handleSendEmail = (email: string, quotationData: any) => {
    const subject = encodeURIComponent(`Quotation #${quotationData.id} Details`);
    const body = encodeURIComponent(
      `Dear Client,\n\n` +
      `Please find below the quotation details:\n\n` +
      `Amount: ₹${quotationData.amount}/-\n` +
      `Valid From: ${new Date(quotationData.start_date).toLocaleDateString()}\n` +
      `Valid Until: ${new Date(quotationData.end_date).toLocaleDateString()}\n` +
      `Description: ${quotationData.description}\n\n` +
      `Assets Included:\n${
        quotationData.quotation_assets.map((asset: any) => 
          `- ${asset.assets.item} (Qty: ${asset.quantity})`
        ).join('\n')
      }\n\n` +
      `Best regards,\n` +
      `${user?.full_name || 'Your Representative'}\n` +
      `${user?.email || ''}`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`);
  };

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

      const { data: contactData } = await supabase
        .from('contact_persons')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });
      setContactPersons(contactData || []);

      if (role === 'admin' || role === 'head' || isAssigned) {
        const { data: quotationData } = await supabase
          .from('quotations')
          .select(`
            *,
            employees (
              full_name
            ),
            quotation_assets (
              asset_id,
              quantity,
              assets (
                item
              )
            )
          `)
          .eq('client_id', id)
          .order('created_at', { ascending: false });
        setQuotations(quotationData || []);

        const { data: visitData } = await supabase
          .from('site_visit')
          .select(`
            *,
            employees (
              full_name
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
        setSiteVisits(visitData || []);
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
      if (role === 'admin' || role === 'head') {
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
    setLoading(prev => ({ ...prev, contact: true }));
    try {
      const { error } = await supabase
        .from('contact_persons')
        .insert([{ ...newContact, client_id: id }]);
      if (error) throw error;
      setNewContact({ name: '', position: '', email: '', phone: '' });
      setShowAddContactModal(false);
      await loadClientData();
    } catch (error) {
      console.error('Error adding contact:', error);
    } finally {
      setLoading(prev => ({ ...prev, contact: false }));
    }
  }

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    setLoading(prev => ({ ...prev, contact: true }));
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
      console.error('Error updating contact:', error);
    } finally {
      setLoading(prev => ({ ...prev, contact: false }));
    }
  }

  async function handleAddQuotation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(prev => ({ ...prev, quotation: true }));
    try {
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([{
          client_id: id,
          employee_id: user?.id,
          amount: parseFloat(newQuotation.amount),
          description: newQuotation.description,
          start_date: newQuotation.start_date,
          end_date: newQuotation.end_date,
          status: 'pending',
        }])
        .select()
        .single();
      if (quotationError) throw quotationError;

      if (newQuotation.selectedAssets.length > 0) {
        const { error: assetsError } = await supabase
          .from('quotation_assets')
          .insert(
            newQuotation.selectedAssets.map(asset => ({
              quotation_id: quotation.id,
              asset_id: asset.assetId,
              quantity: asset.quantity,
            }))
          );
        if (assetsError) throw assetsError;
      }

      setNewQuotation({
        amount: '',
        description: '',
        start_date: '',
        end_date: '',
        selectedAssets: [],
      });
      setShowAddQuotationModal(false);
      await loadClientData();
    } catch (error) {
      console.error('Error adding quotation:', error);
    } finally {
      setLoading(prev => ({ ...prev, quotation: false }));
    }
  }

  async function handleQuotationStatus(quotationId: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status })
        .eq('id', quotationId);
      if (error) throw error;
      await loadClientData();
    } catch (error) {
      console.error('Error updating quotation status:', error);
    }
  }

  if (!client) return <div className="flex justify-center items-center h-screen">Loading client data...</div>;

  return (
    <div className="space-y-6 p-4">
      {/* Client Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{client.name}</h1>
            <p className="text-gray-600">{client.company}</p>
            <p className="text-gray-500 mt-2">{client.address}</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
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
            {(role === 'employee' || role === 'admin') && isAssigned && (
              <button
                onClick={() => setShowAddQuotationModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
                disabled={loading.quotation}
              >
                {loading.quotation ? 'Loading...' : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Quotation
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

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
                  <a href={`mailto:${contact.email}`} className="hover:underline">
                    {contact.email}
                  </a>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                  <Phone className="w-4 h-4 mr-2" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">
                    {contact.phone}
                  </a>
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

      {/* Quotations */}
      {(role === 'admin' || role === 'head' || isAssigned) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quotations</h2>
          {quotations.length === 0 ? (
            <p className="text-gray-500">No quotations found</p>
          ) : (
            <div className="space-y-4">
              {quotations.map((quotation) => (
                <div key={quotation.id} className="border rounded-lg p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Amount: ₹{quotation.amount}/-</p>
                      <p className="text-gray-600 text-sm">By: {quotation.employees.full_name}</p>
                      <p className="text-gray-500 text-sm">{quotation.description}</p>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          Period: {new Date(quotation.start_date).toLocaleDateString()} - {new Date(quotation.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Assets:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {quotation.quotation_assets.map((asset: any) => (
                            <li key={asset.asset_id}>
                              {asset.assets.item} (Qty: {asset.quantity})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        quotation.status === 'approved' ? 'bg-green-100 text-green-800' :
                        quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                      </span>
                      
                      {/* Send Email button - only visible to admin */}
                      {role === 'admin' && (
                        <button
                          onClick={() => handleSendEmail(contactPersons[0].email, quotation)}
                          className="flex items-center justify-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4" />
                          Send Quotation
                        </button>
                      )}

                      {role === 'admin' && quotation.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuotationStatus(quotation.id, 'approved')}
                            className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleQuotationStatus(quotation.id, 'rejected')}
                            className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* End Client Button */}
      {role === 'head' && (
        <button
          onClick={() => SetEndClientModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center"
          disabled={loading.endClient}
        >
          {loading.endClient ? 'Processing...' : (
            <>
              <LogOutIcon className="w-4 h-4 mr-2" />
              End Client
            </>
          )}
        </button>
      )}

      {/* PO Received Button */}
      {role === 'admin' && (
        <button
          onClick={() => SetporeceivedModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center"
          disabled={loading.poReceived}
        >
          {loading.poReceived ? 'Processing...' : (
            <>
              <LogOutIcon className="w-4 h-4 mr-2" />
              PO Received
            </>
          )}
        </button>
      )}

      {/* End Client Modal */}
      {EndClientModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">End Client</h2>
            <p className="text-gray-600 mb-4">Are you sure you want to mark this client as completed?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => SetEndClientModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading.endClient}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoading(prev => ({ ...prev, endClient: true }));
                  try {
                    const { error } = await supabase
                      .from('clients')
                      .update({ status: 'completed' })
                      .eq('id', id);
                    if (error) throw error;
                    SetEndClientModal(false);
                    await loadClientData();
                  } catch (error) {
                    console.error('Error updating client status:', error);
                  } finally {
                    setLoading(prev => ({ ...prev, endClient: false }));
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={loading.endClient}
              >
                {loading.endClient ? 'Processing...' : 'End Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Received Modal */}
      {poreceivedModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">PO Received</h2>
            <p className="text-gray-600 mb-4">Mark this client as PO Received?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => SetporeceivedModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading.poReceived}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoading(prev => ({ ...prev, poReceived: true }));
                  try {
                    const { error } = await supabase
                      .from('clients')
                      .update({ status: 'poreceived' })
                      .eq('id', id);
                    if (error) throw error;
                    SetporeceivedModal(false);
                    await loadClientData();
                  } catch (error) {
                    console.error('Error updating client status:', error);
                  } finally {
                    setLoading(prev => ({ ...prev, poReceived: false }));
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={loading.poReceived}
              >
                {loading.poReceived ? 'Processing...' : 'PO Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Edit Contact Person</h2>
            <form onSubmit={handleUpdateContact}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={editContact.name}
                  onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Position</label>
                <input
                  type="text"
                  value={editContact.position}
                  onChange={(e) => setEditContact({ ...editContact, position: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editContact.email}
                  onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editContact.phone}
                  onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
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

      {/* Add Quotation Modal */}
      {showAddQuotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Quotation</h2>
            <form onSubmit={handleAddQuotation}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newQuotation.amount}
                    onChange={(e) => setNewQuotation({ ...newQuotation, amount: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newQuotation.start_date}
                    onChange={(e) => setNewQuotation({ ...newQuotation, start_date: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newQuotation.description}
                    onChange={(e) => setNewQuotation({ ...newQuotation, description: e.target.value })}
                    className="w-full p-2 border rounded h-24"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={newQuotation.end_date}
                    onChange={(e) => setNewQuotation({ ...newQuotation, end_date: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Select Assets</label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {assets.length === 0 ? (
                    <p className="text-gray-500">No assets available</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {assets.map((asset) => (
                        <div key={asset.id} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id={`asset-${asset.id}`}
                            checked={newQuotation.selectedAssets.some(a => a.assetId === asset.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewQuotation({
                                  ...newQuotation,
                                  selectedAssets: [
                                    ...newQuotation.selectedAssets,
                                    { assetId: asset.id, quantity: 1 },
                                  ],
                                });
                              } else {
                                setNewQuotation({
                                  ...newQuotation,
                                  selectedAssets: newQuotation.selectedAssets.filter(a => a.assetId !== asset.id),
                                });
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label htmlFor={`asset-${asset.id}`} className="font-medium">
                              {asset.item}
                            </label>
                            {newQuotation.selectedAssets.some(a => a.assetId === asset.id) && (
                              <div className="mt-1">
                                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={newQuotation.selectedAssets.find(a => a.assetId === asset.id)?.quantity || 1}
                                  onChange={(e) => {
                                    setNewQuotation({
                                      ...newQuotation,
                                      selectedAssets: newQuotation.selectedAssets.map(a =>
                                        a.assetId === asset.id
                                          ? { ...a, quantity: parseInt(e.target.value) || 1 }
                                          : a
                                      ),
                                    });
                                  }}
                                  className="w-full p-1 border rounded text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuotationModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading.quotation}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={loading.quotation}
                >
                  {loading.quotation ? 'Creating...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}