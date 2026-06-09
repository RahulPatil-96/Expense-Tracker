import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRight, Target, HeartHandshake, User, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../lib/axios.js';
import { API_PATHS } from '../utils/apiPaths.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';
import KpiCard from '../components/KpiCard.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart.jsx';
import CategoryBreakdownChart from '../components/charts/CategoryBreakdownChart.jsx';
import Spinner from '../components/Spinner.jsx';

const Dashboard = () => {
    const { user } = useAuth();
    const currency = user?.currency || 'USD';
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [trend, setTrend] = useState([]);
    const [breakdown, setBreakdown] = useState([]);
    const [recent, setRecent] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [borrowLendSummary, setBorrowLendSummary] = useState(null);
    const [borrowLendPeople, setBorrowLendPeople] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [s, t, b, r, bd, blSum, blPeople] = await Promise.all([
                    api.get(API_PATHS.DASHBOARD.SUMMARY),
                    api.get(API_PATHS.DASHBOARD.MONTHLY_TREND),
                    api.get(API_PATHS.DASHBOARD.CATEGORY_BREAKDOWN),
                    api.get(API_PATHS.TRANSACTIONS.LIST, { params: { limit: 5 } }),
                    api.get(API_PATHS.BUDGETS.LIST),
                    api.get(API_PATHS.BORROW_LEND.SUMMARY),
                    api.get(API_PATHS.BORROW_LEND.PEOPLE),
                ]);
                setSummary(s.data);
                setTrend(t.data);
                setBreakdown(b.data);
                setRecent(r.data);
                setBudgets(bd.data);
                setBorrowLendSummary(blSum.data);
                setBorrowLendPeople(blPeople.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const totalSpent = budgets.reduce((sum, b) => sum + parseFloat(b.spent), 0);
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const aggPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const aggColor = aggPct >= 100 ? '#F43F5E' : aggPct >= 70 ? '#F59E0B' : '#10B981';
    const netOutstanding = borrowLendSummary ? (parseFloat(borrowLendSummary.outstandingLent) - parseFloat(borrowLendSummary.outstandingBorrowed)) : 0;

    if (loading || !summary) {
        return (
            <div className="flex justify-center py-16">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1.5">An overview of your finances this month</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Balance"
                    value={formatCurrency(summary.balance, currency)}
                    icon={Wallet}
                    accent="violet"
                />
                <KpiCard
                    label="Income"
                    value={formatCurrency(summary.incomeThisMonth, currency)}
                    delta={summary.incomeDelta}
                    icon={TrendingUp}
                    accent="orange"
                />
                <KpiCard
                    label="Expenses"
                    value={formatCurrency(summary.expenseThisMonth, currency)}
                    delta={summary.expenseDelta}
                    icon={TrendingDown}
                    accent="rose"
                />
                <KpiCard
                    label="Savings Rate"
                    value={`${summary.savingsRate.toFixed(1)}%`}
                    icon={PiggyBank}
                    accent="blue"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Monthly Trend</h2>
                        <p className="text-xs text-slate-500 mt-1">Income vs expenses, last 6 months</p>
                    </div>
                    <MonthlyTrendChart data={trend} currency={currency} />
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Top Categories</h2>
                        <p className="text-xs text-slate-500 mt-1">Spending this month</p>
                    </div>
                    <CategoryBreakdownChart data={breakdown} currency={currency} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Transactions</h2>
                        <Link
                            to="/transactions"
                            className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition"
                        >
                            View all
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                    {recent.length === 0 ? (
                        <p className="text-sm text-slate-500 py-6 text-center">No transactions yet.</p>
                    ) : (
                        <div className="space-y-1">
                            {recent.map((t) => (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <CategoryBadge icon={t.category_icon} color={t.category_color} size="sm" />
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-slate-900 truncate">
                                                {t.description || t.category_name || 'Untitled'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {t.category_name || 'Uncategorized'} · {formatDate(t.transaction_date)}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-sm font-bold shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-orange-500'}`}
                                    >
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Budget Status</h2>
                        <Link
                            to="/budgets"
                            className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition"
                        >
                            View all
                            <ArrowRight size={14} />
                        </Link>
                    </div>

                    {budgets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <Target size={20} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 mb-1">No budgets yet</p>
                            <Link to="/budgets" className="text-xs text-violet-600 font-medium hover:text-violet-700">
                                Create one →
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5">
                                <div className="flex items-baseline justify-between mb-2">
                                    <div>
                                        <div className="text-2xl font-bold tracking-tight text-slate-900">
                                            {formatCurrency(totalSpent, currency)}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            of {formatCurrency(totalBudget, currency)} total
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold" style={{ color: aggColor }}>
                                            {aggPct.toFixed(0)}%
                                        </div>
                                        <div className="text-[10px] text-slate-500">used</div>
                                    </div>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(aggPct, 100)}%`, backgroundColor: aggColor }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {budgets.slice(0, 4).map((b) => {
                                    const spent = parseFloat(b.spent);
                                    const total = parseFloat(b.amount);
                                    const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
                                    const color = pct >= 100 ? '#F43F5E' : pct >= 70 ? '#F59E0B' : '#10B981';
                                    return (
                                        <div key={b.id}>
                                            <div className="flex justify-between items-center text-xs mb-1.5">
                                                <span className="text-slate-700 font-medium truncate">{b.category_name}</span>
                                                <span className="text-slate-500 shrink-0 ml-2 text-[11px]">
                                                    {formatCurrency(spent, currency)} / {formatCurrency(total, currency)}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Borrow & Lend Dashboard Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Overview card */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between dark:border-slate-800">
                    <div>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Borrow & Lend Summary</h2>
                                <p className="text-xs text-slate-500 mt-1">Status of loans and outstanding balances</p>
                            </div>
                            <Link
                                to="/borrow-lend"
                                className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 transition"
                            >
                                Manage
                                <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 hover:bg-slate-100/50 p-4 rounded-2xl border border-slate-100/50 transition flex items-center gap-3 dark:bg-slate-900/50 dark:border-slate-800/50">
                                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 dark:bg-emerald-500/10">
                                    <ArrowUpRight size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lent (To Receive)</span>
                                    <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                                        {formatCurrency(borrowLendSummary?.outstandingLent || 0, currency)}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-50 hover:bg-slate-100/50 p-4 rounded-2xl border border-slate-100/50 transition flex items-center gap-3 dark:bg-slate-900/50 dark:border-slate-800/50">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 dark:bg-rose-500/10">
                                    <ArrowDownLeft size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Borrowed (To Repay)</span>
                                    <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                                        {formatCurrency(borrowLendSummary?.outstandingBorrowed || 0, currency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-xs dark:border-slate-800">
                        <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <HeartHandshake size={14} className="text-slate-400" />
                            Net Outstanding Obligation
                        </span>
                        <span className={`font-bold text-sm ${netOutstanding >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {netOutstanding >= 0 ? '+' : ''}
                            {formatCurrency(netOutstanding, currency)}
                        </span>
                    </div>
                </div>

                {/* Right side: Top active contacts */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-6 dark:border-slate-800">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Contacts</h2>
                            <p className="text-xs text-slate-500 mt-1">Pending balances by person</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">
                            {borrowLendPeople.length} total
                        </span>
                    </div>

                    {borrowLendPeople.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400 dark:bg-slate-900">
                                <User size={20} />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 mb-1">No contacts yet</p>
                            <Link to="/borrow-lend" className="text-xs text-violet-600 font-medium hover:text-violet-700">
                                Add one →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                            {borrowLendPeople.slice(0, 3).map((p) => {
                                const isOwed = p.netSettlement > 0;
                                const isOwes = p.netSettlement < 0;
                                return (
                                    <div
                                        key={p.personName}
                                        onClick={() => navigate(`/borrow-lend/person/${p.personName}`)}
                                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-100 dark:hover:bg-slate-900/40"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 dark:bg-slate-900">
                                                <User size={13} />
                                            </div>
                                            <span className="font-semibold text-slate-800 text-xs truncate">{p.personName}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {isOwed ? (
                                                <span className="text-xs font-bold text-emerald-600 block">
                                                    Owes +{formatCurrency(p.netSettlement, currency)}
                                                </span>
                                            ) : isOwes ? (
                                                <span className="text-xs font-bold text-rose-600 block">
                                                    Owe {formatCurrency(Math.abs(p.netSettlement), currency)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 block">
                                                    Settled
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
