import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Users, Building2, FileText, CalendarCheck, Bell, Calendar, DollarSign, Package, ClipboardList, Menu, X } from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useMediaQuery } from 'react-responsive';

const localizer = momentLocalizer(moment);

interface DashboardStats {
  totalClients: number;
  totalEmployees: number;
  totalQuotations: number;
  totalSiteVisits: number;
  totalpos: number;
  pendingNotifications: number;
  totalInvoices?: number;
  totalPayments?: number;
  totalProjects?: number;
}

interface NotificationEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  description?: string;
  assignedTo?: string;
  isDelivered: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalEmployees: 0,
    totalQuotations: 0,
    totalSiteVisits: 0,
    totalpos: 0,
    pendingNotifications: 0,
    totalInvoices: 0,
    totalPayments: 0,
    totalProjects: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [recentSiteVisits, setRecentSiteVisits] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<NotificationEvent[]>([]);
  const [activeView, setActiveView] = useState<'stats' | 'calendar'>('stats');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const role = useStore((state) => state.role);
  const user = useStore((state) => state.user);

  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  // Removed unused variable 'isDesktop'

  useEffect(() => {
    loadDashboardData();
  }, [role, user?.id]);

  async function loadDashboardData() {
    try {
      // Common queries for all roles
      // Removed unused variable 'commonQueries'
      
      // Load stats based on role
      if (role === 'head' || role === 'admin' || role === 'e.head') {
        const queries = [
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('employees').select('*', { count: 'exact', head: true }),
          supabase.from('quotations').select('*', { count: 'exact', head: true }),
          supabase.from('site_visit').select('*', { count: 'exact', head: true }),
          supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_delivered', false),
        ];

        if (role === 'e.head') {
          queries.push(
            supabase.from('projects').select('*', { count: 'exact', head: true }),
            supabase.from('invoices').select('*', { count: 'exact', head: true }),
            supabase.from('payments').select('*', { count: 'exact', head: true })
          );
        }

        const [
          { count: clientCount },
          { count: employeeCount },
          { count: quotationCount },
          { count: siteVisitCount },
          { count: posCount },
          { count: notificationCount },
          { count: projectCount },
          { count: invoiceCount },
          { count: paymentCount },
        ] = await Promise.all(queries);

        setStats(prev => ({
          ...prev,
          totalClients: clientCount || 0,
          totalEmployees: employeeCount || 0,
          totalQuotations: quotationCount || 0,
          totalSiteVisits: siteVisitCount || 0,
          totalpos: posCount || 0,
          pendingNotifications: notificationCount || 0,
          totalProjects: projectCount || 0,
          totalInvoices: invoiceCount || 0,
          totalPayments: paymentCount || 0,
        }));
      } else if (role === 'finance.employee') {
        const [
          { count: invoiceCount },
          { count: paymentCount },
          { count: notificationCount },
        ] = await Promise.all([
          supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('payments')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .or(`assigned_to.eq.${user?.id},target_role.eq.${role}`)
            .eq('is_delivered', false),
        ]);

        setStats(prev => ({
          ...prev,
          totalInvoices: invoiceCount || 0,
          totalPayments: paymentCount || 0,
          pendingNotifications: notificationCount || 0,
        }));
      } else {
        // For e.employee and employee roles
        const [
          { count: assignedClientCount },
          { count: quotationCount },
          { count: siteVisitCount },
          { count: posCount },
          { count: notificationCount },
          { count: projectCount },
        ] = await Promise.all([
          supabase
            .from('client_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user?.id),
          supabase
            .from('quotations')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user?.id),
          supabase
            .from('site_visit')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user?.id),
          supabase
            .from('quotations')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user?.id)
            .eq('status', 'approved'),
          supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .or(`assigned_to.eq.${user?.id},target_role.eq.${role}`)
            .eq('is_delivered', false),
          role === 'e.employee' ? 
            supabase
              .from('project_assignments')
              .select('*', { count: 'exact', head: true })
              .eq('employee_id', user?.id) :
            Promise.resolve({ count: 0 }),
        ]);

        setStats(prev => ({
          ...prev,
          totalClients: assignedClientCount || 0,
          totalEmployees: 0,
          totalQuotations: quotationCount || 0,
          totalSiteVisits: siteVisitCount || 0,
          totalpos: posCount || 0,
          pendingNotifications: notificationCount || 0,
          totalProjects: projectCount || 0,
        }));
      }

      // Load recent data based on role
      if (role !== 'finance.employee') {
        // Load recent quotations for non-finance roles
        const { data: quotations } = await supabase
          .from('quotations')
          .select(`
            *,
            clients (
              name,
              company
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentQuotations(quotations || []);

        // Load recent site visits for non-finance roles
        const { data: siteVisits } = await supabase
          .from('site_visit')
          .select(`
            *,
            clients (
              name,
              company
            ),
            employees (
              full_name
            ),
            address,
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentSiteVisits(siteVisits || []);
      } else {
        // Finance-specific data
        const { data: invoices } = await supabase
          .from('invoices')
          .select(`
            *,
            clients (
              name,
              company
            ),
            projects (
              name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentInvoices(invoices || []);

        const { data: payments } = await supabase
          .from('payments')
          .select(`
            *,
            invoices (
              invoice_number,
              clients (
                name,
                company
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentPayments(payments || []);
      }

      // Load notifications and calendar events for all roles
      const notificationsQuery = role === 'head' || role === 'admin' || role === 'e.head' 
        ? supabase.from('notifications').select('*').order('scheduled_at', { ascending: false }).limit(5)
        : supabase.from('notifications')
            .select('*')
            .or(`assigned_to.eq.${user?.id},target_role.eq.${role}`)
            .order('scheduled_at', { ascending: false })
            .limit(5);

      const { data: notifications } = await notificationsQuery;

      setRecentNotifications(notifications || []);

      // Format events for calendar
      const events = (notifications || []).map(notif => ({
        id: notif.id,
        title: notif.title,
        start: new Date(notif.scheduled_at),
        end: new Date(new Date(notif.scheduled_at).getTime() + 60 * 60 * 1000), // 1 hour duration by default
        description: notif.description,
        assignedTo: notif.assigned_to,
        isDelivered: notif.is_delivered,
      }));

      setCalendarEvents(events);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  const eventStyleGetter = (event: NotificationEvent) => {
    let backgroundColor = event.isDelivered ? '#d1fae5' : '#fee2e2'; // green for delivered, red for pending
    if (new Date(event.start) > new Date()) {
      backgroundColor = '#bfdbfe'; // blue for future events
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: '#1f2937',
        border: '0px',
        display: 'block',
      },
    };
  };

  const renderFinanceStats = () => (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm md:text-base text-gray-500">Total Invoices</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalInvoices}</h3>
          </div>
          <ClipboardList className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm md:text-base text-gray-500">Total Payments</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalPayments}</h3>
          </div>
          <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
        </div>
      </div>
    </>
  );

  const renderEHeadStats = () => (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm md:text-base text-gray-500">Total Projects</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalProjects}</h3>
          </div>
          <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
        </div>
      </div>
    </>
  );

  const renderEEmployeeStats = () => (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm md:text-base text-gray-500">Assigned Projects</p>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalProjects}</h3>
          </div>
          <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
        </div>
      </div>
    </>
  );

  const renderFinanceRecentActivity = () => (
    <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
          <ClipboardList className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600" />
          Recent Invoices
        </h2>
        <div className="space-y-3 md:space-y-4">
          {recentInvoices.map((invoice) => (
            <div key={invoice.id} className="border-b pb-3 md:pb-4 last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm md:text-base font-medium text-gray-800">
                    {invoice.clients?.name} - {invoice.invoice_number}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    Amount: ${invoice.amount}
                  </p>
                  {invoice.projects?.name && (
                    <p className="text-xs md:text-sm text-gray-500">
                      Project: {invoice.projects.name}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'overdue'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
          <DollarSign className="w-4 h-4 md:w-5 md:h-5 mr-2 text-green-600" />
          Recent Payments
        </h2>
        <div className="space-y-3 md:space-y-4">
          {recentPayments.map((payment) => (
            <div key={payment.id} className="border-b pb-3 md:pb-4 last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm md:text-base font-medium text-gray-800">
                    {payment.invoices?.clients?.name} - {payment.invoices?.invoice_number}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    Amount: ${payment.amount}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500">
                    Method: {payment.method}
                  </p>
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {moment(payment.payment_date).format('MMM D, YYYY')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderViewToggle = () => (
    <div className="flex space-x-2">
      <button
        onClick={() => {
          setActiveView('stats');
          if (isMobile) setMobileMenuOpen(false);
        }}
        className={`px-3 py-1 md:px-4 md:py-2 text-sm md:text-base rounded-md ${
          activeView === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => {
          setActiveView('calendar');
          if (isMobile) setMobileMenuOpen(false);
        }}
        className={`px-3 py-1 md:px-4 md:py-2 text-sm md:text-base rounded-md ${
          activeView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
        }`}
      >
        Calendar
      </button>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-4">
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-md sticky top-0 z-10">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      )}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          {renderViewToggle()}
        </div>
      )}

      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          {renderViewToggle()}
        </div>
      )}

      {activeView === 'stats' ? (
        <>
          {/* Stats */}
          <div className={`grid ${
            isMobile ? 'grid-cols-1 gap-3' : 
            isTablet ? 'grid-cols-2 gap-4' : 
            'grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'
          }`}>
            {/* Common stats for all roles */}
            {role !== 'finance.employee' && role !== null && (
              <>
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm md:text-base text-gray-500">Total Clients</p>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalClients}</h3>
                    </div>
                    <Building2 className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                  </div>
                </div>

                {(role === 'head' || role === 'admin' || role === 'e.head') && (
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm md:text-base text-gray-500">Total Employees</p>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalEmployees}</h3>
                      </div>
                      <Users className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                    </div>
                  </div>
                )}

                {role !== 'finance.employee' && (
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm md:text-base text-gray-500">Total Quotations</p>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalQuotations}</h3>
                      </div>
                      <FileText className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Role-specific stats */}
            {role === 'finance.employee' && renderFinanceStats()}
            {role === 'e.head' && renderEHeadStats()}
            {role === 'e.employee' && renderEEmployeeStats()}

            {/* Common stats for all roles */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm md:text-base text-gray-500">Pending Tasks</p>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.pendingNotifications}</h3>
                </div>
                <Bell className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
              </div>
            </div>

            {(role === 'e.employee' || role === 'employee') && (
              <>
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm md:text-base text-gray-500">Site Visits</p>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalSiteVisits}</h3>
                    </div>
                    <CalendarCheck className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm md:text-base text-gray-500">Total PO's</p>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalpos}</h3>
                    </div>
                    <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Recent Activity */}
          <div className={`grid ${
            isMobile ? 'grid-cols-1 gap-4' : 
            isTablet ? 'grid-cols-1 lg:grid-cols-2 gap-4' : 
            'grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'
          }`}>
            {role === 'finance.employee' ? (
              renderFinanceRecentActivity()
            ) : (
              <>
                {/* Recent Quotations */}
                {role !== 'finance.employee' && (
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
                      <FileText className="w-4 h-4 md:w-5 md:h-5 mr-2 text-purple-600" />
                      Recent Quotations
                    </h2>
                    <div className="space-y-3 md:space-y-4">
                      {recentQuotations.map((quotation) => (
                        <div key={quotation.id} className="border-b pb-3 md:pb-4 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm md:text-base font-medium text-gray-800">
                                {quotation.clients?.name} - {quotation.clients?.company}
                              </p>
                              <p className="text-xs md:text-sm text-gray-500">
                                Amount: ${quotation.amount}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                quotation.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : quotation.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Site Visits for Employees Only */}
                {(role === 'e.employee' || role === 'employee') && (
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
                      <CalendarCheck className="w-4 h-4 md:w-5 md:h-5 mr-2 text-yellow-600" />
                      Recent Site Visits
                    </h2>
                    <div className="space-y-3 md:space-y-4">
                      {recentSiteVisits.map((visit) => (
                        <div key={visit.id} className="border-b pb-3 md:pb-4 last:border-b-0">
                          <p className="text-sm md:text-base font-medium text-gray-800">
                            {visit.clients?.name} - {visit.clients?.company}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            By: {visit.employees?.full_name}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            Location: {visit.address}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Notifications */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
                    <Bell className="w-4 h-4 md:w-5 md:h-5 mr-2 text-orange-600" />
                    Recent Tasks
                  </h2>
                  <div className="space-y-3 md:space-y-4">
                    {recentNotifications.map((notification) => (
                      <div key={notification.id} className="border-b pb-3 md:pb-4 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm md:text-base font-medium text-gray-800">
                              {notification.title}
                            </p>
                            <p className="text-xs md:text-sm text-gray-500">
                              {notification.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {moment(notification.scheduled_at).format('MMM D, h:mm A')}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              notification.is_delivered
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {notification.is_delivered ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 h-[70vh] min-h-[500px]">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-600" />
            Task Calendar
          </h2>
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: isMobile ? '60vh' : '65vh' }}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            defaultView={isMobile ? Views.AGENDA : Views.MONTH}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => {
              alert(
                `Task: ${event.title}\n\nDescription: ${event.description || 'No description'}\n\nStatus: ${event.isDelivered ? 'Completed' : 'Pending'}\n\nTime: ${moment(event.start).format('MMM D, h:mm A')}`
              );
            }}
          />
        </div>
      )}
    </div>
  );
}