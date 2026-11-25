import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import Tooltip from '@/Components/Tooltip';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

export default function MasterUsers({ admins = [], regularUsers = [] }) {
    const [activeTab, setActiveTab] = useState('admins');
    const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [deletingAdmin, setDeletingAdmin] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const {
        data: createData,
        setData: setCreateData,
        post: postAdmin,
        processing: creatingAdmin,
        errors: createErrors,
        reset: resetCreateForm,
    } = useForm({
        name: '',
        email: '',
        password: '',
        unit: 'Management / IT',
        sub_unit: 'Pusat Kontrol',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putAdmin,
        processing: updatingAdmin,
        errors: editErrors,
        reset: resetEditForm,
    } = useForm({
        name: '',
        email: '',
        password: '',
        unit: '',
        sub_unit: '',
        is_active: true,
    });

    const handleCreateAdminSubmit = (e) => {
        e.preventDefault();
        postAdmin('/admin/master/users', {
            onSuccess: () => {
                setIsCreateAdminModalOpen(false);
                resetCreateForm();
                toast.success('Akun Administrator baru berhasil ditambahkan!');
            },
            onError: (errs) => {
                const first = Object.values(errs)[0];
                toast.error(first || 'Gagal menambahkan administrator.');
            },
        });
    };

    const openEditAdmin = (adm) => {
        setEditingAdmin(adm);
        setEditData({
            name: adm.name,
            email: adm.email,
            password: '',
            unit: adm.unit || '',
            sub_unit: adm.sub_unit || '',
            is_active: Boolean(adm.is_active),
        });
    };

    const handleEditAdminSubmit = (e) => {
        e.preventDefault();
        if (!editingAdmin) return;
        putAdmin(`/admin/master/users/${editingAdmin.id}`, {
            onSuccess: () => {
                setEditingAdmin(null);
                resetEditForm();
                toast.success('Data administrator berhasil diperbarui!');
            },
            onError: (errs) => {
                const first = Object.values(errs)[0];
                toast.error(first || 'Gagal memperbarui administrator.');
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deletingAdmin) return;
        router.delete(`/admin/master/users/${deletingAdmin.id}`, {
            onSuccess: () => {
                setDeletingAdmin(null);
                toast.success('Administrator berhasil dihapus.');
            },
            onError: () => {
                toast.error('Gagal menghapus administrator.');
            },
        });
    };

    const handleSyncRsam = () => {
        if (isSyncing) return;
        setIsSyncing(true);
        router.post(
            '/admin/master/users/sync-rsam',
            {},
            {
                onFinish: () => setIsSyncing(false),
            }
        );
    };

    const userList = useMemo(() => {
        return Array.isArray(regularUsers) ? regularUsers : regularUsers?.data || [];
    }, [regularUsers]);

    const adminColumns = [
        {
            key: 'no',
            label: 'No',
            width: '50px',
            align: 'center',
            sortable: false,
            render: (row, idx, globalIdx) => (
                <span className="font-mono font-bold text-slate-400">{globalIdx + 1}</span>
            ),
        },
        {
            key: 'name',
            label: 'Nama Administrator',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <img
                        src={row.avatar_url || 'https://ui-avatars.com/api/?name=Admin&background=0D9488&color=fff'}
                        alt={row.name}
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-brand-500/20 shrink-0"
                    />
                    <div>
                        <span className="font-extrabold text-slate-900 block leading-tight hover:text-brand-600 transition">
                            {row.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Administrator Sistem</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            label: 'Email Login',
            sortable: true,
            render: (row) => (
                <span className="font-mono text-xs text-slate-700">{row.email}</span>
            ),
        },
        {
            key: 'unit',
            label: 'Unit / Bagian',
            sortable: true,
            render: (row) => (
                <div className="text-xs">
                    <span className="font-bold text-slate-800">{row.unit || 'Management / IT'}</span>
                    {row.sub_unit && (
                        <span className="text-[11px] text-slate-500 block">• {row.sub_unit}</span>
                    )}
                </div>
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
                            : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
            ),
        },
        {
            key: 'source',
            label: 'Tipe Akun',
            align: 'center',
            sortable: false,
            render: () => (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Icon icon="ph:shield-check-bold" className="w-3 h-3" />
                    <span>Admin Lokal</span>
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-center gap-1">
                    <Tooltip text="Edit Admin">
                        <button
                            type="button"
                            onClick={() => openEditAdmin(row)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                        >
                            <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Hapus Admin">
                        <button
                            type="button"
                            onClick={() => setDeletingAdmin(row)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                            <Icon icon="ph:trash-bold" className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    const userColumns = [
        {
            key: 'no',
            label: 'No',
            width: '50px',
            align: 'center',
            sortable: false,
            render: (row, idx, globalIdx) => (
                <span className="font-mono font-bold text-slate-400">{globalIdx + 1}</span>
            ),
        },
        {
            key: 'name',
            label: 'Nama Pegawai',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <img
                        src={row.avatar_url || 'https://ui-avatars.com/api/?name=User&background=0D9488&color=fff'}
                        alt={row.name}
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-teal-500/20 shrink-0"
                    />
                    <div>
                        <span className="font-extrabold text-slate-900 block leading-tight hover:text-brand-600 transition">
                            {row.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">User Helpdesk RSAM</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            label: 'Email Akun RSAM',
            sortable: true,
            render: (row) => (
                <span className="font-mono text-xs text-slate-700">{row.email}</span>
            ),
        },
        {
            key: 'unit',
            label: 'Unit Kerja',
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200">
                    <Icon icon="ph:buildings-bold" className="w-3.5 h-3.5 text-brand-600" />
                    <span>{row.unit || 'Umum'}</span>
                </span>
            ),
        },
        {
            key: 'sub_unit',
            label: 'Sub-Unit / Ruangan',
            sortable: true,
            render: (row) => (
                <span className="text-slate-600 text-xs font-medium">
                    {row.sub_unit ? `• ${row.sub_unit}` : '-'}
                </span>
            ),
        },
        {
            key: 'tickets_count',
            label: 'Total Tiket',
            align: 'center',
            sortable: true,
            render: (row) => (
                <span className="font-bold text-slate-800">{row.tickets_count || 0} Tiket</span>
            ),
        },
        {
            key: 'source',
            label: 'Sumber Data',
            align: 'center',
            sortable: false,
            render: () => (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    <Icon icon="ph:cloud-check-bold" className="w-3 h-3" />
                    <span>Data Pusat</span>
                </span>
            ),
        },
    ];

    return (
        <AppLayout title="Master Pengguna & Administrator - Admin">

            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="max-w-xl">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Icon icon="ph:users-three-bold" className="w-7 h-7 text-brand-600 shrink-0" />
                        <span>Master Pengguna & Administrator</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Kelola akun admin dan daftar pegawai yang terdaftar.
                    </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleSyncRsam}
                        disabled={isSyncing}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition active:scale-98 disabled:opacity-50 shrink-0"
                        title="Perbarui data pegawai dari pusat"
                    >
                        <Icon
                            icon={isSyncing ? 'ph:spinner-bold' : 'ph:cloud-arrow-down-bold'}
                            className={`w-4 h-4 text-teal-600 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                        <span className="whitespace-nowrap">{isSyncing ? 'Memperbarui...' : 'Perbarui Data Pegawai'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            resetCreateForm();
                            setIsCreateAdminModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl border border-transparent shadow-xs transition active:scale-98 shrink-0"
                    >
                        <Icon icon="ph:plus-bold" className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Tambah Admin Baru</span>
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('admins')}
                    className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
                        activeTab === 'admins'
                            ? 'text-brand-600 border-b-2 border-brand-600'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Icon icon="ph:shield-check-bold" className="w-4 h-4" />
                    <span>Administrator Lokal</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-200">
                        {admins.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
                        activeTab === 'users'
                            ? 'text-brand-600 border-b-2 border-brand-600'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Icon icon="ph:user-bold" className="w-4 h-4" />
                    <span>Pengguna Biasa (Read-Only)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {userList.length} Akun RSAM
                    </span>
                </button>
            </div>

            {activeTab === 'admins' && (
                <div className="space-y-4">
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                        <Icon icon="ph:info-bold" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-900 leading-relaxed">
                            <span className="font-bold block text-amber-950">Manajemen Khusus Administrator</span>
                            Akun admin dikelola langsung di sini. Anda dapat menambah akun admin baru, mengganti kata sandi, atau mengubah status aktif.
                        </div>
                    </div>

                    <DataTable
                        columns={adminColumns}
                        data={admins}
                        searchPlaceholder="Cari nama admin, email, unit..."
                        defaultSort={{ key: 'name', direction: 'asc' }}
                        emptyMessage="Belum ada data administrator lokal terdaftar."
                    />
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                        <Icon icon="ph:info-bold" className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-sky-900 leading-relaxed">
                            <span className="font-bold block text-sky-950">Daftar Pegawai (Otomatis dari Pusat)</span>
                            Daftar akun pegawai di bawah ini ditarik secara terpusat dari server Helpdesk RSAM. Pengguna dapat langsung login ke Helpdesk Lite menggunakan email dan kata sandi RSAM mereka.
                        </div>
                    </div>

                    <DataTable
                        columns={userColumns}
                        data={userList}
                        searchPlaceholder="Cari nama pegawai, email RSAM, unit kerja..."
                        defaultSort={{ key: 'name', direction: 'asc' }}
                        emptyMessage="Belum ada data pegawai yang tersedia."
                    />
                </div>
            )}

            <Modal show={isCreateAdminModalOpen} onClose={() => setIsCreateAdminModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateAdminSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Tambah Administrator Baru</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Tambahkan akun admin baru untuk mengelola helpdesk.</p>
                        </div>
                        <button type="button" onClick={() => setIsCreateAdminModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                            <Icon icon="ph:x-bold" className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={createData.name}
                                onChange={(e) => setCreateData('name', e.target.value)}
                                placeholder="Contoh: Admin ICT Support"
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {createErrors.name && <p className="text-[11px] text-rose-500 mt-0.5">{createErrors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Alamat Email Login <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={createData.email}
                                onChange={(e) => setCreateData('email', e.target.value)}
                                placeholder="admin@rsam.co.id"
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {createErrors.email && <p className="text-[11px] text-rose-500 mt-0.5">{createErrors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Kata Sandi <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={createData.password}
                                onChange={(e) => setCreateData('password', e.target.value)}
                                placeholder="Minimal 6 karakter"
                                required
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {createErrors.password && <p className="text-[11px] text-rose-500 mt-0.5">{createErrors.password}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Bagian</label>
                                <input
                                    type="text"
                                    value={createData.unit}
                                    onChange={(e) => setCreateData('unit', e.target.value)}
                                    placeholder="Management / IT"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Sub Unit</label>
                                <input
                                    type="text"
                                    value={createData.sub_unit}
                                    onChange={(e) => setCreateData('sub_unit', e.target.value)}
                                    placeholder="Helpdesk Admin"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setIsCreateAdminModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={creatingAdmin}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                        >
                            Simpan Administrator
                        </button>
                    </div>
                </form>
            </Modal>

            {editingAdmin && (
                <Modal show={Boolean(editingAdmin)} onClose={() => setEditingAdmin(null)} maxWidth="md">
                    <form onSubmit={handleEditAdminSubmit} className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Edit Administrator</h3>
                            <button type="button" onClick={() => setEditingAdmin(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Nama Lengkap <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData('name', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                                {editErrors.name && <p className="text-[11px] text-rose-500 mt-0.5">{editErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Alamat Email Login <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={editData.email}
                                    onChange={(e) => setEditData('email', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                                {editErrors.email && <p className="text-[11px] text-rose-500 mt-0.5">{editErrors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Kata Sandi Baru (Kosongkan jika tidak ingin mengubah)
                                </label>
                                <input
                                    type="password"
                                    value={editData.password}
                                    onChange={(e) => setEditData('password', e.target.value)}
                                    placeholder="Masukkan sandi baru jika ingin reset"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                                />
                                {editErrors.password && <p className="text-[11px] text-rose-500 mt-0.5">{editErrors.password}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Bagian</label>
                                    <input
                                        type="text"
                                        value={editData.unit}
                                        onChange={(e) => setEditData('unit', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Sub Unit</label>
                                    <input
                                        type="text"
                                        value={editData.sub_unit}
                                        onChange={(e) => setEditData('sub_unit', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editData.is_active}
                                        onChange={(e) => setEditData('is_active', e.target.checked)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700">Status Akun Aktif</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setEditingAdmin(null)} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={updatingAdmin}
                                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                            >
                                Perbarui Administrator
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <Modal show={Boolean(deletingAdmin)} onClose={() => setDeletingAdmin(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                        <Icon icon="ph:warning-bold" className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Hapus Akun Administrator?</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Apakah Anda yakin ingin menghapus administrator <span className="font-bold text-slate-800">"{deletingAdmin?.name}"</span> ({deletingAdmin?.email})?
                        Akun ini tidak akan dapat login lagi ke sistem.
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDeletingAdmin(null)}
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
