
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { CrmContext } from '../App';
import { Lead, LeadStatus } from '../types';
import Modal from './Modal';
import { PlusCircleIcon, PencilIcon, TrashIcon, XIcon, CalendarIcon, AlertTriangleIcon, ChevronRightIcon } from './Icons';

const emptyLead: Omit<Lead, 'id' | 'createdAt' | 'referredById'> & { referralCode?: string, followUpDate?: string, followUpNotes?: string } = {
    name: '',
    email: '',
    phone: '',
    source: '',
    status: LeadStatus.New,
    referralCode: '',
    followUpDate: '',
    followUpNotes: '',
};

const getStatusColorClasses = (status: LeadStatus) => {
    switch (status) {
        case LeadStatus.Qualified:
            return {
                bg: 'bg-green-100 dark:bg-green-900/50',
                text: 'text-green-800 dark:text-green-300',
                border: 'border-green-500',
                progress: 'bg-green-500',
            };
        case LeadStatus.Lost:
            return {
                bg: 'bg-red-100 dark:bg-red-900/50',
                text: 'text-red-800 dark:text-red-300',
                border: 'border-red-500',
                progress: 'bg-red-500',
            };
        case LeadStatus.Contacted:
            return {
                bg: 'bg-blue-100 dark:bg-blue-900/50',
                text: 'text-blue-800 dark:text-blue-300',
                border: 'border-blue-500',
                progress: 'bg-blue-500',
            };
        case LeadStatus.New:
            return {
                bg: 'bg-slate-200 dark:bg-slate-700',
                text: 'text-slate-800 dark:text-slate-200',
                border: 'border-slate-500',
                progress: 'bg-slate-500',
            };
        case LeadStatus.Converted:
             return {
                bg: 'bg-slate-100 dark:bg-slate-800',
                text: 'text-slate-500 dark:text-slate-500',
                border: 'border-slate-400',
                progress: 'bg-slate-400',
            };
        default:
            return {
                bg: 'bg-slate-200 dark:bg-slate-700',
                text: 'text-slate-800 dark:text-slate-200',
                border: 'border-slate-500',
                progress: 'bg-slate-500',
            };
    }
};

interface LeadPipelineProps {
    counts: Record<LeadStatus, number>;
    total: number;
    activeFilter: string;
    onFilterChange: (status: LeadStatus) => void;
}

