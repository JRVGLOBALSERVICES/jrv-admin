'use client';

import { useState, useEffect, useMemo } from 'react';
import { manualContent } from './manualData';
import { introductionSection, conclusionSection } from './additionalSections';

interface Section {
  id: string;
  title: string;
  icon: string;
  category: string;
}

const sections: Section[] = [
  { id: 'introduction', title: 'Introduction', icon: '📖', category: 'setup' },
  { id: 'dashboard', title: 'Dashboard', icon: '📊', category: 'setup' },
  { id: 'revenue', title: 'Revenue', icon: '💰', category: 'operations' },
  { id: 'agreements', title: 'Agreements', icon: '📄', category: 'operations' },
  { id: 'blacklist', title: 'Blacklist', icon: '🚫', category: 'operations' },
  { id: 'fleet', title: 'Fleet', icon: '🚗', category: 'operations' },
  { id: 'catalog', title: 'Catalog', icon: '📚', category: 'setup' },
  { id: 'marketing', title: 'Marketing', icon: '📢', category: 'marketing' },
  { id: 'landing', title: 'Landing Pages', icon: '📃', category: 'marketing' },
  { id: 'analytics', title: 'Analytics', icon: '📈', category: 'marketing' },
  { id: 'conclusion', title: 'Summary', icon: '✅', category: 'setup' },
];

// Enhanced markdown parser for content
const parseMarkdown = (content: string, onImageClick: (src: string) => void) => {
  let parsed = content;

  // Convert images to img tags with click handlers
  parsed = parsed.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
    return `<img src="${src}" alt="${alt}" class="max-w-full h-auto my-8 rounded-xl shadow-lg border-2 border-pink-100 cursor-pointer hover:shadow-2xl transition-shadow" onclick="window.openImageLightbox('${src}')" />`;
  });

  // Convert headers
  parsed = parsed.replace(/^#### (.*?)$/gm, '<h4 class="text-xl font-semibold text-gray-800 mt-6 mb-3">$1</h4>');
  parsed = parsed.replace(/^### (.*?)$/gm, '<h3 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h3>');

  // Convert bold with colon (labels)
  parsed = parsed.replace(/\*\*(.*?)\*\*:/g, '<strong class="font-bold text-[#FF3057]">$1:</strong>');
  // Convert remaining bold
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');

  // Process line by line for lists
  const lines = parsed.split('\n');
  const processedLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip horizontal rules
    if (trimmed === '---') {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      continue;
    }

    // Handle unordered lists
    if (line.match(/^- /)) {
      if (!inUnorderedList) {
        if (inOrderedList) {
          processedLines.push('</ol>');
          inOrderedList = false;
        }
        processedLines.push('<ul class="space-y-3 ml-6 my-6">');
        inUnorderedList = true;
      }
      const content = line.substring(2).trim();
      processedLines.push(`<li class="flex items-start gap-3"><span class="text-[#F15828] mt-1 font-bold">▸</span><span class="text-gray-700 leading-relaxed">${content}</span></li>`);
    }
    // Handle ordered lists
    else if (line.match(/^\d+\. /)) {
      if (!inOrderedList) {
        if (inUnorderedList) {
          processedLines.push('</ul>');
          inUnorderedList = false;
        }
        processedLines.push('<ol class="space-y-3 ml-8 my-6 list-decimal">');
        inOrderedList = true;
      }
      const content = line.substring(line.indexOf('. ') + 2).trim();
      processedLines.push(`<li class="text-gray-700 leading-relaxed pl-2">${content}</li>`);
    }
    // Handle regular content
    else {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }

      // Skip empty lines and already-processed HTML
      if (trimmed && !line.startsWith('<')) {
        processedLines.push(`<p class="text-gray-700 leading-relaxed my-4">${line}</p>`);
      } else if (line.startsWith('<')) {
        processedLines.push(line);
      }
    }
  }

  // Close any open lists
  if (inUnorderedList) {
    processedLines.push('</ul>');
  }
  if (inOrderedList) {
    processedLines.push('</ol>');
  }

  return processedLines.join('\n');
};

