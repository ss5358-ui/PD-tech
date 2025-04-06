import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

interface Client {
  id: string;
  name: string;
  company: string;
}

interface SiteVisit {
  id: string;
  client_Id: string;
  latitude: string;
  longitude: string;
  accuracy?: string;
  created_at: string;
  employee_Id: string;
  status: string;
}

interface PdKitUpload {
  id: string;
  file_path: string;
  uploaded_at: string;
  upload_type?: string;
}

export default function SiteVisit() {
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSiteVisits, setFilteredSiteVisits] = useState<SiteVisit[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiteVisit, setNewSiteVisit] = useState({
    client_Id: '',
    latitude: '',
    longitude: '',
    accuracy: '',
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdKitFile, setPdKitFile] = useState<File | null>(null);
  const [pdKitUploading, setPdKitUploading] = useState(false);
  const [pdKitUploadError, setPdKitUploadError] = useState('');
  const [pdKitUploadSuccess, setPdKitUploadSuccess] = useState('');
  const [currentVisitForPdKit, setCurrentVisitForPdKit] = useState<string | null>(null);
  const [pdKits, setPdKits] = useState<Record<string, PdKitUpload[]>>({});

  const navigate = useNavigate();
  const role = useStore((state) => state.role);
  const user = useStore((state) => state.user);

  useEffect(() => {
    loadSiteVisits();
    loadClients();
    if ((role === 'employee' || role === 'e.employee') && user?.id) {
      loadAssignedClients();
    }
  }, [role, user?.id]);

  useEffect(() => {
    filterSiteVisits();
  }, [siteVisits, searchQuery]);

  async function loadSiteVisits() {
    try {
      const { data, error } = await supabase
        .from('site_visit')
        .select('*')
        .eq('status', 'start')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSiteVisits(data || []);

      // Load PD Kits for each visit
      if (data && data.length > 0) {
        const visitIds = data.map(visit => visit.id);
        const { data: pdKitData, error: pdKitError } = await supabase
          .from('pd_kit_uploads')
          .select('*')
          .in('visit_id', visitIds);

        if (pdKitError) throw pdKitError;

        const pdKitsByVisit: Record<string, PdKitUpload[]> = {};
        pdKitData?.forEach(upload => {
          if (upload.visit_id) {
            if (!pdKitsByVisit[upload.visit_id]) {
              pdKitsByVisit[upload.visit_id] = [];
            }
            pdKitsByVisit[upload.visit_id].push(upload);
          }
        });

        setPdKits(pdKitsByVisit);
      }
    } catch (error) {
      console.error('Error loading site visits:', error);
    }
  }

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function loadAssignedClients() {
    try {
      if (!user?.id) return;
      
      const { data: assignments, error: assignmentsError } = await supabase
        .from('client_assignments')
        .select('client_id')
        .eq('employee_id', user.id);

      if (assignmentsError) throw assignmentsError;

      if (assignments && assignments.length > 0) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .in('id', assignments.map(a => a.client_id))
          .order('name');

        if (clientError) throw clientError;
        setAssignedClients(clientData || []);
      }
    } catch (error) {
      console.error('Error loading assigned clients:', error);
    }
  }

  const filterSiteVisits = () => {
    if (!searchQuery) {
      setFilteredSiteVisits(siteVisits);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = siteVisits.filter(visit => {
      const client = (role === 'e.head' || role === 'admin' || role === 'head' ? clients : assignedClients).find(c => c.id === visit.client_Id);
      const clientName = client?.name.toLowerCase() || '';
      const companyName = client?.company.toLowerCase() || '';
      
      return (
        clientName.includes(query) ||
        companyName.includes(query) ||
        visit.created_at.toLowerCase().includes(query)
      );
    });
    
    setFilteredSiteVisits(filtered);
  };

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    setLocationError('');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      setNewSiteVisit(prev => ({
        ...prev,
        latitude: position.coords.latitude.toFixed(6),
        longitude: position.coords.longitude.toFixed(6),
        accuracy: `${position.coords.accuracy.toFixed(1)} meters`,
      }));
    } catch (err: any) {
      console.error('Geolocation error:', err);
      setLocationError(err.message || "Failed to get location");
    } finally {
      setIsGettingLocation(false);
    }
  };

  async function handleCreateSiteVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to create a site visit");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('site_visit')
        .insert([
          {
            client_Id: newSiteVisit.client_Id,
            latitude: newSiteVisit.latitude,
            longitude: newSiteVisit.longitude,
            employee_Id: user.id,
            status: 'start'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSiteVisits([data, ...siteVisits]);
      setNewSiteVisit({
        client_Id: '',
        latitude: '',
        longitude: '',
        accuracy: '',
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating site visit:', error);
      alert("Failed to create site visit");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePdKitUpload = async (visitId: string, uploadType: 'start' | 'end') => {
    if (!pdKitFile || !user || !visitId) {
      setPdKitUploadError('No file selected or visit not specified');
      return;
    }
    
    setPdKitUploading(true);
    setPdKitUploadError('');
    setPdKitUploadSuccess('');

    try {
      // Get the visit to associate client ID
      const { data: visitData, error: visitError } = await supabase
        .from('site_visit')
        .select('client_Id')
        .eq('id', visitId)
        .single();

      if (visitError) throw visitError;
      if (!visitData) throw new Error('Visit not found');

      // Generate a unique filename
      const fileExt = pdKitFile.name.split('.').pop();
      const fileName = `${user.id}-${visitId}-${Date.now()}.${fileExt}`;
      const filePath = `pd-kits/${fileName}`;

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pd-kits')
        .upload(filePath, pdKitFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Record the upload in the database
      const { data: dbData, error: dbError } = await supabase
        .from('pd_kit_uploads')
        .insert([
          {
            employee_id: user.id,
            file_path: filePath,
            client_id: visitData.client_Id,
            visit_id: visitId,
            upload_type: uploadType
          }
        ])
        .select();

      if (dbError) throw dbError;

      // Update local state
      setPdKits(prev => {
        const newPdKits = { ...prev };
        if (!newPdKits[visitId]) {
          newPdKits[visitId] = [];
        }
        newPdKits[visitId].push(dbData[0]);
        return newPdKits;
      });

      setPdKitUploadSuccess('PD Kit uploaded successfully!');
      setPdKitFile(null);
      setTimeout(() => {
        setCurrentVisitForPdKit(null);
        setPdKitUploadSuccess('');
      }, 2000);
    } catch (error: any) {
      console.error('Error in handlePdKitUpload:', error);
      setPdKitUploadError(error.message || 'Failed to upload PD Kit. Please try again.');
    } finally {
      setPdKitUploading(false);
    }
  };

  const getAvailableClients = () => {
    if (role === 'admin' || role === 'e.head' || role === 'head') {
      return clients;
    }
    return assignedClients;
  };

  const getPdKitUrl = (filePath: string) => {
    const { data } = supabase.storage.from('pd-kits').getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Site Visits</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search by client or date"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Site Visit</span>
            </button>
          </div>

          {filteredSiteVisits.map((visit) => (
            <button
              key={visit.id}
              onClick={() => navigate(`/site-visits/${visit.id}/pd-kits`)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View PD Kits
            </button>
          ))}
        </div>
      </div>

      {filteredSiteVisits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No site visits found</p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:underline mt-2"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSiteVisits.map((visit) => {
            const availableClients = role === 'admin' || role === 'head' ? clients : assignedClients;
            const client = availableClients.find(c => c.id === visit.client_Id);
            const visitDate = new Date(visit.created_at).toLocaleString();
            const visitPdKits = pdKits[visit.id] || [];

            return (
              <div
                key={visit.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    {client ? client.name : 'Unknown Client'}
                  </h3>
                  {client?.company && (
                    <p className="text-gray-600 text-sm mb-2">{client.company}</p>
                  )}
                  <p className="text-gray-500 text-xs mb-4">
                    {visitDate}
                  </p>

                  {visitPdKits.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">PD Kits:</h4>
                      <ul className="space-y-2">
                        {visitPdKits.map((kit) => (
                          <li key={kit.id} className="flex items-center">
                            <FileText className="w-4 h-4 text-gray-500 mr-2" />
                            <a
                              href={getPdKitUrl(kit.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {new Date(kit.uploaded_at).toLocaleString()} ({kit.upload_type})
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => navigate(`/site-visits/${visit.id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Site Visit
                  </button>
                  {(role === 'e.employee') && (
                    <button
                      onClick={() => setCurrentVisitForPdKit(visit.id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload PD Kit</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Site Visit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Site Visit</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateSiteVisit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">Client</label>
                <select
                  value={newSiteVisit.client_Id}
                  onChange={(e) => setNewSiteVisit({ ...newSiteVisit, client_Id: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isSubmitting || ((role === 'employee' || role === 'e.employee') && assignedClients.length === 0)}
                >
                  <option value="">Select Client</option>
                  {getAvailableClients().map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.company})
                    </option>
                  ))}
                </select>
                {(role === 'employee' || role === 'e.employee') && assignedClients.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">You don't have any assigned clients</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">Location</label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={updateLocation}
                    disabled={isGettingLocation || isSubmitting}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2"
                  >
                    {isGettingLocation ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Getting Location...
                      </>
                    ) : (
                      'Update Current Location'
                    )}
                  </button>

                  {newSiteVisit.latitude && newSiteVisit.longitude && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Latitude:</span> {newSiteVisit.latitude}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Longitude:</span> {newSiteVisit.longitude}
                      </p>
                      {newSiteVisit.accuracy && (
                        <p className="text-sm">
                          <span className="font-medium">Accuracy:</span> {newSiteVisit.accuracy}
                        </p>
                      )}
                    </div>
                  )}

                  {locationError && (
                    <p className="text-red-500 text-sm">{locationError}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSiteVisit.client_Id || !newSiteVisit.latitude || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Site Visit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PD Kit Upload Modal */}
      {currentVisitForPdKit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upload PD Kit</h2>
              <button
                onClick={() => {
                  setCurrentVisitForPdKit(null);
                  setPdKitFile(null);
                  setPdKitUploadError('');
                  setPdKitUploadSuccess('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">Select File (Image or PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setPdKitFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  disabled={pdKitUploading}
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 font-medium">Upload Type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  disabled={pdKitUploading}
                >
                  <option value="start">Start of Visit</option>
                </select>
              </div>

              {pdKitFile && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Selected file:</span> {pdKitFile.name}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Size:</span> {(pdKitFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              {pdKitUploadError && (
                <p className="text-red-500 text-sm">{pdKitUploadError}</p>
              )}

              {pdKitUploadSuccess && (
                <p className="text-green-500 text-sm">{pdKitUploadSuccess}</p>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentVisitForPdKit(null);
                    setPdKitFile(null);
                    setPdKitUploadError('');
                    setPdKitUploadSuccess('');
                  }}
                  disabled={pdKitUploading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selectElement = document.querySelector('select');
                    const uploadType = selectElement?.value as 'start' | 'end';
                    handlePdKitUpload(currentVisitForPdKit, uploadType);
                  }}
                  disabled={!pdKitFile || pdKitUploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2"
                >
                  {pdKitUploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Upload PD Kit'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}