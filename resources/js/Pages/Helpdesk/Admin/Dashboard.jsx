import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function AdminDashboard({
    tickets: propTickets = [],
    stats = { total: 0, open: 0, in_progress: 0, resolved: 0 },
    categories: propCategories = [],
    urgencies: propUrgencies = [],
    technicians: propTechnicians = [],
    units: propUnits = [],
    monthly_chart = [],
    category_distribution = [],
    available_years = [2026],
    selected_year = 2026,
    filters = {},
}) {
    const tickets = Array.isArray(propTickets) ? propTickets : [];
    const categories = Array.isArray(propCategories) ? propCategories : [];
    const urgencies = Array.isArray(propUrgencies) ? propUrgencies : [];
    const technicians = Array.isArray(propTechnicians) ? propTechnicians : [];
    const units = Array.isArray(propUnits) ? propUnits : [];
    const { auth, slaAlerts } = usePage().props;
    const user = auth?.user;

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [statusModalTicket, setStatusModalTicket] = useState(null);

    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [categoryFilter, setCategoryFilter] = useState(filters.category_id || '');
    const [urgencyFilter, setUrgencyFilter] = useState(filters.urgency_id || '');
    const [unitFilter, setUnitFilter] = useState(filters.unit || '');
    const [currentYear, setCurrentYear] = useState(selected_year || 2026);

    // Form Update Status
    const {
        data: statusData,
        setData: setStatusData,
        post: postStatus,
        processing: submittingStatus,
        reset: resetStatusForm,
    } = useForm({
        status: 'in_progress',
        note: '',
    });

    // Form Reply
    const {
        data: replyData,
        setData: setReplyData,
        post: postReply,
        processing: submittingReply,
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

    // Realtime Reverb: Tanggapan Pesan Langsung Masuk ke Chat yang Sedang Terbuka
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

    // Realtime Reverb: Update Tabel Antrean & Notifikasi Dashboard
    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;

        const dashChannel = window.Echo.channel('dashboard-tickets');

        dashChannel.listen('.TicketUpdated', (e) => {
            if (e?.notification) {
                toast.info(e.notification);
            }
            router.reload({
                only: ['tickets', 'stats', 'monthly_chart', 'category_distribution'],
                preserveScroll: true,
                preserveState: true,
            });
        });

        dashChannel.listen('.TicketMessageSent', (e) => {
            if (e?.message && (!selectedTicket || selectedTicket.id !== e.message.ticket_id)) {
                if (e.message.user_id !== user?.id) {
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
    }, [selectedTicket?.id, user?.id]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 11) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const handleFilterChange = (key, value) => {
        const query = {
            status: key === 'status' ? value : statusFilter,
            category_id: key === 'category_id' ? value : categoryFilter,
            urgency_id: key === 'urgency_id' ? value : urgencyFilter,
            unit: key === 'unit' ? value : unitFilter,
            year: currentYear,
        };
        if (query.status === 'all') delete query.status;
        if (!query.category_id) delete query.category_id;
        if (!query.urgency_id) delete query.urgency_id;
        if (!query.unit) delete query.unit;
        router.get('/admin/dashboard', query, { preserveState: true, replace: true });
    };

    const handleYearChange = (year) => {
        setCurrentYear(year);
        router.get(
            '/admin/dashboard',
            { ...filters, year },
            { preserveState: true, replace: true }
        );
    };

    const openStatusModal = (ticket, e) => {
        if (e) e.stopPropagation();
        setStatusModalTicket(ticket);
        setStatusData({
            status: ticket.status,
            note: '',
        });
    };

    const handleStatusSubmit = (e) => {
        e.preventDefault();
        if (!statusModalTicket) return;
        postStatus(`/admin/tickets/${statusModalTicket.id}/status`, {
            onSuccess: () => {
                setStatusModalTicket(null);
                resetStatusForm();
            },
        });
    };

    const handleReplySubmit = (e) => {
        e.preventDefault();
        if (!selectedTicket) return;
        postReply(`/admin/tickets/${selectedTicket.id}/reply`, {
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
                    bg: 'bg-slate-50 text-slate-600 border-slate-200',
                    dot: 'bg-slate-400',
                };
        }
    };

    const getUrgencyBadgeColor = (color) => {
        switch (color) {
            case 'danger':
            case 'rose':
            case 'red':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'warning':
            case 'amber':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'info':
            case 'sky':
            case 'blue':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'success':
            case 'emerald':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Total tahunan untuk persentase legenda
    const totalMasukYear = useMemo(() => {
        return (monthly_chart || []).reduce((acc, curr) => acc + (curr.masuk || 0), 0);
    }, [monthly_chart]);

    const totalSelesaiYear = useMemo(() => {
        return (monthly_chart || []).reduce((acc, curr) => acc + (curr.selesai || 0), 0);
    }, [monthly_chart]);

    const grandTotalYear = totalMasukYear + totalSelesaiYear;
    const percentMasukDisplay = grandTotalYear > 0 ? Math.round((totalMasukYear / grandTotalYear) * 100) : 75;
    const percentSelesaiDisplay = grandTotalYear > 0 ? Math.round((totalSelesaiYear / grandTotalYear) * 100) : 25;

    // Konfigurasi Chart.js Bar Chart
    const barChartData = useMemo(() => {
        return {
            labels: (monthly_chart || []).map((d) => d.month),
            datasets: [
                {
                    label: 'Tiket Masuk',
                    data: (monthly_chart || []).map((d) => d.masuk),
                    backgroundColor: '#059669', // Emerald 600
                    hoverBackgroundColor: '#10B981',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    categoryPercentage: 0.7,
                },
                {
                    label: 'Tiket Selesai',
                    data: (monthly_chart || []).map((d) => d.selesai),
                    backgroundColor: '#F59E0B', // Amber 500
                    hoverBackgroundColor: '#FBBF24',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.65,
                    categoryPercentage: 0.7,
                },
            ],
        };
    }, [monthly_chart]);

    const barChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                padding: 12,
                cornerRadius: 10,
                boxPadding: 4,
                usePointStyle: true,
                callbacks: {
                    label: function (context) {
                        return ` ${context.dataset.label}: ${context.parsed.y} tiket`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11,
                        weight: '500',
                    },
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f8fafc',
                    borderDash: [4, 4],
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11,
                    },
                    stepSize: 2,
                    precision: 0,
                },
            },
        },
    }), []);

    // Konfigurasi Chart.js Doughnut Chart
    const categoryChartItems = useMemo(() => {
        const palette = ['#059669', '#F59E0B', '#F43F5E', '#0EA5E9', '#8B5CF6', '#EC4899', '#6366F1'];
        const totalAll = (category_distribution || []).reduce((acc, c) => acc + (c.count || 0), 0) || 1;

        return (category_distribution || []).map((cat, idx) => ({
            ...cat,
            color: palette[idx % palette.length],
            percent: Math.round(((cat.count || 0) / totalAll) * 100),
        }));
    }, [category_distribution]);

    const doughnutData = useMemo(() => {
        return {
            labels: categoryChartItems.map((c) => c.name),
            datasets: [
                {
                    data: categoryChartItems.map((c) => c.count),
                    backgroundColor: categoryChartItems.map((c) => c.color),
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6,
                },
            ],
        };
    }, [categoryChartItems]);

    const doughnutOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                padding: 10,
                cornerRadius: 10,
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                        return ` ${label}: ${value} tiket (${pct}%)`;
                    },
                },
            },
        },
    }), []);

    // Kolom tabel antrean tiket
    const ticketColumns = [
        {
            key: 'ticket_number',
            label: 'No. Tiket',
            sortable: true,
            render: (t) => (
                <button
                    type="button"
                    onClick={() => setSelectedTicket(t)}
                    className="font-mono text-xs font-bold text-brand-600 hover:text-brand-800 transition flex items-center gap-1.5"
                >
                    <Icon icon="ph:ticket-bold" className="w-3.5 h-3.5" />
                    <span>{t.ticket_number}</span>
                </button>
            ),
        },
        {
            key: 'reporter.name',
            label: 'Pelapor & Unit',
            sortable: true,
            sortValue: (t) => t.reporter?.name || '',
            render: (t) => (
                <div>
                    <div className="font-bold text-slate-900">{t.reporter.name}</div>
                    <div className="text-[11px] text-slate-500">
                        {t.reporter.unit} {t.reporter.sub_unit && t.reporter.sub_unit !== '-' ? `• ${t.reporter.sub_unit}` : ''}
                    </div>
                </div>
            ),
        },
        {
            key: 'subject',
            label: 'Judul & Kategori',
            sortable: true,
            render: (t) => (
                <div className="max-w-xs">
                    <div className="font-bold text-slate-900 truncate" title={t.subject}>
                        {t.subject}
                    </div>
                    {t.category && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                            <Icon icon={t.category.icon || 'ph:folder-bold'} className="w-3 h-3 text-brand-600" />
                            {t.category.name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'urgency_level',
            label: 'Urgensi & SLA',
            align: 'center',
            sortable: true,
            sortValue: (t) => (t.sla?.is_overdue ? 999 : (t.sla?.is_near_deadline ? 500 : (t.urgency?.level || 0))),
            render: (t) => {
                if (!t.urgency) return '-';
                const urgencyClass = getUrgencyBadgeColor(t.urgency.color);
                return (
                    <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${urgencyClass}`}>
                            {t.urgency.name}
                        </span>
                        {t.sla && (
                            <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                    t.sla.status === 'overdue' || t.sla.status === 'breached'
                                        ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                                        : t.sla.status === 'near_deadline'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : t.sla.status === 'met'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                                title={`Batas: ${t.sla.deadline_at || '-'}`}
                            >
                                <Icon
                                    icon={
                                        t.sla.status === 'overdue' || t.sla.status === 'breached'
                                            ? 'ph:warning-circle-fill'
                                            : t.sla.status === 'near_deadline'
                                            ? 'ph:clock-countdown-bold'
                                            : t.sla.status === 'met'
                                            ? 'ph:check-circle-bold'
                                            : 'ph:clock-bold'
                                    }
                                    className="w-3 h-3 shrink-0"
                                />
                                <span>{t.sla.status_label}</span>
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            align: 'center',
            sortable: true,
            render: (t) => {
                const statusObj = getStatusBadge(t.status);
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                        {statusObj.label}
                    </span>
                );
            },
        },
        {
            key: 'handler',
            label: 'Penanganan / Penyelesai',
            sortable: true,
            sortValue: (t) => t.resolved_by?.name || t.status,
            render: (t) => {
                if (t.status === 'resolved' || t.status === 'closed') {
                    return (
                        <div className="flex items-center gap-2">
                            <img
                                src={t.resolved_by?.avatar_url || 'https://ui-avatars.com/api/?name=Admin&background=0D9488&color=fff'}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-emerald-300"
                            />
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
                                    {t.resolved_by?.name || 'Admin'}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold block leading-tight">
                                    Selesai • {t.resolved_at || '-'}
                                </span>
                            </div>
                        </div>
                    );
                }

                if (t.status === 'in_progress') {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                            <Icon icon="ph:spinner-bold" className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                            <span>Ditangani Tim Admin</span>
                        </span>
                    );
                }

                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <span>Menunggu Respon</span>
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            sortable: false,
            render: (t) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={(e) => openStatusModal(t, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                        title="Perbarui Status Penanganan"
                    >
                        <Icon icon="ph:arrows-clockwise-bold" className="w-3.5 h-3.5 text-slate-600" />
                        <span>Status</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedTicket(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg transition"
                        title="Buka Detail & Respon Tiket"
                    >
                        <Icon icon="ph:chats-circle-bold" className="w-3.5 h-3.5 text-brand-600" />
                        <span>Respon</span>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Dashboard - Admin Workspace">
            {/* Hero Banner (Persis seperti referensi dengan karakter animasi teknisi transparan tanpa background kotak) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#176B54] via-[#1B775E] to-[#125844] text-white p-6 sm:p-8 lg:p-10 mb-6 shadow-sm border border-emerald-900/20">
                {/* Subtle pattern background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-xl pb-2">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            {getGreeting()}, {user?.name || 'Administrator'}
                        </h1>
                        <p className="mt-2.5 text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-lg font-normal">
                            Semoga hari kerja Anda menyenangkan dan produktif! Pantau antrean kendala rumah sakit, tindak lanjuti laporan secara langsung, dan pastikan seluruh unit operasional tetap terlayani dengan optimal.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const el = document.getElementById('daftar-antrean-tiket');
                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="px-5 py-2.5 bg-white text-[#176B54] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition active:scale-98 inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:list-bullets-bold" className="w-4 h-4" />
                                <span>Kelola Antrean Tiket</span>
                            </button>
                            <Link
                                href="/admin/logs"
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 backdrop-blur-xs transition inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:clock-counter-clockwise-bold" className="w-4 h-4" />
                                <span>Lihat Log Aktivitas</span>
                            </Link>
                        </div>
                    </div>

                    {/* Karakter Animasi Teknisi 3D Tanpa Background (Seamless Cutout persis layout referensi) */}
                    <div className="relative shrink-0 flex items-end justify-center md:justify-end -mb-6 sm:-mb-8 lg:-mb-10 pointer-events-none">
                        <img
                            src="/images/technician_hero.png"
                            alt="Animasi Teknisi IT Support RSAM"
                            className="w-52 sm:w-64 lg:w-72 h-auto max-h-[260px] sm:max-h-[300px] object-contain object-bottom drop-shadow-[0_15px_25px_rgba(0,0,0,0.35)]"
                        />
                    </div>
                </div>
            </div>

            {/* 4 Kartu Metrik KPI (Garis Aksen Vertikal & Kotak Ikon di Kanan Atas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. Appointments / Total Tiket */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-1.5 h-10 bg-emerald-600 rounded-full shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-slate-500">Total Tiket Masuk</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">{stats.total}</p>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                        <Icon icon="ph:calendar-check-bold" className="w-5 h-5" />
                    </div>
                </div>

                {/* 2. New Patients / Tiket Baru (Open) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-1.5 h-10 bg-amber-400 rounded-full shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-slate-500">Tiket Baru (Open)</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-amber-500 mt-0.5">{stats.open}</p>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-400/20 shrink-0">
                        <Icon icon="ph:user-bold" className="w-5 h-5" />
                    </div>
                </div>

                {/* 3. Operations / Sedang Diproses */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-1.5 h-10 bg-rose-500 rounded-full shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-slate-500">Sedang Diproses</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-rose-500 mt-0.5">{stats.in_progress}</p>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
                        <Icon icon="ph:wrench-bold" className="w-5 h-5" />
                    </div>
                </div>

                {/* 4. Earnings / Tiket Selesai */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-1.5 h-10 bg-sky-500 rounded-full shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-slate-500">Tiket Selesai</p>
                            <p className="text-2xl sm:text-3xl font-extrabold text-sky-600 mt-0.5">{stats.resolved}</p>
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
                        <Icon icon="ph:folder-simple-bold" className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Baris Grafik Analitik Menggunakan Chart.js (Dual Bar Chart & Donut Chart Dinamis) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Grafik Kiri (2 Kolom): Tren Penanganan Tiket Bulanan via Chart.js */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                Tren Penanganan Tiket Bulanan
                            </h2>
                            <Icon icon="ph:info-bold" className="w-4 h-4 text-slate-400" title="Data riil perbandingan tiket masuk dan selesai per bulan" />
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                                <span>Tiket Masuk {percentMasukDisplay}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" />
                                <span>Tiket Selesai {percentSelesaiDisplay}%</span>
                            </div>
                            <select
                                value={currentYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                                {(available_years || [2026]).map((yr) => (
                                    <option key={yr} value={yr}>
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Chart.js Bar Chart Canvas */}
                    <div className="mt-4 h-64 w-full">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>

                {/* Grafik Kanan (1 Kolom): Distribusi Kategori Kendala via Chart.js Doughnut */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">
                            Distribusi Kategori Kendala
                        </h2>
                        <button type="button" className="text-slate-400 hover:text-slate-600">
                            <Icon icon="ph:dots-three-vertical-bold" className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Chart.js Doughnut Canvas dengan Ikon Tengah */}
                    <div className="relative my-2 h-52 w-full flex items-center justify-center">
                        <Doughnut data={doughnutData} options={doughnutOptions} />

                        {/* Ikon Tengah Donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 shadow-inner">
                                <Icon icon="ph:headset-bold" className="w-5 h-5 text-brand-600" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight uppercase">
                                Kategori
                            </span>
                        </div>
                    </div>

                    {/* Legenda Kategori Dinamis dari Database */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 max-h-40 overflow-y-auto pr-1">
                        {categoryChartItems.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 truncate">
                                    <span
                                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="font-semibold text-slate-700 truncate" title={cat.name}>
                                        {cat.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                    <span className="text-[11px] text-slate-400">{cat.count} tiket</span>
                                    <span className="font-bold text-slate-900 w-8 text-right">{cat.percent}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bagian Tabel Antrean & Penanganan Tiket Terpadu */}
            <div id="daftar-antrean-tiket" className="mt-8">
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Icon icon="ph:stack-bold" className="w-5 h-5 text-brand-600" />
                            <span>Daftar Antrean & Penanganan Tiket</span>
                        </h2>
                        <p className="text-xs text-slate-500">
                            Kelola antrean tiket kendala, tindak lanjuti laporan langsung, dan pantau status penyelesaian masalah.
                        </p>
                    </div>
                </div>

                {/* Alert Perhatian SLA jika ada tiket mendesak / terlewat */}
                {slaAlerts?.urgent_count > 0 && (
                    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                                <Icon icon="ph:warning-octagon-fill" className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                    <span>Perhatian SLA: Ada {slaAlerts.urgent_count} Tiket yang Membutuhkan Penanganan Segera!</span>
                                </h4>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    {slaAlerts.overdue_count > 0 && <span className="text-red-600 font-bold mr-2">{slaAlerts.overdue_count} tiket melewati batas waktu SLA.</span>}
                                    {slaAlerts.near_count > 0 && <span className="text-amber-700 font-bold">{slaAlerts.near_count} tiket mendekati batas waktu resolusi.</span>}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setStatusFilter('sla_urgent');
                                handleFilterChange('status', 'sla_urgent');
                            }}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-1.5 shrink-0"
                        >
                            <Icon icon="ph:funnel-bold" className="w-3.5 h-3.5" />
                            <span>Tampilkan Tiket Mendesak</span>
                        </button>
                    </div>
                )}

                {/* DataTable dengan Slot Filter Komprehensif */}
                <DataTable
                    columns={ticketColumns}
                    data={tickets}
                    searchPlaceholder="Cari nomor tiket, judul kendala, nama pelapor..."
                    defaultSort={{ key: 'ticket_number', direction: 'desc' }}
                    emptyMessage="Tidak ada tiket kendala yang sesuai dengan filter pencarian."
                    filterSlot={
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    handleFilterChange('status', e.target.value);
                                }}
                                className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                            >
                                <option value="all">Antrean Aktif (Open & Diproses)</option>
                                <option value="sla_urgent">⚠️ Perlu Tindakan SLA (Mendekati / Terlewat)</option>
                                <option value="open">Menunggu (Open)</option>
                                <option value="in_progress">Sedang Diproses (In Progress)</option>
                                <option value="resolved">Telah Selesai (Resolved)</option>
                                <option value="history">Semua Riwayat (Termasuk Selesai)</option>
                            </select>

                            <select
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    handleFilterChange('category_id', e.target.value);
                                }}
                                className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
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
                                className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                            >
                                <option value="">Semua Urgensi</option>
                                {urgencies.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={unitFilter}
                                onChange={(e) => {
                                    setUnitFilter(e.target.value);
                                    handleFilterChange('unit', e.target.value);
                                }}
                                className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                            >
                                <option value="">Semua Unit</option>
                                {units.map((u, idx) => (
                                    <option key={idx} value={u}>
                                        {u}
                                    </option>
                                ))}
                            </select>
                        </div>
                    }
                />
            </div>

            {/* Modal Perbarui Status Tiket */}
            {statusModalTicket && (
                <Modal show={Boolean(statusModalTicket)} onClose={() => setStatusModalTicket(null)} maxWidth="md">
                    <form onSubmit={handleStatusSubmit} className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Perbarui Status Tiket</h3>
                                <p className="text-xs text-slate-500">{statusModalTicket.ticket_number}</p>
                            </div>
                            <button type="button" onClick={() => setStatusModalTicket(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Status Penanganan</label>
                                <select
                                    value={statusData.status}
                                    onChange={(e) => setStatusData('status', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                >
                                    <option value="open">Menunggu (Open)</option>
                                    <option value="in_progress">Sedang Diproses (In Progress)</option>
                                    <option value="resolved">Selesai Ditangani (Resolved)</option>
                                    <option value="closed">Ditutup (Closed)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Log Perubahan (Opsional)</label>
                                <textarea
                                    value={statusData.note}
                                    onChange={(e) => setStatusData('note', e.target.value)}
                                    rows={2}
                                    placeholder="Alasan perubahan atau catatan tindak lanjut..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setStatusModalTicket(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submittingStatus}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                            >
                                Simpan Status
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Detail & Percakapan Tiket */}
            {selectedTicket && (
                <Modal show={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} maxWidth="2xl">
                    <div className="p-6 flex flex-col max-h-[85vh]">
                        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-sm font-extrabold text-brand-600">
                                        {selectedTicket.ticket_number}
                                    </span>
                                    {selectedTicket.urgency && (
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getUrgencyBadgeColor(selectedTicket.urgency.color)}`}>
                                            Urgensi: {selectedTicket.urgency.name}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-base font-bold text-slate-900 leading-snug">
                                    {selectedTicket.subject}
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Pelapor: <span className="font-semibold text-slate-700">{selectedTicket.reporter.name}</span> • Unit: {selectedTicket.reporter.unit}
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
                            {/* Banner Status Penyelesaian */}
                            {(selectedTicket.resolved_by || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') ? (
                                <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <Icon icon="ph:check-circle-bold" className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-extrabold text-emerald-950">
                                                Tiket Telah Diselesaikan
                                            </p>
                                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                                Diselesaikan oleh: <span className="font-bold underline decoration-emerald-400">{selectedTicket.resolved_by?.name || 'Administrator'}</span>
                                                {selectedTicket.resolved_at && ` • ${selectedTicket.resolved_at}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                        Resolved
                                    </span>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <span>Status: <strong className="text-slate-900">{selectedTicket.status === 'in_progress' ? 'Sedang Diproses Admin' : 'Menunggu Ditangani'}</strong></span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openStatusModal(selectedTicket)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                                    >
                                        <Icon icon="ph:check-circle-bold" className="w-3.5 h-3.5" />
                                        <span>Ubah Status / Tandai Selesai</span>
                                    </button>
                                </div>
                            )}

                            {/* Card Informasi SLA & Batas Waktu */}
                            {selectedTicket.sla && (
                                <div
                                    className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                                        selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                            ? 'bg-red-50/90 border-red-200 text-red-950'
                                            : selectedTicket.sla.is_near_deadline
                                            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                                            : selectedTicket.sla.status === 'met'
                                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                                            : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                                    ? 'bg-red-200/80 text-red-700 animate-pulse'
                                                    : selectedTicket.sla.is_near_deadline
                                                    ? 'bg-amber-200/80 text-amber-700 animate-bounce'
                                                    : selectedTicket.sla.status === 'met'
                                                    ? 'bg-emerald-200/80 text-emerald-700'
                                                    : 'bg-indigo-200/80 text-indigo-700'
                                            }`}
                                        >
                                            <Icon
                                                icon={
                                                    selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                                        ? 'ph:warning-octagon-bold'
                                                        : selectedTicket.sla.is_near_deadline
                                                        ? 'ph:clock-countdown-bold'
                                                        : selectedTicket.sla.status === 'met'
                                                        ? 'ph:seal-check-bold'
                                                        : 'ph:timer-bold'
                                                }
                                                className="w-5 h-5"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-extrabold">Service Level Agreement (SLA)</span>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                                        selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached'
                                                            ? 'bg-red-100 text-red-800 border-red-300'
                                                            : selectedTicket.sla.is_near_deadline
                                                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                                            : selectedTicket.sla.status === 'met'
                                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                            : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                                    }`}
                                                >
                                                    {selectedTicket.sla.status_label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] opacity-80 mt-0.5">
                                                Target Respon: <strong>{selectedTicket.sla.target_hours} Jam</strong> • Batas Waktu: <strong>{selectedTicket.sla.deadline_at}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    {selectedTicket.sla.is_near_deadline && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-xl shrink-0">
                                            <Icon icon="ph:warning-bold" className="w-3.5 h-3.5 text-amber-600" />
                                            Mendekati Batas Waktu
                                        </span>
                                    )}
                                    {(selectedTicket.sla.is_overdue || selectedTicket.sla.status === 'breached') && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100/90 px-2.5 py-1 rounded-xl shrink-0">
                                            <Icon icon="ph:warning-octagon-bold" className="w-3.5 h-3.5 text-red-600" />
                                            Melewati Target SLA
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deskripsi Kendala</span>
                                <p className="mt-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                                    {selectedTicket.description}
                                </p>
                            </div>

                            {/* Riwayat Percakapan & Tanggapan */}
                            <div className="space-y-3">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <Icon icon="ph:chat-dots-bold" className="w-4 h-4 text-brand-600" />
                                    <span>Riwayat Tanggapan & Aktivitas ({selectedTicket.messages?.length || 0})</span>
                                </span>

                                <div className="space-y-2.5">
                                    {selectedTicket.messages?.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-2xl text-xs ${
                                                msg.is_me
                                                    ? 'bg-brand-50 border border-brand-200/60 ml-6 text-brand-950'
                                                    : 'bg-white border border-slate-200 mr-6 text-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100/60">
                                                <span className="font-bold">{msg.user_name} ({msg.user_role})</span>
                                                <span className="text-[10px] text-slate-400">{msg.time}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                            </div>
                        </div>

                        {/* Form Kirim Tanggapan */}
                        <form onSubmit={handleReplySubmit} className="pt-3 border-t border-slate-100 shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={replyData.message}
                                    onChange={(e) => setReplyData('message', e.target.value)}
                                    placeholder="Tulis tanggapan atau instruksi penanganan..."
                                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                                <button
                                    type="submit"
                                    disabled={submittingReply || !replyData.message.trim()}
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                                >
                                    Kirim
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
