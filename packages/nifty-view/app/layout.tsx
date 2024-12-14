const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
};

export default ScaffoldEthApp;
