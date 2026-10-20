import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

const COMMON_FACILITIES = [
    'Proyektor HD',
    'Sound System & Mic Wireless',
    'AC Sentral',
    'AC Split',
    'Smart TV Layar Besar',
    'Video Conference Zoom',
    'Whiteboard Glass',
    'Podium Pidato',
    'Panggung Utama',
    'Area Meja Konsumsi',
    'Webcam PTZ 4K',
    'WiFi Dedicated',
];

const PRESET_COLORS = [
    { label: 'Teal', value: '#0D9488' },
    { label: 'Blue', value: '#2563EB' },
    { label: 'Purple', value: '#7C3AED' },
    { label: 'Amber', value: '#D97706' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Rose', value: '#E11D48' },
];

export default function MasterRooms({ rooms = [] }) {
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [deletingRoom, setDeletingRoom] = useState(null);

    // Form Tambah Ruangan
    const {
        data: createData,
        setData: setCreateData,
        post: postCreate,
        processing: submittingCreate,
        errors: createErrors,
        reset: resetCreate,
    } = useForm({
        name: '',
        code: '',
        capacity: 25,
        location: '',
        facilities: ['Proyektor HD', 'AC Sentral', 'Sound System & Mic Wireless'],
        description: '',
        image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
        color: '#0D9488',
        is_active: true,
    });

    // Form Edit Ruangan
    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: submittingEdit,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        name: '',
        code: '',
        capacity: 20,
        location: '',
        facilities: [],
        description: '',
        image_url: '',
        color: '#0D9488',
        is_active: true,
    });

    const openEditModal = (room) => {
        setEditingRoom(room);
        setEditData({
            name: room.name,
            code: room.code || '',
            capacity: room.capacity || 20,
            location: room.location || '',
            facilities: Array.isArray(room.facilities) ? [...room.facilities] : [],
            description: room.description || '',
            image_url: room.image_url || '',
            color: room.color || '#0D9488',
            is_active: Boolean(room.is_active),
        });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        postCreate('/admin/master/rooms', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetCreate();
            },
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingRoom) return;
        putEdit(`/admin/master/rooms/${editingRoom.id}`, {
            onSuccess: () => {
                setEditingRoom(null);
                resetEdit();
            },
        });
    };

    const handleDeleteSubmit = () => {
        if (!deletingRoom) return;
        router.delete(`/admin/master/rooms/${deletingRoom.id}`, {
            onSuccess: () => {
                setDeletingRoom(null);
            },
        });
    };

    const toggleFacility = (facility, isEdit = false) => {
        if (isEdit) {
            const current = editData.facilities || [];
            if (current.includes(facility)) {
                setEditData('facilities', current.filter((f) => f !== facility));
            } else {
                setEditData('facilities', [...current, facility]);
            }
        } else {
            const current = createData.facilities || [];
            if (current.includes(facility)) {
                setCreateData('facilities', current.filter((f) => f !== facility));
            } else {
                setCreateData('facilities', [...current, facility]);
            }
        }
    };

    const columns = [
        {
            key: 'name',
            label: 'Ruangan & Foto',
            sortable: true,
            render: (r) => (
                <div className="flex items-center gap-3">
                    <img
                        src={r.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=80'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{r.name}</span>
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: r.color || '#0D9488' }}
                                title="Warna label kalender"
                            />
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{r.code}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'location',
            label: 'Lokasi & Lantai',
            sortable: true,
            render: (r) => (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <Icon icon="ph:map-pin-bold" className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{r.location}</span>
                </div>
            ),
        },
        {
            key: 'capacity',
            label: 'Kapasitas',
            align: 'center',
            sortable: true,
            render: (r) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                    <Icon icon="ph:users-bold" className="w-3.5 h-3.5 text-slate-500" />
                    <span>{r.capacity} Orang</span>
                </span>
            ),
        },
        {
            key: 'facilities',
            label: 'Fasilitas Utama',
            render: (r) => (
                <div className="flex flex-wrap gap-1 max-w-xs">
                    {(r.facilities || []).slice(0, 3).map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                            {f}
                        </span>
                    ))}
                    {(r.facilities || []).length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-brand-50 text-brand-700">
                            +{r.facilities.length - 3}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'bookings',
            label: 'Booking Aktif',
            align: 'center',
            sortable: true,
            render: (r) => (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    {r.active_bookings_count} Aktif
                </span>
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            align: 'center',
            sortable: true,
            render: (r) => (
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{r.is_active ? 'Aktif' : 'Nonaktif'}</span>
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            render: (r) => (
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition"
                        title="Edit Ruangan"
                    >
                        <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeletingRoom(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Hapus Ruangan"
                    >
                        <Icon icon="ph:trash-bold" className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Master Ruangan - Admin Helpdesk">
            {/* Header Hero */}
            <div
                style={{ background: 'linear-gradient(135deg, #176B54 0%, #1B775E 50%, #125844 100%)' }}
                className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 mb-6 shadow-sm border border-emerald-900/20"
            >
                {/* Subtle pattern background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
                            <Icon icon="ph:door-bold" className="w-4 h-4" />
                            <span>Pusat Data Master Fasilitas</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">Master Ruangan Pertemuan</h1>
                        <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 max-w-xl font-normal leading-relaxed">
                            Kelola daftar ruangan rapat, aula, fasilitas pendukung, kapasitas peserta, dan ketersediaan ruangan untuk sistem peminjaman RS Antam Medika.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2.5 bg-white text-[#176B54] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition active:scale-98 inline-flex items-center gap-2"
                        >
                            <Icon icon="ph:plus-circle-bold" className="w-4 h-4 text-[#176B54]" />
                            <span>Tambah Ruangan Baru</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats & View Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
                    <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ruangan</span>
                        <p className="text-xl font-extrabold text-slate-900 mt-0.5">{rooms.length}</p>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ruangan Aktif</span>
                        <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{rooms.filter((r) => r.is_active).length}</p>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Total Kapasitas</span>
                        <p className="text-xl font-extrabold text-teal-700 mt-0.5">
                            {rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)} Kursi
                        </p>
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Booking Aktif</span>
                        <p className="text-xl font-extrabold text-blue-600 mt-0.5">
                            {rooms.reduce((acc, r) => acc + (r.active_bookings_count || 0), 0)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                            viewMode === 'grid' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="Tampilan Kartu Visual"
                    >
                        <Icon icon="ph:squares-four-bold" className="w-4 h-4" />
                        <span className="hidden sm:inline">Katalog</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                            viewMode === 'table' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="Tampilan Tabel Data"
                    >
                        <Icon icon="ph:table-bold" className="w-4 h-4" />
                        <span className="hidden sm:inline">Tabel</span>
                    </button>
                </div>
            </div>

            {/* Content: Grid Cards atau DataTable */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                        >
                            <div>
                                {/* Foto Cover Ruangan */}
                                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                                    <img
                                        src={room.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'}
                                        alt={room.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-white/90 text-slate-900 shadow-sm backdrop-blur-xs">
                                            {room.code}
                                        </span>
                                        <span
                                            className={`px-2 py-0.5 rounded-xl text-[10px] font-bold border backdrop-blur-xs ${
                                                room.is_active ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-slate-500/90 text-white border-slate-400'
                                            }`}
                                        >
                                            {room.is_active ? 'Tersedia' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                                        <span className="text-xs font-semibold flex items-center gap-1 drop-shadow-sm">
                                            <Icon icon="ph:map-pin-bold" className="w-3.5 h-3.5 text-teal-300" />
                                            {room.location}
                                        </span>
                                        <span className="text-xs font-bold bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                                            {room.capacity} Kursi
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: room.color || '#0D9488' }}
                                        />
                                        <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition leading-snug line-clamp-1">
                                            {room.name}
                                        </h3>
                                    </div>

                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                        {room.description || 'Tidak ada deskripsi khusus untuk ruangan ini.'}
                                    </p>

                                    {/* Fasilitas Pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {(room.facilities || []).slice(0, 4).map((f, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200/70"
                                            >
                                                <Icon icon="ph:check-circle-bold" className="w-3 h-3 text-teal-600" />
                                                <span>{f}</span>
                                            </span>
                                        ))}
                                        {(room.facilities || []).length > 4 && (
                                            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                +{room.facilities.length - 4} fasilitas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-500">
                                    Booking aktif: <strong className="text-slate-900">{room.active_bookings_count}</strong>
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(room)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1"
                                    >
                                        <Icon icon="ph:pencil-simple-bold" className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeletingRoom(room)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                        title="Hapus Ruangan"
                                    >
                                        <Icon icon="ph:trash-bold" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
                    <DataTable
                        columns={columns}
                        data={rooms}
                        searchPlaceholder="Cari nama ruangan, kode, atau lokasi..."
                        defaultSort={{ key: 'name', direction: 'asc' }}
                        emptyMessage="Belum ada data ruangan pertemuan."
                    />
                </div>
            )}

            {/* Modal Tambah Ruangan Baru */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleCreateSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <Icon icon="ph:door-bold" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Tambah Ruangan Baru</h3>
                                <p className="text-xs text-slate-500">Daftarkan ruang pertemuan untuk sistem peminjaman.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Ruangan *</label>
                                <input
                                    type="text"
                                    value={createData.name}
                                    onChange={(e) => setCreateData('name', e.target.value)}
                                    placeholder="Contoh: Ruang Rapat Komite Medik Lt. 3"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                                {createErrors.name && <p className="text-[11px] text-red-600 mt-1">{createErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Ruangan</label>
                                <input
                                    type="text"
                                    value={createData.code}
                                    onChange={(e) => setCreateData('code', e.target.value)}
                                    placeholder="R-MEDIK-01"
                                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Maksimal (Orang) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={createData.capacity}
                                    onChange={(e) => setCreateData('capacity', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi / Lantai Gedung *</label>
                                <input
                                    type="text"
                                    value={createData.location}
                                    onChange={(e) => setCreateData('location', e.target.value)}
                                    placeholder="Gedung Utama Lantai 2"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Fasilitas Standar Tersedia</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                                {COMMON_FACILITIES.map((fac) => {
                                    const checked = (createData.facilities || []).includes(fac);
                                    return (
                                        <button
                                            type="button"
                                            key={fac}
                                            onClick={() => toggleFacility(fac, false)}
                                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left transition border ${
                                                checked ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Icon
                                                icon={checked ? 'ph:check-square-fill' : 'ph:square'}
                                                className={`w-4 h-4 shrink-0 ${checked ? 'text-teal-600' : 'text-slate-400'}`}
                                            />
                                            <span className="truncate">{fac}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1">URL Foto Sampul Ruangan</label>
                                <input
                                    type="url"
                                    value={createData.image_url}
                                    onChange={(e) => setCreateData('image_url', e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Warna Label Kalender</label>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            type="button"
                                            key={c.value}
                                            onClick={() => setCreateData('color', c.value)}
                                            className={`w-6 h-6 rounded-full transition-transform ${
                                                createData.color === c.value ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                                            }`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ruangan</label>
                            <textarea
                                value={createData.description}
                                onChange={(e) => setCreateData('description', e.target.value)}
                                rows={2}
                                placeholder="Keterangan peruntukan ruangan, tata tertib, atau informasi pendukung lainnya..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="create_is_active"
                                checked={createData.is_active}
                                onChange={(e) => setCreateData('is_active', e.target.checked)}
                                className="rounded text-brand-600 focus:ring-brand-500"
                            />
                            <label htmlFor="create_is_active" className="text-xs font-bold text-slate-700">
                                Ruangan aktif dan dapat dipinjam oleh seluruh unit
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingCreate}
                            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                        >
                            {submittingCreate ? 'Menyimpan...' : 'Simpan Ruangan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Edit Ruangan */}
            {editingRoom && (
                <Modal show={Boolean(editingRoom)} onClose={() => setEditingRoom(null)} maxWidth="2xl">
                    <form onSubmit={handleEditSubmit} className="p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Edit Ruangan: {editingRoom.name}</h3>
                                <p className="text-xs text-slate-500">Perbarui informasi kapasitas, fasilitas, dan status ruangan.</p>
                            </div>
                            <button type="button" onClick={() => setEditingRoom(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Ruangan *</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => setEditData('name', e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Kode Ruangan</label>
                                    <input
                                        type="text"
                                        value={editData.code}
                                        onChange={(e) => setEditData('code', e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Maksimal (Orang) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editData.capacity}
                                        onChange={(e) => setEditData('capacity', e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi / Lantai Gedung *</label>
                                    <input
                                        type="text"
                                        value={editData.location}
                                        onChange={(e) => setEditData('location', e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Fasilitas Standar Tersedia</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                                    {COMMON_FACILITIES.map((fac) => {
                                        const checked = (editData.facilities || []).includes(fac);
                                        return (
                                            <button
                                                type="button"
                                                key={fac}
                                                onClick={() => toggleFacility(fac, true)}
                                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left transition border ${
                                                    checked ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                <Icon
                                                    icon={checked ? 'ph:check-square-fill' : 'ph:square'}
                                                    className={`w-4 h-4 shrink-0 ${checked ? 'text-teal-600' : 'text-slate-400'}`}
                                                />
                                                <span className="truncate">{fac}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">URL Foto Sampul</label>
                                    <input
                                        type="url"
                                        value={editData.image_url}
                                        onChange={(e) => setEditData('image_url', e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Warna Label Kalender</label>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {PRESET_COLORS.map((c) => (
                                            <button
                                                type="button"
                                                key={c.value}
                                                onClick={() => setEditData('color', c.value)}
                                                className={`w-6 h-6 rounded-full transition-transform ${
                                                    editData.color === c.value ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
                                                }`}
                                                style={{ backgroundColor: c.value }}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Ruangan</label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData('description', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit_is_active"
                                    checked={editData.is_active}
                                    onChange={(e) => setEditData('is_active', e.target.checked)}
                                    className="rounded text-brand-600 focus:ring-brand-500"
                                />
                                <label htmlFor="edit_is_active" className="text-xs font-bold text-slate-700">
                                    Ruangan aktif dan dapat dipinjam
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingRoom(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submittingEdit}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                            >
                                {submittingEdit ? 'Menyimpan...' : 'Perbarui Ruangan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal Konfirmasi Hapus */}
            {deletingRoom && (
                <Modal show={Boolean(deletingRoom)} onClose={() => setDeletingRoom(null)} maxWidth="sm">
                    <div className="p-6">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Icon icon="ph:warning-bold" className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 text-center">Hapus Ruangan?</h3>
                        <p className="text-xs text-slate-500 text-center mt-1">
                            Apakah Anda yakin ingin menghapus ruangan <strong>{deletingRoom.name}</strong>? Tindakan ini tidak dapat dibatalkan jika ruangan belum memiliki riwayat booking.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingRoom(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSubmit}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                            >
                                Ya, Hapus Ruangan
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
