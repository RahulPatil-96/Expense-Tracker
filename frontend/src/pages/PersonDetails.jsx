import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle,
    Clock,
    Trash2,
    Calendar,
    AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/axios.js';
import { API_PATHS } from '../utils/apiPaths.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency } from '../utils/format.js';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/Spinner.jsx';

const PersonDetails = () => {
    const { name } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const currency = user?.currency || 'INR';

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(API_PATHS.BORROW_LEND.PERSON_DETAILS(name));
            setDetails(res.data);
        } catch (err) {
            console.error('Failed to load person details', err);
            toast.error('Failed to load transaction history');
            navigate('/borrow-lend');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (name) {
            fetchDetails();
        }
    }, [name]);

    const handleToggleStatus = async (tx) => {
        let newStatus = 'PENDING';
        if (tx.status === 'PENDING') {
            newStatus = tx.transaction_type === 'BORROWED' ? 'REPAID' : 'RECEIVED';
        }

        try {
            await api.put(API_PATHS.BORROW_LEND.UPDATE_STATUS(tx.id), { status: newStatus });
            toast.success(`Marked as ${newStatus.toLowerCase()}`);
            fetchDetails();
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
            fetchDetails();
        } catch (err) {
            console.error('Failed to delete record', err);
            toast.error('Failed to delete record');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!details) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <AlertCircle size={40} className="text-slate-300 mb-2" />
                <span>Person record not found.</span>
                <Button onClick={() => navigate('/borrow-lend')} className="mt-4">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    const { summary, transactions } = details;
    const isOwed = summary.netSettlement > 0;
    const isOwes = summary.netSettlement < 0;

    return (
        <div className="space-y-6">
            {/* Header / Back */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/borrow-lend')}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition shrink-0 border border-slate-100 bg-white"
                >
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Settlement Details</span>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{summary.personName}</h1>
                </div>
            </div>

            {/* Split Summary Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Net Settlement Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm md:col-span-1 flex flex-col justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Net Settlement Balance</span>
                        <h2 className={`text-4xl font-bold tracking-tight mt-3 ${summary.netSettlement >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {summary.netSettlement >= 0 ? '+' : ''}{formatCurrency(summary.netSettlement, currency)}
                        </h2>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-sm">
                        {isOwed ? (
                            <p className="text-emerald-700 font-medium flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                                {summary.personName} owes you {formatCurrency(summary.netSettlement, currency)}
                            </p>
                        ) : isOwes ? (
                            <p className="text-rose-700 font-medium flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                                You owe {summary.personName} {formatCurrency(Math.abs(summary.netSettlement), currency)}
                            </p>
                        ) : (
                            <p className="text-slate-500 font-medium flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-slate-400 inline-block" />
                                All settlements completed!
                            </p>
                        )}
                    </div>
                </div>

                {/* Sub-totals Breakdown */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Lent obligations */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <ArrowUpRight size={14} className="text-emerald-600" /> Lent Account
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-400 block">Total Lent</span>
                                <span className="font-semibold text-slate-800 text-sm">{formatCurrency(summary.totalLent, currency)}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block">Total Received</span>
                                <span className="font-semibold text-slate-800 text-sm">{formatCurrency(summary.totalReceived, currency)}</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-50">
                            <span className="text-xs text-slate-400 block">Outstanding Receivable</span>
                            <span className="text-lg font-bold text-slate-900">{formatCurrency(summary.outstandingLent, currency)}</span>
                        </div>
                    </div>

                    {/* Borrowed obligations */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <ArrowDownLeft size={14} className="text-rose-600" /> Borrowed Account
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-400 block">Total Borrowed</span>
                                <span className="font-semibold text-slate-800 text-sm">{formatCurrency(summary.totalBorrowed, currency)}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block">Total Repaid</span>
                                <span className="font-semibold text-slate-800 text-sm">{formatCurrency(summary.totalRepaid, currency)}</span>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-50">
                            <span className="text-xs text-slate-400 block">Outstanding Payable</span>
                            <span className="text-lg font-bold text-slate-900">{formatCurrency(summary.outstandingBorrowed, currency)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-6">Transaction History</h3>

                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
                        <Calendar size={32} className="text-slate-200 mb-2" />
                        <span>No historical transactions recorded.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                                    <th className="pb-4 font-semibold">Type</th>
                                    <th className="pb-4 font-semibold">Date</th>
                                    <th className="pb-4 font-semibold">Description</th>
                                    <th className="pb-4 font-semibold">Status</th>
                                    <th className="pb-4 font-semibold text-right">Amount</th>
                                    <th className="pb-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700 text-sm">
                                {transactions.map((tx) => {
                                    const isLent = tx.transaction_type === 'LENT';
                                    const isPending = tx.status === 'PENDING';
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isLent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                    {isLent ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                                    {isLent ? 'Lent' : 'Borrowed'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-xs text-slate-500">
                                                {new Date(tx.transaction_date).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 font-medium text-slate-900 max-w-[200px] truncate" title={tx.reason}>
                                                {tx.reason || 'No description'}
                                                {tx.notes && <p className="text-[10px] text-slate-400 font-normal mt-0.5 truncate">{tx.notes}</p>}
                                            </td>
                                            <td className="py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isPending ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                                    {isPending ? <Clock size={12} /> : <CheckCircle size={12} />}
                                                    {tx.status}
                                                </span>
                                                {!isPending && tx.settled_at && (
                                                    <span className="text-[9px] text-slate-400 block mt-0.5">
                                                        Settle: {new Date(tx.settled_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`py-4 text-right font-bold text-base ${isLent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {isLent ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                                            </td>
                                            <td className="py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleToggleStatus(tx)}
                                                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                                                            isPending
                                                                ? isLent
                                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                                                        }`}
                                                    >
                                                        {isPending ? 'Settle' : 'Reopen'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tx.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100"
                                                        title="Delete record"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonDetails;
