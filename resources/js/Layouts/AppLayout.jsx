import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

export default function AppLayout({ title = 'Helpdesk', children, onOpenCreateTicket = null }) {
    const { auth, flash, url, slaAlerts } = usePage().props;
    const user = auth?.user;
    const isAdmin = user?.role === 'admin';
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isSlaDropdownOpen, setIsSlaDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMasterDropdownOpen, setIsMasterDropdownOpen] = useState(false);
    const [isMobileMasterOpen, setIsMobileMasterOpen] = useState(true);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : (url || '');
    const isDashboardActive = isAdmin ? currentPath === '/admin/dashboard' : currentPath === '/dashboard';
    const isRoomBookingsActive = isAdmin ? currentPath.startsWith('/admin/room-bookings') : currentPath.startsWith('/room-bookings');
    const isLogsActive = currentPath.startsWith('/admin/logs');
    const isMasterActive = currentPath.startsWith('/admin/master');

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // SLA Desktop & Toast Notification
    useEffect(() => {
        if (isAdmin && (slaAlerts?.urgent_count || 0) > 0) {
            const firstUrgent = slaAlerts.tickets?.[0];
            if (firstUrgent) {
                const alertKey = `sla_alert_${firstUrgent.id}_${firstUrgent.sla?.status}`;
                if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(alertKey)) {
                    sessionStorage.setItem(alertKey, '1');
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification('⚠️ Peringatan SLA Helpdesk', {
                            body: `Tiket ${firstUrgent.ticket_number}: ${firstUrgent.subject} (${firstUrgent.sla?.status_label})`,
                            icon: '/logo.png',
                        });
                    }
                }
            }
        }
    }, [isAdmin, slaAlerts?.urgent_count]);

    const requestNotificationPermission = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
                toast.success('Izin notifikasi desktop aktif untuk batas waktu SLA.');
            } else {
                toast.error('Izin notifikasi desktop ditolak oleh browser.');
            }
        }
    };

    const handleLogout = (e) => {
        if (e) e.preventDefault();
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Head title={title} />

            {/* Top Navigation */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 xl:px-16">
                    <div className="relative flex items-center justify-between h-16">
                        {/* Left: Logo (Using official logo.png) */}
                        <div className="flex items-center shrink-0">
                            <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-3.5 group">
                                <img
                                    src="/images/logo.png"
                                    alt="Helpdesk Lite"
                                    className="h-10 sm:h-11 w-auto object-contain group-hover:scale-105 transition-transform shrink-0"
                                />
                                <div className="hidden sm:block border-l border-slate-200 pl-3.5 py-0.5">
                                    <span className="block text-xs font-bold text-slate-800 leading-tight">
                                        {isAdmin ? 'Admin Workspace' : 'Portal Layanan Tiket'}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 font-medium tracking-wide">
                                        RS Antam Medika
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Center: Desktop Nav Items (Centered, Tanpa Icon, Tanpa Background Hover) */}
                        <nav className="hidden md:flex items-center justify-center gap-8 lg:gap-10 absolute left-1/2 -translate-x-1/2">
                            {isAdmin ? (
                                <>
                                    {/* 1. Dashboard */}
                                    <Link
                                        href="/admin/dashboard"
                                        className={`text-sm font-semibold transition-colors py-1 ${
                                            isDashboardActive
                                                ? 'text-brand-600 font-bold'
                                                : 'text-slate-600 hover:text-brand-600'
                                        }`}
                                    >
                                        Dashboard
                                    </Link>

                                    {/* 2. Peminjaman Ruangan */}
                                    <Link
                                        href="/admin/room-bookings"
                                        className={`text-sm font-semibold transition-colors py-1 ${
                                            isRoomBookingsActive
                                                ? 'text-brand-600 font-bold'
                                                : 'text-slate-600 hover:text-brand-600'
                                        }`}
                                    >
                                        Peminjaman Ruangan
                                    </Link>

                                    {/* 3. Log */}
                                    <Link
                                        href="/admin/logs"
                                        className={`text-sm font-semibold transition-colors py-1 ${
                                            isLogsActive
                                                ? 'text-brand-600 font-bold'
                                                : 'text-slate-600 hover:text-brand-600'
                                        }`}
                                    >
                                        Log
                                    </Link>

                                    {/* 3. Master Data Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMasterDropdownOpen(!isMasterDropdownOpen);
                                                setIsProfileMenuOpen(false);
                                            }}
                                            className={`text-sm font-semibold transition-colors py-1 flex items-center gap-1.5 ${
                                                isMasterActive || isMasterDropdownOpen
                                                    ? 'text-brand-600 font-bold'
                                                    : 'text-slate-600 hover:text-brand-600'
                                            }`}
                                        >
                                            <span>Master Data</span>
                                            <Icon
                                                icon="ph:caret-down-bold"
                                                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                                    isMasterDropdownOpen ? 'rotate-180 text-brand-600' : ''
                                                }`}
                                            />
                                        </button>

                                        {/* Dropdown Menu Box */}
                                        {isMasterDropdownOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={() => setIsMasterDropdownOpen(false)}
                                                />
                                                <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="px-3 py-1.5 mb-1 border-b border-slate-100 flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pusat Data Master</span>
                                                        <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-bold">5 Modul</span>
                                                    </div>

                                                    <div className="space-y-0.5">
                                                        <Link
                                                            href="/admin/master/rooms"
                                                            onClick={() => setIsMasterDropdownOpen(false)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                                                currentPath.startsWith('/admin/master/rooms')
                                                                    ? 'bg-brand-50 text-brand-700 font-bold'
                                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                                                <Icon icon="ph:door-bold" className="w-4 h-4" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="leading-tight truncate">Master Ruangan</p>
                                                                <p className="text-[10px] text-slate-400 font-normal truncate">Ruang rapat & fasilitas</p>
                                                            </div>
                                                        </Link>

                                                        <Link
                                                            href="/admin/master/categories"
                                                            onClick={() => setIsMasterDropdownOpen(false)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                                                currentPath.startsWith('/admin/master/categories')
                                                                    ? 'bg-brand-50 text-brand-700 font-bold'
                                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <Icon icon="ph:folder-notch-open-bold" className="w-4 h-4" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="leading-tight truncate">Master Kategori</p>
                                                                <p className="text-[10px] text-slate-400 font-normal truncate">Kategori & topik tiket</p>
                                                            </div>
                                                        </Link>

                                                        <Link
                                                            href="/admin/master/urgencies"
                                                            onClick={() => setIsMasterDropdownOpen(false)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                                                currentPath.startsWith('/admin/master/urgencies')
                                                                    ? 'bg-brand-50 text-brand-700 font-bold'
                                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                                                <Icon icon="ph:siren-bold" className="w-4 h-4" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="leading-tight truncate">Master Urgensi</p>
                                                                <p className="text-[10px] text-slate-400 font-normal truncate">Prioritas & SLA jam</p>
                                                            </div>
                                                        </Link>

                                                        <Link
                                                            href="/admin/master/units"
                                                            onClick={() => setIsMasterDropdownOpen(false)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                                                currentPath.startsWith('/admin/master/units')
                                                                    ? 'bg-brand-50 text-brand-700 font-bold'
                                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                                                                <Icon icon="ph:buildings-bold" className="w-4 h-4" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="leading-tight truncate">Master Unit</p>
                                                                <p className="text-[10px] text-slate-400 font-normal truncate">Unit kerja & ruangan</p>
                                                            </div>
                                                        </Link>

                                                        <Link
                                                            href="/admin/master/users"
                                                            onClick={() => setIsMasterDropdownOpen(false)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                                                currentPath.startsWith('/admin/master/users')
                                                                    ? 'bg-brand-50 text-brand-700 font-bold'
                                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                        >
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                                <Icon icon="ph:users-three-bold" className="w-4 h-4" />
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="leading-tight truncate">Master Pengguna</p>
                                                                <p className="text-[10px] text-slate-400 font-normal truncate">Admin & sinkronisasi</p>
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/dashboard"
                                        className={`text-sm font-semibold transition-colors py-1 ${
                                            isDashboardActive
                                                ? 'text-brand-600 font-bold'
                                                : 'text-slate-600 hover:text-brand-600'
                                        }`}
                                    >
                                        Tiket Bantuan
                                    </Link>

                                    <Link
                                        href="/room-bookings"
                                        className={`text-sm font-semibold transition-colors py-1 flex items-center gap-1.5 ${
                                            isRoomBookingsActive
                                                ? 'text-brand-600 font-bold'
                                                : 'text-slate-600 hover:text-brand-600'
                                        }`}
                                    >
                                        <span>Peminjaman Ruangan</span>
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                                            Booking
                                        </span>
                                    </Link>
                                </>
                            )}
                        </nav>

                        {/* Right Section */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            {!isAdmin && onOpenCreateTicket && (
                                <button
                                    type="button"
                                    onClick={onOpenCreateTicket}
                                    className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-brand-500/20 active:scale-98 transition-all"
                                >
                                    <Icon icon="ph:plus-bold" className="w-4 h-4" />
                                    <span>Buat Tiket Baru</span>
                                </button>
                            )}

                            {/* SLA Alert Notification Bell for Admin */}
                            {isAdmin && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSlaDropdownOpen(!isSlaDropdownOpen);
                                            setIsProfileMenuOpen(false);
                                            setIsMasterDropdownOpen(false);
                                        }}
                                        className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
                                            (slaAlerts?.urgent_count || 0) > 0
                                                ? (slaAlerts?.overdue_count > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700')
                                                : 'border-slate-200/80 hover:bg-slate-50 text-slate-600'
                                        }`}
                                        title="Peringatan Tenggat Waktu SLA"
                                    >
                                        <Icon
                                            icon="ph:bell-ringing-bold"
                                            className={`w-5 h-5 ${
                                                (slaAlerts?.urgent_count || 0) > 0
                                                    ? (slaAlerts?.overdue_count > 0 ? 'text-rose-600 animate-wiggle' : 'text-amber-600')
                                                    : 'text-slate-500'
                                            }`}
                                        />
                                        {(slaAlerts?.urgent_count || 0) > 0 && (
                                            <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center ring-2 ring-white ${
                                                slaAlerts?.overdue_count > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
                                            }`}>
                                                {slaAlerts.urgent_count}
                                            </span>
                                        )}
                                    </button>

                                    {/* SLA Dropdown Panel */}
                                    {isSlaDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsSlaDropdownOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white p-3.5 shadow-xl border border-slate-200 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <Icon icon="ph:timer-bold" className="w-4 h-4 text-brand-600" />
                                                        <span className="text-xs font-bold text-slate-900">Pengingat Batas Waktu</span>
                                                    </div>
                                                    {(slaAlerts?.urgent_count || 0) > 0 ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            slaAlerts.overdue_count > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {slaAlerts.urgent_count} Perlu Tindakan
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                                            Aman
                                                        </span>
                                                    )}
                                                </div>

                                                {/* List of urgent tickets */}
                                                <div className="max-h-72 overflow-y-auto space-y-1.5">
                                                    {(slaAlerts?.tickets || []).length === 0 ? (
                                                        <div className="py-5 px-3 text-center text-xs text-slate-500">
                                                            Belum ada tiket yang mendekati atau melewati batas waktu.
                                                        </div>
                                                    ) : (
                                                        slaAlerts.tickets.map((t) => (
                                                            <Link
                                                                key={t.id}
                                                                href={`/admin/dashboard?search=${encodeURIComponent(t.ticket_number)}`}
                                                                onClick={() => setIsSlaDropdownOpen(false)}
                                                                className={`block p-2.5 rounded-xl border transition ${
                                                                    t.sla?.is_overdue
                                                                        ? 'bg-rose-50/50 border-rose-200/80 hover:bg-rose-50'
                                                                        : 'bg-amber-50/40 border-amber-200/70 hover:bg-amber-50/70'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                                    <span className="font-mono text-xs font-bold text-slate-900">
                                                                        {t.ticket_number}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        t.sla?.is_overdue
                                                                            ? 'bg-rose-100 text-rose-800'
                                                                            : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                        {t.sla?.status_label}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs font-semibold text-slate-800 truncate">{t.subject}</p>
                                                                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                                                    <span className="truncate">{t.reporter_name} ({t.reporter_unit})</span>
                                                                    <span className="font-medium text-slate-500 shrink-0">Batas: {t.sla?.deadline_at}</span>
                                                                </div>
                                                            </Link>
                                                        ))
                                                    )}
                                                </div>

                                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                                    <Link
                                                        href="/admin/dashboard"
                                                        onClick={() => setIsSlaDropdownOpen(false)}
                                                        className="text-brand-600 font-bold hover:underline"
                                                    >
                                                        Buka Dashboard &rarr;
                                                    </Link>
                                                    {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                                                        <button
                                                            type="button"
                                                            onClick={requestNotificationPermission}
                                                            className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 transition"
                                                        >
                                                            Aktifkan notifikasi
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* User Profile Pill */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileMenuOpen(!isProfileMenuOpen);
                                        setIsMasterDropdownOpen(false);
                                    }}
                                    className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition"
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                                            {user?.name || 'Pengguna'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            {user?.unit ? `${user.unit}` : (isAdmin ? 'Admin' : 'User')}
                                        </p>
                                    </div>
                                    <img
                                        src={user?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0D9488&color=fff'}
                                        alt={user?.name || 'User'}
                                        className="w-8 h-8 rounded-lg object-cover ring-2 ring-brand-500/30"
                                    />
                                    <Icon icon="ph:caret-down-bold" className="w-3.5 h-3.5 text-slate-400" />
                                </button>

                                {/* Dropdown Menu */}
                                {isProfileMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-20 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                                    Role: {isAdmin ? 'Admin' : 'User'}
                                                </div>
                                            </div>

                                            {user?.unit && (
                                                <div className="px-3 py-1.5 text-[11px] text-slate-500">
                                                    <p className="font-semibold text-slate-700">Unit / Bagian:</p>
                                                    <p>{user.unit} {user.sub_unit ? `• ${user.sub_unit}` : ''}</p>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 rounded-xl hover:bg-rose-50 transition text-left"
                                            >
                                                <Icon icon="ph:sign-out-bold" className="w-4 h-4" />
                                                <span>Keluar (Logout)</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile Menu Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
                            >
                                <Icon icon={isMobileMenuOpen ? 'ph:x-bold' : 'ph:list-bold'} className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Drawer */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
                        {isAdmin ? (
                            <>
                                <Link
                                    href="/admin/dashboard"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-xl text-xs font-bold transition ${
                                        isDashboardActive ? 'text-brand-600 font-bold' : 'text-slate-700 hover:text-brand-600'
                                    }`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/admin/room-bookings"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-xl text-xs font-bold transition ${
                                        isRoomBookingsActive ? 'text-brand-600 font-bold' : 'text-slate-700 hover:text-brand-600'
                                    }`}
                                >
                                    Peminjaman Ruangan
                                </Link>
                                <Link
                                    href="/admin/logs"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-xl text-xs font-bold transition ${
                                        isLogsActive ? 'text-brand-600 font-bold' : 'text-slate-700 hover:text-brand-600'
                                    }`}
                                >
                                    Log
                                </Link>

                                {/* Mobile Master Data Accordion */}
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileMasterOpen(!isMobileMasterOpen)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                                            isMasterActive ? 'text-brand-600 font-bold' : 'text-slate-700 hover:text-brand-600'
                                        }`}
                                    >
                                        <span>Master Data</span>
                                        <Icon
                                            icon="ph:caret-down-bold"
                                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMobileMasterOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {isMobileMasterOpen && (
                                        <div className="pl-6 pr-2 py-1 space-y-1">
                                            <Link
                                                href="/admin/master/rooms"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                    currentPath.startsWith('/admin/master/rooms')
                                                        ? 'bg-brand-50 text-brand-700 font-bold'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                }`}
                                            >
                                                <Icon icon="ph:door-bold" className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Master Ruangan</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/categories"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                    currentPath.startsWith('/admin/master/categories')
                                                        ? 'bg-brand-50 text-brand-700 font-bold'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                }`}
                                            >
                                                <Icon icon="ph:folder-notch-open-bold" className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Master Kategori</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/urgencies"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                    currentPath.startsWith('/admin/master/urgencies')
                                                        ? 'bg-brand-50 text-brand-700 font-bold'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                }`}
                                            >
                                                <Icon icon="ph:siren-bold" className="w-3.5 h-3.5 text-amber-600" />
                                                <span>Master Urgensi</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/units"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                    currentPath.startsWith('/admin/master/units')
                                                        ? 'bg-brand-50 text-brand-700 font-bold'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                }`}
                                            >
                                                <Icon icon="ph:buildings-bold" className="w-3.5 h-3.5 text-cyan-600" />
                                                <span>Master Unit</span>
                                            </Link>
                                            <Link
                                                href="/admin/master/users"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                    currentPath.startsWith('/admin/master/users')
                                                        ? 'bg-brand-50 text-brand-700 font-bold'
                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                                }`}
                                            >
                                                <Icon icon="ph:users-three-bold" className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>Master Pengguna</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/dashboard"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                                        isDashboardActive ? 'text-brand-600 font-bold' : 'text-slate-700 hover:text-brand-600'
                                    }`}
                                >
                                    <Icon icon="ph:list-bullets-bold" className="w-4 h-4 text-brand-600" />
                                    <span>Tiket Bantuan</span>
                                </Link>

                                <Link
                                    href="/room-bookings"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                                        isRoomBookingsActive ? 'text-brand-600 font-bold' : 'text-slate-700 hover:text-brand-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon icon="ph:door-bold" className="w-4 h-4 text-teal-600" />
                                        <span>Peminjaman Ruangan</span>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                                        Booking
                                    </span>
                                </Link>
                            </>
                        )}
                        {!isAdmin && onOpenCreateTicket && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    onOpenCreateTicket();
                                }}
                                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-xs"
                            >
                                <Icon icon="ph:plus-bold" className="w-4 h-4" />
                                <span>Buat Tiket Baru</span>
                            </button>
                        )}

                        {/* Mobile Logout Option */}
                        <div className="pt-2 mt-2 border-t border-slate-100">
                            <div className="px-3 py-1 mb-1">
                                <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                                <p className="text-[10px] text-slate-500">{user?.email}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                            >
                                <Icon icon="ph:sign-out-bold" className="w-4 h-4" />
                                <span>Keluar (Logout)</span>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 py-6 sm:py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200/80 bg-white py-4 px-6 sm:px-10 lg:px-12 xl:px-16 text-center text-xs text-slate-400">
                <p>Helpdesk Lite &copy; 2026. Terhubung secara terpusat dengan Helpdesk RSAM API.</p>
            </footer>
        </div>
    );
}
