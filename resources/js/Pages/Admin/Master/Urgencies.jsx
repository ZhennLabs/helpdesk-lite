import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import { Icon } from '@iconify/react';

export default function MasterUrgencies({ urgencies = [] }) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUrgency, setEditingUrgency] = useState(null);
    const [deletingUrgency, setDeletingUrgency] = useState(null);

    const colorOptions = [
        { label: 'Hijau (Emerald)', value: 'emerald', class: 'bg-emerald-500' },
        { label: 'Biru (Blue)', value: 'blue', class: 'bg-blue-500' },
        { label: 'Kuning / Oranye (Amber)', value: 'amber', class: 'bg-amber-500' },
        { label: 'Merah (Rose)', value: 'rose', class: 'bg-rose-500' },
        { label: 'Ungu (Purple)', value: 'purple', class: 'bg-purple-500' },
        { label: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
    ];

    const {
        data: formData,
        setData: setFormData,
        post,
        put,
        processing,
        errors,
        reset,
    } = useForm({
        name: '',
        level: 1,
        color: 'emerald',
        sla_hours: 24,
        description: '',
        order_index: 0,
        is_active: true,
    });

    const openCreateModal = () => {
        reset();
        setFormData({
            name: '',
            level: urgencies.length + 1,
            color: 'emerald',
            sla_hours: 24,
            description: '',
            order_index: urgencies.length + 1,
            is_active: true,
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (urg) => {
        setEditingUrgency(urg);
        setFormData({
            name: urg.name,
            level: urg.level || 1,
            color: urg.color || 'emerald',
            sla_hours: urg.sla_hours || 24,
            description: urg.description || '',
            order_index: urg.order_index || 0,
            is_active: Boolean(urg.is_active),
        });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        post('/admin/master/urgencies', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingUrgency) return;
        put(`/admin/master/urgencies/${editingUrgency.id}`, {
            onSuccess: () => {
                setEditingUrgency(null);
                reset();
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deletingUrgency) return;
        router.delete(`/admin/master/urgencies/${deletingUrgency.id}`, {
            onSuccess: () => setDeletingUrgency(null),
        });
    };

    const getBadgeStyle = (color) => {
        switch (color) {
            case 'rose':
            case 'red':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'amber':
            case 'orange':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'blue':
            case 'indigo':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'purple':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'emerald':
            case 'green':
            default:
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
    };

    const getDotStyle = (color) => {
        switch (color) {
            case 'rose':
            case 'red':
                return 'bg-rose-500';
            case 'amber':
            case 'orange':
                return 'bg-amber-500';
            case 'blue':
            case 'indigo':
                return 'bg-blue-500';
            case 'purple':
                return 'bg-purple-500';
            case 'emerald':
            case 'green':
            default:
                return 'bg-emerald-500';
        }
    };

    // Columns Definition for DataTable
    const columns = [
        {
            key: 'order_index',
            label: 'Urutan',
            width: '60px',
            align: 'center',
            sortable: true,
            render: (row) => (
                <span className="font-mono font-bold text-slate-400">#{row.order_index}</span>
            ),
        },
        {
            key: 'name',
            label: 'Tingkat Urgensi / Prioritas',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${getBadgeStyle(
                            row.color
                        )}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${getDotStyle(row.color)}`} />
                        {row.name}
                    </span>
                </div>
            ),
        },
        {
            key: 'level',
            label: 'Level Skala',
            align: 'center',
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 font-bold text-slate-700 text-xs">
                    {row.level}
                </span>
            ),
        },
        {
            key: 'sla_hours',
            label: 'Target SLA',
            align: 'center',
            sortable: true,
            render: (row) => (
                <div className="flex items-center justify-center gap-1 font-bold text-slate-800">
                    <Icon icon="ph:timer-bold" className="w-3.5 h-3.5 text-brand-600" />
                    <span>{row.sla_hours} Jam</span>
                </div>
            ),
        },
        {
            key: 'description',
            label: 'Dampak & Keterangan',
            sortable: true,
            render: (row) => (
                <span className="text-slate-500 max-w-sm truncate block">{row.description || '-'}</span>
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            align: 'center',
            sortable: true,
            render: (row) => (
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        row.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Urgensi"
                    >
                        <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeletingUrgency(row)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Urgensi"
                    >
                        <Icon icon="ph:trash-bold" className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Master Urgensi Tiket - Admin">
            {/* Consistent Standard Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="max-w-xl">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Icon icon="ph:siren-bold" className="w-7 h-7 text-brand-600 shrink-0" />
                        <span>Master Urgensi & SLA</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Atur skala prioritas, warna badge indikator, dan target SLA penyelesaian tiket kendala.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl border border-transparent shadow-xs transition active:scale-98 shrink-0"
                    >
                        <Icon icon="ph:plus-bold" className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Tambah Urgensi Baru</span>
                    </button>
                </div>
            </div>

            {/* DataTable */}
            <DataTable
                columns={columns}
                data={urgencies}
                searchPlaceholder="Cari prioritas atau keterangan..."
                defaultSort={{ key: 'order_index', direction: 'asc' }}
                emptyMessage="Belum ada data urgensi terdaftar."
            />

            {/* Modal Tambah Urgensi */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Tambah Master Urgensi</h3>
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                            <Icon icon="ph:x-bold" className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Urgensi / Prioritas <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData('name', e.target.value)}
                                placeholder="Contoh: Sangat Mendesak, Tinggi, Normal, Rendah"
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {errors.name && <p className="text-[11px] text-rose-500 mt-0.5">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Level Skala (1-10)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={formData.level}
                                    onChange={(e) => setFormData('level', parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Target SLA (Jam)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={formData.sla_hours}
                                    onChange={(e) => setFormData('sla_hours', parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Warna Badge</label>
                            <div className="grid grid-cols-3 gap-2">
                                {colorOptions.map((c, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setFormData('color', c.value)}
                                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] transition ${
                                            formData.color === c.value
                                                ? 'border-brand-600 bg-brand-50/60 font-bold ring-1 ring-brand-500'
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full ${c.class}`} />
                                        <span className="truncate">{c.label.split(' ')[0]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Dampak</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData('description', e.target.value)}
                                rows={2}
                                placeholder="Jelaskan kriteria kendala pada tingkat urgensi ini..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Urutan</label>
                                <input
                                    type="number"
                                    value={formData.order_index}
                                    onChange={(e) => setFormData('order_index', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                />
                            </div>
                            <div className="flex items-center pt-5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData('is_active', e.target.checked)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700">Status Aktif</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                        >
                            Simpan Urgensi
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Urgensi */}
            {editingUrgency && (
                <Modal show={Boolean(editingUrgency)} onClose={() => setEditingUrgency(null)} maxWidth="md">
                    <form onSubmit={handleEditSubmit} className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Edit Master Urgensi</h3>
                            <button type="button" onClick={() => setEditingUrgency(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nama Urgensi / Prioritas <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData('name', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                                {errors.name && <p className="text-[11px] text-rose-500 mt-0.5">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Level Skala (1-10)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={formData.level}
                                        onChange={(e) => setFormData('level', parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Target SLA (Jam)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.sla_hours}
                                        onChange={(e) => setFormData('sla_hours', parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Warna Badge</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {colorOptions.map((c, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setFormData('color', c.value)}
                                            className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] transition ${
                                                formData.color === c.value
                                                    ? 'border-brand-600 bg-brand-50/60 font-bold ring-1 ring-brand-500'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            <span className={`w-3 h-3 rounded-full ${c.class}`} />
                                            <span className="truncate">{c.label.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Dampak</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>

                            <div className="flex items-center pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData('is_active', e.target.checked)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700">Status Aktif</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setEditingUrgency(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                            >
                                Perbarui Urgensi
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Konfirmasi Hapus */}
            <Modal show={Boolean(deletingUrgency)} onClose={() => setDeletingUrgency(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                        <Icon icon="ph:warning-bold" className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Hapus Tingkat Urgensi?</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Apakah Anda yakin ingin menghapus urgensi <span className="font-bold text-slate-800">"{deletingUrgency?.name}"</span>?
                        {deletingUrgency?.tickets_count > 0 && (
                            <span className="block mt-1 text-rose-600 font-semibold">
                                Perhatian: Terdapat {deletingUrgency.tickets_count} tiket yang menggunakan urgensi ini.
                            </span>
                        )}
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDeletingUrgency(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                        >
                            Ya, Hapus Sekarang
                        </button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
