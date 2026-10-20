import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, useForm, usePage, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
import DataTable from '@/Components/DataTable';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

const HOURS = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00', '21:00'
];

const EXTRA_FACILITIES_OPTIONS = [
    'Proyektor & Layar Lebar',
    'Sound System & Mic Wireless',
    'Mic Meja Rapat (Gooseneck)',
    'Video Conference Zoom',
    'Area Meja Konsumsi (Snack/Makan)',
    'Podium Pidato',
    'Whiteboard & Spidol',
    'Bantuan Operator / Teknisi IT',
];

export default function AdminRoomBookings({
    stats = { today_total: 0, pending: 0, in_use: 0, approved: 0, total_rooms: 0 },
    bookings = [],
    rooms = [],
    timeline_bookings = [],
    month_bookings = [],
    selected_date = '',
    units = [],
    users = [],
    filters = {},
}) {
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search);
            if (p.get('view') === 'timeline') return 'timeline';
        }
        return 'table';
    }); // 'table' | 'timeline'
    const [zoomMode, setZoomMode] = useState('month'); // 'month' | 'day'
    const timelineScrollRef = useRef(null);
    const [filterDate, setFilterDate] = useState(selected_date || new Date().toISOString().split('T')[0]);
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [roomFilter, setRoomFilter] = useState(filters.room_id || '');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [availableFacilities, setAvailableFacilities] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('rsam_extra_facilities');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (e) {
                console.error('Error loading facilities from localStorage', e);
            }
        }
        return EXTRA_FACILITIES_OPTIONS;
    });
    const [isFacilityMenuOpen, setIsFacilityMenuOpen] = useState(false);
    const [isAddingFacility, setIsAddingFacility] = useState(false);
    const [newFacilityName, setNewFacilityName] = useState('');
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selectedFacilitiesToDelete, setSelectedFacilitiesToDelete] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [rejectingBooking, setRejectingBooking] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [deletingBooking, setDeletingBooking] = useState(null);

    // Form Tambah Booking oleh Admin
    const {
        data: adminBookingData,
        setData: setAdminBookingData,
        post: postAdminBooking,
        processing: submittingAdminBooking,
        errors: adminBookingErrors,
        reset: resetAdminBookingForm,
    } = useForm({
        room_id: rooms.length > 0 ? rooms[0].id : '',
        booking_date: filterDate,
        start_time: '09:00',
        end_time: '11:00',
        title: '',
        booker_name: '',
        booker_unit: units[0] || 'Direksi',
        booker_phone: '',
        participants_count: 20,
        description: '',
        extra_facilities: [],
        status: 'approved', // Admin default to approved
    });

    // Realtime Reverb
    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;

        const channel = window.Echo.channel('room-bookings');
        channel.listen('.RoomBookingUpdated', (e) => {
            if (e?.notification) {
                toast.info(e.notification, { duration: 4500 });
            }
            router.reload({
                only: ['bookings', 'stats', 'timeline_bookings', 'month_bookings'],
                preserveScroll: true,
                preserveState: true,
            });
        });

        return () => {
            channel.stopListening('.RoomBookingUpdated');
        };
    }, []);

    const handleFilterChange = (key, value) => {
        const query = {
            ...filters,
            status: key === 'status' ? value : statusFilter,
            room_id: key === 'room_id' ? value : roomFilter,
            date: key === 'date' ? value : filterDate,
        };
        if (query.status === 'all') delete query.status;
        if (!query.room_id) delete query.room_id;
        if (!query.date) delete query.date;

        router.get('/admin/room-bookings', query, { preserveState: true, replace: true });
    };

    const handleDateJump = (newDate) => {
        setFilterDate(newDate);
        setAdminBookingData('booking_date', newDate);
        handleFilterChange('date', newDate);
    };

    // Gantt Chart State & Helpers
    const todayDateStr = useMemo(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    const isToday = filterDate === todayDateStr;

    const [currentTime, setCurrentTime] = useState(() => {
        const now = new Date();
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            decimal: now.getHours() + now.getMinutes() / 60,
            formatted: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        };
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime({
                hours: now.getHours(),
                minutes: now.getMinutes(),
                decimal: now.getHours() + now.getMinutes() / 60,
                formatted: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            });
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const filterDateFormatted = useMemo(() => {
        try {
            const d = new Date(filterDate + 'T00:00:00');
            return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return filterDate;
        }
    }, [filterDate]);

    const stepDay = (days) => {
        try {
            const d = new Date(filterDate + 'T00:00:00');
            d.setDate(d.getDate() + days);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            handleDateJump(`${y}-${m}-${day}`);
        } catch {
            // fallback
        }
    };

    const currentMonthDate = useMemo(() => {
        try {
            return new Date(filterDate + 'T00:00:00');
        } catch {
            return new Date();
        }
    }, [filterDate]);

    const monthNameFormatted = useMemo(() => {
        return currentMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }, [currentMonthDate]);

    const daysInMonth = useMemo(() => {
        const y = currentMonthDate.getFullYear();
        const m = currentMonthDate.getMonth();
        return new Date(y, m + 1, 0).getDate();
    }, [currentMonthDate]);

    const monthDays = useMemo(() => {
        const y = currentMonthDate.getFullYear();
        const m = currentMonthDate.getMonth();
        const arr = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(y, m, d);
            const dayOfWeek = dateObj.getDay();
            arr.push({
                day: d,
                dayOfWeek,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                dateStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            });
        }
        return arr;
    }, [currentMonthDate, daysInMonth]);

    const todayDayNumber = useMemo(() => {
        if (selected_date) {
            const parts = selected_date.split('-');
            const sY = parseInt(parts[0], 10);
            const sM = parseInt(parts[1], 10) - 1;
            const sD = parseInt(parts[2], 10);
            if (sY === currentMonthDate.getFullYear() && sM === currentMonthDate.getMonth()) {
                return sD;
            }
        }
        const d = new Date();
        if (
            d.getFullYear() === currentMonthDate.getFullYear() &&
            d.getMonth() === currentMonthDate.getMonth()
        ) {
            return d.getDate();
        }
        return null;
    }, [selected_date, currentMonthDate]);

    const stepMonthOrDay = (delta) => {
        try {
            const d = new Date(filterDate + 'T00:00:00');
            if (zoomMode === 'month') {
                d.setMonth(d.getMonth() + delta);
            } else {
                d.setDate(d.getDate() + delta);
            }
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            handleDateJump(`${y}-${m}-${day}`);
        } catch {
            // fallback
        }
    };

    const allMonthBookings = useMemo(() => {
        let list = (month_bookings && month_bookings.length > 0) ? [...month_bookings] : [];
        if (bookings && bookings.length > 0) {
            bookings.forEach((b) => {
                if (!list.some((item) => Number(item.id) === Number(b.id))) {
                    list.push({
                        id: b.id,
                        booking_number: b.booking_number,
                        room_id: b.room ? b.room.id : b.room_id,
                        room_name: b.room ? b.room.name : b.room_name,
                        room_color: b.room ? b.room.color : (b.room_color || '#0D9488'),
                        title: b.title,
                        description: b.description,
                        booker_name: b.booker_name,
                        booker_unit: b.booker_unit,
                        booker_phone: b.booker_phone,
                        participants_count: b.participants_count,
                        booking_date: b.booking_date,
                        day: b.booking_date ? parseInt(b.booking_date.split('-')[2], 10) : 1,
                        start_time: b.start_time,
                        end_time: b.end_time,
                        status: b.status,
                        extra_facilities: b.extra_facilities || [],
                    });
                }
            });
        }
        return list;
    }, [month_bookings, bookings]);

    const getRoomMonthBookings = (room) => {
        return allMonthBookings.filter((b) => Number(b.room_id) === Number(room.id));
    };

    const getRoomDayBookings = (room) => {
        const fromTimeline = (timeline_bookings || []).filter(
            (b) => Number(b.room_id) === Number(room.id)
        );
        if (fromTimeline.length > 0) return fromTimeline;

        return allMonthBookings.filter(
            (b) => Number(b.room_id) === Number(room.id) && b.booking_date === filterDate
        );
    };

    const dayTotalAgendas = useMemo(() => {
        const fromTimeline = (timeline_bookings || []).length;
        if (fromTimeline > 0) return fromTimeline;
        return allMonthBookings.filter((b) => b.booking_date === filterDate).length;
    }, [timeline_bookings, allMonthBookings, filterDate]);

    const scrollToToday = (smooth = false) => {
        if (!timelineScrollRef.current) return;
        const container = timelineScrollRef.current;
        const stickyWidth = 256;
        const containerWidth = container.clientWidth || 1000;
        const visibleTrackWidth = Math.max(300, containerWidth - stickyWidth);

        if (zoomMode === 'month') {
            const dayNumber = todayDayNumber || (selected_date ? parseInt(selected_date.split('-')[2], 10) : new Date().getDate());
            const dayIndex = Math.max(0, dayNumber - 1);
            const dayColWidth = 72;
            const dayLeftPos = dayIndex * dayColWidth;
            const targetScrollLeft = Math.max(0, dayLeftPos - (visibleTrackWidth / 2) + (dayColWidth / 2));
            container.scrollTo({
                left: targetScrollLeft,
                behavior: smooth ? 'smooth' : 'auto',
            });
        } else {
            const currentHourDec = (currentTime && currentTime.decimal >= 7 && currentTime.decimal <= 21)
                ? currentTime.decimal
                : 9;
            const hourColWidth = 96;
            const hourOffset = (currentHourDec - 7) * hourColWidth;
            const targetScrollLeft = Math.max(0, hourOffset - (visibleTrackWidth / 2) + (hourColWidth / 2));
            container.scrollTo({
                left: targetScrollLeft,
                behavior: smooth ? 'smooth' : 'auto',
            });
        }
    };

    useEffect(() => {
        if (viewMode !== 'timeline') return;

        // Multi-tick scroll to ensure it directly jumps to today
        scrollToToday(false);

        const rAF = requestAnimationFrame(() => {
            scrollToToday(false);
        });

        const timer1 = setTimeout(() => {
            scrollToToday(false);
        }, 60);

        const timer2 = setTimeout(() => {
            scrollToToday(false);
        }, 220);

        return () => {
            cancelAnimationFrame(rAF);
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [viewMode, zoomMode, filterDate]);

    const assignMonthLanes = (bookingsList) => {
        if (!bookingsList || bookingsList.length === 0) return { listWithLanes: [], totalLanes: 1 };
        const sorted = [...bookingsList].sort((a, b) => (a.booking_date || '').localeCompare(b.booking_date || '') || (a.start_time || '').localeCompare(b.start_time || ''));
        const laneEnds = [];
        const listWithLanes = sorted.map((b) => {
            const bDay = b.day || (b.booking_date ? parseInt(b.booking_date.split('-')[2], 10) : 1);
            let laneIdx = laneEnds.findIndex((endDay) => endDay <= bDay);
            if (laneIdx === -1) {
                laneIdx = laneEnds.length;
                laneEnds.push(bDay + 1);
            } else {
                laneEnds[laneIdx] = bDay + 1;
            }
            return { ...b, bDay, laneIdx };
        });
        return { listWithLanes, totalLanes: Math.max(1, laneEnds.length) };
    };

    const handleQuickBookMonthSlot = (room, dateStr) => {
        setAdminBookingData((prev) => ({
            ...prev,
            room_id: room.id,
            booking_date: dateStr,
            start_time: '09:00',
            end_time: '11:00',
        }));
        setIsCreateModalOpen(true);
    };

    const handleQuickBookSlot = (room, hourNumber) => {
        const startHourStr = `${String(hourNumber).padStart(2, '0')}:00`;
        const endHourStr = `${String(Math.min(21, hourNumber + 2)).padStart(2, '0')}:00`;

        setAdminBookingData((prev) => ({
            ...prev,
            room_id: room.id,
            booking_date: filterDate,
            start_time: startHourStr,
            end_time: endHourStr,
        }));
        setIsCreateModalOpen(true);
    };

    const assignGanttLanes = (bookingsList) => {
        if (!bookingsList || bookingsList.length === 0) return { bookingsWithLanes: [], totalLanes: 1 };

        const sorted = [...bookingsList].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const laneEnds = [];

        const bookingsWithLanes = sorted.map((b) => {
            const [sh, sm] = (b.start_time || '07:00').split(':').map(Number);
            const [eh, em] = (b.end_time || '08:00').split(':').map(Number);
            const startDec = sh + (sm || 0) / 60;
            const endDec = eh + (em || 0) / 60;

            let laneIdx = laneEnds.findIndex((end) => end <= startDec);
            if (laneIdx === -1) {
                laneIdx = laneEnds.length;
                laneEnds.push(endDec);
            } else {
                laneEnds[laneIdx] = endDec;
            }
            return {
                ...b,
                laneIdx,
                startDec,
                endDec,
            };
        });

        return {
            bookingsWithLanes,
            totalLanes: Math.max(1, laneEnds.length),
        };
    };

    const getBookingGanttStyle = (status) => {
        switch (status) {
            case 'approved':
                return {
                    bar: 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 border-emerald-400/50 shadow-emerald-950/15 text-white',
                    badgeBg: 'bg-emerald-950/40 text-emerald-200 border border-emerald-400/30',
                    label: 'Disetujui',
                    icon: 'ph:check-circle-bold',
                };
            case 'in_use':
                return {
                    bar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 border-blue-300 shadow-blue-900/20 text-white ring-2 ring-blue-400/60',
                    badgeBg: 'bg-blue-950/40 text-cyan-200 border border-cyan-400/40 animate-pulse',
                    label: 'LIVE',
                    icon: 'ph:broadcast-bold',
                };
            case 'pending':
                return {
                    bar: 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 border-amber-300 shadow-amber-900/20 text-white',
                    badgeBg: 'bg-amber-950/40 text-amber-100 border border-amber-300/40',
                    label: 'Pending',
                    icon: 'ph:clock-countdown-bold',
                };
            case 'completed':
                return {
                    bar: 'bg-gradient-to-r from-slate-600 to-slate-700 border-slate-500 text-slate-100 opacity-90',
                    badgeBg: 'bg-slate-900/40 text-slate-200 border border-slate-400/30',
                    label: 'Selesai',
                    icon: 'ph:check-bold',
                };
            case 'rejected':
                return {
                    bar: 'bg-gradient-to-r from-rose-600 to-rose-700 border-rose-400 text-white opacity-90',
                    badgeBg: 'bg-rose-950/40 text-rose-200 border border-rose-400/30',
                    label: 'Ditolak',
                    icon: 'ph:x-circle-bold',
                };
            default:
                return {
                    bar: 'bg-gradient-to-r from-slate-500 to-slate-600 border-slate-400 text-white',
                    badgeBg: 'bg-slate-900/40 text-slate-200',
                    label: status,
                    icon: 'ph:info-bold',
                };
        }
    };

    // Update Status Action
    const updateBookingStatus = (bookingId, status, extraData = {}) => {
        router.post(`/admin/room-bookings/${bookingId}/status`, {
            status,
            ...extraData,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                if (rejectingBooking) {
                    setRejectingBooking(null);
                    setRejectionReason('');
                }
            },
        });
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        postAdminBooking('/admin/room-bookings', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetAdminBookingForm();
            },
        });
    };

    const handleDeleteSubmit = () => {
        if (!deletingBooking) return;
        router.delete(`/admin/room-bookings/${deletingBooking.id}`, {
            onSuccess: () => setDeletingBooking(null),
        });
    };

    const toggleExtraFacility = (fac) => {
        const current = adminBookingData.extra_facilities || [];
        if (current.includes(fac)) {
            setAdminBookingData('extra_facilities', current.filter((f) => f !== fac));
        } else {
            setAdminBookingData('extra_facilities', [...current, fac]);
        }
    };

    const handleAddFacility = () => {
        const trimmed = newFacilityName.trim();
        if (!trimmed) {
            toast.error('Nama fasilitas tidak boleh kosong');
            return;
        }
        if (availableFacilities.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
            toast.info('Fasilitas sudah ada di dalam daftar');
            return;
        }

        const updated = [...availableFacilities, trimmed];
        setAvailableFacilities(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('rsam_extra_facilities', JSON.stringify(updated));
        }
        const currentSelected = adminBookingData.extra_facilities || [];
        if (!currentSelected.includes(trimmed)) {
            setAdminBookingData('extra_facilities', [...currentSelected, trimmed]);
        }
        setNewFacilityName('');
        setIsAddingFacility(false);
        toast.success(`Fasilitas "${trimmed}" berhasil ditambahkan`);
    };

    const handleDeleteSelectedFacilities = () => {
        if (selectedFacilitiesToDelete.length === 0) {
            toast.info('Pilih minimal satu fasilitas yang ingin dihapus');
            return;
        }

        const updated = availableFacilities.filter((f) => !selectedFacilitiesToDelete.includes(f));
        setAvailableFacilities(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem('rsam_extra_facilities', JSON.stringify(updated));
        }
        const currentSelected = adminBookingData.extra_facilities || [];
        setAdminBookingData(
            'extra_facilities',
            currentSelected.filter((f) => !selectedFacilitiesToDelete.includes(f))
        );
        toast.success(`${selectedFacilitiesToDelete.length} fasilitas berhasil dihapus`);
        setSelectedFacilitiesToDelete([]);
        setIsDeleteMode(false);
    };

    const toggleFacilityToDelete = (fac) => {
        if (selectedFacilitiesToDelete.includes(fac)) {
            setSelectedFacilitiesToDelete(selectedFacilitiesToDelete.filter((f) => f !== fac));
        } else {
            setSelectedFacilitiesToDelete([...selectedFacilitiesToDelete, fac]);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return { label: 'Disetujui', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
            case 'in_use':
                return { label: 'Sedang Berlangsung', bg: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse', dot: 'bg-blue-500' };
            case 'completed':
                return { label: 'Selesai', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
            case 'rejected':
                return { label: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
            case 'cancelled':
                return { label: 'Dibatalkan', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
            default:
                return { label: 'Menunggu Approval', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
        }
    };

    const columns = [
        {
            key: 'booking_number',
            label: 'No. Booking & Status',
            sortable: true,
            render: (b) => {
                const statusObj = getStatusBadge(b.status);
                return (
                    <div>
                        <div className="font-mono text-xs font-extrabold text-teal-800">{b.booking_number}</div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border mt-1 ${statusObj.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                            {statusObj.label}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'room.name',
            label: 'Ruangan & Kapasitas',
            sortable: true,
            render: (b) => (
                <div>
                    <div className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: b.room?.color || '#0D9488' }}
                        />
                        <span className="font-bold text-slate-900 text-xs">{b.room?.name || '-'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 pl-4">
                        {b.room?.location} • Kapasitas: {b.room?.capacity} Org
                    </span>
                </div>
            ),
        },
        {
            key: 'schedule',
            label: 'Jadwal Pemakaian',
            sortable: true,
            sortValue: (b) => `${b.booking_date} ${b.start_time}`,
            render: (b) => (
                <div>
                    <div className="font-bold text-slate-900 text-xs">{b.booking_date_formatted}</div>
                    <div className="font-mono text-[11px] font-semibold text-teal-700">
                        {b.start_time} - {b.end_time} WIB
                    </div>
                </div>
            ),
        },
        {
            key: 'title',
            label: 'Agenda / Kegiatan & Unit',
            sortable: true,
            render: (b) => (
                <div className="max-w-xs">
                    <div className="font-bold text-slate-900 text-xs truncate" title={b.title}>
                        {b.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Icon icon="ph:buildings-bold" className="w-3 h-3 text-slate-400" />
                        <span>{b.booker_unit}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'booker_name',
            label: 'Penanggung Jawab',
            sortable: true,
            render: (b) => (
                <div>
                    <div className="font-bold text-slate-900 text-xs">{b.booker_name}</div>
                    {b.booker_phone && (
                        <a
                            href={`https://wa.me/${b.booker_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                            <Icon icon="ph:whatsapp-logo-bold" className="w-3 h-3 text-emerald-600" />
                            <span>{b.booker_phone}</span>
                        </a>
                    )}
                </div>
            ),
        },
        {
            key: 'participants_count',
            label: 'Peserta',
            align: 'center',
            sortable: true,
            render: (b) => (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                    <Icon icon="ph:users-bold" className="w-3 h-3 text-slate-500" />
                    <span>{b.participants_count || '-'} Org</span>
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi & Tindakan',
            align: 'right',
            render: (b) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Tombol Setujui / Tolak jika status pending */}
                    {b.status === 'pending' && (
                        <>
                            <button
                                type="button"
                                onClick={() => updateBookingStatus(b.id, 'approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                                title="Setujui Peminjaman"
                            >
                                <Icon icon="ph:check-bold" className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRejectingBooking(b);
                                    setRejectionReason('');
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                                title="Tolak Pengajuan"
                            >
                                <Icon icon="ph:x-bold" className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                            </button>
                        </>
                    )}

                    {/* Tombol Mulai Pemakaian jika status approved */}
                    {b.status === 'approved' && (
                        <button
                            type="button"
                            onClick={() => updateBookingStatus(b.id, 'in_use')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                            title="Tandai Ruangan Sedang Digunakan"
                        >
                            <Icon icon="ph:play-bold" className="w-3.5 h-3.5 text-blue-600" />
                            <span>Mulai Pakai</span>
                        </button>
                    )}

                    {/* Tombol Selesai jika status in_use */}
                    {b.status === 'in_use' && (
                        <button
                            type="button"
                            onClick={() => updateBookingStatus(b.id, 'completed')}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                            title="Tandai Pemakaian Selesai"
                        >
                            <Icon icon="ph:check-circle-bold" className="w-3.5 h-3.5" />
                            <span>Selesaikan</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setSelectedBooking(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                        title="Detail Booking"
                    >
                        <Icon icon="ph:eye-bold" className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setDeletingBooking(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Hapus Data"
                    >
                        <Icon icon="ph:trash-bold" className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AppLayout title="Kelola Peminjaman Ruangan - Admin Workspace">
            {/* Header Hero */}
            <div
                style={{ background: 'linear-gradient(135deg, #176B54 0%, #1B775E 50%, #125844 100%)' }}
                className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 lg:p-10 mb-6 shadow-sm border border-emerald-900/20"
            >
                {/* Subtle pattern background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            Peminjaman Ruangan & Auditorium
                        </h1>
                        <p className="mt-2 text-xs sm:text-sm text-emerald-100/90 max-w-xl font-normal leading-relaxed">
                            Konfirmasi permohonan reservasi ruang rapat, kelola jadwal kegiatan rumah sakit, dan pastikan tidak terjadi jadwal ganda pada setiap fasilitas.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-5 py-2.5 bg-white text-[#176B54] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition active:scale-98 inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:plus-bold" className="w-4 h-4 text-[#176B54]" />
                                <span>Tambah Booking (Atas Nama)</span>
                            </button>
                            <Link
                                href="/admin/master/rooms"
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 backdrop-blur-xs transition inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:door-bold" className="w-4 h-4" />
                                <span>Kelola Master Ruangan</span>
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Total Ruangan</span>
                            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.total_rooms}</p>
                            <span className="text-[10px] text-emerald-200">Fasilitas Aktif</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4 Kartu KPI Metrik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Booking Hari Ini</p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats.today_total}</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <Icon icon="ph:calendar-bold" className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-amber-600 font-bold">Menunggu Konfirmasi</p>
                        <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{stats.pending}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        stats.pending > 0 ? 'bg-amber-100 text-amber-700 animate-bounce' : 'bg-amber-50 text-amber-600'
                    }`}>
                        <Icon icon="ph:clock-countdown-bold" className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-blue-600 font-bold">Sedang Digunakan</p>
                        <p className="text-2xl font-extrabold text-blue-600 mt-0.5">{stats.in_use}</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon icon="ph:broadcast-bold" className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-emerald-600 font-bold">Disetujui / Terjadwal</p>
                        <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">{stats.approved}</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Icon icon="ph:check-circle-bold" className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Switcher Tampilan & Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            viewMode === 'table' ? 'bg-white text-[#176B54] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Icon icon="ph:table-bold" className="w-4 h-4 text-brand-600" />
                        <span>Daftar Permohonan Booking</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('timeline')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            viewMode === 'timeline' ? 'bg-white text-[#176B54] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Icon icon="ph:chart-bar-horizontal-bold" className="w-4 h-4 text-brand-600" />
                        <span>Gantt Chart Jadwal Ruangan</span>
                    </button>
                </div>

                {/* Filter Tanggal Khusus Timeline */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Lihat Tanggal:</span>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => handleDateJump(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-brand-500 focus:border-brand-500 cursor-pointer"
                    />
                </div>
            </div>

            {/* TAB 1: TABEL DATA PENGELOLAAN BOOKING */}
            {viewMode === 'table' ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
                    <DataTable
                        columns={columns}
                        data={bookings}
                        searchPlaceholder="Cari nomor booking, agenda, nama penanggung jawab, unit..."
                        defaultSort={{ key: 'schedule', direction: 'desc' }}
                        emptyMessage="Belum ada data pengajuan booking ruangan."
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
                                    <option value="all">Semua Status</option>
                                    <option value="pending">Menunggu Approval (Pending)</option>
                                    <option value="approved">Disetujui (Approved)</option>
                                    <option value="in_use">Sedang Berlangsung (In Use)</option>
                                    <option value="completed">Selesai (Completed)</option>
                                    <option value="rejected">Ditolak (Rejected)</option>
                                    <option value="cancelled">Dibatalkan (Cancelled)</option>
                                </select>

                                <select
                                    value={roomFilter}
                                    onChange={(e) => {
                                        setRoomFilter(e.target.value);
                                        handleFilterChange('room_id', e.target.value);
                                    }}
                                    className="py-1.5 px-3 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:ring-brand-500 shadow-2xs"
                                >
                                    <option value="">Semua Ruangan</option>
                                    {rooms.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        }
                    />
                </div>
            ) : (
                /* TAB 2: WHITE MODERN GANTT CHART VIEW */
                <div className="space-y-4">
                    <style>{`
                        .white-gantt-scroll::-webkit-scrollbar {
                            height: 9px;
                            background: #f8fafc;
                        }
                        .white-gantt-scroll::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 9999px;
                            border: 2px solid #f8fafc;
                        }
                        .white-gantt-scroll::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
                    `}</style>

                    {/* White Gantt Chart Card Container */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden text-slate-800">
                        {/* Top Header Bar: » Oktober 2026 | [Kelola di Kalender] Bulan ⌄ < Hari ini > */}
                        <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 select-none">
                            {/* Left: » Bulan Tahun + Badge */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Icon icon="ph:caret-double-right-bold" className="w-4 h-4 text-teal-600 shrink-0" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 capitalize tracking-tight">
                                        {zoomMode === 'month' ? monthNameFormatted : filterDateFormatted}
                                    </h3>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                                    {zoomMode === 'month' ? `${allMonthBookings.length} Agenda Terdaftar` : `${dayTotalAgendas} Agenda Hari Ini`}
                                </span>
                            </div>

                            {/* Right Controls: [Kelola di Kalender] | Bulan ⌄ | < Hari ini > */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                                    title="Buka daftar permohonan dalam bentuk tabel"
                                >
                                    <Icon icon="ph:calendar-blank-bold" className="w-4 h-4 text-slate-500" />
                                    <span className="hidden sm:inline">Kelola di Kalender</span>
                                    <span className="sm:hidden">Kalender</span>
                                </button>

                                {/* Dropdown Bulan / Hari */}
                                <div className="relative">
                                    <select
                                        value={zoomMode}
                                        onChange={(e) => setZoomMode(e.target.value)}
                                        className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:border-teal-600 cursor-pointer shadow-2xs"
                                    >
                                        <option value="month">Bulan</option>
                                        <option value="day">Hari</option>
                                    </select>
                                    <Icon icon="ph:caret-down-bold" className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>

                                {/* Stepper < Hari ini > */}
                                <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200/80 p-0.5 rounded-xl text-xs font-bold text-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => stepMonthOrDay(-1)}
                                        className="p-1.5 hover:text-slate-900 hover:bg-white rounded-lg transition"
                                        title={zoomMode === 'month' ? "Bulan Sebelumnya" : "Hari Sebelumnya"}
                                    >
                                        <Icon icon="ph:caret-left-bold" className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleDateJump(todayDateStr);
                                            setTimeout(() => scrollToToday(true), 60);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg transition font-bold ${
                                            isToday ? 'bg-white text-teal-700 shadow-2xs border border-slate-200/60' : 'hover:bg-white text-slate-600'
                                        }`}
                                    >
                                        Hari ini
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => stepMonthOrDay(1)}
                                        className="p-1.5 hover:text-slate-900 hover:bg-white rounded-lg transition"
                                        title={zoomMode === 'month' ? "Bulan Berikutnya" : "Hari Berikutnya"}
                                    >
                                        <Icon icon="ph:caret-right-bold" className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Timeline Canvas with Horizontal Scroll */}
                        <div
                            ref={timelineScrollRef}
                            className="overflow-x-auto white-gantt-scroll relative select-none"
                        >
                            <div className={zoomMode === 'month' ? 'min-w-[2488px]' : 'min-w-[1600px]'}>
                                {/* Timeline Ruler Header */}
                                <div className="flex border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs h-11 sticky top-0 z-30">
                                    {/* Left Sticky Header Cell */}
                                    <div className="w-64 min-w-[256px] shrink-0 border-r border-slate-200 bg-slate-50 sticky left-0 z-40 px-4 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span>RUANGAN</span>
                                        <span className="text-[10px] text-slate-500 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200/80">{rooms.length} unit</span>
                                    </div>

                                    {/* Ruler Time / Day Columns */}
                                    {zoomMode === 'month' ? (
                                        <div className="flex-1 flex relative">
                                            {monthDays.map((day) => {
                                                const isTodayCol = day.day === todayDayNumber;
                                                const dayNames = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
                                                const dayAbbr = dayNames[day.dayOfWeek] || '';

                                                return (
                                                    <div
                                                        key={day.day}
                                                        className={`w-[72px] min-w-[72px] h-full border-r border-slate-200/70 flex flex-col items-center justify-center relative py-1 ${
                                                            day.isWeekend ? 'bg-slate-100/70' : 'bg-slate-50/50'
                                                        }`}
                                                    >
                                                        <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                                                            {dayAbbr}
                                                        </span>
                                                        {isTodayCol ? (
                                                            <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black flex items-center justify-center text-[11px] shadow-xs ring-2 ring-white">
                                                                {day.day}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-slate-700 leading-none">
                                                                {day.day}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Today Coral/Red Vertical Marker Line */}
                                            {todayDayNumber !== null && (
                                                <div
                                                    id="timeline-today-pin"
                                                    style={{ left: `${(todayDayNumber - 0.5) * 72}px` }}
                                                    className="absolute top-0 bottom-[-9999px] w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        /* Day Mode Ruler (14 Hours: 07:00 - 21:00) */
                                        <div className="flex-1 flex relative">
                                            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="w-[96px] min-w-[96px] h-full border-r border-slate-200/70 flex items-center justify-center text-xs font-bold text-slate-600 font-mono bg-slate-50/50"
                                                >
                                                    <span>{String(hour).padStart(2, '0')}:00</span>
                                                </div>
                                            ))}

                                            {/* Today Realtime Marker Line */}
                                            {isToday && currentTime.decimal >= 7 && currentTime.decimal <= 21 && (
                                                <div
                                                    id="timeline-today-pin"
                                                    style={{ left: `${((currentTime.decimal - 7) / 14) * (14 * 96)}px` }}
                                                    className="absolute top-0 bottom-[-9999px] w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_6px_rgba(244,63,94,0.4)] flex flex-col items-center"
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white -translate-y-1" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Body Rows per Ruangan */}
                                <div className="divide-y divide-slate-100">
                                    {rooms.map((room) => {
                                        const roomMonthBookings = getRoomMonthBookings(room);
                                        const roomDayBookings = getRoomDayBookings(room);

                                        const { listWithLanes: monthLanesList, totalLanes: monthTotalLanes } = assignMonthLanes(roomMonthBookings);
                                        const { bookingsWithLanes: dayLanesList, totalLanes: dayTotalLanes } = assignGanttLanes(roomDayBookings);

                                        const totalLanes = zoomMode === 'month' ? monthTotalLanes : dayTotalLanes;
                                        const rowHeightPx = Math.max(58, totalLanes * 42 + 16);
                                        const roomAgendaCount = zoomMode === 'month' ? roomMonthBookings.length : roomDayBookings.length;

                                        return (
                                            <div
                                                key={room.id}
                                                style={{ minHeight: `${rowHeightPx}px` }}
                                                className="flex group/row hover:bg-slate-50/40 transition relative"
                                            >
                                                {/* Left Sticky Room Info */}
                                                <div className="w-64 min-w-[256px] shrink-0 border-r border-slate-200 bg-white sticky left-0 z-20 px-4 py-3 flex items-center justify-between gap-2 group-hover/row:bg-slate-50/90 transition select-none">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                                                            style={{ backgroundColor: room.color || '#0D9488' }}
                                                        />
                                                        <div className="min-w-0">
                                                            <div
                                                                className="text-xs font-bold text-slate-900 truncate block group-hover/row:text-teal-700 transition"
                                                                title={room.name}
                                                            >
                                                                {room.name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
                                                                <span>{room.capacity} org</span>
                                                                <span>•</span>
                                                                <span className="truncate">{room.location}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {roomAgendaCount > 0 && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60">
                                                                {roomAgendaCount}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickBookMonthSlot(room, filterDate)}
                                                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-700 flex items-center justify-center transition"
                                                            title="Tambah Booking Cepat"
                                                        >
                                                            <Icon icon="ph:plus-bold" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Right Track Area */}
                                                {zoomMode === 'month' ? (
                                                    /* Month Mode Track: 31 Day Columns */
                                                    <div className="flex-1 flex relative">
                                                        {monthDays.map((day) => (
                                                            <div
                                                                key={day.day}
                                                                onClick={() => handleQuickBookMonthSlot(room, day.dateStr)}
                                                                className={`w-[72px] min-w-[72px] h-full border-r border-slate-100 relative cursor-pointer hover:bg-teal-50/30 transition group/cell ${
                                                                    day.isWeekend ? 'bg-slate-50/50' : 'bg-white'
                                                                }`}
                                                                title={`Klik untuk booking ${room.name} pada ${day.dateStr}`}
                                                            >
                                                                <div className="opacity-0 group-hover/cell:opacity-100 transition absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                    <Icon icon="ph:plus" className="w-3.5 h-3.5 text-teal-600" />
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Booking Cards in Month Mode */}
                                                        {monthLanesList.map((b) => {
                                                            const isApproved = b.status === 'approved';
                                                            const isInUse = b.status === 'in_use';
                                                            const isPending = b.status === 'pending';

                                                            return (
                                                                <div
                                                                    key={b.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedBooking(b);
                                                                    }}
                                                                    style={{
                                                                        left: `${(b.bDay - 1) * 72 + 4}px`,
                                                                        width: '64px',
                                                                        top: `${b.laneIdx * 42 + 6}px`,
                                                                        height: '36px',
                                                                    }}
                                                                    className={`absolute rounded-xl px-2 py-1 flex flex-col justify-between cursor-pointer shadow-xs transition-all hover:scale-105 hover:shadow-md hover:z-30 border ${
                                                                        isApproved
                                                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100'
                                                                            : isInUse
                                                                            ? 'bg-blue-50 border-blue-400 text-blue-950 ring-2 ring-blue-400/60 animate-pulse'
                                                                            : isPending
                                                                            ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                                                                            : 'bg-slate-100 border-slate-300 text-slate-800'
                                                                    }`}
                                                                    title={`${b.booking_number} • ${b.title}\nWaktu: ${b.booking_date} (${b.start_time} - ${b.end_time})\nPenanggung Jawab: ${b.booker_name} (${b.booker_unit})\nStatus: ${b.status}\n\nKlik untuk melihat rincian & aksi persetujuan.`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-1 leading-none">
                                                                        <span className={`font-mono text-[9px] font-black px-1 py-0.5 rounded ${
                                                                            isApproved ? 'bg-emerald-200/80 text-emerald-900' :
                                                                            isInUse ? 'bg-blue-200/80 text-blue-900' :
                                                                            isPending ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-200 text-slate-800'
                                                                        }`}>
                                                                            {b.start_time}
                                                                        </span>
                                                                        <Icon
                                                                            icon={
                                                                                isApproved ? 'ph:check-bold' :
                                                                                isInUse ? 'ph:broadcast-bold' :
                                                                                isPending ? 'ph:clock-countdown-bold' : 'ph:calendar-check-bold'
                                                                            }
                                                                            className={`w-3 h-3 shrink-0 ${
                                                                                isApproved ? 'text-emerald-700' :
                                                                                isInUse ? 'text-blue-700' :
                                                                                isPending ? 'text-amber-700' : 'text-slate-600'
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                    <span className="truncate text-[9.5px] font-bold leading-tight tracking-tight">
                                                                        {b.title}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    /* Day Mode Track: 14 Hourly Columns */
                                                    <div className="flex-1 flex relative">
                                                        {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                                                            <div
                                                                key={hour}
                                                                onClick={() => handleQuickBookSlot(room, hour)}
                                                                className="w-[96px] min-w-[96px] h-full border-r border-slate-100 relative cursor-pointer hover:bg-teal-50/30 transition group/slot bg-white"
                                                                title={`Klik untuk booking ${room.name} jam ${String(hour).padStart(2, '0')}:00`}
                                                            >
                                                                <div className="opacity-0 group-hover/slot:opacity-100 transition absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                    <Icon icon="ph:plus" className="w-3.5 h-3.5 text-teal-600" />
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Booking Bars in Day Mode */}
                                                        {dayLanesList.map((b) => {
                                                            const clampedStart = Math.max(7, Math.min(21, b.startDec));
                                                            const clampedEnd = Math.max(clampedStart + 0.5, Math.min(21, b.endDec));
                                                            const leftPx = ((clampedStart - 7) / 14) * (14 * 96);
                                                            const widthPx = ((clampedEnd - clampedStart) / 14) * (14 * 96);
                                                            const isApproved = b.status === 'approved';
                                                            const isInUse = b.status === 'in_use';
                                                            const isPending = b.status === 'pending';

                                                            return (
                                                                <div
                                                                    key={b.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedBooking(b);
                                                                    }}
                                                                    style={{
                                                                        left: `${leftPx + 2}px`,
                                                                        width: `${Math.max(50, widthPx - 4)}px`,
                                                                        top: `${b.laneIdx * 42 + 6}px`,
                                                                        height: '36px',
                                                                    }}
                                                                    className={`absolute rounded-xl px-3 py-1 flex items-center justify-between cursor-pointer shadow-xs transition-all hover:scale-[1.01] hover:shadow-md hover:z-30 border ${
                                                                        isApproved
                                                                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-700/15'
                                                                            : isInUse
                                                                            ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-300 shadow-blue-700/15 animate-pulse'
                                                                            : isPending
                                                                            ? 'bg-amber-500 border-amber-400 text-white shadow-amber-700/15'
                                                                            : 'bg-slate-700 border-slate-600 text-white'
                                                                    }`}
                                                                    title={`${b.booking_number} • ${b.title}\nJam: ${b.start_time} - ${b.end_time} WIB\nPenanggung Jawab: ${b.booker_name} (${b.booker_unit})\nStatus: ${b.status}`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                        <Icon
                                                                            icon={
                                                                                isApproved ? 'ph:check-circle-bold' :
                                                                                isInUse ? 'ph:broadcast-bold' :
                                                                                isPending ? 'ph:clock-countdown-bold' : 'ph:calendar-check-bold'
                                                                            }
                                                                            className="w-4 h-4 shrink-0"
                                                                        />
                                                                        <div className="min-w-0 flex items-center gap-1.5">
                                                                            <span className="truncate text-xs font-bold tracking-tight">{b.title}</span>
                                                                            {b.booker_unit && (
                                                                                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-white/20 shrink-0">
                                                                                    {b.booker_unit}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-black/25">
                                                                            {b.start_time} - {b.end_time}
                                                                        </span>
                                                                        {isInUse && (
                                                                            <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider animate-bounce">
                                                                                LIVE
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Bottom Row of Left Column: + Tambah Booking Baru */}
                                <div className="flex border-t border-slate-200 bg-slate-50/70">
                                    {/* Left Cell: + Tambah Booking Baru */}
                                    <div className="w-64 min-w-[256px] shrink-0 border-r border-slate-200 bg-slate-50/70 sticky left-0 z-20 px-4 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 transition w-full py-1 px-1 rounded-lg hover:bg-teal-50/60 select-none"
                                        >
                                            <Icon icon="ph:plus-bold" className="w-3.5 h-3.5 text-teal-600" />
                                            <span>Tambah Booking Baru</span>
                                        </button>
                                    </div>

                                    {/* Empty track extension below */}
                                    <div className="flex-1 flex bg-slate-50/40 min-h-[38px]">
                                        {zoomMode === 'month' ? (
                                            monthDays.map((day) => (
                                                <div
                                                    key={day.day}
                                                    className={`w-[72px] min-w-[72px] border-r border-slate-100 ${
                                                        day.isWeekend ? 'bg-slate-100/50' : 'bg-transparent'
                                                    }`}
                                                />
                                            ))
                                        ) : (
                                            [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="w-[96px] min-w-[96px] border-r border-slate-100"
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Status Legend & Helpful Tips */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-slate-400 font-semibold mr-1">Keterangan:</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Disetujui
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                Sedang Digunakan (LIVE)
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Menunggu Approval
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                Selesai
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                            <Icon icon="ph:info-bold" className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>Klik agenda untuk rincian & aksi. Klik kolom kosong untuk booking instan.</span>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH BOOKING OLEH ADMIN */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleCreateSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <Icon icon="ph:calendar-plus-bold" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Tambah Booking Ruangan (Atas Nama)</h3>
                                <p className="text-xs text-slate-500">Pendaftaran kegiatan internal langsung oleh tim administrator.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Ruangan Pertemuan *</label>
                            <select
                                value={adminBookingData.room_id}
                                onChange={(e) => setAdminBookingData('room_id', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                required
                            >
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} - Kapasitas: {r.capacity} Orang ({r.location})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pemakaian *</label>
                                <input
                                    type="date"
                                    value={adminBookingData.booking_date}
                                    onChange={(e) => setAdminBookingData('booking_date', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai *</label>
                                <input
                                    type="time"
                                    value={adminBookingData.start_time}
                                    onChange={(e) => setAdminBookingData('start_time', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai *</label>
                                <input
                                    type="time"
                                    value={adminBookingData.end_time}
                                    onChange={(e) => setAdminBookingData('end_time', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Acara / Kegiatan *</label>
                            <input
                                type="text"
                                value={adminBookingData.title}
                                onChange={(e) => setAdminBookingData('title', e.target.value)}
                                placeholder="Contoh: Rapat Direksi & Manajemen Bulanan"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Penanggung Jawab *</label>
                                <select
                                    value={adminBookingData.booker_name}
                                    onChange={(e) => {
                                        const selectedName = e.target.value;
                                        const selectedUser = users.find((u) => u.name === selectedName);
                                        setAdminBookingData((prev) => ({
                                            ...prev,
                                            booker_name: selectedName,
                                            booker_unit: selectedUser?.unit || prev.booker_unit,
                                        }));
                                    }}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 bg-white cursor-pointer"
                                    required
                                >
                                    <option value="">-- Pilih Dokter / Pegawai --</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.name}>
                                            {u.name} {u.unit ? `(${u.unit})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Bagian *</label>
                                <select
                                    value={adminBookingData.booker_unit}
                                    onChange={(e) => setAdminBookingData('booker_unit', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                    required
                                >
                                    {units.map((u, i) => (
                                        <option key={i} value={u}>
                                            {u}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Pemohon</label>
                                <input
                                    type="text"
                                    value={adminBookingData.booker_phone}
                                    onChange={(e) => setAdminBookingData('booker_phone', e.target.value)}
                                    placeholder="08..."
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Peserta</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={adminBookingData.participants_count}
                                    onChange={(e) => setAdminBookingData('participants_count', e.target.value)}
                                    placeholder="Bebas tanpa batasan"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5 relative">
                                <label className="block text-xs font-bold text-slate-700">
                                    Fasilitas Tambahan
                                </label>
                                <div className="flex items-center gap-1.5">
                                    {/* Tombol Titik 3 di Pojok Kanan Atas Container */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsFacilityMenuOpen(!isFacilityMenuOpen)}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition shadow-xs"
                                            title="Menu Fasilitas"
                                        >
                                            <Icon icon="ph:dots-three-vertical-bold" className="w-4 h-4" />
                                        </button>

                                        {isFacilityMenuOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={() => setIsFacilityMenuOpen(false)}
                                                />
                                                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsAddingFacility(true);
                                                            setIsFacilityMenuOpen(false);
                                                            setIsDeleteMode(false);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition text-left"
                                                    >
                                                        <Icon icon="ph:plus-circle-bold" className="w-4 h-4 text-teal-600 shrink-0" />
                                                        <span>Tambah</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsDeleteMode(true);
                                                            setIsFacilityMenuOpen(false);
                                                            setIsAddingFacility(false);
                                                            setSelectedFacilitiesToDelete([]);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition text-left border-t border-slate-100"
                                                    >
                                                        <Icon icon="ph:trash-bold" className="w-4 h-4 text-rose-500 shrink-0" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Form Input Tambah Fasilitas Baru */}
                            {isAddingFacility && (
                                <div className="mb-2.5 p-2 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                                    <input
                                        type="text"
                                        value={newFacilityName}
                                        onChange={(e) => setNewFacilityName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddFacility();
                                            } else if (e.key === 'Escape') {
                                                setIsAddingFacility(false);
                                                setNewFacilityName('');
                                            }
                                        }}
                                        placeholder="Ketik nama fasilitas baru..."
                                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddFacility}
                                        className="px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition shadow-xs shrink-0"
                                    >
                                        Simpan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddingFacility(false);
                                            setNewFacilityName('');
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition shrink-0"
                                    >
                                        Batal
                                    </button>
                                </div>
                            )}

                            {/* Toolbar Mode Hapus */}
                            {isDeleteMode && (
                                <div className="mb-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                                    <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                                        <Icon icon="ph:info-bold" className="w-4 h-4 text-rose-600 shrink-0" />
                                        <span>Pilih fasilitas yang ingin dihapus:</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            disabled={selectedFacilitiesToDelete.length === 0}
                                            onClick={handleDeleteSelectedFacilities}
                                            className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-40 transition shadow-xs"
                                        >
                                            Hapus ({selectedFacilitiesToDelete.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDeleteMode(false);
                                                setSelectedFacilitiesToDelete([]);
                                            }}
                                            className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Grid Container Fasilitas */}
                            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border transition ${
                                isDeleteMode ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20' : 'border-slate-200/70'
                            }`}>
                                {availableFacilities.map((fac) => {
                                    if (isDeleteMode) {
                                        const isMarked = selectedFacilitiesToDelete.includes(fac);
                                        return (
                                            <button
                                                type="button"
                                                key={fac}
                                                onClick={() => toggleFacilityToDelete(fac)}
                                                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left transition border ${
                                                    isMarked
                                                        ? 'bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-300'
                                                        : 'bg-white border-slate-200/80 text-slate-700 hover:border-rose-200 hover:bg-rose-50/30'
                                                }`}
                                            >
                                                <Icon
                                                    icon={isMarked ? 'ph:check-square-fill' : 'ph:square'}
                                                    className={`w-4 h-4 shrink-0 ${isMarked ? 'text-rose-600' : 'text-slate-400'}`}
                                                />
                                                <span className="truncate">{fac}</span>
                                            </button>
                                        );
                                    }

                                    const checked = (adminBookingData.extra_facilities || []).includes(fac);
                                    return (
                                        <button
                                            type="button"
                                            key={fac}
                                            onClick={() => toggleExtraFacility(fac)}
                                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-left transition border ${
                                                checked
                                                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                                                    : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100'
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

                                {availableFacilities.length === 0 && (
                                    <div className="col-span-2 sm:col-span-3 text-center py-4 text-xs text-slate-400">
                                        Belum ada fasilitas tambahan. Klik tombol <span className="font-bold text-teal-600">+</span> untuk menambahkan.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Status Langsung</label>
                            <select
                                value={adminBookingData.status}
                                onChange={(e) => setAdminBookingData('status', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 bg-white"
                            >
                                <option value="approved">Disetujui Langsung (Approved)</option>
                                <option value="pending">Menunggu Konfirmasi (Pending)</option>
                            </select>
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
                            disabled={submittingAdminBooking}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                        >
                            {submittingAdminBooking ? 'Menyimpan...' : 'Daftarkan Booking'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL TOLAK PENGAJUAN BOOKING */}
            {rejectingBooking && (
                <Modal show={Boolean(rejectingBooking)} onClose={() => setRejectingBooking(null)} maxWidth="md">
                    <div className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Tolak Pengajuan Booking Ruangan</h3>
                            <button type="button" onClick={() => setRejectingBooking(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <p className="text-xs text-slate-600">
                                Berikan alasan penolakan untuk pengajuan <strong>{rejectingBooking.booking_number}</strong> ({rejectingBooking.title}). Alasan ini akan tampil pada riwayat pemohon.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Penolakan *</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    placeholder="Contoh: Ruangan akan digunakan untuk agenda mendadak direksi / sedang dalam perbaikan AC..."
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRejectingBooking(null)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={() => updateBookingStatus(rejectingBooking.id, 'rejected', { rejection_reason: rejectionReason })}
                                disabled={!rejectionReason.trim()}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                            >
                                Konfirmasi Tolak
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL DETAIL BOOKING ADMIN */}
            {selectedBooking && (
                <Modal show={Boolean(selectedBooking)} onClose={() => setSelectedBooking(null)} maxWidth="lg">
                    <div className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="font-mono text-xs font-extrabold text-teal-700">
                                    {selectedBooking.booking_number}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                                    {selectedBooking.title}
                                </h3>
                            </div>
                            <button type="button" onClick={() => setSelectedBooking(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Ruangan</span>
                                    <p className="font-bold text-slate-900">{selectedBooking.room?.name || selectedBooking.room_name}</p>
                                </div>
                                <span className="text-xs text-slate-500">{selectedBooking.room?.location || selectedBooking.room_location || 'Lantai 1-3 RSAM'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Kegiatan</span>
                                    <p className="font-bold text-slate-900">{selectedBooking.booking_date_formatted || selectedBooking.booking_date}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Jam Pemakaian</span>
                                    <p className="font-bold text-teal-700 font-mono">{selectedBooking.start_time} - {selectedBooking.end_time} WIB</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Penanggung Jawab</span>
                                    <p className="font-bold text-slate-900">{selectedBooking.booker_name}</p>
                                    <p className="text-[11px] text-slate-500">{selectedBooking.booker_unit}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Peserta & Kontak</span>
                                    <p className="font-bold text-slate-900">{selectedBooking.participants_count ? `${selectedBooking.participants_count} Orang` : '-'}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold">{selectedBooking.booker_phone || '-'}</p>
                                </div>
                            </div>

                            {selectedBooking.extra_facilities?.length > 0 && (
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Fasilitas Tambahan</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedBooking.extra_facilities.map((fac, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md text-[10px] font-semibold border border-teal-200">
                                                {fac}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedBooking.description && (
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Catatan Tambahan</span>
                                    <p className="text-slate-700">{selectedBooking.description}</p>
                                </div>
                            )}

                            {selectedBooking.approved_by && (
                                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 text-emerald-950">
                                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Persetujuan Admin</span>
                                    <p className="mt-0.5">
                                        Disetujui oleh <strong>{selectedBooking.approved_by.name}</strong> pada {selectedBooking.approved_at}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {selectedBooking.status === 'pending' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const b = selectedBooking;
                                                setSelectedBooking(null);
                                                setRejectingBooking(b);
                                            }}
                                            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
                                        >
                                            <Icon icon="ph:x-circle-bold" className="w-3.5 h-3.5" />
                                            <span>Tolak</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateBookingStatus(selectedBooking.id, 'approved');
                                                setSelectedBooking(null);
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                        >
                                            <Icon icon="ph:check-circle-bold" className="w-3.5 h-3.5" />
                                            <span>Setujui Booking</span>
                                        </button>
                                    </>
                                )}

                                {selectedBooking.status === 'approved' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateBookingStatus(selectedBooking.id, 'in_use');
                                                setSelectedBooking(null);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                        >
                                            <Icon icon="ph:broadcast-bold" className="w-3.5 h-3.5" />
                                            <span>Mulai Pakai (LIVE)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                updateBookingStatus(selectedBooking.id, 'completed');
                                                setSelectedBooking(null);
                                            }}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5"
                                        >
                                            <Icon icon="ph:check-bold" className="w-3.5 h-3.5" />
                                            <span>Tandai Selesai</span>
                                        </button>
                                    </>
                                )}

                                {selectedBooking.status === 'in_use' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateBookingStatus(selectedBooking.id, 'completed');
                                            setSelectedBooking(null);
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                    >
                                        <Icon icon="ph:check-bold" className="w-3.5 h-3.5" />
                                        <span>Selesaikan Pemakaian</span>
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedBooking(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL HAPUS BOOKING */}
            {deletingBooking && (
                <Modal show={Boolean(deletingBooking)} onClose={() => setDeletingBooking(null)} maxWidth="sm">
                    <div className="p-6">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Icon icon="ph:warning-bold" className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 text-center">Hapus Data Booking?</h3>
                        <p className="text-xs text-slate-500 text-center mt-1">
                            Apakah Anda yakin ingin menghapus data booking <strong>{deletingBooking.booking_number}</strong> ({deletingBooking.title})?
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingBooking(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSubmit}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
