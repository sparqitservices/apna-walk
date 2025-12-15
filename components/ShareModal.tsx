import React from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  url: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, text, url }) => {
  if (!isOpen) return null;

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    {
      name: 'WhatsApp',
      icon: 'fa-whatsapp',
      color: 'bg-[#25D366]',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`
    },
    {
      name: 'X (Twitter)',
      icon: 'fa-x-twitter',
      color: 'bg-black',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
    },
    {
      name: 'Facebook',
      icon: 'fa-facebook-f',
      color: 'bg-[#1877F2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
    },
    {
      name: 'LinkedIn',
      icon: 'fa-linkedin-in',
      color: 'bg-[#0A66C2]',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(`${text} ${url}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-card w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold text-lg">Share Achievement</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {links.map((link) => (
            <a 
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
              onClick={onClose}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-lg transform transition-transform group-hover:scale-110 ${link.color}`}>
                <i className={`fa-brands ${link.icon}`}></i>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors text-center">{link.name}</span>
            </a>
          ))}
        </div>

        <button 
          onClick={handleCopy}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2 transition-colors active:scale-95"
        >
          <i className="fa-solid fa-copy"></i> Copy Text & Link
        </button>
      </div>
    </div>
  );
};