const LeadPipeline: React.FC<LeadPipelineProps> = ({ counts, total, activeFilter, onFilterChange }) => {
    const pipelineStages = [LeadStatus.New, LeadStatus.Contacted, LeadStatus.Qualified, LeadStatus.Lost];
    
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row items-stretch gap-2">
                {pipelineStages.map((stage, index) => {
                    const count = counts[stage] || 0;
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const colors = getStatusColorClasses(stage);
                    const isActive = activeFilter === stage;

                    return (
                        <React.Fragment key={stage}>
                            <button
                                onClick={() => onFilterChange(stage)}
                                className={`
                                    flex-1 p-4 rounded-lg shadow-sm text-left relative overflow-hidden
                                    transition-all duration-200 ease-in-out transform hover:-translate-y-1
                                    ${isActive ? `ring-2 ${colors.border}` : ''}
                                    ${colors.bg}
                                `}
                            >
                                <div className={`font-semibold ${colors.text}`}>{stage}</div>
                                <div className={`text-3xl font-bold mt-1 ${colors.text.replace('text-', 'dark:text-')}`}>{count}</div>
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/10 dark:bg-white/10">
                                    <div 
                                        className={`${colors.progress} h-full rounded-r-full`} 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </button>
                            {index < pipelineStages.length - 1 && (
                                <div className="hidden md:flex items-center justify-center text-slate-300 dark:text-slate-600">
                                    <ChevronRightIcon className="w-6 h-6" />
                                </div>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    );
};


const Leads = () => {
    const context = useContext(CrmContext);
    if (!context) return null;
    const { leads, addLead, updateLead, convertLeadToCustomer, deleteLead, deleteMultipleLeads, viewingItem, clearViewingItem } = context;

    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [viewingLead, setViewingLead] = useState<Lead | null>(null);
    const [formData, setFormData] = useState<typeof emptyLead>(emptyLead);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [leadsToDelete, setLeadsToDelete] = useState<string[]>([]);

    useEffect(() => {
        if (viewingItem?.type === 'lead') {
            const leadToView = leads.find(l => l.id === viewingItem.id);
            if (leadToView) {
                setViewingLead(leadToView);
                setIsDetailModalOpen(true);
                clearViewingItem();
            }
        }
    }, [viewingItem, leads, clearViewingItem]);

    const leadCounts = useMemo(() => {
        const counts: Record<LeadStatus, number> = {
            [LeadStatus.New]: 0,
            [LeadStatus.Contacted]: 0,
            [LeadStatus.Qualified]: 0,
            [LeadStatus.Lost]: 0,
            [LeadStatus.Converted]: 0,
        };
        leads.forEach(lead => {
            counts[lead.status]++;
        });

        // A "Qualified" lead that is converted should still count towards the Qualified pipeline metric.
        counts[LeadStatus.Qualified] += counts[LeadStatus.Converted];

        return counts;
    }, [leads]);

    // Total for pipeline percentage calculation should only include leads in the visible pipeline stages.
    const totalPipelineLeads = leadCounts[LeadStatus.New] + leadCounts[LeadStatus.Contacted] + leadCounts[LeadStatus.Qualified] + leadCounts[LeadStatus.Lost];

    const filteredLeads = useMemo(() => {
        // Filter out converted leads from the main table view as they are now customers.
        let tempLeads = leads.filter(lead => lead.status !== LeadStatus.Converted);
        
        if (searchQuery) {
            tempLeads = tempLeads.filter(lead =>
                lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (statusFilter !== 'all') {
            tempLeads = tempLeads.filter(lead => lead.status === statusFilter);
        }
        return tempLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [leads, searchQuery, statusFilter]);

    const handleOpenAddModal = () => {
        setEditingLead(null);
        setFormData(emptyLead);
        setIsAddEditModalOpen(true);
    };

    const handleOpenEditModal = (lead: Lead) => {
        setEditingLead(lead);
        setFormData({ ...lead, referralCode: ''});
        setIsAddEditModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { referralCode, ...leadData } = formData;
        
        // Ensure empty date string is saved as undefined
        if (leadData.followUpDate === '') {
            leadData.followUpDate = undefined;
        }

        if (editingLead) {
            updateLead(leadData as Lead);
        } else {
            addLead(leadData, referralCode);
        }
        setIsAddEditModalOpen(false);
        setEditingLead(null);
        setFormData(emptyLead);
    };
    
    // Selection Logic
    const handleSelectLead = (leadId: string) => {
        setSelectedLeads(prev => 
            prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
        );
    };

    const handleSelectAllLeads = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLeads(filteredLeads.map(l => l.id));
        } else {
            setSelectedLeads([]);
        }
    };

    // Deletion Logic
    const openConfirmDeleteModal = (ids: string[]) => {
        setLeadsToDelete(ids);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (leadsToDelete.length > 1) {
            deleteMultipleLeads(leadsToDelete);
        } else if (leadsToDelete.length === 1) {
            deleteLead(leadsToDelete[0]);
        }
        setSelectedLeads([]);
        setIsConfirmModalOpen(false);
        setLeadsToDelete([]);
    };

    const renderFollowUpDate = (lead: Lead) => {
        if (!lead.followUpDate) return <span className="text-slate-400">—</span>;

        const today = new Date();
        today.setHours(0,0,0,0);
        const followUpDate = new Date(lead.followUpDate);
        followUpDate.setHours(0,0,0,0); // Compare dates only

        const isOverdue = followUpDate < today;
        const isToday = followUpDate.getTime() === today.getTime();
        
        const formattedDate = new Date(lead.followUpDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        if (isOverdue) {
            return (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold" title={lead.followUpNotes}>
                    <AlertTriangleIcon className="w-4 h-4" />
                    {formattedDate}
                </span>
            );
        }
        if (isToday) {
            return (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold" title={lead.followUpNotes}>
                    <CalendarIcon className="w-4 h-4" />
                    Today
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400" title={lead.followUpNotes}>
                <CalendarIcon className="w-4 h-4" />
                {formattedDate}
            </span>
        );
    };


    return (
        <div className="p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 relative">
                 {selectedLeads.length > 0 ? (
                    <div className="absolute inset-0 bg-brand-light dark:bg-slate-800 flex items-center justify-between px-4 rounded-lg animate-fade-in z-10">
                        <span className="text-sm font-semibold text-brand-primary dark:text-slate-200">{selectedLeads.length} lead(s) selected</span>
                        <div className="flex items-center gap-2">
                           <button onClick={() => openConfirmDeleteModal(selectedLeads)} className="flex items-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                                <TrashIcon className="w-5 h-5" />
                                Delete Selected
                            </button>
                             <button onClick={() => setSelectedLeads([])} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" aria-label="Clear selection">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Leads</h1>
                        <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors">
                            <PlusCircleIcon className="w-5 h-5" />
                            Add Lead
                        </button>
                    </>
                )}
            </div>

            <LeadPipeline 
                counts={leadCounts} 
                total={totalPipelineLeads}
                activeFilter={statusFilter}
                onFilterChange={(status) => setStatusFilter(status)}
            />

            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <input
                    type="search"
                    placeholder="Search leads by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-grow block w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full md:w-auto px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                    <option value="all">All Statuses</option>
                    {Object.values(LeadStatus).filter(s => s !== LeadStatus.Converted).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-800">
                <div className="overflow-x-auto">
                     {leads.length > 0 ? (
                        filteredLeads.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                    <tr>
                                        <th scope="col" className="p-4">
                                            <input 
                                                type="checkbox" 
                                                onChange={handleSelectAllLeads}
                                                checked={selectedLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                                                className="w-4 h-4 text-brand-primary bg-slate-100 border-slate-300 rounded focus:ring-brand-primary dark:focus:ring-brand-primary dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
                                            />
                                        </th>
                                        <th scope="col" className="px-6 py-3">Name</th>
                                        <th scope="col" className="px-6 py-3">Contact</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Follow-up</th>
                                        <th scope="col" className="px-6 py-3">Source</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map(lead => (
                                        <tr key={lead.id} className={`border-b dark:border-slate-700 transition-colors ${selectedLeads.includes(lead.id) ? 'bg-brand-light dark:bg-slate-700' : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>
                                            <td className="p-4">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onChange={() => handleSelectLead(lead.id)}
                                                    className="w-4 h-4 text-brand-primary bg-slate-100 border-slate-300 rounded focus:ring-brand-primary dark:focus:ring-brand-primary dark:ring-offset-slate-800 dark:bg-slate-700 dark:border-slate-600"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{lead.name}</td>
                                            <td className="px-6 py-4">
                                                <div>{lead.email}</div>
                                                <div className="text-slate-400 dark:text-slate-500">{lead.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => updateLead({ ...lead, status: e.target.value as LeadStatus })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    disabled={lead.status === LeadStatus.Converted}
                                                    className={`w-full max-w-[130px] mx-auto cursor-pointer px-2 py-1 text-xs font-semibold border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-brand-primary ${getStatusColorClasses(lead.status).bg} ${getStatusColorClasses(lead.status).text} disabled:cursor-not-allowed disabled:opacity-75`}
                                                >
                                                    {lead.status === LeadStatus.Converted ? (
                                                        <option value={LeadStatus.Converted} className="text-black dark:text-white bg-white dark:bg-slate-800">{LeadStatus.Converted}</option>
                                                    ) : (
                                                        Object.values(LeadStatus).filter(s => s !== LeadStatus.Converted).map(s => <option key={s} value={s} className="text-black dark:text-white bg-white dark:bg-slate-800">{s}</option>)
                                                    )}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">{renderFollowUpDate(lead)}</td>
                                            <td className="px-6 py-4">{lead.source}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {lead.status === LeadStatus.Converted ? (
                                                        <span className="font-medium text-slate-500 dark:text-slate-400">Converted</span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => convertLeadToCustomer(lead)} 
                                                            disabled={lead.status !== LeadStatus.Qualified}
                                                            className="font-medium text-brand-secondary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline">
                                                            Convert
                                                        </button>
                                                    )}
                                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleOpenEditModal(lead)} className="text-slate-400 hover:text-brand-primary transition-colors" aria-label="Edit lead">
                                                          <PencilIcon className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => openConfirmDeleteModal([lead.id])} className="text-slate-400 hover:text-red-600 transition-colors" aria-label="Delete lead">
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <div className="text-center py-16">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Leads Found</h3>
                                <p className="text-slate-500 mt-2 dark:text-slate-400">Your search and filter combination did not return any results.</p>
                            </div>
                        )
                     ) : (
                         <div className="text-center py-16">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No leads in pipeline</h3>
                            <p className="text-slate-500 mt-2 dark:text-slate-400">Click "Add Lead" to get started.</p>
                        </div>
                     )}
                </div>
            </div>
            
            <Modal isOpen={isAddEditModalOpen} onClose={() => setIsAddEditModalOpen(false)} title={editingLead ? "Edit Lead" : "Add New Lead"}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" required />
                        <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                        <input type="text" name="source" placeholder="Lead Source (e.g., Website)" value={formData.source} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                    </div>
                     {!editingLead && (
                        <input type="text" name="referralCode" placeholder="Referral Code (Optional)" value={formData.referralCode} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                    )}
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                        <select name="status" id="status" value={formData.status} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                            {Object.values(LeadStatus).filter(s => s !== LeadStatus.Converted).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="border-t pt-4 dark:border-slate-700">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Follow-up Reminder (Optional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                             <div>
                                <label htmlFor="followUpDate" className="block text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                                <input type="date" name="followUpDate" id="followUpDate" value={formData.followUpDate ? formData.followUpDate.split('T')[0] : ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </div>
                            <div>
                                <label htmlFor="followUpNotes" className="block text-xs font-medium text-slate-500 dark:text-slate-400">Notes</label>
                                <textarea name="followUpNotes" id="followUpNotes" placeholder="e.g., Call about new model" value={formData.followUpNotes || ''} onChange={handleFormChange} rows={1} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-dark transition-colors">{editingLead ? "Save Changes" : "Add Lead"}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Lead Details">
                {viewingLead && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{viewingLead.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{viewingLead.email}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{viewingLead.phone}</p>
                        </div>
                        <div className="border-t pt-4 dark:border-slate-700 grid grid-cols-2 gap-4 text-sm">
                             <p><span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span> {viewingLead.status}</p>
                             <p><span className="font-semibold text-slate-500 dark:text-slate-400">Source:</span> {viewingLead.source}</p>
                             <p><span className="font-semibold text-slate-500 dark:text-slate-400">Created:</span> {new Date(viewingLead.createdAt).toLocaleDateString()}</p>
                        </div>
                        {viewingLead.followUpDate && (
                            <div className="border-t pt-4 dark:border-slate-700 text-sm">
                                <h4 className="font-semibold text-slate-500 dark:text-slate-400">Next Follow-up</h4>
                                <p className="text-slate-800 dark:text-slate-200">{new Date(viewingLead.followUpDate).toLocaleDateString()}</p>
                                {viewingLead.followUpNotes && <p className="mt-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">{viewingLead.followUpNotes}</p>}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Deletion">
                <div>
                    <p className="text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete {leadsToDelete.length} lead(s)? This action cannot be undone.
                    </p>
                    <div className="flex justify-end pt-6 gap-2">
                        <button onClick={() => setIsConfirmModalOpen(false)} className="bg-slate-200 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                            Cancel
                        </button>
                        <button onClick={handleConfirmDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Leads;
