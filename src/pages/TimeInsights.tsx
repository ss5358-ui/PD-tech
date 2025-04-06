import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Filter, X } from 'lucide-react';

interface TimeInsight {
  id: string;
  client_name: string;
  employee_name: string;
  date: string;
  address: string;
  duration: { days: number; hours: number; minutes: number };
  raw_date: Date;
}

export default function TimeInsights() {
  const [timeInsights, setTimeInsights] = useState<TimeInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTimeInsights();
  }, []);

  async function fetchTimeInsights() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_visit')
        .select(`
          id,
          created_at,
          status,
          employee:employee_Id (full_name),
          client:client_Id (name, address),
          form:site_visit_form (
            address,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = processTimeData(data || []);
      setTimeInsights(processedData);
    } catch (error) {
      console.error('Error fetching time insights:', error);
    } finally {
      setLoading(false);
    }
  }

  function processTimeData(rawData: any[]): TimeInsight[] {
    return rawData
      .filter(visit => visit.status === 'end' && visit.form?.[0]?.created_at)
      .map(visit => {
        const startTime = new Date(visit.created_at);
        const endTime = new Date(visit.form[0].created_at);
        const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = Math.floor(totalMinutes % 60);
        
        return {
          id: visit.id,
          client_name: visit.client?.name || 'Unknown',
          employee_name: visit.employee?.full_name || 'Unknown',
          date: startTime.toLocaleDateString(),
          raw_date: startTime,
          address: visit.form?.[0]?.address || visit.client?.address || 'N/A',
          duration: { days, hours, minutes }
        };
      });
  }

  const filteredInsights = timeInsights.filter(insight => {
    const matchesSearch = 
      insight.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter 
      ? insight.raw_date.toISOString().split('T')[0] === dateFilter
      : true;
    
    const matchesEmployee = employeeFilter 
      ? insight.employee_name.toLowerCase().includes(employeeFilter.toLowerCase())
      : true;
    
    return matchesSearch && matchesDate && matchesEmployee;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setEmployeeFilter('');
  };

  const uniqueEmployees = [...new Set(timeInsights.map(insight => insight.employee_name))];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Time Insights</h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search by client, employee or address..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              >
                <option value="">All Employees</option>
                {uniqueEmployees.map(employee => (
                  <option key={employee} value={employee}>{employee}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInsights.length > 0 ? (
                  filteredInsights.map(insight => {
                    const totalMinutes = insight.duration.days * 1440 + insight.duration.hours * 60 + insight.duration.minutes;
                    return (
                      <tr key={insight.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{insight.client_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{insight.employee_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{insight.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{insight.address}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              totalMinutes > 120
                                ? 'bg-red-100 text-red-800'
                                : totalMinutes > 60
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {`${insight.duration.days > 0 ? `${insight.duration.days}d ` : ''}${insight.duration.hours}h ${insight.duration.minutes}m`}
                            {totalMinutes > 0 && ` (${totalMinutes.toFixed(0)} mins)`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No matching time tracking data found
                      {(searchTerm || dateFilter || employeeFilter) && (
                        <button 
                          onClick={clearFilters}
                          className="text-blue-600 hover:underline ml-2"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}