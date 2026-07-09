import "../index.css";
import Sidebar from "../components/Sidebar";

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
    <html lang="en" className="dark bg-[#0d0e12]">
      <body className="h-screen w-screen overflow-hidden bg-[#0d0e12] text-zinc-300 antialiased font-sans select-none flex flex-row">
        <Sidebar />
        <div id="auramax-viewport-root" className="flex-1 h-full overflow-y-auto bg-[#0d0e12] relative">
          {children}
        </div>
      </body>
    </html>
  );
}
