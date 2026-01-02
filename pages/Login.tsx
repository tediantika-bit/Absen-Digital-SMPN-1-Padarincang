
import React, { useState, useEffect } from 'react';
import { User as UserIcon, Lock, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

// ==========================================
// KONFIGURASI DATABASE SPREADSHEET
// ==========================================
// Ganti ID ini dengan ID Spreadsheet Anda yang sudah di-share "Anyone with the link view"
const SPREADSHEET_ID = '1mxMVnpeZAxqsFdLeSY733ZnkT-7u23EIhfSdmrmJOb4'; 
const SHEET_NAME = 'user'; 

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const lastUsername = localStorage.getItem('last_username');
    if (lastUsername) {
      setUsername(lastUsername);
    }
  }, []);

  const fetchSpreadsheetData = async (): Promise<any[]> => {
    // Menggunakan Google Visualization API Query
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal mengambil data dari server Google.");
      
      const text = await response.text();
      
      // Parsing respon JSON yang dibungkus function google.visualization.Query.setResponse(...)
      // Kita gunakan Regex agar lebih aman daripada substring manual
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*?)\);/s);
      
      if (!jsonMatch || !jsonMatch[1]) {
        throw new Error("Format data tidak dikenali. Pastikan Sheet ID benar dan akses Public.");
      }

      const jsonData = JSON.parse(jsonMatch[1]);
      
      if (!jsonData.table || !jsonData.table.rows) {
        return []; // Sheet kosong
      }

      const rows = jsonData.table.rows;
      
      // MAPPING KOLOM (Sesuaikan urutan kolom di Spreadsheet Anda)
      // Col 0 (A): Username
      // Col 1 (B): Password
      // Col 2 (C): Nama Lengkap
      // Col 3 (D): NIP
      // Col 4 (E): Jabatan/Role
      // Col 5 (F): Status Pegawai
      return rows.map((row: any) => ({
        username: row.c[0]?.v?.toString() || '',
        password: row.c[1]?.v?.toString() || '',
        name: row.c[2]?.v?.toString() || 'Tanpa Nama',
        nip: row.c[3]?.v?.toString() || '-',
        role: row.c[4]?.v?.toString() || 'GURU',
        employmentStatus: row.c[5]?.v?.toString() || 'Non-ASN'
      })).filter((u: any) => u.username && u.password); // Hanya ambil baris yang ada username & password

    } catch (err) {
      console.error("Spreadsheet error:", err);
      throw new Error("Gagal terhubung ke database sekolah. Cek koneksi internet atau ID Spreadsheet.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const teachers = await fetchSpreadsheetData();
      
      // Mencari user yang cocok (Case Insensitive untuk username)
      const foundUser = teachers.find(
        (t) => t.username.toLowerCase() === username.trim().toLowerCase() && 
               t.password.toString() === password.trim()
      );

      if (foundUser) {
        localStorage.setItem('last_username', username);
        onLogin({
          id: foundUser.nip, // Gunakan NIP sebagai ID unik
          username: foundUser.username,
          name: foundUser.name,
          nip: foundUser.nip,
          role: foundUser.role,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name)}&background=4f46e5&color=fff`,
          school: 'SMPN 1 Padarincang',
          employmentStatus: foundUser.employmentStatus
        });
      } else {
        setError("Username atau kata sandi salah.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-12 justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-[80px]" />

      <div className="text-center mb-10 z-10">
        <div className="w-32 h-32 mx-auto mb-6">
            <img 
              src="https://iili.io/fWETfnt.png" 
              alt="Logo SMPN 1 Padarincang" 
              className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
            />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">E-Absensi Guru</h1>
        <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide">SMPN 1 Padarincang</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 z-10">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <UserIcon size={18} className="text-slate-500" />
          </div>
          <input
            type="text"
            autoComplete="username"
            className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-white placeholder-slate-500"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock size={18} className="text-slate-500" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="w-full pl-11 pr-12 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-white placeholder-slate-500"
            placeholder="Kata Sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={18} />
              Masuk Sekarang
            </>
          )}
        </button>
      </form>
      
      <div className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-widest z-10 flex flex-col gap-1">
        <span>Cloud Database System</span>
        <span className="text-[8px] opacity-50">Pastikan Anda Terkoneksi Internet</span>
      </div>
    </div>
  );
};

export default Login;
