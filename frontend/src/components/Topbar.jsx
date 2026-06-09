import { Bell, Search, Sun, Moon, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
};

const formatToday = () =>
    new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

const Topbar = () => {
    const { user, theme, toggleTheme, aiActive, toggleAi } = useAuth();
    const firstName = user?.name?.split(' ')[0] || '';

    return (
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0">
            <div>
                <div className="text-sm font-semibold text-slate-900 tracking-tight">
                    {greeting()}{firstName && `, ${firstName}`} 👋
                </div>
                <div className="text-xs text-slate-500">{formatToday()}</div>
            </div>

            <div className="flex items-center gap-3">
                {/* Universal AI Toggle Button */}
                <button
                    onClick={toggleAi}
                    title={aiActive ? 'Click to Stop AI' : 'Click to Start AI'}
                    className={`h-9 px-3.5 rounded-full flex items-center gap-2 transition text-xs font-semibold cursor-pointer shadow-xs ${
                        aiActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                >
                    <div className="relative flex h-2 w-2">
                        {aiActive && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${aiActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    </div>
                    <Brain size={14} className={aiActive ? 'animate-pulse' : ''} />
                    <span>{aiActive ? 'AI Agent: Active' : 'AI Agent: Stopped'}</span>
                </button>

                {/* Theme Switcher Button */}
                <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                >
                    {theme === 'dark' ? <Sun size={17} className="text-amber-500" /> : <Moon size={17} />}
                </button>

                <div className="h-6 w-[1px] bg-slate-100"></div>

                <div className="flex items-center gap-1">
                    <button
                        title="Search"
                        className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                    >
                        <Search size={17} />
                    </button>
                    <button
                        title="Notifications"
                        className="relative h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                    >
                        <Bell size={17} />
                        <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
