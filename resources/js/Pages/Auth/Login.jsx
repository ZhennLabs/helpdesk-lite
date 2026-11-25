import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Icon } from '@iconify/react';

export default function Login({ status }) {
    const [showPassword, setShowPassword] = useState(false);

    const getCsrfToken = () => {
        if (typeof document !== 'undefined') {
            return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        }
        return '';
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        _token: getCsrfToken(),
        email: '',
        password: '',
        remember: true,
    });

    const submit = (e) => {
        e.preventDefault();
        data._token = getCsrfToken();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
            <Head title="Masuk ke Helpdesk" />

            <div className="absolute top-0 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex flex-col items-center justify-center mb-3">
                    <div className="p-3 bg-white/95 rounded-3xl shadow-xl shadow-teal-950/40 border border-white/30 backdrop-blur-sm">
                        <img
                            src="/images/logo.png"
                            alt="Helpdesk Lite"
                            className="h-20 w-auto object-contain"
                        />
                    </div>
                </div>
                <p className="mt-2 text-center text-xs text-slate-300 max-w-sm mx-auto">
                    Portal terpadu pengajuan dan pemantauan tiket kendala.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
                <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/20">

                    {status && (
                        <div className="mb-4 text-xs font-semibold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            {status}
                        </div>
                    )}
                    <form onSubmit={submit} className="space-y-4">
                        <input type="hidden" name="_token" value={data._token} />
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Alamat Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Icon icon="ph:envelope-simple-bold" className="w-4 h-4" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="nama@rsantammedika.co.id / admin@helpdesk.local"
                                    required
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500 bg-slate-50/50"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Kata Sandi
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Icon icon="ph:lock-key-bold" className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-brand-500 bg-slate-50/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <Icon icon={showPassword ? 'ph:eye-slash-bold' : 'ph:eye-bold'} className="w-4 h-4" />
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-[11px] text-rose-500 font-medium">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-slate-300 text-brand-600 shadow-xs focus:ring-brand-500 h-4 w-4"
                                />
                                <span className="text-xs text-slate-600 select-none">Ingat sesi saya</span>
                            </label>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-xs bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-700 hover:to-teal-700 shadow-md shadow-brand-500/20 active:scale-98 transition-all disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <Icon icon="ph:spinner-bold" className="w-4 h-4 animate-spin" />
                                        <span>Memproses Autentikasi...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Masuk Sekarang</span>
                                        <Icon icon="ph:arrow-right-bold" className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
