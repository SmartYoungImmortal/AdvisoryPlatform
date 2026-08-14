export default function DesktopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full w-full">
      {children}
    </div>
    // <div className="min-h-full w-full flex mx-auto bg-background">
    // </div>
  );
}
