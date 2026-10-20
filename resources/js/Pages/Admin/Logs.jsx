import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Icon } from '@iconify/react';
import AppLayout from '@/Layouts/AppLayout';
import DataTable from '@/Components/DataTable';

export default function Logs({ logs = [], stats = {}, filters = {} }) {
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [detailLog, setDetailLog] = useState(null);

    // Filter logs berdasarkan tab tipe
    const filteredLogs = useMemo(() => {
        if (selectedType === 'all') return logs;
        return logs.filter((l) => l.type === selectedType);
    }, [logs, selectedType]);

    // Format tipe badge
    const renderTypeBadge = (row) => {
        const type = row.type;
        const typeLabel = row.type_label;
        if (row.message && (row.message.toLowerCase().includes('selesai') || row.message.includes('Resolved'))) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Icon icon="ph:check-circle-bold" className="w-3 h-3 text-emerald-600" />
                    <span>Ditandai Selesai</span>
                </span>
            );
        }
        if (type === 'status') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Icon icon="ph:arrows-clockwise-bold" className="w-3 h-3 text-indigo-500" />
                    <span>{typeLabel || 'Pembaruan Status'}</span>
                </span>
            );
        }
        if (type === 'assign') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    <Icon icon="ph:user-gear-bold" className="w-3 h-3 text-sky-500" />
                    <span>{typeLabel || 'Penugasan Petugas'}</span>
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                <Icon icon="ph:chat-dots-bold" className="w-3 h-3 text-teal-500" />
                <span>{typeLabel || 'Tanggapan Pesan'}</span>
            </span>
        );
    };

    const columns = [
        {
            key: 'created_at',
            label: 'Waktu Aktivitas',
            align: 'left',
            sortable: true,
            sortFn: (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Icon icon="ph:clock-bold" className="w-3.5 h-3.5 text-slate-400" />
                        {row.created_at}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium pl-5">
                        {row.created_at_human}
                    </span>
                </div>
            ),
        },
        {
            key: 'ticket_number',
            label: 'Tiket Terkait',
            align: 'left',
            sortable: true,
            render: (row) => (
                <div className="flex flex-col max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60 inline-flex items-center gap-1">
                            <Icon icon="ph:ticket-bold" className="w-3 h-3" />
                            {row.ticket_number}
                        </span>
                        {row.category && (
                            <span className="text-[10px] text-slate-500 font-medium truncate">
                                • {row.category.name}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-slate-700 font-medium truncate mt-1" title={row.ticket_subject}>
                        {row.ticket_subject}
                    </span>
                </div>
            ),
        },
        {
            key: 'user.name',
            label: 'Pelaku / User',
            align: 'left',
            sortable: true,
            render: (row) => {
                const isAdmin = row.user?.role === 'admin';
                return (
                    <div className="flex items-center gap-2.5">
                        <img
                            src={row.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.user?.name || 'User')}&background=0D9488&color=fff`}
                            alt={row.user?.name || 'User'}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                        />
                        <div className="truncate max-w-[130px]">
                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                                {row.user?.name || 'Sistem'}
                            </p>
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                isAdmin 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                {isAdmin ? 'Admin' : 'Pengguna'}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'type',
            label: 'Tipe Log',
            align: 'left',
            sortable: true,
            render: (row) => renderTypeBadge(row),
        },
        {
            key: 'message',
            label: 'Isi Log / Catatan',
            align: 'left',
            sortable: false,
            render: (row) => (
                <div className="max-w-md">
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed font-normal">
                        {row.message}
                    </p>
                    {row.attachments && row.attachments.length > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-brand-600 font-medium">
                            <Icon icon="ph:paperclip-bold" className="w-3 h-3" />
                            {row.attachments.length} Lampiran File
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'ticket_unit',
            label: 'Unit Kerja',
            align: 'left',
            sortable: true,
            render: (row) => (
                <div className="text-xs text-slate-600 max-w-[150px] truncate">
                    <p className="font-semibold text-slate-800 truncate">{row.ticket_unit || '-'}</p>
                    {row.ticket_sub_unit && row.ticket_sub_unit !== '-' && (
                        <p className="text-[10px] text-slate-400 truncate">{row.ticket_sub_unit}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => setDetailLog(row)}
                        className="px-2 py-1 text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                        title="Lihat Detail Log"
                    >
                        <Icon icon="ph:eye-bold" className="w-3.5 h-3.5" />
                        <span>Detail</span>
                    </button>
                    {row.ticket_number && row.ticket_number !== '-' && (
                        <Link
                            href={`/admin/dashboard?search=${encodeURIComponent(row.ticket_number)}`}
                            className="px-2 py-1 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                            title="Buka Tiket di Dashboard"
                        >
                            <Icon icon="ph:arrow-square-out-bold" className="w-3.5 h-3.5" />
                            <span>Tiket</span>
                        </Link>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Log Aktivitas & Riwayat - Admin">
            {/* Consistent Standard Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Icon icon="ph:clock-counter-clockwise-bold" className="w-7 h-7 text-brand-600" />
                        <span>Log Aktivitas & Riwayat Tiket</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-500">
                        Catatan audit seluruh interaksi tiket, penanganan langsung admin, dan percakapan tanggapan.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/dashboard"
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200/80 shadow-xs transition"
                    >
                        <Icon icon="ph:squares-four-bold" className="w-4 h-4 text-brand-600" />
                        <span>Dashboard Tiket</span>
                    </Link>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Log Aktivitas</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Icon icon="ph:article-bold" className="w-4 h-4 text-brand-600" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total || 0}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600">Aktivitas Hari Ini</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Icon icon="ph:calendar-check-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-700">{stats.today || 0}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-600">Pembaruan Status</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Icon icon="ph:arrows-clockwise-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-indigo-700">{stats.status_changes || 0}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-teal-600">Pesan & Tanggapan</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Icon icon="ph:chat-dots-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-teal-700">{stats.messages || 0}</p>
                </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setSelectedType('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedType === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                >
                    <Icon icon="ph:list-bullets-bold" className="w-3.5 h-3.5" />
                    <span>Semua Log ({logs.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedType('status')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedType === 'status'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                >
                    <Icon icon="ph:arrows-clockwise-bold" className="w-3.5 h-3.5" />
                    <span>Pembaruan Status ({stats.status_changes || 0})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedType('assign')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedType === 'assign'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                >
                    <Icon icon="ph:user-gear-bold" className="w-3.5 h-3.5" />
                    <span>Penugasan ({stats.assignments || 0})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedType('message')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedType === 'message'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                >
                    <Icon icon="ph:chat-dots-bold" className="w-3.5 h-3.5" />
                    <span>Pesan / Tanggapan ({stats.messages || 0})</span>
                </button>
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={filteredLogs}
                searchPlaceholder="Cari nomor tiket, nama pelaku, atau isi catatan..."
                defaultSort={{ key: 'created_at', direction: 'desc' }}
                emptyMessage="Belum ada riwayat aktivitas log tercatat."
            />

            {/* Modal Detail Log */}
            {detailLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                                    <Icon icon="ph:clock-counter-clockwise-bold" className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Rincian Log Aktivitas</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailLog(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                <Icon icon="ph:x-bold" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3.5 text-xs">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Nomor Tiket</span>
                                    <p className="font-mono font-bold text-brand-700">{detailLog.ticket_number}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Waktu</span>
                                    <p className="font-semibold text-slate-800">{detailLog.created_at}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-slate-400 font-semibold">Subjek Tiket:</span>
                                <p className="font-bold text-slate-800 mt-0.5">{detailLog.ticket_subject}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-slate-400 font-semibold">Pelaku:</span>
                                    <p className="font-bold text-slate-800 mt-0.5">{detailLog.user?.name} ({detailLog.user?.role})</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-semibold">Unit Pengaju:</span>
                                    <p className="font-bold text-slate-800 mt-0.5">{detailLog.ticket_unit || '-'}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-slate-400 font-semibold">Isi Catatan / Pesan:</span>
                                <div className="mt-1.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                                    {detailLog.message}
                                </div>
                            </div>

                            {detailLog.attachments && detailLog.attachments.length > 0 && (
                                <div>
                                    <span className="text-slate-400 font-semibold">Lampiran File:</span>
                                    <div className="mt-1.5 space-y-1">
                                        {detailLog.attachments.map((file, i) => (
                                            <a
                                                key={i}
                                                href={file.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 p-2 rounded-lg bg-brand-50/50 hover:bg-brand-50 text-brand-700 font-medium transition"
                                            >
                                                <Icon icon="ph:file-arrow-down-bold" className="w-4 h-4" />
                                                <span className="truncate">{file.name || 'Unduh Lampiran'}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                            {detailLog.ticket_number && detailLog.ticket_number !== '-' ? (
                                <Link
                                    href={`/admin/dashboard?search=${encodeURIComponent(detailLog.ticket_number)}`}
                                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition"
                                >
                                    <Icon icon="ph:arrow-square-out-bold" className="w-4 h-4" />
                                    <span>Buka di Pusat Kendali Tiket</span>
                                </Link>
                            ) : <div />}
                            <button
                                type="button"
                                onClick={() => setDetailLog(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
