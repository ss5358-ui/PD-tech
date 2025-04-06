import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Plus, Phone, Mail, LogOutIcon, Check, X, Paperclip, Send, Trash2 } from 'lucide-react';

export default function FClientProfile() {
    const { id } = useParams<{ id: string }>();
    const [client, setClient] = useState<any>(null);
    const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [EndClientModal, SetEndClientModal] = useState(false);
    const [completedModal, SetcompletedModal] = useState(false);
    const [editContact, setEditContact] = useState<any>(null);
    const [isAssigned, setIsAssigned] = useState<boolean>(false);
    const [loading, setLoading] = useState({
        contact: false,
        status: false,
        quotation: false,
        document: false
    });
    const [newDocument, setNewDocument] = useState({
        document_type: 'quotation',
        description: '',
        file: null as File | null
    });

    const role = useStore((state) => state.role);
    const user = useStore((state) => state.user);
    const openGoogleMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
      };

      const handleSendEmail = (email: string, quotationData: any) => {
        const subject = encodeURIComponent(`Quotation #${quotationData.id} Details`);
        const body = encodeURIComponent(
          `Dear Client,\n\n` +
          `Please find below the document:\n\n` +
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
            loadDocuments();
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

            const quotationQuery = supabase
                .from('quotations')
                .select(`
                    *,
                    employees (
                        full_name,
                        role
                    ),
                    quotation_assets (
                        asset_id,
                        quantity,
                        assets (
                            item
                        )
                    )
                `)
                .eq('client_id', id);

            if (role !== 'admin' && role !== 'head') {
                quotationQuery.eq('status', 'approved');
            }

        } catch (error) {
            console.error('Error loading client data:', error);
        }
    }

    async function loadDocuments() {
        try {
            setLoading(prev => ({...prev, document: true}));
            
            const { data: documentData, error } = await supabase
                .from('documents')
                .select(`
                    *,
                    employees (
                        full_name
                    )
                `)
                .eq('client_id', id)
                .order('created_at', { ascending: false });
    
            if (error) throw error;
    
            // Verify we have data
            console.log('Documents loaded:', documentData);
            setDocuments(documentData || []);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(prev => ({...prev, document: false}));
        }
    }

    async function loadAssets() {
        try {
            const { data } = await supabase
                .from('assets')
                .select('*')
                .order('item');
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    }

    async function checkAssignment() {
        try {
            if (role === 'admin' || role === 'finance.employee') {
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

    async function handleStatusUpdate(newStatus: 'completed') {
        setLoading({...loading, status: true});

        try {
            const { error } = await supabase
                .from('clients')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            SetEndClientModal(false);
            SetcompletedModal(false);
            await loadClientData();
        } catch (error) {
            console.error('Error updating client status:', error);
        } finally {
            setLoading({...loading, status: false});
        }
    }

    async function handleUploadDocument(e: React.FormEvent) {
        e.preventDefault();
        if (!newDocument.file || !user?.id) return;
      
        setLoading({...loading, document: true});
      
        try {
          // Check if bucket exists, create if not
          const { data: bucketList } = await supabase.storage.listBuckets();
          if (!bucketList?.find(b => b.name === 'documents')) {
            await supabase.storage.createBucket('documents', {
              public: false
            });
          }
      
          const fileExt = newDocument.file.name.split('.').pop();
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;
          
          // Upload with error handling
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, newDocument.file, {
              cacheControl: '3600',
              upsert: false
            });
      
          if (uploadError) throw uploadError;
      
          // Get public URL (even for private buckets with signed URLs)
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);
      
          // Create document record
          const { error: docError } = await supabase
            .from('documents')
            .insert([{
              client_id: id,
              employee_id: user.id,
              document_type: newDocument.document_type,
              description: newDocument.description,
              file_name: newDocument.file.name,
              file_url: publicUrl,
              file_path: filePath,
              file_type: newDocument.file.type,
              file_size: newDocument.file.size
            }]);
      
          if (docError) throw docError;
      
          setNewDocument({
            document_type: 'quotation',
            description: '',
            file: null
          });
          setShowDocumentModal(false);
          await loadDocuments();
        } catch (error) {
          console.error('Error uploading document:', error);
          if (error instanceof Error) {
              alert(`Upload failed: ${error.message}`);
          } else {
              alert('Upload failed: An unknown error occurred.');
          }
        } finally {
          setLoading({...loading, document: false});
        }
      }

    async function handleDeleteDocument(documentId: string, filePath: string) {
        if (!confirm('Are you sure you want to delete this document?')) return;

        setLoading({...loading, document: true});

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('documents')
                .remove([filePath]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
                .from('documents')
                .delete()
                .eq('id', documentId);

            if (dbError) throw dbError;

            await loadDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
        } finally {
            setLoading({...loading, document: false});
        }
    }

    function handleSendDocument(document: any, contactEmail: string) {
        const subject = encodeURIComponent(`Document: ${document.file_name}`);
        const body = encodeURIComponent(
            `Dear Client,\n\n` +
            `Please find attached the document you requested.\n\n` +
            `Document Type: ${document.document_type}\n` +
            `Description: ${document.description || 'N/A'}\n\n` +
            `Best regards,\n` +
            `${user?.full_name || 'Your Representative'}\n` +
            `${user?.email || ''}`
        );
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${contactEmail}&su=${subject}&body=${body}`);
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
                        <button
                            onClick={() => setShowDocumentModal(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
                            disabled={loading.document}
                        >
                            {loading.document ? 'Loading...' : (
                                <>
                                    <Paperclip className="w-4 h-4 mr-2" />
                                    Upload Document
                                </>
                            )}
                        </button>
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
                                    {contact.email}
                                </div>
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Phone className="w-4 h-4 mr-2" />
                                    {contact.phone}
                                </div>
                            </div>
                            {role === 'finance.employee' && (
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

            {/* Documents Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Documents</h2>
                {documents.length === 0 ? (
                    <p className="text-gray-500">No documents found</p>
                ) : (
                    <div className="space-y-4">
                        {documents.map((document) => (
                            <div key={document.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Paperclip className="w-4 h-4 text-gray-500" />
                                            <a 
                                                href={document.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="font-medium text-blue-600 hover:underline"
                                            >
                                                {document.file_name}
                                            </a>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Type: {document.document_type}
                                        </p>
                                        {document.description && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                Description: {document.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                            Uploaded by {document.employees?.full_name} on {new Date(document.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {contactPersons.length > 0 && (
                                            <button
                                                onClick={() => handleSendDocument(document, contactPersons[0].email)}
                                                className="p-2 text-blue-600 hover:text-blue-800"
                                                title="Send to client"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        )}
                                        {(role === 'admin' || role === 'finance.employee') && (
                                            <button
                                                onClick={() => handleDeleteDocument(document.id, document.file_path)}
                                                className="p-2 text-red-600 hover:text-red-800"
                                                title="Delete document"
                                                disabled={loading.document}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Document Upload Modal */}
            {showDocumentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Upload Document</h2>
                        <form onSubmit={handleUploadDocument}>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Document Type</label>
                                <select
                                    value={newDocument.document_type}
                                    onChange={(e) => setNewDocument({...newDocument, document_type: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="quotation">Quotation</option>
                                    <option value="contract">Contract</option>
                                    <option value="invoice">Invoice</option>
                                    <option value="proposal">Proposal</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Description (Optional)</label>
                                <textarea
                                    value={newDocument.description}
                                    onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows={3}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2">File</label>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setNewDocument({...newDocument, file: e.target.files[0]});
                                        }
                                    }}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDocumentModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    disabled={loading.document}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    disabled={loading.document || !newDocument.file}
                                >
                                    {loading.document ? 'Uploading...' : 'Upload Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {role === 'finance.employee' && (
                <button
                    onClick={() => SetcompletedModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center"
                    disabled={loading.status}
                >
                    {loading.status ? 'Processing...' : (
                        <>
                            <LogOutIcon className="w-4 h-4 mr-2" />
                            Completed
                        </>
                    )}
                </button>
            )}

            {/* End Client Modal */}
            {EndClientModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">End Client</h2>
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

            {/* Completed Modal */}
            {completedModal && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Completed</h2>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => SetcompletedModal(false)}
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