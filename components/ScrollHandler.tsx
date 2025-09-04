'use client';

import { useEffect } from 'react';

export default function ScrollHandler() {
  useEffect(() => {
    const handleScroll = () => {
      const contactSection = document.querySelector('.contact-section');
      if (!contactSection) return;

      // Skryj sekci pokud uživatel scrollnul více než 100px
      if (window.scrollY > 100) {
        contactSection.classList.add('hidden');
      } else {
        contactSection.classList.remove('hidden');
      }
    };

    // Přidej event listener
    window.addEventListener('scroll', handleScroll);

    // Vyčisti event listener při unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return null; // Tato komponenta nic nevykresluje
}
