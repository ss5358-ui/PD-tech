import React, { useEffect, useState } from 'react';
import { Plus, Search, X, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const user = useStore((state) => state.user);
  const [newNotification, setNewNotification] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    assignTo: 'self' // 'self' or 'all'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
    loadEmployees();
    const interval = setInterval(checkActiveNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkActiveNotifications();
  }, [notifications]);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*');
    
    if (!error) {
      setEmployees(data || []);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('scheduled_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  function checkActiveNotifications() {
    const now = new Date();
    const active = notifications.filter(notification => {
      const scheduledTime = new Date(notification.scheduled_at);
      return scheduledTime <= now && !notification.is_delivered;
    });
    setActiveNotifications(active);
  }

  async function handleCreateNotification(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const scheduledAt = new Date(`${newNotification.date}T${newNotification.time}`).toISOString();
      const assignTo = newNotification.assignTo === 'all' ? employees.map(e => e.id) : [user?.id];

      const { data, error } = await supabase
        .from('notifications')
        .insert(assignTo.map(userId => ({
          title: newNotification.title,
          description: newNotification.description,
          scheduled_at: scheduledAt,
          created_by: user?.id,
          assigned_to: userId,
          is_delivered: false
        })))
        .select();
      
      if (error) throw error;

      setNotifications([...data, ...notifications]);
      setNewNotification({ title: '', description: '', date: '', time: '', assignTo: 'self' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating notification:', error);
      setError('Failed to create notification');
    } finally {
      setLoading(false);
    }
  }

  async function markAsDelivered(id: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_delivered: true })
        .eq('id', id);
      
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_delivered: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification:', error);
    }
  }

  async function assignNotification(notificationId: string, assignTo: 'self' | 'all') {
    setLoading(true);
    try {
      const userIds = assignTo === 'all' ? employees.map(e => e.id) : [user?.id];
      
      // First delete existing assignments
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      // Create new assignments
      const { data, error } = await supabase
        .from('notifications')
        .insert(userIds.map(userId => ({
          ...currentNotification,
          id: undefined, // Let Supabase generate new IDs
          assigned_to: userId,
          is_delivered: false
        })))
        .select();

      if (error) throw error;

      setNotifications([
        ...data,
        ...notifications.filter(n => n.id !== notificationId)
      ]);
      setShowAssignModal(false);
    } catch (error) {
      console.error('Error assigning notification:', error);
      setError('Failed to assign notification');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Notification Center</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search Notifications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            <span>Add Notification</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading && !notifications.length ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activeNotifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No active notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeNotifications
            .filter(notification => 
              notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (notification.description && notification.description.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map((notification) => (
              <div
                key={notification.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow w-full relative"
              >
                <button
                  onClick={() => markAsDelivered(notification.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  title="Dismiss notification"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {notification.title}
                    </h3>
                    {notification.description && (
                      <p className="text-gray-600 mb-4">{notification.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Scheduled: {formatDate(notification.scheduled_at)} at {formatTime(notification.scheduled_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(user?.role === 'head' || user?.role === 'admin' || user?.role === 'employee') && (
                      <button
                        onClick={() => {
                          setCurrentNotification(notification);
                          setShowAssignModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                        title="Reassign notification"
                      >
                        {notification.assigned_to === user?.id ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Users className="w-4 h-4" />
                        )}
                        Reassign
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Notification Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Notification</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateNotification}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">Title *</label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">Description</label>
                <textarea
                  value={newNotification.description}
                  onChange={(e) => setNewNotification({ ...newNotification, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Date *</label>
                  <input
                    type="date"
                    value={newNotification.date}
                    onChange={(e) => setNewNotification({ ...newNotification, date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Time *</label>
                  <input
                    type="time"
                    value={newNotification.time}
                    onChange={(e) => setNewNotification({ ...newNotification, time: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {(user?.role === 'head' || user?.role === 'admin' || user?.role === 'e.head') && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium">Assign To</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="assignTo"
                        value="self"
                        checked={newNotification.assignTo === 'self'}
                        onChange={() => setNewNotification({ ...newNotification, assignTo: 'self' })}
                        className="h-4 w-4"
                        disabled={loading}
                      />
                      <span>Only me</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="assignTo"
                        value="all"
                        checked={newNotification.assignTo === 'all'}
                        onChange={() => setNewNotification({ ...newNotification, assignTo: 'all' })}
                        className="h-4 w-4"
                        disabled={loading}
                      />
                      <span>All employees</span>
                    </label>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 text-sm rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={loading}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newNotification.title || !newNotification.date || !newNotification.time}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Notification'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Notification Modal */}
      {showAssignModal && currentNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Reassign Notification</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{currentNotification.title}</h3>
              {currentNotification.description && (
                <p className="text-gray-600 mb-4">{currentNotification.description}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-4 font-medium">Assign To</label>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => assignNotification(currentNotification.id, 'self')}
                  disabled={loading}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Only me</p>
                    <p className="text-sm text-gray-500">Assign this notification only to yourself</p>
                  </div>
                </button>
                <button
                  onClick={() => assignNotification(currentNotification.id, 'all')}
                  disabled={loading}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="p-2 bg-green-100 rounded-full">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">All employees</p>
                    <p className="text-sm text-gray-500">Assign this notification to all employees</p>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 text-sm rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}