// app/layout.js
export const metadata = { title: 'Shuttle Tracker' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
