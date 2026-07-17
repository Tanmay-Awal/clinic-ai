import React from 'react';

export const CompanyLogos: React.FC = () => {
  const logos = [
    '/assets/company-logo/chakra.png',
    // '/assets/company-logo/osterley-1.png',
    // '/assets/company-logo/oberoi.png',
    '/assets/company-logo/royal.webp',
    '/assets/company-logo/orufy.svg',
    '/assets/company-logo/dgc.png',
    '/logo.png',
    '/assets/company-logo/be_logo_color.png',
  ];

  const duplicatedLogos = [...logos, ...logos];

  return (
    <main className="w-full bg-transparent py-20 max-w-6xl mx-auto">
      <div className="relative w-full overflow-hidden">

        {/* <div className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-background via-background to-background z-20 pointer-events-none" /> */}

        {/* <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-background via-background to-background z-20 pointer-events-none" /> */}

        <div className="flex animate-scroll whitespace-nowrap">
          {duplicatedLogos.map((logo, index) => (
            <div
              key={index}
              className="flex-shrink-0 mx-6 md:mx-8 lg:mx-10 flex items-center"
            >
              <img
                src={logo}
                alt={`Company logo ${(index % logos.length) + 1}`}
                className="object-contain h-28 w-28"
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};
