import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Search, Calendar, User, Filter, X, ArrowLeft, Download, Image as ImageIcon } from 'lucide-react';

interface PdKitWithDetails {
  id: string;
  file_path: string;
  uploaded_at: string;
  upload_type: 'start' | 'end';
  visit: {
    id: string;
    created_at: string;
    client: {
      id: string;
      name: string;
      company: string;
    };
    employee: {
      id: string;
      name: string;
    };
  };
}

export default function AllPdKitsPage() {
  const navigate = useNavigate();
  const [pdKits, setPdKits] = useState<PdKitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'start' | 'end'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchPdKits = async () => {
      try {
        setLoading(true);
        
        const { data: pdKitData, error: pdKitError } = await supabase
          .from('pd_kit_uploads')
          .select(`
            id,
            file_path,
            uploaded_at,
            upload_type,
            visit_id
          `)
          .order('uploaded_at', { ascending: false });

        if (pdKitError) throw pdKitError;
        if (!pdKitData) return;

        const visitIds = [...new Set(pdKitData.map(kit => kit.visit_id))];

        const { data: visitData, error: visitError } = await supabase
          .from('site_visit')
          .select(`
            id,
            created_at,
            client_Id,
            employee_Id,
            clients (id, name, company),
            employees (id, full_name)
          `)
          .in('id', visitIds);

        if (visitError) throw visitError;

        const kitsWithDetails = pdKitData.map(kit => {
          const visit = visitData?.find(v => v.id === kit.visit_id);
          
          if (!visit) {
            return {
              id: kit.id,
              file_path: kit.file_path,
              uploaded_at: kit.uploaded_at,
              upload_type: kit.upload_type as 'start' | 'end',
              visit: {
                id: '',
                created_at: '',
                client: {
                  id: '',
                  name: 'Unknown Client',
                  company: '',
                },
                employee: {
                  id: '',
                  name: 'Unknown Employee',
                }
              }
            };
          }

          return {
            id: kit.id,
            file_path: kit.file_path,
            uploaded_at: kit.uploaded_at,
            upload_type: kit.upload_type as 'start' | 'end',
            visit: {
              id: visit.id,
              created_at: visit.created_at,
              client: {
                id: visit.client_id,
                name: visit.clients?.name || 'Unknown Client',
                company: visit.clients?.company || '',
              },
              employee: {
                id: visit.employee_id,
                name: visit.employees?.full_name || 'Unknown Employee',
              }
            }
          };
        });

        setPdKits(kitsWithDetails);
      } catch (err: any) {
        console.error('Error fetching PD kits:', err);
        setError(err.message || 'Failed to load PD kits');
      } finally {
        setLoading(false);
      }
    };

    fetchPdKits();
  }, []);

  const handleDownloadFile = async (filePath: string, clientName: string, uploadType: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('pd-kits')
        .download(filePath);
      
      if (error) throw error;
      if (!data) throw new Error('No data received');

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      
      // Get file extension
      const fileExtension = filePath.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `pd-kit-${clientName}-${uploadType}.${fileExtension}`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError(err.message || 'Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (kitId: string) => {
    setImageLoadErrors(prev => ({ ...prev, [kitId]: true }));
  };

  const filteredPdKits = pdKits.filter(kit => {
    const matchesSearch = 
      kit.visit.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kit.visit.client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kit.visit.employee.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter 
      ? new Date(kit.uploaded_at).toISOString().split('T')[0] === dateFilter
      : true;
    
    const matchesType = typeFilter === 'all' || kit.upload_type === typeFilter;
    
    return matchesSearch && matchesDate && matchesType;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setTypeFilter('all');
  };

  const isImageFile = (filePath: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-gray-200 rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">All PD Kits</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search by client, company or employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Filters</h3>
            <button 
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'start' | 'end')}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              >
                <option value="all">All Types</option>
                <option value="start">Start of Visit</option>
                <option value="end">End of Visit</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {filteredPdKits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No PD Kits found</p>
          {(searchTerm || dateFilter || typeFilter !== 'all') && (
            <button 
              onClick={clearFilters}
              className="text-blue-600 hover:underline mt-2"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPdKits.map((kit) => (
            <div key={kit.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800 line-clamp-1">
                      {kit.visit.client.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {kit.visit.client.company}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    kit.upload_type === 'start' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {kit.upload_type === 'start' ? 'Start' : 'End'}
                  </span>
                </div>
              </div>
              
              {/* File preview section */}
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center relative">
                {isImageFile(kit.file_path) && !imageLoadErrors[kit.id] ? (
                  <img
                    src={`${supabase.storage.from('pd-kits').getPublicUrl(kit.file_path).data.publicUrl}`}
                    alt={`PD Kit for ${kit.visit.client.name}`}
                    className="w-full h-full object-contain"
                    onError={() => handleImageError(kit.id)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    {isImageFile(kit.file_path) ? (
                      <ImageIcon className="w-16 h-16 text-gray-400 mb-2" />
                    ) : (
                      <FileText className="w-16 h-16 text-gray-400 mb-2" />
                    )}
                    <p className="text-sm text-gray-500">
                      {isImageFile(kit.file_path) ? 'Image preview' : 'Document preview'} not available
                    </p>
                  </div>
                )}
                <button
                  onClick={() => handleDownloadFile(kit.file_path, kit.visit.client.name, kit.upload_type)}
                  className="absolute bottom-4 right-4 px-3 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1 hover:bg-blue-700 transition-colors text-sm"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {kit.visit.employee.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(kit.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(kit.file_path, kit.visit.client.name, kit.upload_type)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}