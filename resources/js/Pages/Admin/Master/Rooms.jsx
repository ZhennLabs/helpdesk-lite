import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import Tooltip from '@/Components/Tooltip';
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

// simpan daftar fasilitas tambahan di browser
const FACILITIES_STORAGE_KEY = 'helpdesk_room_facilities';

const PRESET_COLORS = [
    { label: 'Teal', value: '#0D9488' },
    { label: 'Blue', value: '#2563EB' },
    { label: 'Purple', value: '#7C3AED' },
    { label: 'Amber', value: '#D97706' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Rose', value: '#E11D48' },
];

export default function MasterRooms({ rooms = [] }) {
    const [viewMode, setViewMode] = useState('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [deletingRoom, setDeletingRoom] = useState(null);
    // state modal konfirmasi hapus fasilitas
    const [deletingFacility, setDeletingFacility] = useState(null);
    const [newFacility, setNewFacility] = useState('');
    const [facilityOptions, setFacilityOptions] = useState(() => {
        if (typeof window === 'undefined') return COMMON_FACILITIES;
        try {
            const saved = localStorage.getItem(FACILITIES_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {

        }
        return COMMON_FACILITIES;
    });

    const saveFacilityOptions = (next) => {
        setFacilityOptions(next);
        try {
            localStorage.setItem(FACILITIES_STORAGE_KEY, JSON.stringify(next));
        } catch {

        }
    };

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
        image: null,
        color: '#0D9488',
        is_active: true,
    });

    const {
        data: editData,
        setData: setEditData,
        post: postEdit,
        processing: submittingEdit,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        _method: 'put',
        name: '',
        code: '',
        capacity: 20,
        location: '',
        facilities: [],
        description: '',
        image: null,
        image_url: '',
        color: '#0D9488',
        is_active: true,
    });

    const openEditModal = (room) => {
        const roomFacilities = Array.isArray(room.facilities) ? [...room.facilities] : [];
        const missingFromOptions = roomFacilities.filter((f) => !facilityOptions.includes(f));
        if (missingFromOptions.length > 0) {
            saveFacilityOptions([...facilityOptions, ...missingFromOptions]);
        }
        setEditingRoom(room);
        setEditData({
            _method: 'put',
            name: room.name,
            code: room.code || '',
            capacity: room.capacity || 20,
            location: room.location || '',
            facilities: roomFacilities,
            description: room.description || '',
            image: null,
            image_url: room.image_url || '',
            color: room.color || '#0D9488',
            is_active: Boolean(room.is_active),
        });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        postCreate('/admin/master/rooms', {
            forceFormData: true,
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetCreate();
                toast.success('Ruangan baru berhasil ditambahkan!');
            },
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                toast.error(firstErr || 'Gagal menyimpan ruangan. Periksa kembali form isian.');
            },
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        if (!editingRoom) return;
        postEdit(`/admin/master/rooms/${editingRoom.id}`, {
            forceFormData: true,
            onSuccess: () => {
                setEditingRoom(null);
                resetEdit();
                toast.success('Data ruangan berhasil diperbarui!');
            },
            onError: (errs) => {
                const firstErr = Object.values(errs)[0];
                toast.error(firstErr || 'Gagal memperbarui data ruangan.');
            },
        });
    };

    const handleDeleteSubmit = () => {
        if (!deletingRoom) return;
        router.delete(`/admin/master/rooms/${deletingRoom.id}`, {
            onSuccess: () => {
                setDeletingRoom(null);
                toast.success('Ruangan berhasil dihapus.');
            },
            onError: () => {
                toast.error('Gagal menghapus ruangan.');
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

    const handleAddFacility = () => {
        const name = newFacility.trim();
        if (!name) return;

        const existing = facilityOptions.find((f) => f.toLowerCase() === name.toLowerCase());
        if (!existing) {
            saveFacilityOptions([...facilityOptions, name]);
        }

        setNewFacility('');
    };

    const handleRemoveFacility = () => {
        if (!deletingFacility) return;
        const facility = deletingFacility;
        saveFacilityOptions(facilityOptions.filter((f) => f !== facility));
        setCreateData('facilities', (createData.facilities || []).filter((f) => f !== facility));
        setEditData('facilities', (editData.facilities || []).filter((f) => f !== facility));
        setDeletingFacility(null);
        toast.success(`Fasilitas "${facility}" dihapus dari daftar.`);
    };

    const renderFacilitySelector = (isEdit = false) => {
        const selected = isEdit ? editData.facilities || [] : createData.facilities || [];
        return (
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Fasilitas Standar Tersedia</label>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-2.5">
                    {facilityOptions.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">
                            Belum ada daftar fasilitas. Tambahkan fasilitas baru di bawah.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {facilityOptions.map((fac) => {
                                const checked = selected.includes(fac);
                                return (
                                    <div
                                        key={fac}
                                        className={`group flex items-center justify-between gap-1.5 p-2 rounded-xl text-xs font-semibold transition border ${
                                            checked ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleFacility(fac, isEdit)}
                                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                        >
                                            <Icon
                                                icon={checked ? 'ph:check-square-fill' : 'ph:square'}
                                                className={`w-4 h-4 shrink-0 ${checked ? 'text-teal-600' : 'text-slate-400'}`}
                                            />
                                            <span className="truncate">{fac}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingFacility(fac)}
                                            title={`Hapus "${fac}"`}
                                            className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                                        >
                                            <Icon icon="ph:x-bold" className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/70">
                        <input
                            type="text"
                            value={newFacility}
                            onChange={(e) => setNewFacility(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddFacility();
                                }
                            }}
                            placeholder="Tambah fasilitas baru..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddFacility}
                            disabled={!newFacility.trim()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition disabled:opacity-40 shrink-0"
                        >
                            <Icon icon="ph:plus-bold" className="w-3.5 h-3.5" />
                            <span>Tambah</span>
                        </button>
                    </div>
                </div>
            </div>
        );
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
                <div className="flex items-center justify-center gap-1.5">
                    <Tooltip text="Edit Ruangan">
                        <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition"
                        >
                            <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Hapus Ruangan">
                        <button
                            type="button"
                            onClick={() => setDeletingRoom(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                            <Icon icon="ph:trash-bold" className="w-4 h-4" />
                        </button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Master Ruangan - Admin Helpdesk">

            <div
                style={{ background: 'linear-gradient(135deg, #176B54 0%, #1B775E 50%, #125844 100%)' }}
                className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 mb-6 shadow-sm border border-emerald-900/20"
            >

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
                            Kelola daftar ruangan rapat, aula, fasilitas pendukung, kapasitas peserta, dan ketersediaan ruangan untuk peminjaman di RS Antam Medika.
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-500">Total Ruangan</span>
                        <p className="mt-1.5 text-2xl font-extrabold text-slate-900">{rooms.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Icon icon="ph:door-bold" className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-emerald-600">Ruangan Aktif</span>
                        <p className="mt-1.5 text-2xl font-extrabold text-emerald-600">{rooms.filter((r) => r.is_active).length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Icon icon="ph:check-circle-bold" className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-teal-600">Total Kapasitas</span>
                        <p className="mt-1.5 text-2xl font-extrabold text-teal-700">
                            {rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)} <span className="text-sm font-bold">Kursi</span>
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Icon icon="ph:users-three-bold" className="w-5 h-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-blue-600">Booking Aktif</span>
                        <p className="mt-1.5 text-2xl font-extrabold text-blue-600">
                            {rooms.reduce((acc, r) => acc + (r.active_bookings_count || 0), 0)}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Icon icon="ph:calendar-check-bold" className="w-5 h-5" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-800">
                    Daftar Ruangan <span className="text-slate-400 font-semibold">({rooms.length})</span>
                </h2>

                <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            viewMode === 'grid' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Tampilan Kartu"
                    >
                        <Icon icon="ph:squares-four-bold" className="w-4 h-4" />
                        <span>Katalog</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            viewMode === 'table' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                        title="Tampilan Tabel"
                    >
                        <Icon icon="ph:table-bold" className="w-4 h-4" />
                        <span>Tabel</span>
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                        >
                            <div>

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

            <Modal
                show={isCreateModalOpen}
                closeable={!deletingFacility}
                onClose={() => {
                    if (!deletingFacility) setIsCreateModalOpen(false);
                }}
                maxWidth="2xl"
            >
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
                                {createErrors.code && <p className="text-[11px] text-red-600 mt-1">{createErrors.code}</p>}
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
                                {createErrors.capacity && <p className="text-[11px] text-red-600 mt-1">{createErrors.capacity}</p>}
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
                                {createErrors.location && <p className="text-[11px] text-red-600 mt-1">{createErrors.location}</p>}
                            </div>
                        </div>

                        {renderFacilitySelector(false)}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Foto Sampul Ruangan</label>
                                <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-brand-400 bg-slate-50/70 hover:bg-brand-50/30 cursor-pointer transition">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Icon icon="ph:upload-simple-bold" className="w-4 h-4 text-brand-600 shrink-0" />
                                        <span className="text-xs text-slate-600 truncate">
                                            {createData.image ? createData.image.name : 'Pilih foto ruangan (JPG, PNG, WEBP)'}
                                        </span>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shrink-0">
                                        Upload
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(e) => setCreateData('image', e.target.files?.[0] || null)}
                                    />
                                </label>
                                {createErrors.image && <p className="text-[11px] text-red-600 mt-1">{createErrors.image}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Warna Label Kalender</label>
                                <div className="flex items-center gap-2.5 h-[34px] pl-1">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            type="button"
                                            key={c.value}
                                            onClick={() => setCreateData('color', c.value)}
                                            className={`w-5 h-5 rounded-full transition-transform shrink-0 ${
                                                createData.color === c.value ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
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

            {editingRoom && (
                <Modal
                    show={Boolean(editingRoom)}
                    closeable={!deletingFacility}
                    onClose={() => {
                        if (!deletingFacility) setEditingRoom(null);
                    }}
                    maxWidth="2xl"
                >
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

                            {renderFacilitySelector(true)}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Foto Sampul Ruangan</label>
                                    <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-brand-400 bg-slate-50/70 hover:bg-brand-50/30 cursor-pointer transition">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Icon icon="ph:upload-simple-bold" className="w-4 h-4 text-brand-600 shrink-0" />
                                            <span className="text-xs text-slate-600 truncate">
                                                {editData.image ? editData.image.name : (editData.image_url ? 'Ganti foto ruangan...' : 'Pilih foto ruangan (JPG, PNG, WEBP)')}
                                            </span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shrink-0">
                                            Upload
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => setEditData('image', e.target.files?.[0] || null)}
                                        />
                                    </label>
                                    {editErrors.image && <p className="text-[11px] text-red-600 mt-1">{editErrors.image}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Warna Label Kalender</label>
                                    <div className="flex items-center gap-2.5 h-[34px] pl-1">
                                        {PRESET_COLORS.map((c) => (
                                            <button
                                                type="button"
                                                key={c.value}
                                                onClick={() => setEditData('color', c.value)}
                                                className={`w-5 h-5 rounded-full transition-transform shrink-0 ${
                                                    editData.color === c.value ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110'
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

            {deletingFacility && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
                    onClick={() => setDeletingFacility(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Icon icon="ph:warning-bold" className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 text-center">Hapus Fasilitas?</h3>
                        <p className="text-xs text-slate-500 text-center mt-1">
                            Apakah Anda yakin ingin menghapus fasilitas <strong>{deletingFacility}</strong> dari daftar pilihan?
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingFacility(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveFacility}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                            >
                                Ya, Hapus Fasilitas
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