export default function ManualClient() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Make lightbox function available globally for image clicks
  useEffect(() => {
    (window as any).openImageLightbox = (src: string) => {
      setLightboxImage(src);
    };
    return () => {
      delete (window as any).openImageLightbox;
    };
  }, []);

  // Filter sections based on search and category
  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      const sectionData = manualContent.find(s => s.id === section.id);
      const matchesSearch = searchQuery === '' ||
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sectionData?.content.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesFilter = selectedFilter === 'all' ||
        section.category === selectedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, selectedFilter]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      for (const section of filteredSections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredSections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-30 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="font-bold text-gray-900">JRV Manual</div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-gray-600 hover:text-[#FF3057] active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 w-80 bg-linear-to-b from-[#FF3057] to-[#F15828] text-white overflow-y-auto shadow-2xl z-50 transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="relative">
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 border-b border-white/20">
            <div className="text-5xl font-black mb-2">JRV</div>
            <div className="text-xs tracking-widest opacity-90 mb-3">GLOBAL SERVICES</div>
            <div className="text-[11px] leading-relaxed opacity-85 bg-white/15 p-3 rounded-lg backdrop-blur-sm">
              This system directly controls the live customer website: <strong>jrvservices.co</strong>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border-none focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filter Tags */}
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'setup', label: 'Setup' },
              { id: 'operations', label: 'Operations' },
              { id: 'marketing', label: 'Marketing' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedFilter === filter.id
                  ? 'bg-white text-[#FF3057] shadow-lg'
                  : 'bg-white/10 hover:bg-white/20'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          {selectedFilter !== 'all' && (
            <div className="mt-2 text-xs opacity-75">
              Showing {filteredSections.length} of {sections.length} sections
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="px-3 pb-6">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${activeSection === section.id
                ? 'bg-white text-[#FF3057] font-semibold shadow-lg'
                : 'bg-white/10 hover:bg-white/20'
                }`}
            >
              <span className="text-xl">{section.icon}</span>
              <span className="text-sm">{section.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-80 p-4 lg:p-12 max-w-7xl mt-24 lg:mt-0">
        {/* Hero */}
        <div className="bg-linear-to-r from-[#FF3057] to-[#F15828] text-white p-8 lg:p-16 rounded-2xl lg:rounded-3xl mb-8 lg:mb-12 shadow-2xl">
          <h1 className="text-3xl lg:text-6xl font-black mb-4">Admin & Website Integration Manual</h1>
          <p className="text-lg lg:text-xl opacity-95 max-w-3xl leading-relaxed">
            Complete interactive guide to the JRV Global Services Admin Dashboard and its direct integration with your live customer website at jrvservices.co
          </p>
        </div>

        {/* Render all sections with content */}
        {filteredSections.map((section) => {
          // Get section data from manualContent or additional sections
          let sectionData = manualContent.find(s => s.id === section.id);

          // Handle special sections
          if (section.id === 'introduction') {
            sectionData = introductionSection;
          } else if (section.id === 'conclusion') {
            sectionData = conclusionSection;
          }

          return (
            <section
              key={section.id}
              id={section.id}
              className="bg-white p-6 lg:p-12 rounded-xl lg:rounded-2xl shadow-lg mb-6 lg:mb-8 hover:shadow-xl transition-shadow"
            >
              <h2 className="text-3xl lg:text-5xl font-black text-[#FF3057] mb-6 lg:mb-8 pb-4 lg:pb-6 border-b-4 border-[#FF3057] flex items-center gap-4">
                {sectionData?.number !== undefined && sectionData.number > 0 && (
                  <span className="text-[#F15828]">{sectionData.number}.</span>
                )}
                {sectionData?.title}
              </h2>

              {/* Render parsed markdown content */}
              {sectionData && (
                <div
                  className="prose prose-base lg:prose-lg max-w-none prose-img:rounded-xl prose-headings:text-gray-900 prose-p:text-gray-700"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(sectionData.content, setLightboxImage) }}
                />
              )}
            </section>
          );
        })}

        {/* No Results */}
        {filteredSections.length === 0 && (
          <div className="bg-white p-8 lg:p-16 rounded-2xl shadow-lg text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filter</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="px-6 py-3 bg-linear-to-r from-[#FF3057] to-[#F15828] text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>

      {/* Scroll to Top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-20 right-6 lg:bottom-20 lg:right-6 w-12 h-12 lg:w-12 lg:h-12 bg-linear-to-br from-[#FF3057] to-[#F15828] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40"
        aria-label="Scroll to top"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 z-9999 flex items-center justify-center cursor-pointer p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 lg:top-8 lg:right-8 w-10 h-10 lg:w-12 lg:h-12 bg-white text-gray-900 rounded-full flex items-center justify-center hover:bg-[#FF3057] hover:text-white transition-all hover:rotate-90 z-50"
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged view"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
