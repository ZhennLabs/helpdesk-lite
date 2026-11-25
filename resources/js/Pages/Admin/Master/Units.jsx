import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import { Icon } from '@iconify/react';

export default function MasterUnits({ units = [] }) {
    const [activeTab, setActiveTab] = useState('units');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [selectedUnitFilter, setSelectedUnitFilter] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);

    const [expandedUnitIds, setExpandedUnitIds] = useState({});

    const [isCreateUnitModalOpen, setIsCreateUnitModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState(null);
    const [addingSubUnitTarget, setAddingSubUnitTarget] = useState(null);
    const [isGeneralAddSubUnitModalOpen, setIsGeneralAddSubUnitModalOpen] = useState(false);
    const [selectedUnitIdForNewSubUnit, setSelectedUnitIdForNewSubUnit] = useState('');
    const [editingSubUnit, setEditingSubUnit] = useState(null);
    const [deletingTarget, setDeletingTarget] = useState(null);

    const {
        data: createUnitData,
        setData: setCreateUnitData,
        post: postUnit,
        processing: submittingUnit,
        errors: unitErrors,
        reset: resetCreateUnit,
    } = useForm({
        name: '',
        description: '',
        sub_units: [''],
    });

    const {
        data: editUnitData,
        setData: setEditUnitData,
        put: putUnit,
        processing: updatingUnit,
        errors: editUnitErrors,
        reset: resetEditUnit,
    } = useForm({
        name: '',
        description: '',
        is_active: true,
    });

    const {
        data: createSubUnitData,
        setData: setCreateSubUnitData,
        post: postSubUnit,
        processing: submittingSubUnit,
        errors: subUnitErrors,
        reset: resetCreateSubUnit,
    } = useForm({
        name: '',
        description: '',
    });

    const {
        data: editSubUnitData,
        setData: setEditSubUnitData,
        put: putSubUnit,
        processing: updatingSubUnit,
        errors: editSubUnitErrors,
        reset: resetEditSubUnit,
    } = useForm({
        name: '',
        description: '',
        is_active: true,
    });

    const toggleExpandUnit = (id) => {
        setExpandedUnitIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleSyncRsam = () => {
        if (isSyncing) return;
        setIsSyncing(true);
        router.post(
            '/admin/master/units/sync-rsam',
            {},
            {
                onFinish: () => setIsSyncing(false),
            }
        );
    };

    const handleAddSubUnitRow = () => {
        setCreateUnitData('sub_units', [...createUnitData.sub_units, '']);
    };

    const handleRemoveSubUnitRow = (index) => {
        const updated = [...createUnitData.sub_units];
        updated.splice(index, 1);
        setCreateUnitData('sub_units', updated.length > 0 ? updated : ['']);
    };

    const handleSubUnitRowChange = (index, val) => {
        const updated = [...createUnitData.sub_units];
        updated[index] = val;
        setCreateUnitData('sub_units', updated);
    };

    const handleCreateUnitSubmit = (e) => {
        e.preventDefault();
        postUnit('/admin/master/units', {
            onSuccess: () => {
                setIsCreateUnitModalOpen(false);
                resetCreateUnit();
            },
        });
    };

    const handleEditUnitSubmit = (e) => {
        e.preventDefault();
        if (!editingUnit) return;
        putUnit(`/admin/master/units/${editingUnit.id}`, {
            onSuccess: () => {
                setEditingUnit(null);
                resetEditUnit();
            },
        });
    };

    const handleCreateSubUnitSubmit = (e) => {
        e.preventDefault();
        const targetUnitId = addingSubUnitTarget?.id || selectedUnitIdForNewSubUnit;
        if (!targetUnitId) return;

        postSubUnit(`/admin/master/units/${targetUnitId}/sub-units`, {
            onSuccess: () => {
                setAddingSubUnitTarget(null);
                setIsGeneralAddSubUnitModalOpen(false);
                setSelectedUnitIdForNewSubUnit('');
                resetCreateSubUnit();
            },
        });
    };

    const handleEditSubUnitSubmit = (e) => {
        e.preventDefault();
        if (!editingSubUnit) return;
        putSubUnit(`/admin/master/sub-units/${editingSubUnit.id}`, {
            onSuccess: () => {
                setEditingSubUnit(null);
                resetEditSubUnit();
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!deletingTarget) return;

        if (deletingTarget.type === 'unit') {
            router.delete(`/admin/master/units/${deletingTarget.item.id}`, {
                onSuccess: () => setDeletingTarget(null),
            });
        } else if (deletingTarget.type === 'subUnit') {
            router.delete(`/admin/master/sub-units/${deletingTarget.item.id}`, {
                onSuccess: () => setDeletingTarget(null),
            });
        }
    };

    const allSubUnitsList = useMemo(() => {
        const list = [];
        units.forEach((u) => {
            (u.sub_units || []).forEach((sub) => {
                list.push({
                    ...sub,
                    parent_unit_id: u.id,
                    parent_unit_name: u.name,
                    parent_unit_source: u.source,
                });
            });
        });
        return list;
    }, [units]);

    const filteredUnits = useMemo(() => {
        if (sourceFilter === 'all') return units;
        return units.filter((u) => u.source === sourceFilter);
    }, [units, sourceFilter]);

    const filteredSubUnitsList = useMemo(() => {
        return allSubUnitsList.filter((item) => {
            const matchesUnit =
                selectedUnitFilter === 'all' ||
                String(item.parent_unit_id) === String(selectedUnitFilter);
            const matchesSource =
                sourceFilter === 'all' || item.source === sourceFilter;
            return matchesUnit && matchesSource;
        });
    }, [allSubUnitsList, selectedUnitFilter, sourceFilter]);

    const totalUnits = units.length;
    const rsamUnitsCount = units.filter((u) => u.source === 'rsam').length;
    const localUnitsCount = units.filter((u) => u.source === 'local').length;
    const totalSubUnits = allSubUnitsList.length;

    const unitColumns = [
        {
            key: 'expand',
            label: '',
            width: '40px',
            sortable: false,
            align: 'center',
            render: (row) => (
                <button
                    type="button"
                    onClick={() => toggleExpandUnit(row.id)}
                    title={expandedUnitIds[row.id] ? 'Tutup rincian ruangan' : 'Lihat rincian ruangan'}
                    className={`p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition ${
                        expandedUnitIds[row.id] ? 'bg-brand-50 text-brand-600 rotate-90' : ''
                    }`}
                >
                    <Icon icon="ph:caret-right-bold" className="w-3.5 h-3.5 transition-transform" />
                </button>
            ),
        },
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
            label: 'Nama Unit Kerja',
            sortable: true,
            render: (row) => {
                const isRsam = row.source === 'rsam';
                return (
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isRsam ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                        >
                            <Icon icon="ph:buildings-bold" className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-slate-900 hover:text-brand-600 transition">
                            {row.name}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'description',
            label: 'Deskripsi',
            sortable: true,
            render: (row) => (
                <span className="text-slate-500 max-w-xs truncate block">{row.description || '-'}</span>
            ),
        },
        {
            key: 'source',
            label: 'Sumber Data',
            sortable: true,
            align: 'center',
            render: (row) => {
                const isRsam = row.source === 'rsam';
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRsam
                                ? 'bg-sky-50 text-sky-700 border border-sky-200/80'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        }`}
                    >
                        <Icon icon={isRsam ? 'ph:cloud-check-bold' : 'ph:database-bold'} className="w-3 h-3" />
                        {isRsam ? 'Terhubung' : 'Lokal'}
                    </span>
                );
            },
        },
        {
            key: 'sub_units_count',
            label: 'Ruangan / Sub-Unit',
            sortable: true,
            align: 'center',
            sortValue: (row) => row.sub_units?.length || 0,
            render: (row) => (
                <button
                    type="button"
                    onClick={() => toggleExpandUnit(row.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 transition"
                >
                    <Icon icon="ph:door-bold" className="w-3.5 h-3.5 text-slate-500" />
                    <span>{row.sub_units?.length || 0} Ruangan</span>
                    <Icon
                        icon={expandedUnitIds[row.id] ? 'ph:caret-up-bold' : 'ph:caret-down-bold'}
                        className="w-3 h-3 opacity-60"
                    />
                </button>
            ),
        },
        {
            key: 'is_active',
            label: 'Status',
            sortable: true,
            align: 'center',
            render: (row) => (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
            key: 'actions',
            label: 'Aksi',
            sortable: false,
            align: 'right',
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            setAddingSubUnitTarget(row);
                            resetCreateSubUnit();
                            setCreateSubUnitData({ name: '', description: '' });
                        }}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition"
                        title="Tambah Ruangan ke Unit ini"
                    >
                        <Icon icon="ph:plus-circle-bold" className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingUnit(row);
                            setEditUnitData({
                                name: row.name,
                                description: row.description || '',
                                is_active: Boolean(row.is_active),
                            });
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Unit"
                    >
                        <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeletingTarget({ type: 'unit', item: row })}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Unit"
                    >
                        <Icon icon="ph:trash-bold" className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    const subUnitColumns = [
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
            label: 'Nama Ruangan / Sub-Unit',
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Icon icon="ph:door-bold" className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-slate-900 hover:text-brand-600 transition">
                        {row.name}
                    </span>
                </div>
            ),
        },
        {
            key: 'parent_unit_name',
            label: 'Unit Induk',
            sortable: true,
            render: (row) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200">
                    <Icon icon="ph:buildings-bold" className="w-3.5 h-3.5 text-brand-600" />
                    <span>{row.parent_unit_name}</span>
                </span>
            ),
        },
        {
            key: 'description',
            label: 'Deskripsi / Lokasi',
            sortable: true,
            render: (row) => (
                <span className="text-slate-500 max-w-xs truncate block">{row.description || '-'}</span>
            ),
        },
        {
            key: 'source',
            label: 'Sumber Data',
            sortable: true,
            align: 'center',
            render: (row) => {
                const isSubLocal = row.source === 'local';
                return (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isSubLocal
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                    >
                        <Icon icon={isSubLocal ? 'ph:database-bold' : 'ph:cloud-check-bold'} className="w-3 h-3" />
                        {isSubLocal ? 'Lokal' : 'RSAM'}
                    </span>
                );
            },
        },
        {
            key: 'is_active',
            label: 'Status',
            sortable: true,
            align: 'center',
            render: (row) => (
                <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
            key: 'actions',
            label: 'Aksi',
            sortable: false,
            align: 'right',
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            setEditingSubUnit(row);
                            setEditSubUnitData({
                                name: row.name,
                                description: row.description || '',
                                is_active: Boolean(row.is_active),
                            });
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Ruangan"
                    >
                        <Icon icon="ph:pencil-simple-bold" className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            setDeletingTarget({
                                type: 'subUnit',
                                item: row,
                                parentUnit: { name: row.parent_unit_name },
                            })
                        }
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Ruangan"
                    >
                        <Icon icon="ph:trash-bold" className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Master Unit & Ruangan - Admin">

            <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="max-w-xl">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <Icon icon="ph:buildings-bold" className="w-7 h-7 text-brand-600 shrink-0" />
                        <span>Master Unit & Sub Unit</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Kelola daftar unit kerja dan sub-unit/ruangan.
                    </p>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleSyncRsam}
                        disabled={isSyncing}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition active:scale-98 disabled:opacity-50 shrink-0"
                        title="Perbarui data unit dari pusat"
                    >
                        <Icon
                            icon={isSyncing ? 'ph:spinner-bold' : 'ph:cloud-arrow-down-bold'}
                            className={`w-4 h-4 text-teal-600 shrink-0 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                        <span className="whitespace-nowrap">{isSyncing ? 'Memperbarui...' : 'Perbarui Data Unit'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            resetCreateSubUnit();
                            setSelectedUnitIdForNewSubUnit(units.length > 0 ? units[0].id : '');
                            setIsGeneralAddSubUnitModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition active:scale-98 shrink-0"
                    >
                        <Icon icon="ph:door-bold" className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="whitespace-nowrap">Tambah Ruangan</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            resetCreateUnit();
                            setCreateUnitData({ name: '', description: '', sub_units: [''] });
                            setIsCreateUnitModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl border border-transparent shadow-xs transition active:scale-98 shrink-0"
                    >
                        <Icon icon="ph:plus-bold" className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Tambah Unit Baru</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Unit Kerja</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Icon icon="ph:buildings-bold" className="w-4 h-4 text-brand-600" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalUnits}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-sky-600">Unit Terhubung</span>
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                            <Icon icon="ph:cloud-check-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-sky-600">{rsamUnitsCount}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600">Unit Lokal</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Icon icon="ph:database-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-600">{localUnitsCount}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-600">Total Ruangan / Sub-Unit</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Icon icon="ph:door-bold" className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-purple-600">{totalSubUnits}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('units')}
                    className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
                        activeTab === 'units'
                            ? 'text-brand-600 border-b-2 border-brand-600'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Icon icon="ph:buildings-bold" className="w-4 h-4" />
                    <span>Tabel Unit Kerja</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-200">
                        {totalUnits}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('subUnits')}
                    className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
                        activeTab === 'subUnits'
                            ? 'text-brand-600 border-b-2 border-brand-600'
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Icon icon="ph:door-bold" className="w-4 h-4" />
                    <span>Tabel Semua Sub-Unit / Ruangan</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                        {totalSubUnits}
                    </span>
                </button>
            </div>

            {activeTab === 'units' && (
                <DataTable
                    columns={unitColumns}
                    data={filteredUnits}
                    searchPlaceholder="Cari nama unit kerja atau deskripsi..."
                    defaultSort={{ key: 'name', direction: 'asc' }}
                    isRowExpanded={(row) => Boolean(expandedUnitIds[row.id])}
                    filterSlot={
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                        >
                            <option value="all">Semua Sumber ({totalUnits})</option>
                            <option value="rsam">Dari Pusat ({rsamUnitsCount})</option>
                            <option value="local">Ditambahkan Lokal ({localUnitsCount})</option>
                        </select>
                    }
                    subRowRender={(row) => {
                        const subUnits = row.sub_units || [];
                        return (
                            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Icon icon="ph:door-bold" className="w-4 h-4 text-brand-600" />
                                        <span className="text-xs font-bold text-slate-900">
                                            Daftar Ruangan / Sub-Unit pada {row.name} ({subUnits.length})
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAddingSubUnitTarget(row);
                                            resetCreateSubUnit();
                                            setCreateSubUnitData({ name: '', description: '' });
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[11px] font-bold transition"
                                    >
                                        <Icon icon="ph:plus-bold" className="w-3 h-3" />
                                        <span>Tambah Ruangan Baru</span>
                                    </button>
                                </div>

                                {subUnits.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2 text-center">
                                        Belum ada ruangan/sub-unit terdaftar pada unit ini.
                                    </p>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                                <th className="py-2 px-3 w-10 text-center">No</th>
                                                <th className="py-2 px-3">Nama Ruangan / Sub-Unit</th>
                                                <th className="py-2 px-3">Deskripsi / Lokasi</th>
                                                <th className="py-2 px-3 text-center">Sumber</th>
                                                <th className="py-2 px-3 text-center">Status</th>
                                                <th className="py-2 px-3 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {subUnits.map((sub, sIdx) => {
                                                const isSubLocal = sub.source === 'local';
                                                return (
                                                    <tr key={sub.id} className="hover:bg-slate-50/50">
                                                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                                                            {sIdx + 1}
                                                        </td>
                                                        <td className="py-2 px-3 font-bold text-slate-800">
                                                            {sub.name}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-500">
                                                            {sub.description || '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <span
                                                                className={`inline-flex px-2 py-0.2 rounded text-[9px] font-bold ${
                                                                    isSubLocal
                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                                                                }`}
                                                            >
                                                                {isSubLocal ? 'Lokal' : 'RSAM'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-center">
                                                            <span
                                                                className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                                                    sub.is_active ? 'text-emerald-600' : 'text-rose-500'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                                        sub.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                                                                    }`}
                                                                />
                                                                {sub.is_active ? 'Aktif' : 'Nonaktif'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingSubUnit(sub);
                                                                        setEditSubUnitData({
                                                                            name: sub.name,
                                                                            description: sub.description || '',
                                                                            is_active: Boolean(sub.is_active),
                                                                        });
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                                                                    title="Edit Ruangan"
                                                                >
                                                                    <Icon icon="ph:pencil-simple-bold" className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setDeletingTarget({
                                                                            type: 'subUnit',
                                                                            item: sub,
                                                                            parentUnit: row,
                                                                        })
                                                                    }
                                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                                                    title="Hapus Ruangan"
                                                                >
                                                                    <Icon icon="ph:trash-bold" className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    }}
                />
            )}

            {activeTab === 'subUnits' && (
                <DataTable
                    columns={subUnitColumns}
                    data={filteredSubUnitsList}
                    searchPlaceholder="Cari nama ruangan, unit induk, atau lokasi..."
                    defaultSort={{ key: 'name', direction: 'asc' }}
                    filterSlot={
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedUnitFilter}
                                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                                className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                            >
                                <option value="all">Semua Unit Induk ({totalUnits})</option>
                                {units.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        Unit: {u.name} ({u.sub_units?.length || 0})
                                    </option>
                                ))}
                            </select>

                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value)}
                                className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                            >
                                <option value="all">Semua Sumber</option>
                                <option value="rsam">Dari RSAM</option>
                                <option value="local">Lokal</option>
                            </select>
                        </div>
                    }
                />
            )}

            <Modal show={isCreateUnitModalOpen} onClose={() => setIsCreateUnitModalOpen(false)} maxWidth="lg">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Tambah Unit Kerja Baru</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Unit ini akan ditambahkan sebagai unit lokal.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateUnitModalOpen(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        >
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateUnitSubmit} className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Unit / Bagian <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={createUnitData.name}
                                onChange={(e) => setCreateUnitData('name', e.target.value)}
                                placeholder="Contoh: Radiologi, Logistik Farmasi, Rawat Jalan"
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {unitErrors.name && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{unitErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Deskripsi / Catatan (Opsional)
                            </label>
                            <textarea
                                value={createUnitData.description}
                                onChange={(e) => setCreateUnitData('description', e.target.value)}
                                rows={2}
                                placeholder="Keterangan fungsi atau gedung unit..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {unitErrors.description && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{unitErrors.description}</p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Sub-Unit / Ruangan Terkait (Opsional)
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddSubUnitRow}
                                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                >
                                    <Icon icon="ph:plus-circle-bold" className="w-3.5 h-3.5" />
                                    <span>Tambah Baris</span>
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 mb-2">
                                Daftarkan beberapa nama ruangan di bawah unit ini sekaligus.
                            </p>
                            <div className="space-y-2">
                                {createUnitData.sub_units.map((sub, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={sub}
                                            onChange={(e) => handleSubUnitRowChange(idx, e.target.value)}
                                            placeholder={`Ruangan #${idx + 1} (Contoh: Poli Gigi, Loket 1)`}
                                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                                        />
                                        {createUnitData.sub_units.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubUnitRow(idx)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                            >
                                                <Icon icon="ph:trash-bold" className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreateUnitModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submittingUnit}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {submittingUnit && <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin" />}
                                <span>Simpan Unit Baru</span>
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal show={Boolean(editingUnit)} onClose={() => setEditingUnit(null)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Edit Unit Kerja</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Sumber: <span className="font-semibold text-slate-700">{editingUnit?.source === 'rsam' ? 'Data Pusat' : 'Data Lokal'}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditingUnit(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        >
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleEditUnitSubmit} className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Unit <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editUnitData.name}
                                onChange={(e) => setEditUnitData('name', e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {editUnitErrors.name && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{editUnitErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Deskripsi
                            </label>
                            <textarea
                                value={editUnitData.description}
                                onChange={(e) => setEditUnitData('description', e.target.value)}
                                rows={2}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="unit_is_active"
                                checked={editUnitData.is_active}
                                onChange={(e) => setEditUnitData('is_active', e.target.checked)}
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                            />
                            <label htmlFor="unit_is_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                                Unit ini Aktif (Dapat dipilih saat membuat tiket)
                            </label>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingUnit(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={updatingUnit}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {updatingUnit && <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin" />}
                                <span>Perbarui Unit</span>
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal
                show={Boolean(addingSubUnitTarget) || isGeneralAddSubUnitModalOpen}
                onClose={() => {
                    setAddingSubUnitTarget(null);
                    setIsGeneralAddSubUnitModalOpen(false);
                }}
                maxWidth="md"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Tambah Ruangan / Sub-Unit</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {addingSubUnitTarget
                                    ? `Menambahkan sub-unit pada ${addingSubUnitTarget.name}`
                                    : 'Pilih unit induk dan masukkan nama ruangan'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setAddingSubUnitTarget(null);
                                setIsGeneralAddSubUnitModalOpen(false);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        >
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateSubUnitSubmit} className="mt-4 space-y-4">
                        {!addingSubUnitTarget && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Pilih Unit Induk <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={selectedUnitIdForNewSubUnit}
                                    onChange={(e) => setSelectedUnitIdForNewSubUnit(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                >
                                    <option value="">-- Pilih Unit Kerja --</option>
                                    {units.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} {u.source === 'local' ? '(Lokal)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Ruangan / Sub-Unit <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={createSubUnitData.name}
                                onChange={(e) => setCreateSubUnitData('name', e.target.value)}
                                placeholder="Contoh: Poli Mata, Meja Pendaftaran 1, Lab Darah"
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {subUnitErrors.name && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{subUnitErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Deskripsi / Lokasi Spesifik (Opsional)
                            </label>
                            <textarea
                                value={createSubUnitData.description}
                                onChange={(e) => setCreateSubUnitData('description', e.target.value)}
                                rows={2}
                                placeholder="Contoh: Gedung A Lantai 2 Sayap Kanan..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setAddingSubUnitTarget(null);
                                    setIsGeneralAddSubUnitModalOpen(false);
                                }}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submittingSubUnit}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {submittingSubUnit && <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin" />}
                                <span>Simpan Ruangan</span>
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal show={Boolean(editingSubUnit)} onClose={() => setEditingSubUnit(null)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Edit Ruangan / Sub-Unit</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Sumber: <span className="font-semibold text-slate-700">{editingSubUnit?.source === 'rsam' ? 'Data Pusat' : 'Data Lokal'}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEditingSubUnit(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        >
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleEditSubUnitSubmit} className="mt-4 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Ruangan / Sub-Unit <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editSubUnitData.name}
                                onChange={(e) => setEditSubUnitData('name', e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                            />
                            {editSubUnitErrors.name && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{editSubUnitErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Deskripsi (Opsional)
                            </label>
                            <textarea
                                value={editSubUnitData.description}
                                onChange={(e) => setEditSubUnitData('description', e.target.value)}
                                rows={2}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="sub_unit_is_active"
                                checked={editSubUnitData.is_active}
                                onChange={(e) => setEditSubUnitData('is_active', e.target.checked)}
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                            />
                            <label htmlFor="sub_unit_is_active" className="text-xs font-bold text-slate-700 cursor-pointer">
                                Sub-Unit ini Aktif
                            </label>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingSubUnit(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={updatingSubUnit}
                                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {updatingSubUnit && <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin" />}
                                <span>Perbarui Ruangan</span>
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            <Modal show={Boolean(deletingTarget)} onClose={() => setDeletingTarget(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                        <Icon icon="ph:warning-bold" className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                        {deletingTarget?.type === 'unit' ? 'Hapus Unit Ini?' : 'Hapus Ruangan / Sub-Unit Ini?'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {deletingTarget?.type === 'unit' ? (
                            <>
                                Apakah Anda yakin ingin menghapus unit <span className="font-bold text-slate-800">"{deletingTarget?.item?.name}"</span>?
                                Semua ruangan/sub-unit di bawah unit ini juga akan terhapus.
                            </>
                        ) : (
                            <>
                                Apakah Anda yakin ingin menghapus ruangan <span className="font-bold text-slate-800">"{deletingTarget?.item?.name}"</span>
                                {deletingTarget?.parentUnit?.name && (
                                    <> dari unit <span className="font-bold text-slate-800">"{deletingTarget?.parentUnit?.name}"</span></>
                                )}?
                            </>
                        )}
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setDeletingTarget(null)}
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
