import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import Modal from '@/Components/Modal';
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

export default function UserRoomBookings({
    rooms = [],
    my_bookings = [],
    month_bookings = [],
    timeline_bookings = [],
    units = [],
    selected_date = '',
}) {
    const { auth } = usePage().props;
    const user = auth?.user;

    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search);
            if (p.get('tab') === 'timeline' || p.get('view') === 'timeline') return 'timeline';
        }
        return 'catalog';
    });
    const [zoomMode, setZoomMode] = useState('month');
    const timelineScrollRef = useRef(null);
    const [filterDate, setFilterDate] = useState(selected_date || new Date().toISOString().split('T')[0]);
    const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
    const [cancellingBooking, setCancellingBooking] = useState(null);
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


    const {
        data: bookingData,
        setData: setBookingData,
        post: postBooking,
        processing: submittingBooking,
        errors: bookingErrors,
        reset: resetBookingForm,
    } = useForm({
        room_id: '',
        booking_date: filterDate,
        start_time: '09:00',
        end_time: '11:00',
        title: '',
        booker_name: user?.name || '',
        booker_unit: user?.unit || (units[0] || 'Umum'),
        booker_phone: '',
        participants_count: 1,
        description: '',
        extra_facilities: [],
    });


    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo) return;

        const channel = window.Echo.channel('room-bookings');
        channel.listen('.RoomBookingUpdated', (e) => {
            if (e?.notification) {
                toast.info(e.notification, { duration: 4000 });
            }
            router.reload({
                only: ['rooms', 'my_bookings', 'month_bookings', 'timeline_bookings'],
                preserveScroll: true,
                preserveState: true,
            });
        });

        return () => {
            channel.stopListening('.RoomBookingUpdated');
        };
    }, []);


    const handleDateChange = (newDate) => {
        setFilterDate(newDate);
        setBookingData('booking_date', newDate);
        router.get('/room-bookings', { date: newDate }, { preserveState: true, replace: true });
    };


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

    const stepDay = (days) => {
        try {
            const d = new Date(filterDate + 'T00:00:00');
            d.setDate(d.getDate() + days);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            handleDateChange(`${y}-${m}-${day}`);
        } catch {

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
        const d = new Date();
        if (
            d.getFullYear() === currentMonthDate.getFullYear() &&
            d.getMonth() === currentMonthDate.getMonth()
        ) {
            return d.getDate();
        }
        if (selected_date) {
            try {
                const parts = selected_date.split('-');
                if (parseInt(parts[0], 10) === currentMonthDate.getFullYear() && (parseInt(parts[1], 10) - 1) === currentMonthDate.getMonth()) {
                    return parseInt(parts[2], 10);
                }
            } catch {

            }
        }
        return null;
    }, [currentMonthDate, selected_date]);

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
            handleDateChange(`${y}-${m}-${day}`);
        } catch {

        }
    };

    const allMonthBookings = useMemo(() => {
        let list = (month_bookings && month_bookings.length > 0) ? [...month_bookings] : [];
        if (my_bookings && my_bookings.length > 0) {
            my_bookings.forEach((b) => {
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
    }, [month_bookings, my_bookings]);

    const getRoomMonthBookings = (room) => {
        return allMonthBookings.filter((b) => Number(b.room_id) === Number(room.id));
    };

    const getRoomDayBookings = (room) => {
        if (room.day_bookings && room.day_bookings.length > 0) {
            return room.day_bookings;
        }

        const fromTimeline = (timeline_bookings || []).filter(
            (b) => Number(b.room_id) === Number(room.id)
        );
        if (fromTimeline.length > 0) return fromTimeline;

        return allMonthBookings.filter(
            (b) => Number(b.room_id) === Number(room.id) && b.booking_date === filterDate
        );
    };

    const dayTotalAgendas = useMemo(() => {
        let count = 0;
        rooms.forEach((r) => {
            count += (r.day_bookings || []).length;
        });
        if (count > 0) return count;
        return allMonthBookings.filter((b) => b.booking_date === filterDate).length;
    }, [rooms, allMonthBookings, filterDate]);

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
        if (activeTab !== 'timeline') return;


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
    }, [activeTab, zoomMode, filterDate]);

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

    const handleQuickUserBookMonthSlot = (room, dateStr) => {
        setSelectedRoomForBooking(room);
        setBookingData({
            room_id: room.id,
            booking_date: dateStr,
            start_time: '09:00',
            end_time: '11:00',
            title: '',
            booker_name: user?.name || '',
            booker_unit: user?.unit || (units[0] || 'Umum'),
            booker_phone: '',
            participants_count: 1,
            description: '',
            extra_facilities: [],
        });
        setIsBookingModalOpen(true);
    };

    const handleQuickUserBookSlot = (room, hourNumber) => {
        const startHourStr = `${String(hourNumber).padStart(2, '0')}:00`;
        const endHourStr = `${String(Math.min(21, hourNumber + 2)).padStart(2, '0')}:00`;
        openBookingModalWithRoom(room, startHourStr, endHourStr);
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
                    badgeBg: 'bg-blue-950/40 text-cyan-200 border border-cyan-400/40',
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

    const openBookingModalWithRoom = (room, initialStartTime = '09:00', initialEndTime = '11:00') => {
        setSelectedRoomForBooking(room);
        setBookingData({
            room_id: room.id,
            booking_date: filterDate,
            start_time: initialStartTime,
            end_time: initialEndTime,
            title: '',
            booker_name: user?.name || '',
            booker_unit: user?.unit || (units[0] || 'Umum'),
            booker_phone: '',
            participants_count: 1,
            description: '',
            extra_facilities: [],
        });
        setIsBookingModalOpen(true);
    };


    const activeRoom = useMemo(() => {
        return rooms.find((r) => r.id === Number(bookingData.room_id)) || selectedRoomForBooking;
    }, [rooms, bookingData.room_id, selectedRoomForBooking]);

    const conflictDetected = useMemo(() => {
        if (!activeRoom || !activeRoom.day_bookings?.length) return null;
        if (bookingData.booking_date !== filterDate) return null;

        const start = bookingData.start_time;
        const end = bookingData.end_time;
        if (!start || !end || start >= end) return null;

        return activeRoom.day_bookings.find((b) => {
            return b.start_time < end && b.end_time > start;
        });
    }, [activeRoom, bookingData.start_time, bookingData.end_time, bookingData.booking_date, filterDate]);

    const handleBookingSubmit = (e) => {
        e.preventDefault();
        postBooking('/room-bookings', {
            onSuccess: () => {
                setIsBookingModalOpen(false);
                resetBookingForm();
            },
        });
    };

    const handleCancelBooking = (booking) => {
        setCancellingBooking(booking);
    };

    const confirmCancelBooking = () => {
        if (!cancellingBooking) return;
        router.post(`/room-bookings/${cancellingBooking.id}/cancel`, {}, {
            onSuccess: () => {
                setCancellingBooking(null);
            },
        });
    };

    const toggleExtraFacility = (fac) => {
        const current = bookingData.extra_facilities || [];
        if (current.includes(fac)) {
            setBookingData('extra_facilities', current.filter((f) => f !== fac));
        } else {
            setBookingData('extra_facilities', [...current, fac]);
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
        const currentSelected = bookingData.extra_facilities || [];
        if (!currentSelected.includes(trimmed)) {
            setBookingData('extra_facilities', [...currentSelected, trimmed]);
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
        const currentSelected = bookingData.extra_facilities || [];
        setBookingData(
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
                return { label: 'Sedang Berlangsung', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
            case 'completed':
                return { label: 'Selesai', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
            case 'rejected':
                return { label: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
            case 'cancelled':
                return { label: 'Dibatalkan', bg: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
            default:
                return { label: 'Menunggu Konfirmasi', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
        }
    };


    const formattedSelectedDate = useMemo(() => {
        try {
            const d = new Date(filterDate + 'T00:00:00');
            return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return filterDate;
        }
    }, [filterDate]);

    return (
        <AppLayout title="Peminjaman Ruangan & Aula - RS Antam Medika">

            <div
                style={{ background: 'linear-gradient(135deg, #176B54 0%, #1B775E 50%, #125844 100%)' }}
                className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-8 lg:p-10 mb-6 shadow-sm border border-emerald-900/20"
            >

                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold border border-white/15 mb-3 backdrop-blur-xs">
                            <Icon icon="ph:buildings-bold" className="w-3.5 h-3.5" />
                            <span>Layanan Terpadu Sarana & Prasarana RSAM</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                            Peminjaman Ruangan Pertemuan & Aula
                        </h1>
                        <p className="mt-2.5 text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
                            Reservasi ruang rapat, aula serbaguna, dan ruang diklat secara mudah dengan transparansi jadwal pemakaian langsung untuk mencegah bentrok antar unit kerja.
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    if (rooms.length > 0) openBookingModalWithRoom(rooms[0]);
                                }}
                                className="px-5 py-2.5 bg-white text-[#176B54] hover:bg-emerald-50 text-xs font-bold rounded-2xl shadow-sm transition active:scale-98 inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:calendar-plus-bold" className="w-4 h-4 text-[#176B54]" />
                                <span>Ajukan Peminjaman Ruangan</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('my_bookings')}
                                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 backdrop-blur-xs transition inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:clock-counter-clockwise-bold" className="w-4 h-4" />
                                <span>Riwayat Booking Saya ({my_bookings.length})</span>
                            </button>
                        </div>
                    </div>


                    <div className="grid grid-cols-2 gap-3 shrink-0 self-stretch md:self-auto">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Total Ruangan</span>
                            <p className="text-2xl font-extrabold text-white mt-1">{rooms.length}</p>
                            <span className="text-[10px] text-emerald-200">Siap digunakan</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[120px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Booking Saya</span>
                            <p className="text-2xl font-extrabold text-white mt-1">{my_bookings.length}</p>
                            <span className="text-[10px] text-emerald-200">Riwayat reservasi</span>
                        </div>
                    </div>
                </div>
            </div>


            <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            activeTab === 'catalog' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Icon icon="ph:squares-four-bold" className="w-4 h-4 text-teal-600" />
                        <span>Katalog Ruangan</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('timeline')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            activeTab === 'timeline' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Icon icon="ph:calendar-blank-bold" className="w-4 h-4 text-teal-600" />
                        <span>Timeline Jadwal Pemakaian</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('my_bookings')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            activeTab === 'my_bookings' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Icon icon="ph:list-bullets-bold" className="w-4 h-4 text-teal-600" />
                        <span>Booking Saya</span>
                        {my_bookings.length > 0 && (
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold flex items-center justify-center">
                                {my_bookings.length}
                            </span>
                        )}
                    </button>
                </div>


                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <button
                        type="button"
                        onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                            filterDate === new Date().toISOString().split('T')[0]
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        Hari Ini
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            handleDateChange(d.toISOString().split('T')[0]);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                    >
                        Besok
                    </button>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Icon icon="ph:calendar-bold" className="w-4 h-4 text-slate-500" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="bg-transparent border-0 p-0 text-xs font-bold text-slate-800 focus:ring-0 cursor-pointer"
                        />
                    </div>
                </div>
            </div>


            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Icon icon="ph:calendar-check-bold" className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-extrabold text-slate-900">
                        Jadwal Ketersediaan: <span className="text-teal-700 underline decoration-teal-300">{formattedSelectedDate}</span>
                    </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                    {rooms.length} Ruangan terdaftar
                </span>
            </div>


            {activeTab === 'catalog' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => {
                        const hasBookings = (room.day_bookings || []).length > 0;

                        return (
                            <div
                                key={room.id}
                                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                            >
                                <div>

                                    <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                                        <img
                                            src={room.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80'}
                                            alt={room.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                                        <div className="absolute top-3 left-3 flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-white/95 text-slate-900 shadow-sm backdrop-blur-xs">
                                                {room.code}
                                            </span>
                                            <span
                                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border backdrop-blur-xs ${
                                                    hasBookings
                                                        ? 'bg-amber-500/90 text-white border-amber-400'
                                                        : 'bg-emerald-600/90 text-white border-emerald-500'
                                                }`}
                                            >
                                                {hasBookings ? `${room.day_bookings.length} Jadwal Terisi` : 'Tersedia Sepanjang Hari'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                                            <span className="text-xs font-semibold flex items-center gap-1 drop-shadow-sm truncate">
                                                <Icon icon="ph:map-pin-bold" className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                                                <span className="truncate">{room.location}</span>
                                            </span>
                                            <span className="text-xs font-bold bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-xs shrink-0">
                                                {room.capacity} Orang
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: room.color || '#0D9488' }}
                                            />
                                            <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition leading-snug line-clamp-1">
                                                {room.name}
                                            </h3>
                                        </div>

                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                            {room.description || 'Ruangan pertemuan standar rumah sakit.'}
                                        </p>


                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {(room.facilities || []).map((f, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200/70"
                                                >
                                                    <Icon icon="ph:check-bold" className="w-3 h-3 text-teal-600" />
                                                    <span>{f}</span>
                                                </span>
                                            ))}
                                        </div>


                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                                Pemakaian pada {formattedSelectedDate.split(',')[0]}
                                            </span>
                                            {hasBookings ? (
                                                <div className="space-y-1.5">
                                                    {room.day_bookings.map((b) => (
                                                        <div
                                                            key={b.id}
                                                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-slate-200/60 shadow-2xs"
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <span className="font-mono font-bold text-teal-700 text-[11px] shrink-0">
                                                                    {b.start_time} - {b.end_time}
                                                                </span>
                                                                <span className="text-slate-800 font-semibold truncate text-[11px]" title={b.title}>
                                                                    {b.title}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                                                                {b.booker_unit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                                                    <Icon icon="ph:check-circle-bold" className="w-4 h-4 text-emerald-600" />
                                                    <span>Belum ada kegiatan (Ruangan bebas dipesan)</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 pt-0">
                                    <button
                                        type="button"
                                        onClick={() => openBookingModalWithRoom(room)}
                                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-2xl transition shadow-xs flex items-center justify-center gap-2 active:scale-98"
                                    >
                                        <Icon icon="ph:calendar-plus-bold" className="w-4 h-4" />
                                        <span>Pesan Ruangan Ini</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            {activeTab === 'timeline' && (
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


                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden text-slate-800">

                        <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 select-none">

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Icon icon="ph:caret-double-right-bold" className="w-4 h-4 text-teal-600 shrink-0" />
                                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 capitalize tracking-tight">
                                        {zoomMode === 'month' ? monthNameFormatted : formattedSelectedDate}
                                    </h3>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                                    {zoomMode === 'month' ? `${allMonthBookings.length} Agenda Terdaftar` : `${dayTotalAgendas} Agenda Hari Ini`}
                                </span>
                            </div>


                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('catalog')}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                                    title="Lihat katalog ruangan"
                                >
                                    <Icon icon="ph:squares-four-bold" className="w-4 h-4 text-slate-500" />
                                    <span className="hidden sm:inline">Katalog Ruangan</span>
                                    <span className="sm:hidden">Katalog</span>
                                </button>


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
                                            handleDateChange(todayDateStr);
                                            setTimeout(() => scrollToToday(true), 80);
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


                        <div
                            ref={timelineScrollRef}
                            className="overflow-x-auto white-gantt-scroll relative select-none"
                        >
                            <div className={zoomMode === 'month' ? 'min-w-[2488px]' : 'min-w-[1600px]'}>

                                <div className="flex border-b border-slate-200 bg-slate-50/90 backdrop-blur-xs h-11 sticky top-0 z-30">

                                    <div className="w-64 min-w-[256px] shrink-0 border-r border-slate-200 bg-slate-50 sticky left-0 z-40 px-4 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span>RUANGAN</span>
                                        <span className="text-[10px] text-slate-500 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200/80">{rooms.length} unit</span>
                                    </div>


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


                                            {todayDayNumber !== null && (
                                                <div
                                                    id="timeline-today-pin"
                                                    style={{ left: `${(todayDayNumber - 0.5) * 72}px` }}
                                                    className="absolute top-0 bottom-[-9999px] w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                                                />
                                            )}
                                        </div>
                                    ) : (

                                        <div className="flex-1 flex relative">
                                            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="w-[96px] min-w-[96px] h-full border-r border-slate-200/70 flex items-center justify-center text-xs font-bold text-slate-600 font-mono bg-slate-50/50"
                                                >
                                                    <span>{String(hour).padStart(2, '0')}:00</span>
                                                </div>
                                            ))}


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
                                                            onClick={() => handleQuickUserBookMonthSlot(room, filterDate)}
                                                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-500 hover:text-teal-700 flex items-center justify-center transition"
                                                            title="Ajukan Peminjaman"
                                                        >
                                                            <Icon icon="ph:plus-bold" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>


                                                {zoomMode === 'month' ? (

                                                    <div className="flex-1 flex relative">
                                                        {monthDays.map((day) => (
                                                            <div
                                                                key={day.day}
                                                                onClick={() => handleQuickUserBookMonthSlot(room, day.dateStr)}
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


                                                        {monthLanesList.map((b) => {
                                                            const isApproved = b.status === 'approved';
                                                            const isInUse = b.status === 'in_use';
                                                            const isPending = b.status === 'pending';

                                                            return (
                                                                <div
                                                                    key={b.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedBookingDetail(b);
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
                                                                            ? 'bg-blue-50 border-blue-400 text-blue-950 ring-2 ring-blue-400/60'
                                                                            : isPending
                                                                            ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                                                                            : 'bg-slate-100 border-slate-300 text-slate-800'
                                                                    }`}
                                                                    title={`${b.booking_number} • ${b.title}\nWaktu: ${b.booking_date} (${b.start_time} - ${b.end_time})\nPenanggung Jawab: ${b.booker_name} (${b.booker_unit})\nStatus: ${b.status}\n\nKlik untuk melihat rincian agenda.`}
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

                                                    <div className="flex-1 flex relative">
                                                        {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => (
                                                            <div
                                                                key={hour}
                                                                onClick={() => handleQuickUserBookSlot(room, hour)}
                                                                className="w-[96px] min-w-[96px] h-full border-r border-slate-100 relative cursor-pointer hover:bg-teal-50/30 transition group/slot bg-white"
                                                                title={`Klik untuk booking ${room.name} jam ${String(hour).padStart(2, '0')}:00`}
                                                            >
                                                                <div className="opacity-0 group-hover/slot:opacity-100 transition absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                    <Icon icon="ph:plus" className="w-3.5 h-3.5 text-teal-600" />
                                                                </div>
                                                            </div>
                                                        ))}


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
                                                                        setSelectedBookingDetail(b);
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
                                                                            ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-300 shadow-blue-700/15'
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
                                                                            <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
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


                                <div className="flex border-t border-slate-200 bg-slate-50/70">

                                    <div className="w-64 min-w-[256px] shrink-0 border-r border-slate-200 bg-slate-50/70 sticky left-0 z-20 px-4 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (rooms.length > 0) openBookingModalWithRoom(rooms[0]);
                                                else setIsBookingModalOpen(true);
                                            }}
                                            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 transition w-full py-1 px-1 rounded-lg hover:bg-teal-50/60 select-none"
                                        >
                                            <Icon icon="ph:plus-bold" className="w-3.5 h-3.5 text-teal-600" />
                                            <span>Ajukan Peminjaman Ruangan</span>
                                        </button>
                                    </div>


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


                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-slate-400 font-semibold mr-1">Keterangan:</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Disetujui
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold border border-blue-200">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                Sedang Digunakan (LIVE)
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Menunggu Konfirmasi
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-500" />
                                Selesai
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500">
                            <Icon icon="ph:info-bold" className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>Klik agenda untuk melihat detail. Klik kolom kosong untuk booking langsung.</span>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'my_bookings' && (
                <div className="space-y-4">
                    {my_bookings.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
                                <Icon icon="ph:calendar-x-bold" className="w-7 h-7" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">Belum ada riwayat peminjaman</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Anda belum mengajukan peminjaman ruangan. Pilih ruangan yang tersedia dari katalog dan ajukan jadwal Anda.
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveTab('catalog')}
                                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
                            >
                                <Icon icon="ph:squares-four-bold" className="w-4 h-4" />
                                <span>Lihat Katalog Ruangan</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {my_bookings.map((booking) => {
                                const statusObj = getStatusBadge(booking.status);

                                return (
                                    <div
                                        key={booking.id}
                                        className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <span className="font-mono text-xs font-extrabold text-teal-700">
                                                    {booking.booking_number}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusObj.bg}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dot}`} />
                                                    {statusObj.label}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-slate-900 leading-snug">
                                                {booking.title}
                                            </h3>

                                            <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                                    <Icon icon="ph:door-bold" className="w-4 h-4 text-teal-600" />
                                                    <span>{booking.room?.name || 'Ruangan'}</span>
                                                </div>
                                                {booking.participants_count && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <div className="flex items-center gap-1 text-slate-500 font-medium">
                                                            <Icon icon="ph:users-bold" className="w-3.5 h-3.5" />
                                                            <span>{booking.participants_count} Peserta</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Icon icon="ph:calendar-blank-bold" className="w-4 h-4 text-teal-600" />
                                                    <span className="font-bold text-slate-900">{booking.booking_date_formatted}</span>
                                                </div>
                                                <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                                                    {booking.start_time} - {booking.end_time} WIB
                                                </span>
                                            </div>


                                            {booking.status === 'rejected' && booking.rejection_reason && (
                                                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                                                    <strong className="block text-[11px] font-bold text-red-700">Alasan Penolakan Admin:</strong>
                                                    <p className="mt-0.5">{booking.rejection_reason}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-400">
                                                Diajukan {booking.created_at_human}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {booking.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelBooking(booking)}
                                                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1"
                                                    >
                                                        <Icon icon="ph:x-circle-bold" className="w-3.5 h-3.5" />
                                                        <span>Batalkan</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBookingDetail(booking)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1"
                                                >
                                                    <Icon icon="ph:eye-bold" className="w-3.5 h-3.5" />
                                                    <span>Detail</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}


            <Modal show={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleBookingSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <Icon icon="ph:calendar-plus-bold" className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Form Pengajuan Peminjaman Ruangan</h3>
                                <p className="text-xs text-slate-500">Reservasi ruang pertemuan untuk kegiatan dinas RS Antam Medika.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setIsBookingModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                            <Icon icon="ph:x-bold" className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Ruangan Pertemuan *</label>
                            <select
                                value={bookingData.room_id}
                                onChange={(e) => setBookingData('room_id', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500 bg-white"
                                required
                            >
                                <option value="">-- Pilih Ruangan --</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} ({r.location}) - Kapasitas: {r.capacity} Orang
                                    </option>
                                ))}
                            </select>
                            {bookingErrors.room_id && <p className="text-[11px] text-red-600 mt-1">{bookingErrors.room_id}</p>}
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pemakaian *</label>
                                <input
                                    type="date"
                                    value={bookingData.booking_date}
                                    onChange={(e) => setBookingData('booking_date', e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai *</label>
                                <input
                                    type="time"
                                    value={bookingData.start_time}
                                    onChange={(e) => setBookingData('start_time', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai *</label>
                                <input
                                    type="time"
                                    value={bookingData.end_time}
                                    onChange={(e) => setBookingData('end_time', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                        </div>


                        {conflictDetected && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5">
                                <Icon icon="ph:warning-octagon-fill" className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="font-extrabold text-rose-900 block">Jadwal Bentrok dengan Kegiatan Lain!</strong>
                                    <p className="mt-0.5 text-rose-800">
                                        Ruangan telah dipesan pada jam <strong>{conflictDetected.start_time} - {conflictDetected.end_time}</strong> untuk agenda "<strong>{conflictDetected.title}</strong>" ({conflictDetected.booker_unit}). Silakan ubah jam atau pilih ruangan lain.
                                    </p>
                                </div>
                            </div>
                        )}


                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Acara / Agenda Kegiatan *</label>
                            <input
                                type="text"
                                value={bookingData.title}
                                onChange={(e) => setBookingData('title', e.target.value)}
                                placeholder="Contoh: Rapat Koordinasi Mutu Pelayanan & Keselamatan Pasien"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                required
                            />
                            {bookingErrors.title && <p className="text-[11px] text-red-600 mt-1">{bookingErrors.title}</p>}
                        </div>


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Penanggung Jawab *</label>
                                <input
                                    type="text"
                                    value={bookingData.booker_name}
                                    onChange={(e) => setBookingData('booker_name', e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Unit / Bagian Pemohon *</label>
                                <select
                                    value={bookingData.booker_unit}
                                    onChange={(e) => setBookingData('booker_unit', e.target.value)}
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
                                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP Penanggung Jawab</label>
                                <input
                                    type="text"
                                    value={bookingData.booker_phone}
                                    onChange={(e) => setBookingData('booker_phone', e.target.value)}
                                    placeholder="081234567890"
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Peserta</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={bookingData.participants_count}
                                    onChange={(e) => setBookingData('participants_count', e.target.value)}
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

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddingFacility((prev) => !prev);
                                            setIsFacilityMenuOpen(false);
                                            setIsDeleteMode(false);
                                        }}
                                        className="h-7 px-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 transition shadow-xs text-xs font-semibold"
                                        title="Tambah Fasilitas Baru"
                                    >
                                        <Icon icon="ph:plus-bold" className="w-3.5 h-3.5 text-teal-600" />
                                        <span className="hidden sm:inline text-[11px]">Tambah</span>
                                    </button>


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

                                    const checked = (bookingData.extra_facilities || []).includes(fac);
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
                            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan / Agenda Rinci</label>
                            <textarea
                                value={bookingData.description}
                                onChange={(e) => setBookingData('description', e.target.value)}
                                rows={2}
                                placeholder="Contoh: Membutuhkan mic tambahan 2 buah dan penataan meja bentuk U-Shape..."
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsBookingModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingBooking || Boolean(conflictDetected)}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                        >
                            <Icon icon="ph:paper-plane-right-bold" className="w-4 h-4" />
                            <span>{submittingBooking ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Booking'}</span>
                        </button>
                    </div>
                </form>
            </Modal>


            {selectedBookingDetail && (
                <Modal show={Boolean(selectedBookingDetail)} onClose={() => setSelectedBookingDetail(null)} maxWidth="lg">
                    <div className="p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="font-mono text-xs font-extrabold text-teal-700">
                                    {selectedBookingDetail.booking_number}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                                    {selectedBookingDetail.title}
                                </h3>
                            </div>
                            <button type="button" onClick={() => setSelectedBookingDetail(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                                <Icon icon="ph:x-bold" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="py-4 space-y-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Ruangan</span>
                                    <p className="font-bold text-slate-900">{selectedBookingDetail.room?.name || selectedBookingDetail.room_name}</p>
                                </div>
                                <span className="text-xs text-slate-500">{selectedBookingDetail.room?.location || selectedBookingDetail.room_location || 'Lantai 1-3 RSAM'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tanggal</span>
                                    <p className="font-bold text-slate-900">{selectedBookingDetail.booking_date_formatted || selectedBookingDetail.booking_date}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Jam Pemakaian</span>
                                    <p className="font-bold text-teal-700 font-mono">{selectedBookingDetail.start_time} - {selectedBookingDetail.end_time} WIB</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Pemohon & Unit</span>
                                    <p className="font-bold text-slate-900">{selectedBookingDetail.booker_name}</p>
                                    <p className="text-[11px] text-slate-500">{selectedBookingDetail.booker_unit}</p>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Peserta & Kontak</span>
                                    <p className="font-bold text-slate-900">{selectedBookingDetail.participants_count ? `${selectedBookingDetail.participants_count} Orang` : '-'}</p>
                                    <p className="text-[11px] text-emerald-600 font-semibold">{selectedBookingDetail.booker_phone || '-'}</p>
                                </div>
                            </div>

                            {selectedBookingDetail.extra_facilities?.length > 0 && (
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Fasilitas Tambahan</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedBookingDetail.extra_facilities.map((fac, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md text-[10px] font-semibold border border-teal-200">
                                                {fac}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedBookingDetail.description && (
                                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Catatan Khusus</span>
                                    <p className="text-slate-700">{selectedBookingDetail.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedBookingDetail(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </Modal>
            )}


            {cancellingBooking && (
                <Modal show={Boolean(cancellingBooking)} onClose={() => setCancellingBooking(null)} maxWidth="sm">
                    <div className="p-6">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                            <Icon icon="ph:warning-circle-bold" className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 text-center">Batalkan Pengajuan Booking?</h3>
                        <p className="text-xs text-slate-500 text-center mt-1">
                            Apakah Anda yakin ingin membatalkan pengajuan booking ruangan <strong>{cancellingBooking.booking_number}</strong> ({cancellingBooking.title})?
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCancellingBooking(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                            >
                                Kembali
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancelBooking}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                            >
                                Ya, Batalkan Booking
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AppLayout>
    );
}
