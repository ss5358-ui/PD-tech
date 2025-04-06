import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface ContactData {
  id?: number;
  client: string;
  name: string;
  contact_name: string;
  email: string;
  phone_number: string;
  status: string;
}

export default function XLData() {
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch existing contacts from Supabase
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('status', 'open');

        if (error) throw error;
        setContacts(data || []);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Process Excel file and upload to Supabase
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      // Transform Excel data to match ContactData structure
      const contactsData: ContactData[] = jsonData.map((row) => ({
        client: row['Client'] || row['client'] || '',
        name: row['Name'] || row['name'] || '',
        contact_name: row['Contact Name'] || row['contact_name'] || row['Contact'] || '',
        email: row['Email'] || row['email'] || '',
        phone_number: row['Phone Number'] || row['phone_number'] || row['Phone'] || '',
        status: 'open'
      }));

      // Insert into Supabase
      const { data: insertedData, error } = await supabase
        .from('contacts')
        .insert(contactsData)
        .select();

      if (error) throw error;

      // Update local state with new contacts
      setContacts([...contacts, ...insertedData]);
      alert(`${insertedData.length} contacts imported successfully!`);
      setFile(null);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error importing contacts. Please check the file format.');
    } finally {
      setUploading(false);
    }
  };

  // Mark contact as done
  const handleMarkDone = async (id: number) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ status: 'close' })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setContacts(contacts.filter(contact => contact.id !== id));
      alert('Call Done');
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading contacts...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Excel Data Import</h1>
      
      {/* Excel Upload Section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-3">Upload Excel File</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={uploading}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed mt-6 sm:mt-0"
          >
            {uploading ? 'Uploading...' : 'Import Data'}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Supported formats: .xlsx, .xls, .csv. File should contain columns for Client, Name, Contact Name, Email, and Phone Number.
        </p>
      </div>

      {/* Contacts Table */}
      {contacts.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.client}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.contact_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.phone_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => contact.id && handleMarkDone(contact.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Mark Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No contacts found. Upload an Excel file to get started.</p>
        </div>
      )}
    </div>
  );
}