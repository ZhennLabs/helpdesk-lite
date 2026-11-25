import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import Tooltip from '@/Components/Tooltip';
import { Icon } from '@iconify/react';

export default function MasterCategories({ categories = [] }) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [deletingCategory, setDeletingCategory] = useState(null);

    const iconPresets = [
        { label: 'Fasilitas/Gedung', icon: 'ph:buildings-bold' },
        { label: 'Perbaikan/Alat', icon: 'ph:wrench-bold' },
        { label: 'Listrik/Utilitas', icon: 'ph:lightning-bold' },
        { label: 'Kebersihan', icon: 'ph:sparkle-bold' },
        { label: 'Keamanan', icon: 'ph:shield-check-bold' },
        { label: 'Administrasi', icon: 'ph:file-text-bold' },
        { label: 'Pelayanan', icon: 'ph:chats-circle-bold' },
        { label: 'Lain-lain', icon: 'ph:dots-three-circle-bold' },
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
        description: '',
        icon: 'ph:folder-bold',
        order_index: 0,
        is_active: true,
    });

    const openCreateModal = () => {
        reset();
        setFormData({
            name: '',
            description: '',
            icon: 'ph:buildings-bold',
            order_index: categories.length + 1,
            is_active: true,
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (cat) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            description: cat.description || '',
            icon: cat.icon || 'ph:folder-bold',
            order_index: cat.order_index || 0,
            is_active: Boolean(cat.is_active),
        });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        post('/admin/master/categories', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingCategory) return;
        put(`/admin/master/categories/${editingCategory.id}`, {
            onSuccess: () => {
                setEditingCategory(null);
                reset();
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deletingCategory) return;
        router.delete(`/admin/master/categories/${deletingCategory.id}`, {
            onSuccess: () => setDeletingCategory(null),
        });
    };

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
            label: 'Nama Kategori',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <Icon icon={row.icon || 'ph:folder-bold'} className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-slate-900 hover:text-brand-600 transition">
                        {row.name}
                    </span>
                </div>
            ),
        },
        {
            key: 'description',
            label: 'Deskripsi',
            align: 'justify',
            sortable: true,
            render: (row) => (
                <p className="text-slate-500 max-w-sm line-clamp-2 leading-relaxed text-justify">{row.description || '-'}</p>
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
            key: 'tickets_count',
            label: 'Jumlah Tiket',
            align: 'center',
            sortable: true,
            render: (row) => (
                <span className="font-bold text-slate-800">{row.tickets_count || 0} Tiket</span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-center gap-1">
                    <Tooltip text="Edit Kategori">
                        <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Hapus Kategori">
                        <button
                            type="button"
                            onClick={() => setDeletingCategory(row)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                            <Icon icon="ph:trash-bold" className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Master Kategori Tiket - Admin">

            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="max-w-xl">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Icon icon="ph:folder-notch-open-bold" className="w-7 h-7 text-brand-600 shrink-0" />
                        <span>Master Kategori Tiket</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Kelola seluruh kategori opsi pembuatan tiket kendala secara dinamis.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl border border-transparent shadow-xs transition active:scale-98 shrink-0"
                    >
                        <Icon icon="ph:plus-bold" className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Tambah Kategori Baru</span>
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={categories}
                searchPlaceholder="Cari kategori atau deskripsi..."
                defaultSort={{ key: 'order_index', direction: 'asc' }}
                emptyMessage="Belum ada data kategori terdaftar."
            />

            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Tambah Master Kategori</h3>
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                            <Icon icon="ph:x-bold" className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Kategori <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData('name', e.target.value)}
                                placeholder="Contoh: Fasilitas, Peralatan, Kebersihan"
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {errors.name && <p className="text-[11px] text-rose-500 mt-0.5">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData('description', e.target.value)}
                                rows={2}
                                placeholder="Jelaskan jenis kendala yang tercakup..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ikon Kategori</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {iconPresets.map((p, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setFormData('icon', p.icon)}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition ${
                                            formData.icon === p.icon
                                                ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold ring-1 ring-brand-500'
                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon icon={p.icon} className="w-4 h-4" />
                                        <span className="truncate w-full text-center">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Tampilan</label>
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
                            Simpan Kategori
                        </button>
                    </div>
                </form>
            </Modal>

            {editingCategory && (
                <Modal show={Boolean(editingCategory)} onClose={() => setEditingCategory(null)} maxWidth="md">
                    <form onSubmit={handleEditSubmit} className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Edit Master Kategori</h3>
                            <button type="button" onClick={() => setEditingCategory(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nama Kategori <span className="text-rose-500">*</span>
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

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Ikon Kategori</label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {iconPresets.map((p, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setFormData('icon', p.icon)}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition ${
                                                formData.icon === p.icon
                                                    ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold ring-1 ring-brand-500'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Icon icon={p.icon} className="w-4 h-4" />
                                            <span className="truncate w-full text-center">{p.label}</span>
                                        </button>
                                    ))}
                                </div>
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
                            <button type="button" onClick={() => setEditingCategory(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                            >
                                Perbarui Kategori
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <Modal show={Boolean(deletingCategory)} onClose={() => setDeletingCategory(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                        <Icon icon="ph:warning-bold" className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Hapus Kategori Tiket?</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Apakah Anda yakin ingin menghapus kategori <span className="font-bold text-slate-800">"{deletingCategory?.name}"</span>?
                        {deletingCategory?.tickets_count > 0 && (
                            <span className="block mt-1 text-rose-600 font-semibold">
                                Perhatian: Terdapat {deletingCategory.tickets_count} tiket yang terkait dengan kategori ini.
                            </span>
                        )}
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDeletingCategory(null)}
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
