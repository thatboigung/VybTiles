import React, { useState } from 'react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);
    const appUrl = 'https://vybetiles.netlify.app';
    const shareText = 'Check out Vyb Taps - An AI-powered rhythm game!';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(appUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareOnPlatform = (platform: string) => {
        let url = '';
        const encodedUrl = encodeURIComponent(appUrl);
        const encodedText = encodeURIComponent(shareText);

        switch (platform) {
            case 'x':
                url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'instagram':
                // Instagram doesn't have direct web sharing, copy link to clipboard and notify
                navigator.clipboard.writeText(appUrl);
                alert('Link copied! Open Instagram app to share.');
                return;
            case 'tiktok':
                // TikTok doesn't have direct web sharing, copy link to clipboard and notify
                navigator.clipboard.writeText(appUrl);
                alert('Link copied! Open TikTok app to share.');
                return;
        }

        if (url) {
            window.open(url, '_blank', 'width=600,height=400');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Share Vyb Taps</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-sm text-slate-400 mb-6">Share this rhythm game with your friends!</p>

                {/* Copy Link */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">App Link</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={appUrl}
                            readOnly
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/70 focus:outline-none focus:border-white/20"
                        />
                        <button
                            onClick={handleCopyLink}
                            className="px-6 py-3 bg-white text-black font-bold text-sm uppercase rounded-lg hover:bg-white/90 transition-all active:scale-95"
                        >
                            {copied ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    {copied && (
                        <p className="text-xs text-green-400 mt-2 animate-in fade-in duration-200">✓ Link copied to clipboard!</p>
                    )}
                </div>

                {/* Social Platforms */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Share On</label>
                    <div className="grid grid-cols-5 gap-4">
                        <button
                            onClick={() => shareOnPlatform('x')}
                            className="flex flex-col items-center gap-2 p-3 hover:opacity-70 transition-opacity group"
                            title="Share on X"
                        >
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-400">X</span>
                        </button>

                        <button
                            onClick={() => shareOnPlatform('facebook')}
                            className="flex flex-col items-center gap-2 p-3 hover:opacity-70 transition-opacity group"
                            title="Share on Facebook"
                        >
                            <svg className="w-8 h-8 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-400">Facebook</span>
                        </button>

                        <button
                            onClick={() => shareOnPlatform('whatsapp')}
                            className="flex flex-col items-center gap-2 p-3 hover:opacity-70 transition-opacity group"
                            title="Share on WhatsApp"
                        >
                            <svg className="w-8 h-8 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-400">WhatsApp</span>
                        </button>

                        <button
                            onClick={() => shareOnPlatform('instagram')}
                            className="flex flex-col items-center gap-2 p-3 hover:opacity-70 transition-opacity group"
                            title="Share on Instagram"
                        >
                            <svg className="w-8 h-8" fill="url(#instagram-gradient)" viewBox="0 0 24 24">
                                <defs>
                                    <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                        <stop offset="0%" style={{ stopColor: '#FED373' }} />
                                        <stop offset="15%" style={{ stopColor: '#F15245' }} />
                                        <stop offset="30%" style={{ stopColor: '#D92E7F' }} />
                                        <stop offset="50%" style={{ stopColor: '#9B36B7' }} />
                                        <stop offset="100%" style={{ stopColor: '#515ECF' }} />
                                    </linearGradient>
                                </defs>
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-400">Instagram</span>
                        </button>

                        <button
                            onClick={() => shareOnPlatform('tiktok')}
                            className="flex flex-col items-center gap-2 p-3 hover:opacity-70 transition-opacity group"
                            title="Share on TikTok"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                                <path fill="#25F4EE" d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
                                <path fill="#FE2C55" d="M15.819 2.441V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.795 4.795 0 0 1-4.773-4.35z" />
                                <path fill="#000" d="M5.17 13.41a2.895 2.895 0 0 0-.002 5.791 2.896 2.896 0 0 0 5.203-1.743V2.001h3.444a4.793 4.793 0 0 0 4.773 4.35v3.422a8.183 8.183 0 0 1-4.773-1.526v6.946a6.33 6.33 0 0 1-10.857 4.424A6.325 6.325 0 0 0 5.17 13.41z" />
                            </svg>
                            <span className="text-xs font-bold text-slate-400">TikTok</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
