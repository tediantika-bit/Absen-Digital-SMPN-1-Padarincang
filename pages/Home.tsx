
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LogIn, LogOut, Coffee, GraduationCap, MapPin, Clock, Camera, Check, X, RefreshCw, Fingerprint, FileText, Calendar as CalendarIcon, Image as ImageIcon, AlertCircle, ShieldCheck, Navigation } from 'lucide-react';
import Header from '../components/Header';
import { User } from '../types';

interface HomeProps { user: User; }

// School coordinates for SMPN 1 Padarincang
const SCHOOL_LAT = -6.207717532534012;
const SCHOOL_LNG = 105.97297020119038;
const ALLOWED_RADIUS_METERS = 50; 

// URL Deployment Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz1Gy-QYQMVssA1F888bdM4alqNXisnlQNY8Hr7lTYa8nYInrD_IMSb9T7VleGOleDWPA/exec'; 

const Home: React.FC<HomeProps> = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'IDLE' | 'PRESENT' | 'OUT'>('IDLE');
  const [showTeachingModal, setShowTeachingModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // State untuk Notifikasi
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('PAI');

  const [leaveType, setLeaveType] = useState<'Izin' | 'Sakit' | 'Dinas'>('Izin');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveAttachment, setLeaveAttachment] = useState<string | null>(null);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceType, setAttendanceType] = useState<'IN' | 'OUT' | 'TEACHING' | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000); // Hilang setelah 4 detik
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  };

  const isAfterPulangTime = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return hours > 14 || (hours === 14 && minutes >= 20);
  }, [currentTime]);

  const isPulangDisabled = status !== 'PRESENT' || !isAfterPulangTime;

  // Haversine formula to calculate distance in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const clearErrors = () => setErrors({});

  const handleOpenTeaching = () => {
    const now = new Date();
    const start = now.toTimeString().slice(0, 5);
    const endObj = new Date(now.getTime() + 60 * 60 * 1000);
    const end = endObj.toTimeString().slice(0, 5);

    setStartTime(start);
    setEndTime(end);
    setAttendanceType('TEACHING');
    setPhoto(null);
    clearErrors();
    setShowTeachingModal(true);
    startCamera();
  };

  const openAttendanceModal = (type: 'IN' | 'OUT') => {
    setAttendanceType(type);
    setShowAttendanceModal(true);
    setPhoto(null);
    clearErrors();
    getLocation();
    startCamera();
  };

  const closeAttendanceModal = () => {
    setShowAttendanceModal(false);
    stopCamera();
    setAttendanceType(null);
    setPhoto(null);
    setDistance(null);
    setLocation(null);
    clearErrors();
    setIsSubmitting(false);
  };

  const closeTeachingModal = () => {
    setShowTeachingModal(false);
    stopCamera();
    setAttendanceType(null);
    setPhoto(null);
    clearErrors();
    setIsSubmitting(false);
  };

  const closeLeaveModal = () => {
    setShowLeaveModal(false);
    clearErrors();
    setIsSubmitting(false);
  };

  const getLocation = () => {
    setGpsLoading(true);
    setErrors(prev => {
        const next = {...prev};
        delete next.location;
        return next;
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(coords);
          const dist = calculateDistance(coords.lat, coords.lng, SCHOOL_LAT, SCHOOL_LNG);
          setDistance(dist);
          
          if (dist > ALLOWED_RADIUS_METERS) {
            setErrors(prev => ({...prev, location: `Anda berada di luar radius sekolah (${Math.round(dist)}m). Maksimal radius: ${ALLOWED_RADIUS_METERS}m.`}));
          }

          setGpsLoading(false);
        },
        (error) => {
          console.error("Error getting location", error);
          setGpsLoading(false);
          setErrors(prev => ({...prev, location: "Gagal mendapatkan koordinat GPS. Pastikan izin lokasi aktif."}));
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          aspectRatio: { ideal: 3/4 },
          width: { ideal: 1200 },
          height: { ideal: 1600 }
        }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      setIsCameraActive(false);
      setErrors(prev => ({...prev, photo: "Kamera tidak dapat diakses."}));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      const targetAspect = 3 / 4;
      
      canvas.width = 600;
      canvas.height = 800;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const currentAspect = vWidth / vHeight;
        let sWidth, sHeight, sx, sy;

        if (currentAspect > targetAspect) {
          sHeight = vHeight;
          sWidth = vHeight * targetAspect;
          sx = (vWidth - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = vWidth;
          sHeight = vWidth / targetAspect;
          sx = 0;
          sy = (vHeight - sHeight) / 2;
        }

        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 600, 800);
        // Menggunakan Quality 0.7 agar ukuran file tidak terlalu besar saat upload
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhoto(dataUrl);
        setErrors(prev => {
            const next = {...prev};
            delete next.photo;
            return next;
        });
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
          setErrors(prev => ({...prev, attachment: "File terlalu besar (Maks 5MB)."}));
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLeaveAttachment(reader.result as string);
        setErrors(prev => {
            const next = {...prev};
            delete next.attachment;
            return next;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const submitToSpreadsheet = async (formData: FormData, successMessage: string, onSuccess: () => void) => {
    setIsSubmitting(true);
    try {
      // Kirim menggunakan metode POST ke Apps Script
      // Apps Script doPost handle parameter sebagai FormData
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.result === 'success') {
        showNotification(successMessage, 'success');
        onSuccess();
      } else {
        throw new Error(result.error || "Gagal menyimpan data.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      showNotification("Gagal mengirim data. Periksa koneksi internet Anda.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAttendance = () => {
    const newErrors: Record<string, string> = {};
    if (!photo) newErrors.photo = "Wajib mengambil foto selfie sebagai bukti kehadiran.";
    if (!location) newErrors.location = "Wajib mengaktifkan GPS untuk mencatat lokasi presensi.";
    if (distance !== null && distance > ALLOWED_RADIUS_METERS) {
        newErrors.location = `Gagal! Jarak Anda (${Math.round(distance)}m) terlalu jauh dari sekolah.`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const typeLabel = attendanceType === 'IN' ? 'Masuk' : 'Pulang';
    
    const formData = new FormData();
    formData.append('action', 'attendance');
    formData.append('type', attendanceType === 'IN' ? 'Hadir (Masuk)' : 'Hadir (Pulang)');
    formData.append('nip', user.nip);
    formData.append('name', user.name);
    formData.append('lat', location?.lat.toString() || '');
    formData.append('lng', location?.lng.toString() || '');
    formData.append('distance', Math.round(distance || 0).toString());
    // Kirim foto sebagai string Base64
    if (photo) formData.append('photo', photo);

    submitToSpreadsheet(
      formData, 
      `Presensi ${typeLabel} Berhasil Dicatat! Data telah tersimpan.`,
      () => {
        if (attendanceType === 'IN') {
          setStatus('PRESENT');
        } else {
          setStatus('OUT');
        }
        closeAttendanceModal();
      }
    );
  };

  const handleSubmitTeaching = () => {
    const newErrors: Record<string, string> = {};
    
    if (!startTime) newErrors.startTime = "Jam mulai wajib diisi.";
    if (!endTime) newErrors.endTime = "Jam selesai wajib diisi.";
    if (startTime && endTime && startTime >= endTime) {
        newErrors.endTime = "Jam selesai harus setelah jam mulai.";
    }
    if (!photo) newErrors.photo = "Bukti foto mengajar wajib dilampirkan.";

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    const formData = new FormData();
    formData.append('action', 'teaching');
    formData.append('nip', user.nip);
    formData.append('name', user.name);
    formData.append('subject', selectedSubject);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('className', 'VI - 1'); // Bisa dibuat dinamis nanti
    if (photo) formData.append('photo', photo);

    submitToSpreadsheet(
        formData,
        `Laporan Mengajar Berhasil Disimpan!`,
        () => closeTeachingModal()
    );
  };

  const handleSubmitLeave = () => {
    const newErrors: Record<string, string> = {};
    
    if (!leaveStartDate) newErrors.leaveStartDate = "Pilih tanggal mulai.";
    if (!leaveEndDate) newErrors.leaveEndDate = "Pilih tanggal selesai.";
    if (leaveStartDate && leaveEndDate && leaveEndDate < leaveStartDate) {
        newErrors.leaveEndDate = "Tanggal selesai tidak boleh mendahului tanggal mulai.";
    }
    if (!leaveReason || leaveReason.trim().length < 10) {
        newErrors.leaveReason = "Keterangan minimal 10 karakter.";
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    const formData = new FormData();
    formData.append('action', 'leave');
    formData.append('nip', user.nip);
    formData.append('name', user.name);
    formData.append('leaveType', leaveType);
    formData.append('startDate', leaveStartDate);
    formData.append('endDate', leaveEndDate);
    formData.append('reason', leaveReason);
    if (leaveAttachment) formData.append('attachment', leaveAttachment);

    submitToSpreadsheet(
        formData,
        `Pengajuan ${leaveType} Berhasil Dikirim!`,
        () => {
            setShowLeaveModal(false);
            setLeaveReason('');
            setLeaveStartDate('');
            setLeaveEndDate('');
            setLeaveAttachment(null);
        }
    );
  };

  const ErrorMsg = ({ name }: { name: string }) => errors[name] ? (
    <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
      <AlertCircle size={10} /> {errors[name]}
    </p>
  ) : null;

  return (
    <div className="flex-1 pb-24 overflow-y-auto relative">
      <Header title="Dashboard" />
      
      {/* GLOBAL NOTIFICATION COMPONENT */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-5 duration-300 backdrop-blur-md ${
          notification.type === 'success' 
            ? 'bg-emerald-500/90 border-emerald-400/50 text-white' 
            : 'bg-red-500/90 border-red-400/50 text-white'
        }`}>
          <div className="p-2 bg-white/20 rounded-full shrink-0">
            {notification.type === 'success' ? <Check size={20} strokeWidth={3} /> : <AlertCircle size={20} strokeWidth={3} />}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm leading-tight">{notification.type === 'success' ? 'Berhasil' : 'Gagal'}</h4>
            <p className="text-xs font-medium opacity-90 mt-0.5 leading-snug">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="px-6 mb-6">
        <div className="p-6 rounded-2xl glass overflow-hidden relative border-indigo-500/20">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <LogOut size={100} className="rotate-180" />
          </div>
          <h2 className="text-slate-400 text-sm font-medium">Halo, selamat pagi!</h2>
          <p className="text-xl font-bold text-white mt-1 truncate">{user.name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span className="text-[10px] font-semibold uppercase">{user.role}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                NIP: {user.nip}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-10 text-center">
        <div className="inline-block px-8 py-6 bg-slate-900/40 rounded-3xl border border-white/5 shadow-inner">
            <div className="text-4xl font-mono font-bold tracking-tighter text-indigo-400 mb-1">
                {formatTime(currentTime)}
            </div>
            <div className="text-slate-400 text-sm font-medium">
                {formatDate(currentTime)}
            </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-4">
        <button 
            onClick={() => openAttendanceModal('IN')}
            disabled={status !== 'IDLE'}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 transition-all disabled:opacity-50 disabled:grayscale group"
        >
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 group-active:scale-95 transition-transform">
                <LogIn className="text-white" size={24} />
            </div>
            <span className="text-white font-bold text-xs">Absen Masuk</span>
        </button>

        <button 
            onClick={() => openAttendanceModal('OUT')}
            disabled={isPulangDisabled}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-all disabled:opacity-50 disabled:grayscale group relative overflow-hidden"
        >
            <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20 group-active:scale-95 transition-transform">
                <LogOut className="text-white" size={24} />
            </div>
            <span className="text-white font-bold text-xs">Absen Pulang</span>
            {status === 'PRESENT' && !isAfterPulangTime && (
              <span className="text-[9px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Pukul 14:20
              </span>
            )}
        </button>

        <button 
            onClick={handleOpenTeaching}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-amber-600/10 border border-amber-500/20 hover:bg-amber-600/20 transition-all group"
        >
            <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20 group-active:scale-95 transition-transform">
                <GraduationCap className="text-white" size={24} />
            </div>
            <span className="text-white font-bold text-xs text-center leading-tight">Absen Mengajar</span>
        </button>

        <button 
            onClick={() => {
                clearErrors();
                setShowLeaveModal(true);
            }}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 transition-all group"
        >
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20 group-active:scale-95 transition-transform">
                <Coffee className="text-white" size={24} />
            </div>
            <span className="text-white font-bold text-xs">Ijin / Sakit</span>
        </button>
      </div>

      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={closeAttendanceModal} />
          <div className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Absen {attendanceType === 'IN' ? 'Masuk' : 'Pulang'}</h3>
              <button onClick={closeAttendanceModal} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <label className="text-[10px] text-indigo-400 uppercase font-bold absolute -top-2 left-4 bg-slate-900 px-2 z-10 tracking-widest">Identitas Pegawai</label>
                  <div className="w-full flex items-center justify-between p-4 bg-slate-800/40 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <span className="text-sm text-white font-bold block">{user.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono font-medium block">NIP: {user.nip}</span>
                      </div>
                    </div>
                    {distance !== null && (
                        <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-end ${distance <= ALLOWED_RADIUS_METERS ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <span className="text-[9px] text-slate-500 uppercase font-bold">Jarak</span>
                            <span className={`text-xs font-black ${distance <= ALLOWED_RADIUS_METERS ? 'text-emerald-500' : 'text-red-500'}`}>
                                {Math.round(distance)}m
                            </span>
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between ${errors.location ? 'bg-red-500/5 border-red-500/40' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${location ? (distance !== null && distance <= ALLOWED_RADIUS_METERS ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500') : 'bg-slate-700 text-slate-500'}`}>
                    <Navigation size={18} className={location ? '' : 'animate-pulse'} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Live GPS Location</span>
                    <span className="text-xs text-white font-mono block truncate max-w-[180px]">
                      {gpsLoading ? 'Melacak Posisi...' : location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Gagal melacak'}
                    </span>
                    <ErrorMsg name="location" />
                  </div>
                </div>
                <button onClick={getLocation} className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors">
                  <RefreshCw size={18} className={gpsLoading ? 'animate-spin' : ''}/>
                </button>
              </div>

              <div className={`relative aspect-[3/4] w-full max-w-[280px] mx-auto bg-slate-950 rounded-[2rem] overflow-hidden border-2 shadow-2xl transition-colors ${errors.photo ? 'border-red-500/50' : 'border-indigo-500/30'}`}>
                {photo ? (
                  <>
                    <img src={photo} alt="Selfie preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                    <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                      <Check size={12} /> BERHASIL DIAMBIL
                    </div>
                    <button 
                      onClick={() => { setPhoto(null); startCamera(); }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 p-4 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20 shadow-lg active:scale-90 transition-transform"
                    >
                      <RefreshCw size={24} />
                    </button>
                  </>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                      <Camera size={12} className="text-indigo-400" /> MODE POTRAIT
                    </div>
                    {isCameraActive && (
                      <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white p-1 border-4 border-slate-900 shadow-2xl active:scale-90 transition-transform flex items-center justify-center">
                        <div className="w-full h-full bg-slate-100 rounded-full border border-slate-300" />
                      </button>
                    )}
                  </>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="text-center"><ErrorMsg name="photo" /></div>

              <button 
                onClick={handleSubmitAttendance}
                disabled={(distance !== null && distance > ALLOWED_RADIUS_METERS) || isSubmitting}
                className={`w-full py-5 text-white font-bold rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 ${distance !== null && distance > ALLOWED_RADIUS_METERS ? 'bg-slate-700 cursor-not-allowed opacity-60' : 'bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-700'}`}
              >
                {isSubmitting ? (
                    <RefreshCw className="animate-spin" size={20} />
                ) : (
                    <>
                        <Check size={20} />
                        {distance !== null && distance > ALLOWED_RADIUS_METERS ? 'Di luar Jangkauan Sekolah' : 'Kirim Laporan Presensi'}
                    </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeachingModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={closeTeachingModal} />
            <div className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300 my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <GraduationCap className="text-amber-500" /> Sesi Mengajar
                    </h3>
                    <button onClick={closeTeachingModal} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1 tracking-wider">Identitas Guru</span>
                            <span className="text-xs text-white font-medium truncate block">{user.name}</span>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1 tracking-wider">NIP (Verified)</span>
                            <span className="text-xs text-indigo-400 font-mono font-bold block">{user.nip}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                               <Clock size={10}/> Jam Mulai
                            </label>
                            <input 
                              type="time" 
                              value={startTime}
                              onChange={(e) => {
                                setStartTime(e.target.value);
                                setErrors(prev => ({...prev, startTime: "", endTime: ""}));
                              }}
                              className={`w-full p-4 bg-slate-800 border rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 ${errors.startTime ? 'border-red-500' : 'border-slate-700'}`} 
                            />
                            <ErrorMsg name="startTime" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                               <Clock size={10}/> Jam Selesai
                            </label>
                            <input 
                              type="time" 
                              value={endTime}
                              onChange={(e) => {
                                setEndTime(e.target.value);
                                setErrors(prev => ({...prev, endTime: ""}));
                              }}
                              className={`w-full p-4 bg-slate-800 border rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 ${errors.endTime ? 'border-red-500' : 'border-slate-700'}`} 
                            />
                            <ErrorMsg name="endTime" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                             <MapPin size={10}/> Ruang / Kelas
                          </label>
                          <select className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs">
                              <option>VI - 1</option>
                              <option>VI - 2</option>
                              <option>VI - 3</option>
                              <option>VI - 4</option>
                              <option>VI - 5</option>
                              <option>VI - 6</option>
                              <option>VI - 7</option>
                              <option>VII - 1</option>
                              <option>VII - 2</option>
                              <option>VII - 3</option>
                              <option>VII - 4</option>
                              <option>VII - 5</option>
                              <option>VII - 6</option>
                              <option>VII - 7</option>
                              <option>IX - 1</option>
                              <option>IX - 2</option>
                              <option>IX - 3</option>
                              <option>IX - 4</option>
                              <option>IX - 5</option>
                              <option>IX - 6</option>
                              <option>IX - 7</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                             <FileText size={10}/> Mata Pelajaran
                          </label>
                          <select 
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs"
                          >
                              <option>PAI</option>
                              <option>PKN</option>
                              <option>B. INDONESIA</option>
                              <option>B. INGGRIS</option>
                              <option>IPA</option>
                              <option>IPS</option>
                              <option>PJOK</option>
                              <option>SBD</option>
                              <option>TIK</option>
                              <option>MATEMATIKA</option>
                              <option>KASERANGAN</option>
                              <option>BTQ</option>
                              <option>PRAKARYA</option>
                              <option>BP/BK</option>
                          </select>
                      </div>
                    </div>

                    <div className={`relative aspect-[3/4] w-full max-w-[200px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 shadow-xl mt-2 transition-colors ${errors.photo ? 'border-red-500' : 'border-amber-500/30'}`}>
                        {photo ? (
                          <>
                            <img src={photo} alt="Teaching selfie" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => { setPhoto(null); startCamera(); }}
                              className="absolute bottom-3 left-1/2 -translate-x-1/2 p-2 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20 shadow-lg active:scale-90 transition-transform"
                            >
                              <RefreshCw size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10 uppercase">
                              <Camera size={10} className="text-amber-500" /> Bukti Ngajar
                            </div>
                            {isCameraActive && (
                              <button onClick={capturePhoto} className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white p-1 border-2 border-slate-900 shadow-xl active:scale-90 transition-transform flex items-center justify-center">
                                <div className="w-full h-full bg-slate-100 rounded-full border border-slate-300" />
                              </button>
                            )}
                          </>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="text-center"><ErrorMsg name="photo" /></div>

                    <button 
                        onClick={handleSubmitTeaching}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Check size={20} strokeWidth={3} />
                                Konfirmasi Sesi
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md" onClick={closeLeaveModal} />
            <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] p-6 border border-white/10 shadow-2xl animate-in zoom-in duration-300 my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg"><Coffee size={20} className="text-white"/></div>
                        Pengajuan Izin
                    </h3>
                    <button onClick={closeLeaveModal} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="space-y-5">
                    {/* Teacher Identity Block */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1 tracking-wider">Identitas Guru</span>
                            <span className="text-xs text-white font-medium truncate block">{user.name}</span>
                        </div>
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1 tracking-wider">NIP (Verified)</span>
                            <span className="text-xs text-indigo-400 font-mono font-bold block">{user.nip}</span>
                        </div>
                    </div>

                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                        {(['Izin', 'Sakit', 'Dinas'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setLeaveType(type)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${leaveType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                               <CalendarIcon size={12}/> Tgl Mulai
                            </label>
                            <input 
                                type="date" 
                                value={leaveStartDate}
                                onChange={(e) => {
                                    setLeaveStartDate(e.target.value);
                                    setErrors(prev => ({...prev, leaveStartDate: "", leaveEndDate: ""}));
                                }}
                                className={`w-full p-4 bg-slate-800 border rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 ${errors.leaveStartDate ? 'border-red-500' : 'border-slate-700'}`} 
                            />
                            <ErrorMsg name="leaveStartDate" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                               <CalendarIcon size={12}/> Tgl Selesai
                            </label>
                            <input 
                                type="date" 
                                value={leaveEndDate}
                                onChange={(e) => {
                                    setLeaveEndDate(e.target.value);
                                    setErrors(prev => ({...prev, leaveEndDate: ""}));
                                }}
                                className={`w-full p-4 bg-slate-800 border rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 ${errors.leaveEndDate ? 'border-red-500' : 'border-slate-700'}`} 
                            />
                            <ErrorMsg name="leaveEndDate" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-1">Keterangan / Alasan</label>
                        <textarea 
                            value={leaveReason}
                            onChange={(e) => {
                                setLeaveReason(e.target.value);
                                if (e.target.value.trim().length >= 10) {
                                    setErrors(prev => ({...prev, leaveReason: ""}));
                                }
                            }}
                            placeholder="Tuliskan detail pengajuan izin..."
                            className={`w-full p-4 bg-slate-800/50 border rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 h-28 resize-none ${errors.leaveReason ? 'border-red-500' : 'border-white/10'}`}
                        />
                        <ErrorMsg name="leaveReason" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-1">Lampiran (Optional)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all group ${errors.attachment ? 'border-red-500' : 'border-white/10'}`}
                        >
                            {leaveAttachment ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                                    <img src={leaveAttachment} alt="Attachment" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setLeaveAttachment(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-slate-800 rounded-full text-slate-500 group-hover:text-indigo-400 transition-colors">
                                        <ImageIcon size={24} />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium">Klik untuk pilih foto dari galeri</span>
                                </>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileUpload}
                            />
                        </div>
                        <ErrorMsg name="attachment" />
                    </div>

                    <button 
                        onClick={handleSubmitLeave}
                        disabled={isSubmitting}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <>
                                <Check size={20} />
                                Kirim Pengajuan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Home;
