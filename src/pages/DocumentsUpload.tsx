import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Upload, FileText, X } from 'lucide-react';

interface DocumentData {
  client_id: string;
  employee_id: string;
  document_type: string;
  description: string;
  file: File | null;
}

interface Client {
  id: string;
  name: string;
}

const DocumentsUpload = () => {
  const [documentData, setDocumentData] = useState<DocumentData>({
    client_id: '',
    employee_id: '',
    document_type: '',
    description: '',
    file: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const user = useStore((state) => state.user);

  // Fetch clients from Supabase
  useEffect(() => {
    const fetchClients = async () => {
      try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'ecomplete')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
      } catch (error) {
      console.error('Error fetching clients:', error);
      setUploadError('Failed to load client list');
      } finally {
      setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDocumentData({
      ...documentData,
      [name]: value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentData({
        ...documentData,
        file: e.target.files[0],
      });
    }
  };

  const removeFile = () => {
    setDocumentData({
      ...documentData,
      file: null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentData.file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // First upload the file to Supabase Storage
      const fileExt = documentData.file.name.split('.').pop();
      const fileName = `${documentData.client_id}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, documentData.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: documentData.file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL of the uploaded file
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Then insert the document record into the database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          client_id: documentData.client_id,
          employee_id: user?.id || documentData.employee_id,
          document_type: documentData.document_type,
          description: documentData.description,
          file_name: documentData.file.name,
          file_url: urlData.publicUrl,
          file_path: filePath,
          file_type: documentData.file.type,
          file_size: documentData.file.size,
        }]);

      if (dbError) {
        throw dbError;
      }

      setUploadSuccess(true);
      setDocumentData({
        client_id: '',
        employee_id: '',
        document_type: '',
        description: '',
        file: null,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Documents Upload</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client dropdown */}
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          {loadingClients ? (
            <select
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
            >
              <option>Loading clients...</option>
            </select>
          ) : (
            <select
              id="client_id"
              name="client_id"
              value={documentData.client_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Rest of your form remains unchanged */}
        {!user?.id && (
          <div>
            <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              id="employee_id"
              name="employee_id"
              value={documentData.employee_id}
              onChange={handleInputChange}
              required={!user?.id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Document type dropdown */}
        <div>
          <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 mb-1">
            Document Type
          </label>
          <select
            id="document_type"
            name="document_type"
            value={documentData.document_type}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select document type</option>
            <option value="invoice">Invoice</option>
            <option value="contract">Contract</option>
            <option value="proposal">Proposal</option>
            <option value="report">Report</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Description textarea */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={documentData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* File upload section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document File</label>
          {!documentData.file ? (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                </div>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      className="sr-only"
                      required
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF, DOCX, XLSX, JPG, PNG up to 10MB</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  {documentData.file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="pt-1">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {uploadError}
          </div>
        )}

        {/* Success message */}
        {uploadSuccess && (
          <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">
            Document uploaded successfully!
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading}
            className={`px-4 py-2 rounded-md text-white ${isUploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentsUpload;