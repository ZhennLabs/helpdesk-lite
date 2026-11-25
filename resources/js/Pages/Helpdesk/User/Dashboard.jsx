import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

export default function UserDashboard({
    tickets: propTickets = [],
    stats = { total: 0, open: 0, in_progress: 0, resolved: 0 },
    categories: propCategories = [],
    urgencies: propUrgencies = [],
    units: propUnits = [],
    filters = {},
}) {
    const tickets = Array.isArray(propTickets) ? propTickets : [];
    const categories = Array.isArray(propCategories) ? propCategories : [];
    const urgencies = Array.isArray(propUrgencies) ? propUrgencies : [];
    const units = Array.isArray(propUnits) ? propUnits : [];
    const { auth } = usePage().props;
    const user = auth?.user;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [categoryFilter, setCategoryFilter] = useState(filters.category_id || '');
    const [urgencyFilter, setUrgencyFilter] = useState(filters.urgency_id || '');

    // Form Buat Tiket Baru
    const {
        data: newTicket,
        setData: setNewTicket,
        post: postTicket,
        processing: submittingTicket,
        errors: ticketErrors,
        reset: resetTicketForm,
    } = useForm({
        subject: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        urgency_id: urgencies.length > 0 ? urgencies[0].id : '',
        unit: user?.unit || '',
        sub_unit: user?.sub_unit || '',
        description: '',
        attachments: [],
    });

    // Form Balas Pesan Tiket
    const {
        data: replyData,
        setData: setReplyData,
        post: postReply,
        processing: submittingReply,
        errors: replyErrors,
        reset: resetReplyForm,
    } = useForm({
        message: '',
        attachments: [],
    });

    const chatEndRef = useRef(null);

    // Auto-scroll ke bawah saat ada pesan baru pada modal chat
    useEffect(() => {
        if (selectedTicket?.messages?.length) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages?.length]);

    // Realtime Reverb: Percakapan Tiket Terbuka
    useEffect(() => {
        if (!selectedTicket || typeof window === 'undefined' || !window.Echo) return;

        const ticketChannel = window.Echo.channel(`ticket.${selectedTicket.id}`);

        ticketChannel.listen('.TicketMessageSent', (e) => {
            if (e?.message && e.message.ticket_id === selectedTicket.id) {
                setSelectedTicket((prev) => {
                    if (!prev || prev.id !== e.message.ticket_id) return prev;
                    const exists = prev.messages?.some((m) => m.id === e.message.id);
                    if (exists) return prev;
                    return {
                        ...prev,
                        messages: [
                            ...(prev.messages || []),
                            {
                                ...e.message,
                                is_me: e.message.user_id === user?.id,
                            },
                        ],
                    };
                });
            }
        });

        ticketChannel.listen('.TicketUpdated', (e) => {
            if (e?.ticketData && e.ticketData.id === selectedTicket.id) {
                setSelectedTicket((prev) => {
                    if (!prev || prev.id !== e.ticketData.id) return prev;
                    return {
                        ...prev,
                        status: e.ticketData.status || prev.status,
                    };
                });
            }
        });

        return () => {
            ticketChannel.stopListening('.TicketMessageSent');
            ticketChannel.stopListening('.TicketUpdated');
        };
    }, [selectedTicket?.id, user?.id]);

    // Realtime Reverb: Notifikasi dan Pembaruan Tiket Pengguna
    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;

        const dashChannel = window.Echo.channel('dashboard-tickets');

        dashChannel.listen('.TicketUpdated', (e) => {
            const isMyTicket = tickets.some((t) => t.id === e?.ticketData?.id) || selectedTicket?.id === e?.ticketData?.id;
            if (isMyTicket && e?.notification) {
                toast.info(e.notification);
            }
            router.reload({
                only: ['tickets', 'stats'],
                preserveScroll: true,
                preserveState: true,
            });
        });

        dashChannel.listen('.TicketMessageSent', (e) => {
            if (e?.message && (!selectedTicket || selectedTicket.id !== e.message.ticket_id)) {
                const isMyTicket = tickets.some((t) => t.id === e.message.ticket_id);
                if (isMyTicket && e.message.user_id !== user?.id) {
                    toast.info(`Tanggapan baru di tiket #${e.message.ticket_id} dari ${e.message.user_name}`, {
                        duration: 3500,
                    });
                }
            }
            router.reload({
                only: ['tickets'],
                preserveScroll: true,
                preserveState: true,
            });
        });

        return () => {
            dashChannel.stopListening('.TicketUpdated');
            dashChannel.stopListening('.TicketMessageSent');
        };
    }, [selectedTicket?.id, user?.id, tickets]);

    const openCreateModal = () => {
        resetTicketForm();
        const defaultUnit = user?.unit || (units.length > 0 ? units[0].name : '');
        setNewTicket({
            subject: '',
            category_id: categories.length > 0 ? categories[0].id : '',
            urgency_id: urgencies.length > 0 ? urgencies[0].id : '',
            unit: defaultUnit,
            sub_unit: user?.sub_unit || '',
            description: '',
            attachments: [],
        });
        setIsCreateModalOpen(true);
    };

    const handleFilterChange = (key, value) => {
        const query = {
            search,
            status: statusFilter,
            category_id: categoryFilter,
            urgency_id: urgencyFilter,
            [key]: value,
        };
        router.get('/dashboard', query, { preserveState: true, replace: true });
    };

    const handleCreateTicketSubmit = (e) => {
        e.preventDefault();
        postTicket('/tickets', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetTicketForm();
            },
        });
    };

    const handleReplySubmit = (e) => {
        e.preventDefault();
        if (!selectedTicket) return;
        postReply(`/tickets/${selectedTicket.id}/reply`, {
            onSuccess: () => {
                resetReplyForm();
                const updated = tickets.find((t) => t.id === selectedTicket.id);
                if (updated) setSelectedTicket(updated);
            },
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'open':
                return {
                    label: 'Menunggu',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200',
                    dot: 'bg-amber-500',
                };
            case 'in_progress':
                return {
                    label: 'Diproses',
                    bg: 'bg-blue-50 text-blue-700 border-blue-200',
                    dot: 'bg-blue-500',
                };
            case 'resolved':
                return {
                    label: 'Selesai',
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    dot: 'bg-emerald-500',
                };
            case 'closed':
                return {
                    label: 'Ditutup',
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                    dot: 'bg-slate-400',
                };
            default:
                return {
                    label: status,
                    bg: 'bg-slate-100 text-slate-700 border-slate-200',
                    dot: 'bg-slate-400',
                };
        }
    };

    const getUrgencyBadgeColor = (color) => {
        switch (color) {
            case 'rose':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'amber':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'blue':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    // Sub-units matching currently selected unit
    const selectedUnitObj = units.find((u) => u?.name === newTicket.unit);
    const availableSubUnits = selectedUnitObj?.sub_units || selectedUnitObj?.subUnits || [];

    return (
        <AppLayout title="Tiket Saya - Portal Layanan" onOpenCreateTicket={openCreateModal}>
            {/* Consistent Standard Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Icon icon="ph:ticket-bold" className="w-7 h-7 text-brand-600" />
                        <span>Portal Layanan & Tiket Saya</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-500">
                        Selamat datang, {user?.name} — Pantau progres penanganan tiket dan laporkan kendala operasional Anda di sini.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                        <Icon icon="ph:plus-bold" className="w-4 h-4" />
                        <span>Buat Tiket Baru</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Tiket Saya</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Icon icon="ph:ticket-bold" className="w-4 h-4 text-brand-600" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-600">Menunggu Respon</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Icon icon="ph:clock-countdown-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-amber-600">{stats.open}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600">Sedang Diproses</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Icon icon="ph:gear-six-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-blue-600">{stats.in_progress}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600">Terselesaikan</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Icon icon="ph:check-circle-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-600">{stats.resolved}</p>
                </div>
            </div>

            {/* Filter & Pencarian Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                    <Icon icon="ph:magnifying-glass-bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFilterChange('search', search)}
                        placeholder="Cari nomor tiket, judul kendala..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 placeholder-slate-400"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            handleFilterChange('status', e.target.value);
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500"
                    >
                        <option value="all">Semua Status</option>
                        <option value="open">Menunggu</option>
                        <option value="in_progress">Diproses</option>
                        <option value="resolved">Selesai</option>
                        <option value="closed">Ditutup</option>
                    </select>

                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            handleFilterChange('category_id', e.target.value);
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={urgencyFilter}
                        onChange={(e) => {
                            setUrgencyFilter(e.target.value);
                            handleFilterChange('urgency_id', e.target.value);
                        }}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500"
                    >
                        <option value="">Semua Urgensi</option>
                        {urgencies.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List Tiket */}
            {tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
                        <Icon icon="ph:ticket-bold" className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Belum ada tiket</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Anda belum memiliki tiket bantuan. Klik tombol di bawah untuk membuat laporan kendala pertama Anda.
                    </p>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition"
                    >
                        <Icon icon="ph:plus-bold" className="w-4 h-4" />
                        <span>Buat Tiket Sekarang</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tickets.map((t) => {
                        const statusObj = getStatusBadge(t.status);
                        const urgencyClass = t.urgency ? getUrgencyBadgeColor(t.urgency.color) : 'bg-slate-50 text-slate-700';

                        return (
                            <div
                                key={t.id}
                                onClick={() => setSelectedTicket(t)}
                                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-brand-300 transition-all cursor-pointer flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="font-mono text-xs font-extrabold text-slate-900 group-hover:text-brand-600 transition">
                                            {t.ticket_number}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {t.urgency && (
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${urgencyClass}`}>
                                                    {t.urgency.name}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                                                {statusObj.label}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-brand-600 transition">
                                        {t.subject}
                                    </h3>

                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {t.category && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                <Icon icon={t.category.icon || 'ph:folder-bold'} className="w-3 h-3 text-brand-600" />
                                                <span>{t.category.name}</span>
                                            </span>
                                        )}
                                        {t.reporter?.unit && t.reporter.unit !== '-' && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                <Icon icon="ph:buildings-bold" className="w-3 h-3 text-slate-400" />
                                                <span>{t.reporter.unit}</span>
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-2.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                        {t.description}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Icon icon="ph:clock-bold" className="w-3.5 h-3.5" />
                                        {t.created_at_human}
                                    </span>
                                    {t.sla && (
                                        <span
                                            className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded border ${
                                                t.sla.status === 'overdue' || t.sla.status === 'breached'
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : t.sla.status === 'near_deadline'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : t.sla.status === 'met'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}
                                            title={`Batas Akhir SLA: ${t.sla.deadline_at}`}
                                        >
                                            <Icon icon="ph:timer-bold" className="w-3 h-3" />
                                            <span>{t.sla.status_label}</span>
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                                        <Icon icon="ph:chat-circle-dots-bold" className="w-3.5 h-3.5" />
                                        {t.messages.length} pesan
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Buat Tiket Baru */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Buat Tiket Kendala Baru</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Kategori, urgensi, unit & ruangan diambil dinamis dari master data.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        >
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateTicketSubmit} className="mt-4 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div className="text-xs leading-tight">
                                <p className="font-bold text-slate-900">{user?.name} ({user?.email})</p>
                                <p className="text-slate-500 mt-0.5">
                                    Profil Unit: <span className="font-semibold text-slate-700">{user?.unit || 'Umum'}</span> {user?.sub_unit ? `• ${user.sub_unit}` : ''}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Judul Kendala / Kebutuhan <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newTicket.subject}
                                onChange={(e) => setNewTicket('subject', e.target.value)}
                                placeholder="Contoh: Printer tidak tersambung di meja registrasi"
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {ticketErrors.subject && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{ticketErrors.subject}</p>
                            )}
                        </div>

                        {/* Pilihan Unit & Sub-Unit (Master) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Unit / Departemen (Master) <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={newTicket.unit}
                                    onChange={(e) => {
                                        const selectedUnitName = e.target.value;
                                        setNewTicket((prev) => ({
                                            ...prev,
                                            unit: selectedUnitName,
                                            sub_unit: '',
                                        }));
                                    }}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                >
                                    <option value="">-- Pilih Unit / Bagian --</option>
                                    {units.map((u) => (
                                        <option key={u.id} value={u.name}>
                                            {u.name} {u.source === 'local' ? '(Lokal)' : ''}
                                        </option>
                                    ))}
                                    {user?.unit && !units.some((u) => u.name === user.unit) && (
                                        <option value={user.unit}>{user.unit} (Profil Anda)</option>
                                    )}
                                </select>
                                {ticketErrors.unit && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{ticketErrors.unit}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ruangan / Sub-Unit (Master)
                                </label>
                                {availableSubUnits.length > 0 ? (
                                    <select
                                        value={newTicket.sub_unit}
                                        onChange={(e) => setNewTicket('sub_unit', e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                    >
                                        <option value="">-- Pilih Ruangan / Sub-Unit (Opsional) --</option>
                                        {availableSubUnits.map((sub) => (
                                            <option key={sub.id} value={sub.name}>
                                                {sub.name} {sub.source === 'local' ? '(Lokal)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={newTicket.sub_unit}
                                        onChange={(e) => setNewTicket('sub_unit', e.target.value)}
                                        placeholder="Nama ruangan atau nomor meja (opsional)"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                                    />
                                )}
                                {ticketErrors.sub_unit && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{ticketErrors.sub_unit}</p>
                                )}
                            </div>
                        </div>

                        {/* Pilihan Kategori & Urgensi (Master) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Kategori Tiket (Master) <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={newTicket.category_id}
                                    onChange={(e) => setNewTicket('category_id', e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                >
                                    <option value="">-- Pilih Kategori --</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                {ticketErrors.category_id && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{ticketErrors.category_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tingkat Urgensi (Master) <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={newTicket.urgency_id}
                                    onChange={(e) => setNewTicket('urgency_id', e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                >
                                    <option value="">-- Pilih Urgensi --</option>
                                    {urgencies.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} {u.sla_hours ? `(SLA: ${u.sla_hours} Jam)` : ''}
                                        </option>
                                    ))}
                                </select>
                                {ticketErrors.urgency_id && (
                                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{ticketErrors.urgency_id}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Rincian Deskripsi Masalah <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={newTicket.description}
                                onChange={(e) => setNewTicket('description', e.target.value)}
                                rows={4}
                                placeholder="Jelaskan detail kendala, ruangan, dan kendala yang dihadapi..."
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {ticketErrors.description && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{ticketErrors.description}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Lampiran Foto / Berkas Pendukung (Opsional)
                            </label>
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setNewTicket('attachments', Array.from(e.target.files))}
                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Maksimal 10MB (Gambar, Dokumen PDF/Word/Excel, ZIP).</p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submittingTicket}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {submittingTicket ? (
                                    <>
                                        <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin" />
                                        <span>Menyimpan Tiket...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="ph:paper-plane-right-bold" className="w-4 h-4" />
                                        <span>Kirim Tiket Sekarang</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal Detail & Percakapan Tiket */}
            {selectedTicket && (
                <Modal show={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} maxWidth="2xl">
                    <div className="p-6 flex flex-col max-h-[85vh]">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs font-extrabold text-slate-900">
                                        {selectedTicket.ticket_number}
                                    </span>
                                    {selectedTicket.urgency && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getUrgencyBadgeColor(selectedTicket.urgency.color)}`}>
                                            {selectedTicket.urgency.name}
                                        </span>
                                    )}
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedTicket.status).bg}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(selectedTicket.status).dot}`} />
                                        {getStatusBadge(selectedTicket.status).label}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 leading-snug">{selectedTicket.subject}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Dibuat pada {selectedTicket.created_at} • Unit: <span className="font-semibold text-slate-600">{selectedTicket.reporter?.unit || '-'}</span> {selectedTicket.reporter?.sub_unit ? `(${selectedTicket.reporter.sub_unit})` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <Icon icon="ph:x-bold" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                            {/* Banner Status Penyelesaian untuk User */}
                            {(selectedTicket.resolved_by || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                                <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <Icon icon="ph:check-circle-bold" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-extrabold text-emerald-950">
                                                Laporan Kendala Anda Telah Diselesaikan
                                            </p>
                                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                                Diselesaikan oleh: <span className="font-bold underline decoration-emerald-400">{selectedTicket.resolved_by?.name || 'Administrator'}</span>
                                                {selectedTicket.resolved_at && ` • ${selectedTicket.resolved_at}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                        Selesai
                                    </span>
                                </div>
                            )}

                            {/* Info Target SLA Penyelesaian */}
                            {selectedTicket.sla && (
                                <div
                                    className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 text-xs ${
                                        selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                            ? 'bg-red-50/80 border-red-200 text-red-900'
                                            : selectedTicket.sla.is_near_deadline
                                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                            : selectedTicket.sla.status === 'met'
                                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                            : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon
                                            icon={
                                                selectedTicket.sla.status === 'met'
                                                    ? 'ph:seal-check-bold'
                                                    : selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                                    ? 'ph:clock-countdown-fill'
                                                    : 'ph:clock-bold'
                                            }
                                            className="w-4 h-4 text-brand-600 shrink-0"
                                        />
                                        <span>
                                            Target Penyelesaian SLA:{' '}
                                            <strong>{selectedTicket.sla.target_hours} Jam</strong> (Batas Maksimal: {selectedTicket.sla.deadline_at})
                                        </span>
                                    </div>
                                    <span
                                        className={`font-bold px-2 py-0.5 rounded text-[10px] border shrink-0 ${
                                            selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                                ? 'bg-red-100 text-red-800 border-red-200'
                                                : selectedTicket.sla.is_near_deadline
                                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                : selectedTicket.sla.status === 'met'
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        {selectedTicket.sla.status_label}
                                    </span>
                                </div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                                    <span>Deskripsi Awal Tiket</span>
                                    {selectedTicket.category && (
                                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                            <Icon icon={selectedTicket.category.icon || 'ph:folder-bold'} className="w-3.5 h-3.5 text-brand-600" />
                                            {selectedTicket.category.name}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                                    {selectedTicket.description}
                                </p>

                                {selectedTicket.attachments?.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                                        <p className="text-[11px] font-bold text-slate-600 mb-1.5">Berkas Lampiran:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTicket.attachments.map((att, i) => (
                                                <a
                                                    key={i}
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-brand-700 hover:bg-brand-50 transition"
                                                >
                                                    <Icon icon="ph:file-arrow-down-bold" className="w-4 h-4" />
                                                    <span>{att.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedTicket.messages?.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.is_me ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <img
                                        src={msg.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0D9488&color=fff'}
                                        alt={msg.user_name}
                                        className="w-8 h-8 rounded-lg shrink-0 object-cover"
                                    />
                                    <div
                                        className={`max-w-[75%] rounded-2xl p-3.5 text-xs ${
                                            msg.is_me
                                                ? 'bg-brand-600 text-white rounded-tr-none'
                                                : msg.user_role === 'admin'
                                                ? 'bg-teal-50 text-teal-950 border border-teal-200/80 rounded-tl-none'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-80">
                                            <span className="font-bold">
                                                {msg.user_name} {msg.user_role === 'admin' ? '(Admin Helpdesk)' : ''}
                                            </span>
                                            <span>{msg.time}</span>
                                        </div>
                                        <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>

                                        {msg.attachments?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1.5">
                                                {msg.attachments.map((att, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-black/10 rounded-lg text-[11px] font-medium hover:bg-black/20 transition"
                                                    >
                                                        <Icon icon="ph:paperclip-bold" className="w-3.5 h-3.5" />
                                                        <span>{att.name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleReplySubmit} className="pt-3 border-t border-slate-100 shrink-0">
                            <div className="flex gap-2">
                                <textarea
                                    value={replyData.message}
                                    onChange={(e) => setReplyData('message', e.target.value)}
                                    rows={2}
                                    placeholder="Tulis balasan atau informasi tambahan..."
                                    required
                                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingReply}
                                    className="px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition disabled:opacity-50"
                                >
                                    {submittingReply ? (
                                        <Icon icon="ph:spinner-bold" className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Icon icon="ph:paper-plane-right-bold" className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
