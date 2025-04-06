import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Plus, Users, Building2, Phone, Mail, Calendar } from 'lucide-react';

export default function ClientsHistoryProfile() {
    const { id } = useParams<{ id: string }>();
    const [client, setClient] = useState<any>(null);
    const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [quotations, setQuotations] = useState<any[]>([]);
    const [siteVisits, setSiteVisits] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const user = useStore((state) => state.user);

    useEffect(() => {
        if (id) {
            loadClientData();
            loadAssets();
        }
    }, [id]);

    async function loadClientData() {
        // Load client details
        const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();

        setClient(clientData);

        // Load contact persons
        const { data: contactData } = await supabase
            .from('contact_persons')
            .select('*')
            .eq('client_id', id)
            .order('created_at', { ascending: false });

        setContactPersons(contactData || []);

        // Load quotations
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

        // Load site visits
        const { data: visitData } = await supabase
            .from('site_visits')
            .select(`
                *,
                employees (
                    full_name
                ),
                site_visit_assets (
                    asset_id,
                    quantity,
                    assets (
                        item
                    )
                )
            `)
            .eq('client_id', id)
            .order('created_at', { ascending: false });

        setSiteVisits(visitData || []);
    }

    async function loadAssets() {
        const { data } = await supabase
            .from('assets')
            .select('*')
            .order('item');
        
        setAssets(data || []);
    }

    if (!client) return null;

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
                </div>
            </div>

            {/* Contact Persons */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Persons</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contactPersons.map((contact) => (
                        <div
                            key={contact.id}
                            className="border rounded-lg p-4"
                        >
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
                        </div>
                    ))}
                </div>
            </div>

            {/* Quotations */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Quotations</h2>
                <div className="space-y-4">
                    {quotations.map((quotation) => (
                        <div
                            key={quotation.id}
                            className="border rounded-lg p-4"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        Amount: ${quotation.amount}
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        By: {quotation.employees.full_name}
                                    </p>
                                    <p className="text-gray-500 text-sm">
                                        {quotation.description}
                                    </p>
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
                                <div className="flex flex-col gap-2">
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
                        </div> ))}
                </div>
            </div>

            {/* Site Visits */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Site Visits</h2>
                <div className="space-y-4">
                    {siteVisits.map((visit) => (
                        <div
                            key={visit.id}
                            className="border rounded-lg p-4"
                        >
                            <div className="flex justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {visit.address}
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        By: {visit.employees.full_name}
                                    </p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        {visit.notes}
                                    </p>
                                    <div className="mt-2">
                                        <p className="text-sm font-medium text-gray-700">Assets Used:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-600">
                                            {visit.site_visit_assets.map((asset: any) => (
                                                <li key={asset.asset_id}>
                                                    {asset.assets.item} (Qty: {asset.quantity})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-2">
                                        Exit Location: {visit.exit_location}
                                    </p>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {new Date(visit.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}