export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-full w-full bg-neutral-100">
      <div className="min-h-full max-w-md w-full flex flex-col mx-auto bg-background">
        {children}
      </div>
    </div>
  );
}
