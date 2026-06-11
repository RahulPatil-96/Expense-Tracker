import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle,
    Clock,
    Search,
    Filter,
    Trash2,
    Sparkles,
    ChevronRight,
    Copy,
    Check,
    X,
    Calendar,
    DollarSign,
    HeartHandshake,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios.js';
import { API_PATHS } from '../utils/apiPaths.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../utils/format.js';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import KpiCard from '../components/KpiCard.jsx';

const getLocalDatetimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const BorrowLend = () => {
    const { user, aiActive } = useAuth();
    const currency = user?.currency || 'INR';
    const navigate = useNavigate();

    // Data states
    const [summary, setSummary] = useState({
        totalBorrowed: 0,
        totalLent: 0,
        outstandingBorrowed: 0,
        outstandingLent: 0,
        pendingSettlementsCount: 0,
        completedSettlementsCount: 0,
    });
    const [people, setPeople] = useState([]);
    const [transactions, setTransactions] = useState([]);

    // Loading states
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingPeople, setLoadingPeople] = useState(true);
    const [loadingTx, setLoadingTx] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        personName: '',
        type: '',
        status: '',
        startDate: '',
        endDate: '',
    });

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        transaction_type: 'LENT',
        person_name: '',
        amount: '',
        reason: '',
        transaction_date: getLocalDatetimeString(),
        notes: '',
    });

    // AI Insight states
    const [insights, setInsights] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    const fetchData = async () => {
        setLoadingSummary(true);
        setLoadingPeople(true);
        setLoadingTx(true);

        try {
            const [sumRes, peopleRes] = await Promise.all([
                api.get(API_PATHS.BORROW_LEND.SUMMARY),
                api.get(API_PATHS.BORROW_LEND.PEOPLE),
            ]);
            setSummary(sumRes.data);
            setPeople(peopleRes.data);
        } catch (err) {
            console.error('Failed to load borrow & lend summary data', err);
            toast.error('Failed to load overview data');
        } finally {
            setLoadingSummary(false);
            setLoadingPeople(false);
        }

        await fetchTransactions();
    };

    const fetchTransactions = async () => {
        setLoadingTx(true);
        try {
            const params = {};
            if (filters.personName) params.personName = filters.personName;
            if (filters.type) params.type = filters.type;
            if (filters.status) params.status = filters.status;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const res = await api.get(API_PATHS.BORROW_LEND.LIST, { params });
            setTransactions(res.data);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
            toast.error('Failed to filter transactions');
        } finally {
            setLoadingTx(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch transactions when filters change
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchTransactions();
        }, 300); // 300ms debounce
        return () => clearTimeout(delayDebounce);
    }, [filters]);

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!form.person_name || !form.amount) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(API_PATHS.BORROW_LEND.CREATE, {
                ...form,
                amount: parseFloat(form.amount),
            });
            toast.success('Record added successfully');
            setModalOpen(false);
            // Reset form
            setForm({
                transaction_type: 'LENT',
                person_name: '',
                amount: '',
                reason: '',
                transaction_date: getLocalDatetimeString(),
                notes: '',
            });
            fetchData();
        } catch (err) {
            console.error('Failed to create record', err);
            toast.error(err.response?.data?.message || 'Failed to create record');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (tx) => {
        let newStatus = 'PENDING';
        if (tx.status === 'PENDING') {
            newStatus = tx.transaction_type === 'BORROWED' ? 'REPAID' : 'RECEIVED';
        }

        try {
            await api.put(API_PATHS.BORROW_LEND.UPDATE_STATUS(tx.id), { status: newStatus });
            toast.success(`Marked as ${newStatus.toLowerCase()}`);
            fetchData();
        } catch (err) {
            console.error('Failed to update status', err);
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            await api.delete(API_PATHS.BORROW_LEND.DELETE(id));
            toast.success('Record deleted');
            fetchData();
        } catch (err) {
            console.error('Failed to delete record', err);
            toast.error('Failed to delete record');
        }
    };

    const generateAiInsights = async () => {
        setAnalyzing(true);
        setInsights(null);
        try {
            const res = await api.get(API_PATHS.BORROW_LEND.INSIGHTS);
            setInsights(res.data);
            toast.success('Insights generated!');
        } catch (err) {
            console.error('Failed to generate insights', err);
            toast.error('Failed to generate AI insights');
        } finally {
            setAnalyzing(false);
        }
    };

    const copyToClipboard = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        toast.success('Reminder copied to clipboard!');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const netOutstanding = summary.outstandingLent - summary.outstandingBorrowed;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Borrow & Lend Tracker</h1>
                    <p className="text-sm text-slate-500 mt-1.5">Manage money details of who owes you and who you owe</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={generateAiInsights}
                        disabled={analyzing || transactions.length === 0 || !aiActive}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm dark:border-slate-800 dark:bg-slate-900"
                        title={!aiActive ? 'AI Engine is offline. Enable it in the topbar to use insights.' : 'Generate AI Insights'}
                    >
                        {analyzing ? <Spinner size="sm" /> : <Sparkles size={14} className={aiActive ? "text-violet-500" : "text-slate-400"} />}
                        {analyzing ? 'Analyzing...' : !aiActive ? 'AI Offline' : 'AI Insights'}
                    </button>
                    <Button onClick={() => setModalOpen(true)} className="rounded-full shadow-md shadow-violet-500/20">
                        <Plus size={16} /> Add Record
                    </Button>
                </div>
            </div>

            {/* KPI Section */}
            {loadingSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-pulse">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-32 bg-white rounded-3xl border border-slate-100" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Net Position Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                        <div className="absolute right-4 top-4 h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <HeartHandshake size={22} />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Position</span>
                            <h3 className={`text-3xl font-bold tracking-tight mt-2 ${netOutstanding >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {netOutstanding >= 0 ? '+' : ''}{formatCurrency(netOutstanding, currency)}
                            </h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500">
                            {netOutstanding >= 0 ? (
                                <span className="text-emerald-600 font-medium">People owe you more than you owe them</span>
                            ) : (
                                <span className="text-rose-600 font-medium">You owe more than people owe you</span>
                            )}
                        </div>
                    </div>

                    {/* Outstanding Receivables Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                        <div className="absolute right-4 top-4 h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <ArrowUpRight size={22} />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lent (To Receive)</span>
                            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-2">
                                {formatCurrency(summary.outstandingLent, currency)}
                            </h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500 flex justify-between">
                            <span>Total Lent: {formatCurrency(summary.totalLent, currency)}</span>
                            <span className="font-semibold text-emerald-600">{summary.pendingSettlementsCount} pending</span>
                        </div>
                    </div>

                    {/* Outstanding Payables Card */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
                        <div className="absolute right-4 top-4 h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <ArrowDownLeft size={22} />
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Borrowed (To Repay)</span>
                            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mt-2">
                                {formatCurrency(summary.outstandingBorrowed, currency)}
                            </h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500 flex justify-between">
                            <span>Total Borrowed: {formatCurrency(summary.totalBorrowed, currency)}</span>
                            <span className="font-semibold text-rose-600">{summary.completedSettlementsCount} settled</span>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Insights Display */}
            {insights && (
                <div className="bg-linear-to-r from-violet-500 to-indigo-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <button 
                        onClick={() => setInsights(null)} 
                        className="absolute right-4 top-4 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition"
                    >
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                            <Sparkles size={16} className="text-amber-300" />
                        </div>
                        <h4 className="font-bold text-lg">AI Financial Helper Insights</h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <p className="text-sm text-indigo-50 leading-relaxed font-medium">
                                {insights.summary}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {insights.topDebtor && (
                                    <div className="bg-white/10 rounded-2xl p-4">
                                        <span className="text-xs text-indigo-200 block">Top Debtor (Owes you most)</span>
                                        <span className="font-bold text-base mt-1 block">{insights.topDebtor}</span>
                                    </div>
                                )}
                                {insights.topLender && (
                                    <div className="bg-white/10 rounded-2xl p-4">
                                        <span className="text-xs text-indigo-200 block">Top Lender (You owe most)</span>
                                        <span className="font-bold text-base mt-1 block">{insights.topLender}</span>
                                    </div>
                                )}
                            </div>
                            {insights.recommendations?.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Recommendations</h5>
                                    <ul className="text-xs space-y-1.5 text-indigo-50 list-disc list-inside">
                                        {insights.recommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {insights.reminders?.length > 0 && (
                            <div className="bg-white/10 rounded-2xl p-4 flex flex-col justify-between">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-200 mb-3">Quick Reminder Templates</h5>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                    {insights.reminders.map((rem, i) => (
                                        <div key={i} className="bg-white/10 rounded-xl p-3 text-xs space-y-2 relative group">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-white">{rem.person}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${rem.type === 'LENT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                                    {rem.type === 'LENT' ? 'Owes you' : 'You owe'} {formatCurrency(rem.amount, currency)}
                                                </span>
                                            </div>
                                            <p className="text-indigo-100 italic">"{rem.message}"</p>
                                            <button
                                                onClick={() => copyToClipboard(rem.message, i)}
                                                className="absolute right-2 bottom-2 p-1 bg-white/20 hover:bg-white/40 text-white rounded transition opacity-0 group-hover:opacity-100"
                                                title="Copy template"
                                            >
                                                {copiedIndex === i ? <Check size={12} /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Layout Split: People summary and transactions history */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: People Summary */}
                <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Person-wise Settlement</h3>
                    
                    {loadingPeople ? (
                        <div className="space-y-3 flex-1">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-14 bg-slate-50 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : people.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
                            <User size={32} className="text-slate-300 mb-2" />
                            <span>No contacts recorded.</span>
                        </div>
                    ) : (
                        <div className="space-y-2 flex-1 overflow-y-auto max-h-125 pr-1">
                            {people.map((p) => {
                                const isOwed = p.netSettlement > 0;
                                const isOwes = p.netSettlement < 0;
                                return (
                                    <div
                                        key={p.personName}
                                        onClick={() => navigate(`/borrow-lend/person/${p.personName}`)}
                                        className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                <User size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-semibold text-slate-800 truncate block text-sm">{p.personName}</span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    L: {formatCurrency(p.outstandingLent, currency)} · B: {formatCurrency(p.outstandingBorrowed, currency)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {isOwed ? (
                                                <span className="text-xs font-bold text-emerald-600 block">
                                                    Owes you {formatCurrency(p.netSettlement, currency)}
                                                </span>
                                            ) : isOwes ? (
                                                <span className="text-xs font-bold text-rose-600 block">
                                                    You owe {formatCurrency(Math.abs(p.netSettlement), currency)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 block">
                                                    Settled
                                                </span>
                                            )}
                                            <span className="text-[9px] text-slate-400 flex items-center justify-end gap-0.5 mt-0.5">
                                                History <ChevronRight size={10} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right side: Filterable Transactions */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="font-bold text-lg text-slate-900">Transaction History</h3>
                        
                        {/* Filters Panel */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search person..."
                                    value={filters.personName}
                                    onChange={(e) => setFilters({ ...filters, personName: e.target.value })}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-transparent hover:bg-slate-100 focus:bg-white focus:border-slate-200 rounded-xl focus:outline-none transition w-36"
                                />
                            </div>

                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="px-2 py-1.5 text-xs bg-slate-50 border border-transparent rounded-xl focus:outline-none hover:bg-slate-100 cursor-pointer"
                            >
                                <option value="">All Types</option>
                                <option value="LENT">Lent</option>
                                <option value="BORROWED">Borrowed</option>
                            </select>

                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="px-2 py-1.5 text-xs bg-slate-50 border border-transparent rounded-xl focus:outline-none hover:bg-slate-100 cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="SETTLED">Settled</option>
                            </select>

                            {(filters.personName || filters.type || filters.status || filters.startDate || filters.endDate) && (
                                <button
                                    onClick={() => setFilters({ personName: '', type: '', status: '', startDate: '', endDate: '' })}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition"
                                    title="Clear filters"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {loadingTx ? (
                        <div className="space-y-4 py-8">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400">
                            <Clock size={40} className="text-slate-200 mb-2" />
                            <span>No records found matching criteria.</span>
                        </div>
                    ) : (
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-125 pr-1">
                            {transactions.map((tx) => {
                                const isLent = tx.transaction_type === 'LENT';
                                const isPending = tx.status === 'PENDING';
                                return (                                    <div
                                        key={tx.id}
                                        className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 dark:border-slate-800"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${isLent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                {isLent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-slate-800 text-sm truncate dark:text-white">{tx.person_name}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${isPending ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                                        {isPending ? <Clock size={10} /> : <CheckCircle size={10} />}
                                                        {tx.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 truncate">
                                                    {tx.reason || 'No description'}
                                                </p>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                                    <Calendar size={10} />
                                                    {new Date(tx.transaction_date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2.5 sm:pt-0 border-t border-slate-50 sm:border-0 dark:border-slate-800">
                                            <div className="text-left sm:text-right">
                                                <span className={`font-bold block text-base ${isLent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {isLent ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleToggleStatus(tx)}
                                                    className={`px-3 py-1.5 rounded-xl border transition text-xs font-semibold cursor-pointer ${
                                                        isPending
                                                            ? isLent
                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                                                    }`}
                                                    title={isPending ? (isLent ? 'Mark as Received' : 'Mark as Repaid') : 'Mark as Pending'}
                                                >
                                                    {isPending ? 'Settle' : 'Reopen'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tx.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100 cursor-pointer"
                                                    title="Delete transaction"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Transaction Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Add Borrow/Lend Record"
            >
                <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, transaction_type: 'LENT' })}
                            className={`py-3.5 rounded-2xl font-semibold text-sm border-2 transition flex flex-col items-center gap-1 ${
                                form.transaction_type === 'LENT'
                                    ? 'bg-emerald-50/50 border-emerald-500 text-emerald-700'
                                    : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <ArrowUpRight size={18} />
                            Lent Money
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, transaction_type: 'BORROWED' })}
                            className={`py-3.5 rounded-2xl font-semibold text-sm border-2 transition flex flex-col items-center gap-1 ${
                                form.transaction_type === 'BORROWED'
                                    ? 'bg-rose-50/50 border-rose-500 text-rose-700'
                                    : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <ArrowDownLeft size={18} />
                            Borrowed Money
                        </button>
                    </div>

                    <Input
                        label="Person Name"
                        required
                        value={form.person_name}
                        onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                        placeholder="Who is this with?"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label={`Amount (${currency})`}
                            required
                            type="number"
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            placeholder="0.00"
                        />
                        <Input
                            label="Transaction Date & Time"
                            type="datetime-local"
                            required
                            value={form.transaction_date}
                            onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Reason / Description"
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        placeholder="e.g., Lunch bill, cab fare, loan"
                    />

                    <Textarea
                        label="Notes (Optional)"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Add any additional context here..."
                        rows={3}
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Adding...' : 'Add Record'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default BorrowLend;
