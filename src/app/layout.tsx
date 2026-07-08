import "../index.css";

export const metadata = {
  title: "AuraMax - Cyber-luxury Bio-aesthetic Matrix",
  description: "Cyber-luxury bio-aesthetic and cervical-kinesiology calibration matrix.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#050505]">
      <body className="min-h-screen bg-[#050505] text-zinc-300 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
